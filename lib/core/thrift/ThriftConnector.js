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
    var poolConfig;
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
    this.setPoolConfig = function (pConfig) {
        poolConfig = pConfig;
    };
    this.getPoolConfig = function () {
        return poolConfig;
    };
}
module.exports = ThriftConnector;

ThriftConnector.prototype = {
    init: function (config, opt) {
        this.setHost(config.ip);
        this.setPort(config.port);
        this.setPoolConfig(opt);
    },
    start: function () {
        createConnect(this);
    },
    send: function (service, method, msg) {
        try {
            msg.body = JSON.stringify(msg.body)
            var msg = new ttypes.Msg(msg);
            pool.acquire(function (err, client) {
                var seqid = client.new_seqid();
                console.log(seqid);
                console.log("======================");
                //var recv_invoke = client.recv_invoke(input,mtype,rseqid);
                console.log("======================");
                var data = client.send_invoke(service, method, msg);
                console.log(data);
                console.log("======================");
                var seqid2 = client.seqid();
                console.log(seqid2);
                console.log("======================");
                client.invoke(service, method, msg, function (err, response) {
                    releasePool(client);
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
    var conf = _self.getPoolConfig();
    console.log(conf)
    console.log(_self.getHost())
    console.log(_self.getPort())
    pool = poolModule.Pool({
        name: 'thrift connect pool',
        create: function (callback) {
            try {
                var connection = thrift.createConnection(_self.getHost(), _self.getPort());
                connection.on("error", function (err) {
                    console.error(err);
                    connection.end();
                });
                var client = thrift.createClient(RPCInvokeService, connection);
                callback(null, client);
            } catch (err) {
                console.log(err);
            }
        },
        destroy: function (client) {
            console.log("client destroy");
        },
        max: conf.maxPoolSize,
        // optional. if you set this, make sure to drain() (see step 3)
        min: conf.minPoolSize,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis: conf.idleTimeout,
        // if true, logs via console.log - can also be a function
        log: false
    });
};

/**
 * 释放connection
 * @param connection
 */
function releasePool(connection) {
    try {
        pool.release(connection);
    } catch (err) {
        console.log(err);
    }
}

process.on('uncaughtException', function (error) {
    console.log(error);
});
