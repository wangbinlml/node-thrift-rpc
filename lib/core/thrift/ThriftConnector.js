var log = require('../../util/Logger').getLogger("system");
var commonUtil = require('../../util/CommonUtil');
var zkUtils = require('../../util/ZookeeperUtils').fn();
var _ = require('lodash');
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
            var servicePools = poolMap[service];
            log.info("servicePools " + (_.isEmpty(servicePools) || servicePools.length));
            if (_.isEmpty(servicePools) || servicePools.length == 0) {
                var content = service + " not found! please check zk is running.";
                log.error(content);
                throw content;
            } else {
                var pool = commonUtil.getRandomForArray(servicePools);
                pool.acquire(function (err, client) {
                    client.invoke(service, method, msg, function (err, response) {
                        releasePool(pool, client);
                        cb(err, response);
                    });
                });
            }
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
        var path = conf.service || "";
        var createPool = function (data) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var array = item.split(':');
                var host = array[0];
                var port = array[1];
                var poolName = serviceName + '_' + item;
                console.log("poolName ", poolName);
                var factory = {
                    name: poolName,
                    create: function (callback) {
                        try {
                            var connection = thrift.createConnection(host, port, {
                                transport: transport,
                                protocol: protocol
                            });
                            connection.on("error", function (err) {
                                log.error("thrift connect error", host, port);
                                log.error(err);
                                connection.end();
                                callback(err, null);
                                throw err;
                            });
                            var client = thrift.createClient(RPCInvokeService, connection);
                            callback(null, client);
                        } catch (err) {
                            log.error(err);
                            throw err;
                        }
                    },
                    destroy: function (client) {
                        log.info("client destroy");
                    },
                    max: conf.maxPoolSize,
                    min: conf.minPoolSize,
                    idleTimeoutMillis: conf.idleTimeout,
                    log: false
                };
                var pool = poolModule.Pool(factory);
                log.info("connect " + serviceName + " - " + host + ":" + port + " success !");
                if (_.isUndefined(poolMap[serviceName])) {
                    poolMap[serviceName] = [pool];
                } else {
                    var pools = poolMap[serviceName];
                    var exists = false;
                    for (var i = 0; i < pools.length; i++) {
                        var pool = pools[i];
                        var poolName = pool.getName();
                        if ((serviceName + '_' + item) == poolName) {
                            exists = true;
                            break;
                        }
                    }
                    if (exists == false) {
                        poolMap[serviceName].push(pool);
                    }
                }
            }
        };
        zkUtils.getChildren(
            path,
            function (error, data) {
                if (error) {
                    log.error("got children error ", error);
                    throw error;
                } else {
                    createPool(data);
                    upgradePoolMap(data, poolMap);
                }
            }
        );
    }
};

/**
 * upgrade pool map
 * @param data
 * @param poolMap
 */
function upgradePoolMap(data, poolMap) {
    for (var serviceName in poolMap) {
        if (data.length == 0) {
            delete poolMap[serviceName];
        } else {
            var pools = poolMap[serviceName];
            var newPools = [];
            for (var i = 0; i < pools.length; i++) {
                var pool = pools[i];
                var poolName = pool.getName();
                var exists = false;
                for (var j = 0; j < data.length; j++) {
                    var address = serviceName + '_' + data[j];
                    if (address == poolName) {
                        exists = true;
                        break;
                    }
                }
                if (exists == true) {
                    newPools.push(pool);
                } else {
                    pool.destroy(pool);
                }
            }
            console.log("newPools " + newPools.length);
            poolMap[serviceName] = newPools;
        }
    }

}
/**
 * 释放connection
 * @param connection
 */
function releasePool(pool, connection) {
    try {
        pool.release(connection);
    } catch (err) {
        log.log(err);
    }
}

