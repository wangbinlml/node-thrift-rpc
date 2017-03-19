var log = require('../../util/Logger').getLogger("system");
var zkUtils = require('../../util/ZKUtils').create();
var thrift = require('thrift');

var poolModule = require('generic-pool');
var RPCInvokeService = require('../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../gen-nodejs/rpc_types');

var poolMap = {};
/**
 * 说明： 构造函数
 */
function ThriftConnector() {
    var connectorConfig;
    this.setConnectorConfig = function (config) {
        connectorConfig = config;
    };
    this.getConnectorConfig = function () {
        return connectorConfig;
    };
}
module.exports = ThriftConnector;

ThriftConnector.prototype = {
    init: function (config, opt) {
        this.setConnectorConfig(config);
    },
    start: function () {
        createConnect(this);
    },
    send: function (service, method, msg, cb) {
        try {
            msg.body = JSON.stringify(msg.body)
            var msg = new ttypes.Msg(msg);
            poolMap[service].acquire(function (err, client) {
                client.invoke(service, method, msg, function (err, response) {
                    releasePool(service, client);
                    cb(err, response);
                    /*if (err) {
                        console.error(err);
                    } else {
                        console.log("client res:", response);
                    }*/
                });
            });
        } catch (err) {
            log.error(err);
        }
    }
};
var createConnect = function (_self) {
    var connectionConfig = _self.getConnectorConfig();

    for (var serviceName in connectionConfig) {
        var conf = connectionConfig[serviceName];
        //从zookeeper中获取服务连接信息
        var path = conf.zk_path || "";
        zkUtils.getData(path, function (error, data, stat) {
            if (!error) {
                var pool = poolModule.Pool({
                    name: 'thrift connect pool',
                    create: function (callback) {
                        try {
                            var dataStr = data.toString();
                            if(dataStr != ""){
                                var obj = JSON.parse(dataStr);
                                var host = obj.host;
                                var port = obj.port;
                                var connection = thrift.createConnection(host, port);
                                connection.on("error", function (err) {
                                    log.error("thrift connect error",host,port);
                                    console.error(err);
                                    connection.end();
                                    callback(error, null);
                                });
                                var client = thrift.createClient(RPCInvokeService, connection);
                                callback(null, client);
                            } else {
                                connection.end();
                                callback(error, null);
                            }
                        } catch (err) {
                            console.log(err);
                        }
                    },
                    destroy: function (client) {
                        console.log("client destroy");
                    },
                    max: conf.maxPoolSize,
                    min: conf.minPoolSize,
                    idleTimeoutMillis: conf.idleTimeout,
                    log: false
                });
                log.info(serviceName + " service connected !");
                poolMap[serviceName] = pool;
            } else {
                //TODO 连接服务错误，各种情况不同
                console.log("ttttttttttttttttttttttt", error)
            }
        });
    }
};

/**
 * 释放connection
 * @param connection
 */
function releasePool(serviceName, connection) {
    try {
        poolMap[serviceName].release(connection);
    } catch (err) {
        console.log(err);
    }
}

process.on('uncaughtException', function (error) {
    console.log(error);
});
