var commonUtil = require('./CommonUtil');
var log4js = require('log4js');
var path = require('path');
//for run out of webstorm ./config/log4js.json ./src/config/log4js.json
//for run in webstorm ./src/common/config/log4js.json

log4js.configure(commonUtil.getConfigPath() + '/log4js.json', {
    reloadSecs: 300
});

exports.getLogger = function (category) {
    return log4js.getLogger(category);
};
