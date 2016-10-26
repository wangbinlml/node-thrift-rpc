var thrift = require('thrift');

var RPCInvokeService = require('../../../gen-nodejs/RPCInvokeService'),
    ttypes = require('../../../gen-nodejs/rpc_types');


/**
 * 说明： 构造函数
 */
function ThriftAcceptor() {

}
module.exports = ThriftAcceptor;


ThriftAcceptor.prototype = {
    init: function (config, opt) {

    },
    start: function () {
        try {
            var server = thrift.createServer(RPCInvokeService, {
                invoke: function (service, method, msg, cb) {
                    cb(null, JSON.stringify(msg));
                }
            }, {});

            server.listen(9090);
        }catch(e){
            console.error(e);
        }
    }
};