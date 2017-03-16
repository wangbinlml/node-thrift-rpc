var thrift = require('thrift');
var BizDispatcher = require(process.cwd() + '/app/dispatcher/BizDispatcher');
var bizConfig = require(process.cwd() + '/config/businessConfig');
var RPCInvokeService = require('../../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../../gen-nodejs/rpc_types');


var bizDispatcher = new BizDispatcher();
/**
 * 说明： 构造函数
 */
function ThriftAcceptor() {
    var host;
    var port;
    var bizMap = {};
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
        this.initBiz();
    },
    start: function () {
        try {
            var server = thrift.createServer(RPCInvokeService, {
                invoke: function (service, method, msg, cb) {

                    console.log(service);
                    console.log(method);
                    console.log(msg);
                    //业务处理
                    bizDispatcher.dispatch(service, method, msg, cb);
                }
            }, {});

            server.listen(this.getPort());
        } catch (e) {
            console.error(e);
        }
    }
};