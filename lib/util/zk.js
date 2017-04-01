/**
 * Created by wangbin on 17-4-1.
 */
var log = require('./Logger').getLogger("system");
var ZK = require("zookeeper").ZooKeeper;

function new_zk(zkclient, config) {
    var zk = new ZK();
    zk.init(config);
    zk.on(ZK.on_connected, function (zkk) {
        log.info("zk session established, id=%s", zkk.client_id);
    });
    zk.on(ZK.on_closed, function (zkk) {
        //re-initialize
        log.info("zk session close,re-init it");
        zkclient.zk = new_zk(zkclient, config);
    });
    return zk;
}

function ZkClient(config) {
    this.zk = new_zk(this, config);
}

module.exports.ZkClient = ZkClient;