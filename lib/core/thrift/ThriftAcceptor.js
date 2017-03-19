/**
 * Created by root on 3/17/17.
 */
var log = require('../../util/Logger').getLogger("system");
var thrift = require('thrift');
var BizDispatcher = require(process.cwd() + '/app/dispatcher/BizDispatcher');
var bizConfig = require(process.cwd() + '/config/businessConfig');
var RPCInvokeService = require('../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../gen-nodejs/rpc_types');

var zkUtils = require('../../util/ZKUtils').create();
var bizDispatcher = new BizDispatcher();

/**
 * 说明： 构造函数
 */
function ThriftAcceptor() {
    var host;
    var port;
    var name;
    var zkPath;
    var bizMap = {};
    this.setName = function (serviceName) {
        name = serviceName;
    };
    this.getName = function () {
        return name;
    };
    this.setZKPath = function (zkparh) {
        zkPath = zkparh;
    };
    this.getZKPath = function () {
        return zkPath;
    };
    this.setPort = function (listenPort) {
        port = listenPort;
    };
    this.getPort = function () {
        return port;
    };
    this.setHost = function (listenIP) {
        host = listenIP;
    };
    this.getHost = function () {
        return host;
    };
    this.setBizImpl = function (bizName, bizImpl) {
        bizMap[bizName] = bizImpl;
    };
    this.getBizImpl = function (bizName) {
        return bizMap[bizName];
    };
    this.getBizMap = function () {
        return bizMap;
    };
}
module.exports = ThriftAcceptor;


ThriftAcceptor.prototype = {
    initBiz: function () {
        var bizList = bizConfig.bizList;
        for (var i in bizList) {
            var bizObj = bizList[i];
            var bizName = bizObj.name;
            var BizImpl = require(process.cwd() + bizObj.impl);
            var bizImpl = new BizImpl();
            bizImpl.init();
            this.setBizImpl(bizName, bizImpl);
        }
        bizDispatcher.init(this.getBizMap());
    },
    init: function (config, opt) {
        this.setHost(config.ip);
        this.setPort(config.port);
        this.setName(config.name);
        this.setZKPath(config.zkPath);
        this.initBiz();
    },
    start: function () {
        try {
            var server = thrift.createServer(RPCInvokeService, {
                invoke: function (service, method, msg, cb) {
                    //console.log(service);
                    //console.log(method);
                    //console.log(msg);
                    //业务处理
                    bizDispatcher.dispatch(service, method, msg, cb);
                }
            }, {});
            server.listen(this.getPort());
            log.info(this.getName() + " server listen ip:port " + this.getHost() + ":"+ this.getPort());
            var obj = {
                host: this.getHost(),
                port: this.getPort()
            };
            zkUtils.setData(this.getZKPath() + this.getName(), JSON.stringify(obj));
        } catch (e) {
            console.error(e);
        }
    }
};

//add shutdown hook: remove service from zookeeper
process.on('SIGTERM', function () {
    console.log('Got SIGTERM.  Removing Zookeeper Registry.');
    zkUtils.remove('/thrift_services/nodis', '192.168.126:9998', function () {
        //zkUtils.close();
        process.exit();//put this in 'close' callback later, now unsupported by node-zookeeper
    });
});