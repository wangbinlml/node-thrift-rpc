var log = require('../../util/Logger').getLogger("system");
var commonUtil = require('../../util/CommonUtil');
var zkUtils = require('../../util/zkUtils').fn();
var _ = require('lodash');
var thrift = require('thrift');
var RPCInvokeService = require('../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../gen-nodejs/rpc_types');

var PoolConnector = require('../../util/ThriftConnectorPool');
var poolConnector = new PoolConnector();

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
            msg.header = header;

            var body = msg.body;
            if(typeof body == 'object') {
                body = JSON.stringify(body);
                msg.body = body;
            }

            msg = new ttypes.Msg(msg);
            //多台服务器随机取一台发送请求，TODO 后期实现负载均衡
            var poolMap = poolConnector.getPoolMap();
            var servicePools = poolMap[service];
            if (_.isEmpty(servicePools) || servicePools.length == 0) {
                var content = service + " service not found! please check service is running.";
                log.error(content);
                throw content;
            } else {
                var pool = commonUtil.getRandomForArray(service, servicePools);
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
        var version = '1.0.0';
        if(conf.version) {
            version = conf.version;
        }
        var path = conf.service ?  conf.service + '/' + version : '';
        zkUtils.getChildren(
            path,
            function (error, data) {
                if (error) {
                    throw error;
                } else {
                    poolConnector.create(serviceName, data, conf);
                    poolConnector.upgradePoolMap(data);
                }
            }
        );
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
        log.log(err);
    }
}

