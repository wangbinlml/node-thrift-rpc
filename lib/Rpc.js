var log = require('./util/Logger').getLogger("system");
var rpcServiceConfig = require(process.cwd() + "/config/rpcServiceConfig");
var _ = require('lodash');
var zkUtil = require('./util/zookeeperSyncUtils');
var Fiber = require('fibers');

var ThriftAcceptor = require('./core/thrift/ThriftAcceptor');
var ThriftConnector = require('./core/thrift/ThriftConnector');

var Rpc = module.exports = {};
var client;
var server;

Rpc.createApp = function (opt) {
    Fiber(function () {
            var acceptorConfig = rpcServiceConfig.acceptorConfig;
            var connectorConfig = rpcServiceConfig.connectorConfig;
            //服务端初始化
            if (!_.isEmpty(acceptorConfig)) {
                var acceptor = new ThriftAcceptor();
                var serviceName = rpcServiceConfig.service.name;
                var zkPath = rpcServiceConfig.service.zk_path || "/root/";
                zkUtil.mkdirpSync(zkPath + serviceName);
                acceptorConfig.name = serviceName;
                acceptorConfig.zkPath = zkPath;
                acceptor.init(acceptorConfig, opt);
                server = acceptor;
            }
            //客户端初始化
            if (!_.isEmpty(connectorConfig)) {
                for (var key in connectorConfig) {
                    var obj = connectorConfig[key];
                    var path = obj.zk_path;
                    if (path) {
                        zkUtil.mkdirpSync(path);
                    }
                }
                var connector = new ThriftConnector();
                connector.init(connectorConfig);
                client = connector;
            }
        }
    ).run();
};

Rpc.getRpcService = function () {
    return client;
};

Rpc.getAccessService = function () {
    return server;
};

/**
 * create a server application
 *
 * @param opts
 * @returns {Application}
 */
Rpc.Server = function (opts) {
    if (server == undefined) {
        var ThriftAcceptor = require('./core/thrift/ThriftAcceptor');
        var acceptor = new ThriftAcceptor();
        var serviceName = rpcServiceConfig.service.name;
        var zkPath = rpcServiceConfig.service.zk_path || "/root/";
        var config = rpcServiceConfig.acceptorConfig;
        config.name = serviceName;
        config.zkPath = zkPath;
        acceptor.init(config, opts);
        server = acceptor;
    }
    return server;
};
/**
 * create a client application
 * @param opts
 * @returns {*}
 * @constructor
 */
Rpc.Client = function (opts) {
    if (client == undefined) {
        var ThriftConnector = require('./core/thrift/ThriftConnector');
        var connector = new ThriftConnector();
        var config = rpcServiceConfig.connectorConfig;
        connector.init(config);
        client = connector;
    }
    return client;
};
/**
 * 框架启动
 * @param thrift
 */
Rpc.start = function () {
    client && client.start();
    server && server.start();
    log.info("Application created!");
};
/**
 * Get application base path
 *
 *  // cwd: /home/game/
 *  // app.getBase() -> /home/game
 *
 * @return {String} application base path
 *
 * @memberOf zero
 */
Rpc.getAppBase = function () {
    return process.cwd();
};


