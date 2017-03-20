/**
 * Created by root on 3/17/17.
 */
var log = require('./Logger').getLogger("system");
var config = require(process.cwd() + "/config/config");
var zookeeper = require('node-zookeeper-client');
var client;
function ZKUtils() {

}

ZKUtils.prototype = {
    init: function () {
        if (client == undefined) {
            client = zookeeper.createClient(config.zk_path, config.zk_option || {});
            client.on('connected', function () {
                log.info('Client connected.');
            });
            client.on('state', function (state) {
                if (state === zookeeper.State.SYNC_CONNECTED) {
                    log.info('Client state is changed to connected.');
                }
            });
        }
    },
    getChildren: function (path, cb) {
        var listChildren = function (path, cb) {
            client.getChildren(
                path,
                function (event) {
                    log.info('getChildren Got watcher event: %s', event);
                    listChildren(path, cb);
                },
                function (error, children, stat) {
                    if (error) {
                        log.info(
                            'Failed to list children of node: %s due to: %s.',
                            path,
                            error
                        );
                        return;
                    }

                    log.info('Children of node: %s are: %j.', path, children,
                        stat.version);
                    cb && cb(error, children, stat);
                }
            );
        };

        client.once('connected', function () {
            log.info('Connected to ZooKeeper.');
            listChildren(path, cb);
        });

        client.connect();
    },
    create: function (path) {
        client.once('connected', function () {
            log.info('Connected to the server.');
            client.create(path, zookeeper.CreateMode.EPHEMERAL, function (error) {
                if (error) {
                    log.info('Failed to create node: %s due to: %s.', path, JSON.stringify(error));
                } else {
                    log.info('Node: %s is successfully created.', path);
                }
                //client.close();
            });
        });
        client.connect();
    },
    mkdirp: function (path, cb) {
        client.mkdirp(path, function (error, path) {
            if (error) {
                console.log(error.stack);
                cb && cb(error);
                return;
            }
            console.log('Node: %s is created.', path);
            cb && cb();
        });
    },
    close: function () {
        client.close();
    },
    exists: function (path, cb) {
        var exists = function (path, cb) {
            client.exists(
                path,
                function (event) {
                    log.info('Got event: %s.', event);
                    //exists(path, cb);
                },
                function (error, stat) {
                    if (error) {
                        log.info(
                            'Failed to check existence of node: %s due to: %s.',
                            path,
                            error
                        );
                        return;
                    }

                    if (stat) {
                        log.info(
                            'Node: %s exists and its version is: %j',
                            path,
                            stat.version
                        );
                        cb && cb(stat.version)
                    } else {
                        log.info('Node %s does not exist.', path);
                        cb && cb()
                    }
                }
            );
        };

        client.once('connected', function () {
            log.info('Connected to ZooKeeper.');
            exists(path, cb);
        });
        client.connect();
    },
    getData: function (path, cb) {
        var getData = function (path, cb) {
            client.getData(
                path,
                function (event) {
                    log.info('getData Got event: %s', event);
                    getData(path, cb);
                },
                function (error, data, stat) {
                    if (error) {
                        log.info('Error occurred when getting data: %s.', JSON.stringify(error));
                        cb(error, data, stat);
                        return;
                    }

                    log.info(
                        'Node: %s has data: %s, version: %d',
                        path,
                        data ? data.toString() : undefined,
                        stat.version
                    );
                    cb(error, data, stat);
                }
            );
        };
        client.once('connected', function () {
            log.info('Connected to ZooKeeper.');
            getData(path, cb);
        });

        client.connect();

    },
    setData: function (path, value) {
        var data = new Buffer(value);
        client.once('connected', function () {
            log.info('Connected to the server.');
            client.setData(path, data, function (error, stat) {
                if (error) {
                    log.info('Got error when setting data: ' + JSON.stringify(error));
                    log.info('path: ' + path + "; value: " + value);
                    return;
                }

                client.close();
            });
        });

        client.connect();
    },
    delete: function (path, cb) {
        client.on('connected', function (state) {
            log.info('Connected to the server.');
            client.remove(path, function (error) {
                if (error) {
                    log.info(
                        'Failed to delete node: %s due to: %s.',
                        path,
                        JSON.stringify(error)
                    );
                    return;
                }
                log.info('Node: %s is deleted.', path);
                client.close();
                cb && cb();
            });
        });
        client.connect();
    }
};
exports.create = function () {
    var zkUtils = new ZKUtils();
    zkUtils.init();
    return zkUtils;
};