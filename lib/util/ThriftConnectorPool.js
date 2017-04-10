/**
 * Created by root on 4/10/17.
 */
var log = require('./Logger').getLogger("system");
var thrift = require('thrift');
var transport = thrift.TBufferedTransport;
var protocol = thrift.TBinaryProtocol;
var poolModule = require('generic-pool');
var RPCInvokeService = require('../../lib/gen-nodejs/RPCInvokeService');
var _ = require('lodash');
var poolMap = {};

module.exports = ThriftConnectorPool;
function ThriftConnectorPool() {

}
ThriftConnectorPool.prototype = {
    /**
     * create connector pool
     * @param data
     * @param conf
     */
    create: function (serviceName, data, conf) {
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var array = item.split(':');
            var host = array[0];
            var port = array[1];
            var poolName = serviceName + '_' + item;
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
                    var pool2 = pools[i];
                    var poolName = pool2.getName();
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
    },
    /**
     * upgrade pool map
     * @param data
     * @param poolMap
     */
    upgradePoolMap: function (data) {
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
                log.info("newPools length " + newPools.length);
                poolMap[serviceName] = newPools;
            }
        }
    },
    /**
     * get connector pool Map
     * @returns {{}}
     */
    getPoolMap: function () {
        return poolMap;
    }
};