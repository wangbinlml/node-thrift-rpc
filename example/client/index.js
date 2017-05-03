var http = require('http');
var Rpc = require('../../index');
var logger = require('../../lib/util/Logger').getLogger("system");
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
            body: "hello"
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