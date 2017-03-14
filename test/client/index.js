var http = require('http');
var ThriftConnector = require('../../lib/core/thrift/ThriftConnector');
var connectorConfig= {
    "retryTime": "30",
        "retryInterval": "5000",
        "maxPoolSize": 5,
        "minPoolSize": 2,
        "idleTimeout": 30000000
};
var config = {
    "ip": "127.0.0.1",
    "port": "9090",
    "sid": "run-osc"
}
var tc = new ThriftConnector();
tc.init(config,connectorConfig);
tc.start();
var msg = {
    header: {
        protocol:"thrift",
        tid:"12145455",
        msgType:"1"
    },
    body: {

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
