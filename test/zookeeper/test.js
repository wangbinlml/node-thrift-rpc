/**
 * Created by root on 3/17/17.
 */
/**
 * Created by root on 9/16/16.
 */
var Fiber = require('fibers');
var utils = require('../../lib/util/zkSyncUtils.js');
var utils2 = require('../../lib/util/ZKUtils').fn();

var service = {
    "SB":{"args":{"sid": "run-cs","serviceId":"CS_SMS"},"codec":"protobuf", "protocol":"socket","impl":"SocketConnector",
        "routePolicy":"round-robin",
        "instance":[{"ip":"127.0.0.1","port":"9050","sid":"run-sb"}]}
};

//utils.create("/platform/service_sms");
//utils.create("/platform/service_broker/SB");
//utils.mkdirp("/platform/sms_platform/common_service");

//utils.delete("/platform/sms_platform/common_service/127.0.0.1:9090");
//utils.setData("/platform/service_broker/CS_SMS", JSON.stringify(service));
utils2.mkdirp("/platform/biz_platform/biz_service");
//utils.create("/platform/biz_platform/biz_service/127.0.0.1:9080",null,1);
//utils.getChildren("/platform/biz_platform/biz_service");
//utils.create("/platform/biz_platform/biz_service/127.0.0.1:9090",null,1);
/*
Fiber(function () {
    try {
        var res = utils.createSync("/platform/biz_platform/biz_service/127.0.0.1:9080", null, 1).wait();
        utils2.getChildren("/platform/biz_platform/biz_service",function (error, data) {
            console.log(data);
        });
    }catch (e) {
        console.log(e)
    }
}).run();*/
