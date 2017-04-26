var http = require('http');
var Rpc = require('../../index');
var logger = require('../../lib/util/Logger').getLogger("system");

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        logger.info('worker ' + worker.process.pid + ' died');
    });

    cluster.on('listening', function (worker, address) {
        logger.info('listening: worker ' + worker.process.pid + ', Address: ' + address.address + ":" + address.port);
    });

    cluster.on('exit', function (worker, code, signal) {
        logger.info('worker %d died (%s). restarting...',
            worker.process.pid, signal || code);
        cluster.fork();
    });

} else {
    logger.info('work %s', process.pid + ' connected !');
    var app = Rpc.createApp({});
    app.start();
}