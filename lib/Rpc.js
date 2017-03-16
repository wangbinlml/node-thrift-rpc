var log = require('./util/Logger').getLogger("system");

var Rpc = module.exports = {};
var client;
var server;
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
        var config = {
            "ip": "127.0.0.1",
            "port": "9090",
            "sid": "run-osc"
        };
        acceptor.init(config, {});
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
        var connectorConfig = {
            "retryTime": "30",
            "retryInterval": "5000",
            "maxPoolSize": 5,
            "minPoolSize": 2,
            "idleTimeout": 30000000
        };
        var config = {
            "ip": "127.0.0.1",
            "port": "9090",
            "sid": "run-osc"
        };
        connector.init(config, connectorConfig);
        client = connector;
    }
    return client;
};
/**
 * 框架启动
 * @param thrift
 */
Rpc.start = function (thrift) {
    thrift.start();
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

