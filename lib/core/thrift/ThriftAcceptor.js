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
        var _self = this;
        try {
            var server = thrift.createServer(RPCInvokeService, {
                invoke: function (service, method, msg, cb) {
                    //业务处理
                    bizDispatcher.dispatch(service, method, msg, cb);
                }
            }, {});
            server.listen(this.getPort());
            var path = this.getZKPath() + this.getName();
            //批量创建path
            zkUtils.mkdirp(path);
            log.info(path + " created!!!");
            path = path + '/' + _self.getHost() + ':' + _self.getPort();
            //创建临时节点
            zkUtils.create(path);
            log.info(path + " server created; listen ip:port " + this.getHost() + ":" + this.getPort());
        } catch (e) {
            console.error(e);
        }
    }
};