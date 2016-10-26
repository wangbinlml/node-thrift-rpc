var http = require('http');
var ThriftConnector = require('../../lib/core/thrift/ThriftConnector');

var tc = new ThriftConnector();
tc.start();
var msg = {
    header:{

    }
};
tc.send("common_service","doBusiness",msg,function(){

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
