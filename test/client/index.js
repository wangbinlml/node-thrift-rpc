var http = require('http');
var Rpc = require('../../index');
var logger = require('../../lib/util/Logger').getLogger("system");
Rpc.createApp();
Rpc.start();
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
            body: {}
        };
        client.send("biz_service", "doBusiness", msg, function (err, data) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            logger.info(data.header.tid  + '-'+ data.header.invokeMode)
            res.end(JSON.stringify(data));
        });
    } catch (err) {
        console.log(err);
    }
});
server.listen(3000);