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
        console.log('worker ' + worker.process.pid + ' died');
    });

    cluster.on('listening', function (worker, address) {
        console.log('listening: worker ' + worker.process.pid + ', Address: ' + address.address + ":" + address.port);
    });

    cluster.on('exit', function (worker, code, signal) {
        console.log('worker %d died (%s). restarting...',
            worker.process.pid, signal || code);
        cluster.fork();
    });

} else {
    console.log('work %s', process.pid + ' connected !');
    var app = Rpc.createApp();
    app.start();
    var client = Rpc.getRpcService();

    var num = 0;
    var server = http.createServer();
    server.on('connection', function (socket) {
        //console.log("connection");
    });
    server.on('close', function () {
        console.log("http server close");
    });
    server.on('clientError', function (exception, socket) {
        console.log("clientError");
    });
    server.on('request', function (req, res) {
        try {
            num++;
            var msg = {
                header: {
                    protocol: "thrift",
                    msgType: "1",
                    invokeMode: num
                },
                body: "{}"
            };
            var start = new Date().getTime();
            client.send("biz_service", "doBusiness", msg, function (err, data) {
                var end = new Date().getTime();
                res.writeHead(200, {'Content-Type': 'text/plain'});
                logger.info(data.header.tid  + '-'+ data.header.invokeMode+'-'+(end-start))
                res.end(JSON.stringify(data));
            });
        } catch (err) {
            console.log(err);
        }
    });
    server.listen(3000);
}