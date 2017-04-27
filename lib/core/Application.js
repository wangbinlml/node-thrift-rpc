var log = require('../util/Logger').getLogger("system");
var rpcServiceConfig = require(process.cwd() + "/config/rpcServiceConfig");
var util = require("util");
var events = require("events");

var zkUtil = require('../util/zkSyncUtils');
var Fiber = require('fibers');
var _ = require('lodash');

var ThriftAcceptor = require('./thrift/ThriftAcceptor');
var ThriftConnector = require('./thrift/ThriftConnector');

var client;
var server;

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
Application.prototype.init = function (opt) {

    var acceptorConfig = rpcServiceConfig.acceptor;
    var connectorConfig = rpcServiceConfig.connector;
    //生成并初始化service
    this.createAcceptor(acceptorConfig, ThriftAcceptor, opt);
    this.createConnector(connectorConfig, ThriftConnector, opt);
    //初始化业务
    //初始化业务路由类
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
 * 框架启动
 * @param thrift
 */
Application.prototype.start = function () {
    client && client.start();
    server && server.start();
};
Application.prototype.createAcceptor = function (acceptorConfig, Acceptor, opt) {
    //服务端初始化
    if (!_.isEmpty(acceptorConfig)) {
        //初始化 acceptor
        this.initAcceptor(acceptorConfig, Acceptor, opt);
    }
};
Application.prototype.createConnector = function (connectorConfig, Connector, opt) {
    //客户端初始化
    if (!_.isEmpty(connectorConfig)) {
        //初始化 connector
        this.initConnector(connectorConfig, Connector, opt);
    }
};
Application.prototype.initConnector = function (config, Connector, opt) {
    Fiber(function () {
            for (var key in config) {
                var obj = config[key];
                var path = obj.service;
                if (path) {
                    zkUtil.mkdirpSync(path);
                }
            }
            var connector = new Connector();
            connector.init(config);
            client = connector;
        }
    ).run();
};

Application.prototype.initAcceptor = function (config, Acceptor, opt) {
    Fiber(function () {
            var acceptor = new Acceptor();
            var zkPath = config.service || "/root/";
            zkUtil.mkdirpSync(zkPath);
            acceptor.init(config, opt);
            server = acceptor;
        }
    ).run();
};

Application.prototype.getRpcService = function () {
    return client;
};

Application.prototype.getAccessService = function () {
    return server;
};
module.exports = Application;
