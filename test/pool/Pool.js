/**
 * Created by wangbin on 17-4-10.
 */
var thrift = require('thrift');
var transport = thrift.TBufferedTransport;
var protocol = thrift.TBinaryProtocol;
var poolModule = require('generic-pool');
var RPCInvokeService = require('../../lib/gen-nodejs/RPCInvokeService'),
    ttypes = require('../../lib/gen-nodejs/rpc_types');
var poolMap = {};
module.exports = Pool;
function Pool() {
}
Pool.prototype = {
    create: function (host, port) {
        console.log("poolName ", host+port);
        var poolName = host+":"+port;
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
            max: 1,
            min: 2,
            idleTimeoutMillis: 10000,
            log: false
        };
        var pool = poolModule.Pool(factory);
        poolMap[poolName] = pool;
    },
    getMap: function () {
        return poolMap;
    }
};