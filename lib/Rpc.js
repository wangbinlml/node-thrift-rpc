var log = require('./util/Logger').getLogger("system");
var rpcServiceConfig = require(process.cwd() + "/config/rpcServiceConfig");
var zkUtils = require('./util/ZKUtils').create();
var _ = require('lodash');


var ThriftAcceptor = require('./core/thrift/ThriftAcceptor');
var ThriftConnector = require('./core/thrift/ThriftConnector');

var Rpc = module.exports = {};
var client;
var server;

Rpc.createApp = function (opt) {
    var acceptorConfig = rpcServiceConfig.acceptorConfig;
    var connectorConfig = rpcServiceConfig.connectorConfig;
    //服务端初始化
    if (!_.isEmpty(acceptorConfig)) {
        var acceptor = new ThriftAcceptor();
        var serviceName = rpcServiceConfig.service.name;
        var zkPath = rpcServiceConfig.service.zk_path || "/root/";
        acceptorConfig.name = serviceName;
        acceptorConfig.zkPath = zkPath;
        acceptor.init(acceptorConfig, opt);
        server = acceptor;
    }
    //客户端初始化
    if (!_.isEmpty(connectorConfig)) {
        var connector = new ThriftConnector();
        connector.init(connectorConfig);
        client = connector;
    }
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

function deleteZKPath() {
    try {
        if(config) {
            zkUtils.close();
        }
    } catch (e) {
        log.info(e);
    }
}
//add shutdown hook: remove service from zookeeper
process.on('SIGTERM', function () {
    console.log('Got SIGTERM.  Removing Zookeeper Registry.');
    deleteZKPath();

});
process.on('SIGINT', function () {
    console.log('Got SIGINT.  Removing Zookeeper Registry.');
    deleteZKPath();
});
process.on('exit', function () {
    console.log('Got exit.  Removing Zookeeper Registry.');
    deleteZKPath()
});

