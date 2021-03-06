/**
 * Created by root on 3/17/17.
 */
var log = require('../../util/Logger').getLogger("system");
var thrift = require('thrift');
var transport = thrift.TBufferedTransport;
var protocol = thrift.TBinaryProtocol;
var RPCInvokeService = require('../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../gen-nodejs/rpc_types');

var zkUtils = require('../../util/zkSyncUtils');
var Fiber = require('fibers');
var bizDispatcher;
/**
 * 说明： 构造函数
 */
function ThriftAcceptor() {
    var host;
    var port;
    var name;
    var version = "1.0.0";
    var weight = "1";
    var zkPath;
    var bizMap = {};

    this.setWeight = function (weight) {
        weight = weight;
    };
    this.getWeight = function () {
        return weight;
    };
    this.setVersion = function (version) {
        version = version;
    };
    this.getVersion = function () {
        return version;
    };
    this.setName = function (serviceName) {
        name = serviceName;
    };
    this.getName = function () {
        return name;
    };

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
        var bizConfig = require(process.cwd() + '/config/businessConfig');
        var bizList = bizConfig.bizList;
        for (var i in bizList) {
            var bizObj = bizList[i];
            var bizName = bizObj.name;
            var BizImpl = require(process.cwd() + bizObj.impl);
            var bizImpl = new BizImpl();
            bizImpl.init();
            this.setBizImpl(bizName, bizImpl);
        }
        var BizDispatcher = require(process.cwd() + '/app/dispatcher/BizDispatcher');
        bizDispatcher = new BizDispatcher();
        bizDispatcher.init(this.getBizMap());
    },
    init: function (config, opt) {
        this.setHost(config.ip);
        this.setPort(config.port);
        this.setName(config.name);
        if(config.version) {
            this.setVersion(config.version);
        }
        if(config.weight){
            this.setWeight(config.weight);
        }
        this.setName(config.name);
        this.setZKPath(config.service);
        this.initBiz();
    },
    start: function () {
        var _self = this;
        try {
            var server = thrift.createServer(RPCInvokeService, {
                invoke: function (service, method, msg, cb) {
                    //业务处理
                    var body = msg.body;
                    if(typeof body == 'object')  {
                        msg.body = JSON.stringify(body);
                    }
                    bizDispatcher.dispatch(service, method, msg, cb);
                }
            }, {
                transport: transport,
                protocol: protocol
            });
            server.listen(this.getPort());
            Fiber(function () {
                var path = _self.getZKPath();
                zkUtils.mkdirpSync(path+'/'+_self.getVersion()).wait();
                path = path+'/'+_self.getVersion() + '/' + _self.getHost() + ':' + _self.getPort() + ':' + _self.getWeight();
                var exists = zkUtils.existsSync(path).wait();
                if(exists == 0) {
                    zkUtils.createSync(path, null, 1).wait();
                }
                log.info("server created " + path + " success ");
            }).run();
        } catch (e) {
            log.error(e);
        }
    }
};