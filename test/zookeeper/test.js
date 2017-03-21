/**
 * Created by root on 3/17/17.
 */
/**
 * Created by root on 9/16/16.
 */
var utils = require('../../lib/util/ZKUtils').create();

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
//utils.mkdirp("/platform/biz_platform/biz_service");
utils.create("/platform/biz_platform/biz_service/127.0.0.1:9080");
utils.getChildren("/platform/biz_platform/biz_service");