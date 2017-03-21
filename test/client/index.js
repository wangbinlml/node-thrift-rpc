var http = require('http');
var Rpc = require('../../index');
Rpc.createApp();
Rpc.start();


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
        var msg = {
            header: {
                protocol: "thrift",
                msgType: "1"
            },
            body: {}
        };
        client.send("biz_service", "doBusiness", msg, function (err, data) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(data));
        });
    } catch (err) {
        console.log(err);
    }
});
server.listen(3000);