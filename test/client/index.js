var http = require('http');
var Rpc = require('../../index');
var client = Rpc.Client();
client.start();
var msg = {
    header: {
        protocol:"thrift",
        tid:"12145455",
        msgType:"1"
    },
    body: {

    }
};
client.send("common_service","doBusiness",msg,function(){

});
/*

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
    try{
        pool.acquire(function (err, connection) {
            getClient(connection).get(msg, function (err, response) {
                releasePool(connection);
                if (err) {
                    console.error(err);
                } else {
                    console.log("client res:", response);
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    var data = response + '\n';
                    res.end(data);
                }
            });
        });
    }catch(err){
        console.log(err);
    }
});
server.listen(3000);*/
