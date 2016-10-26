var thrift = require('thrift');

var poolModule = require('generic-pool');
var RPCInvokeService = require('../../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../../gen-nodejs/rpc_types');

var pool = null;
    /**
 * 说明： 构造函数
 */
function ThriftConnector() {
    var host;
    var port;
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
}
module.exports = ThriftConnector;

ThriftConnector.prototype = {
    init: function (config, opt) {

    },
    start: function () {
        createConnect(this);
    },
    send: function (service, method, msg) {
        try {
            pool.acquire(function (err, connection) {
                getClient(connection).invoke(service, method, msg, function (err, response) {
                    releasePool(connection);
                    if (err) {
                        console.error(err);
                    } else {
                        console.log("client res:", response);
                    }
                });
            });
        } catch (err) {
            console.log(err);
        }
    }
};
var createConnect = function (_self) {
    pool = poolModule.Pool({
        name: 'mysql',
        create: function (callback) {
            try {
                var connection = thrift.createConnection('localhost', 9090);
                connection.on("error", function (err) {
                    console.error(err);
                    connection.end();
                });
                callback(null, connection);
            } catch (err) {
                console.log(err);
            }
        },
        destroy: function (client) {
            client.end();
        },
        max: 100,
        // optional. if you set this, make sure to drain() (see step 3)
        min: 80,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis: 30000,
        // if true, logs via console.log - can also be a function
        log: false
    });
};

/**
 * 释放connection
 * @param connection
 */
function releasePool(connection){
    try{
        pool.release(connection);
    }catch(err){
        console.log(err);
    }
}

/**
 * 获取connection
 */
function getClient(connection) {
    var client = client = thrift.createClient(RPCInvokeService, connection);
    return client;
}


process.on('uncaughtException', function (error) {
    console.log(error);
});
