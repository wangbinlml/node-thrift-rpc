var log = require('../util/Logger').getLogger("system");
var beanFactory = require("../../../core/ioc/impl/BeanFactoryImpl")();
var util = require("util");
var events = require("events");

//业务逻辑map
var businessMap = {};
//服务map
var serviceMap = {};

/**
 * 说明： 构造函数，
 */
function Application() {
    events.EventEmitter.call(this);
}
util.inherits(Application, events.EventEmitter);


/**
 * 说明： 初始化业务入口
 */
Application.prototype.init = function () {

    //生成并初始化service
    var serviceConfig = this.ConfigUtil.getConfig('service');
    for (var serviceId in serviceConfig) {
        //如果是第三方模块，require方式，否则getBean方式
        var module = serviceConfig[serviceId]['module'];
        var service = module ? require(serviceConfig[serviceId]['impl']) : beanFactory.getBean(serviceConfig[serviceId]['impl']);
        serviceMap[serviceId] = service;
        serviceId !== 'eventService' && service.init();
    }

    //初始化业务
    this.ConfigUtil.getConfig('business')['bizList'].forEach(function (bizInfo, index) {
        var business = beanFactory.getBean(bizInfo['impl']);
        businessMap[bizInfo['name']] = business;
        business.init();
    });

    //初始化业务路由类
    beanFactory.getBean('BizDispatcherImpl').init(businessMap, this);
};

Application.prototype.before = function (cb) {
    //触发before事件
    this.emit('before', cb);
};

Application.prototype.after = function (cb) {
    //触发after事件
    this.emit('after', cb);
};

/**
 * 说明： 启动业务
 */
Application.prototype.start = function () {
    //启动Servcie
    for (var serviceId in serviceMap) {
        serviceId !== 'eventService' && serviceMap[serviceId].start();
    }

    log.info("Application started!");
};

/**
 * 说明： 获得service
 */
Application.prototype.getService = function (serviceId) {

    return serviceMap[serviceId];

};

/**
 * 说明： 设置service
 */
Application.prototype.setService = function (serviceId, serviceObj) {

    serviceMap[serviceId] = serviceObj;

};

/**
 * 说明： 向Application添加配置
 */
Application.prototype.configure = function (env, type, fn) {
    var args = [].slice.call(arguments);
    fn = args.pop();
    env = 'all';
    type = 'all';

    if (args.length > 0) {
        env = args[0];
    }
    if (args.length > 1) {
        type = args[1];
    }

    if (env === 'all') {
        if (type === 'all') {
            fn.call(this);
        }
    }
    return this;
};

/**
 * 说明： 向ConfigUtil添加配置
 */
Application.prototype.set = function (key, val) {
    this.ConfigUtil.setConfig(key, val);
};

/**
 * 说明： 通过ConfigUtil获取配置
 */
Application.prototype.get = function (key) {
    return this.ConfigUtil.getConfig(key);
};

module.exports = Application;

//服务进程退出监控
process.on('exit', function () {
    console.log('About to exit.');
});

process.on('uncaughtException', function (err) {
    log.error('uncaughtException is catched. error is: ' + err.stack);
});

process.on('SIGTERM', function () {
    log.info('About to killed.');
});
