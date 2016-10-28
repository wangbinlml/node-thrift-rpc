var commonUtil = require('./CommonUtil');
var rpcConfig = require(commonUtil.getConfigPath() + '/rpcServiceConfig');
var accessConfig = require(commonUtil.getConfigPath() + '/accessServiceConfig');
var rpcService;
var accessService;
function ConfigUtils() {

}
module.exports = ConfigUtils;
ConfigUtils.prototype = {
    init: function () {
        rpcService = rpcConfig;
        accessService = accessConfig;
    }
};

