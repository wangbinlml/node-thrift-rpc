/**
 * 业务--access 端 dispatcher类实现
 * 实现接口：IBizDispatcher
 */
//var log = require('../../../../util/logger.js').getLogger("system");

//签名业务
var bizMap;

/**
 * 说明： 构造函数，
 */
function BizDispatcher(){
}

module.exports = BizDispatcher;

BizDispatcher.prototype = {

    /**
     *
     * @param businessMap
     */
    init:function(businessMap){
        bizMap = businessMap;
    },

    /**
     * 说明： 业务分类处理
     */
    dispatch:function(service, method, msg, cb){
        bizMap['SMSBusiness'].doBusiness(service, method, msg, cb);
    }
};