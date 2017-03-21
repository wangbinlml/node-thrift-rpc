var log = require('../../util/Logger').getLogger("system");
var commonUtil = require('../../util/CommonUtil');
var zkUtils = require('../../util/ZKUtils').create();
var thrift = require('thrift');
var transport = thrift.TBufferedTransport;
var protocol = thrift.TBinaryProtocol;
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
            var header = msg.header;
            var tid = header.tid || commonUtil.genTid(32) + "";
            var rpcId = header.rpcId || "0";
            header.tid = tid;
            header.rpcId = rpcId;
            var body = JSON.stringify(msg.body);
            msg.body = body;
            msg.header = header;
            var msg = new ttypes.Msg(msg);
            //多台服务器随机取一台发送请求，TODO 后期实现负载均衡
            var pool = commonUtil.getRandomForArray(poolMap[service]);
            pool.acquire(function (err, client) {
                client.invoke(service, method, msg, function (err, response) {
                    releasePool(pool, client);
                    cb(err, response);
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
        zkUtils.getChildren(path, function (error, data, stat) {
            if (!error) {
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        var item = data[i];
                        var array = item.split(':');
                        var pool = poolModule.Pool({
                            name: 'thrift connect pool',
                            create: function (callback) {
                                try {
                                    var host = array[0];
                                    var port = array[1];
                                    var connection = thrift.createConnection(host, port, {
                                        transport: transport,
                                        protocol: protocol
                                    });
                                    connection.on("error", function (err) {
                                        log.error("thrift connect error", host, port);
                                        console.error(err);
                                        connection.end();
                                        throw err;
                                        callback(error, null);
                                    });
                                    var client = thrift.createClient(RPCInvokeService, connection);
                                    callback(null, client);
                                } catch (err) {
                                    console.log(err);
                                    throw err;
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
                        log.info(serviceName + " service ("+item+") created !");
                        if(poolMap[serviceName] == undefined) {
                            poolMap[serviceName] = [pool];
                        } else {
                            poolMap[serviceName].push(pool);
                        }
                    }
                }
            } else {
                //TODO 连接服务错误，各种情况不同
                console.log("get children path error ", error)
                throw error;
            }
        });
    }
};

/**
 * 释放connection
 * @param connection
 */
function releasePool(pool, connection) {
    try {
        pool.release(connection);
    } catch (err) {
        console.log(err);
    }
}

process.on('uncaughtException', function (error) {
    console.log(error);
});
