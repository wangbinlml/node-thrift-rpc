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
    var app = Rpc.createApp();
    app.start();
    var client = Rpc.getRpcService();

    var num = 0;
    var server = http.createServer();
    server.on('connection', function (socket) {
        //logger.info("connection");
    });
    server.on('close', function () {
        logger.info("http server close");
    });
    server.on('clientError', function (exception, socket) {
        logger.info("clientError");
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
                body: {}
            };
            var start = new Date().getTime();
            client.send("biz_service", "doBusiness", msg, function (err, data) {
                var end = new Date().getTime();
                res.writeHead(200, {'Content-Type': 'text/plain'});
                logger.info(data.header.tid  + '-'+ data.header.invokeMode+'-'+(end-start))
                res.end(JSON.stringify(data));
            });
        } catch (err) {
            logger.info(err);
        }
    });
    server.listen(3000);
}