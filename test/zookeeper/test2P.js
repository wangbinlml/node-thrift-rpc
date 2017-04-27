/**
 * Created by root on 3/28/17.
 */
var utils = require('../../lib/util/zkUtils').fn();
utils.create("/platform/biz_platform/biz_service/127.0.0.1:9090",null,1, function (error, data) {
    console.log(error)
    console.log(data)
});