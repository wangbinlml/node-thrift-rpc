var http = require('http');
var Rpc = require('../../index');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
if (cluster.isMaster) {
    console.log('Master '+process.pid+' is running');
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker '+worker.process.pid+' died');
    });
} else {
    var server = Rpc.Server({});
    Rpc.start(server);
}
