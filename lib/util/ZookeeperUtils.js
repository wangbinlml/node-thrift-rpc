/**
 * Created by root on 3/26/17.
 */
var log = require('./Logger').getLogger("system");
var config = require(process.cwd() + "/config/config");
var ZkClient = require('./zk').ZkClient;
var zkConfig = {
    connect: config.zk_path,
    timeout: config.timeout,
    debug_level: config.debug_level,
    host_order_deterministic: config.host_order_deterministic
};
var client = new ZkClient(zkConfig);
function ZookeeperUtils() {

}
//Log Levels:
//* ZOO_LOG_LEVEL_ERROR        =  1
//* ZOO_LOG_LEVEL_WARN         =  2
//* ZOO_LOG_LEVEL_INFO         =  3
//* ZOO_LOG_LEVEL_DEBUG        =  4
ZookeeperUtils.prototype = {
    /**
     * create path
     * @param path
     * @param mode  ZK.ZOO_SEQUENCE = 2 | ZK.ZOO_EPHEMERAL = 1
     */
    create: function (path, value, mode, cb) {
        client.zk.a_create(path, value || "", mode, function (rc, error, path) {
            if (rc != 0) {
                cb && cb(error, null);
                log.error("zk node create result: %d, error: '%s', path=%s", rc, error, path);
                throw error;
            } else {
                log.info("created zk node %s", path, " success");
                cb && cb(null, path);
            }
        });
    },
    getChildren: function (path, cb) {
        var _self = this;
        var listChildren = function (path, cb) {
            client.zk.aw_get_children(
                path,
                function (type, state, path) {
                    // this is watcher
                    log.info("get watcher is triggered: type=%d, state=%d, path=%s", type, state, path);
                    listChildren(path, cb);
                }, function (rc, error, children) {
                    // this is response from aw_get_children
                    if (rc != 0) {
                        //no node
                        log.error("ERROR zk node.aw_get_children " + path + ": %d, error: '%s'", rc, error);
                        if (rc == -101) {
                            _self.mkdirp(path, function (error, data) {
                                if (error == null && data == true) {
                                    log.info("Created mkdirp " + path + "success ");
                                    listChildren(path, cb);
                                }
                            });
                            return;
                        }
                        cb && cb(error, null);
                    } else {
                        cb && cb(null, children);
                        log.info("zk get path " + path + " children SUCCESS , children is ", children);
                    }
                }
            );
        };
        listChildren(path, cb);
    },
    mkdirp: function (path, cb) {
        client.zk.mkdirp(path, cb);
    },
    remove: function (path, cb) {
        client.zk.a_delete_(path, 0, function (rc, error, stat) {
            if (rc != 0) {
                log.info("delete path " + path, error, stat)
                cb && cb(null, 0);
                return;
            }
            cb && cb(null, 1);
        });
    },
    exists: function (path, cb) {
        client.zk.a_exists(path, null, function (rc, error, stat) {
            if (rc != 0) {
                cb && cb(null, 0);
                return;
            }
            cb && cb(null, 1);
        });
    }
};
exports.fn = function () {
    var zk = new ZookeeperUtils();
    return zk;
};
process.on('SIGINT', function () {
    client.zk.close();
    log.info('SIGINT!!');
});
process.on('SIGTERM', function () {
    client.zk.close();
    log.info('SIGTERM!!');
    process.exit(0);
});
process.on('exit', function (code) {
    client.zk.close();
    log.info('About to exit with code: ' + code);
});
/*
 process.on('uncaughtException', function (err) {
 client.close();
 log.info('Caught exception!!' + err);
 });
 */
