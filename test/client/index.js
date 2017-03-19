var http = require('http');
var Rpc = require('../../index');
var client = Rpc.Client();
Rpc.start(client);


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
                tid: "12145455",
                msgType: "1"
            },
            body: {}
        };
        client.send("common_service", "doBusiness", msg, function (err, data) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(JSON.stringify(data));
        });
    } catch (err) {
        console.log(err);
    }
});
server.listen(3000);
