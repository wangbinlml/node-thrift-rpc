var utils = require('../../lib/util/zookeeperSyncUtils.js');
var utils2 = require('../../lib/util/ZookeeperUtils').fn();
var Fiber = require('fibers');
//utils.create("/platform/service_sms");
//utils.create("/platform/service_broker/SB");
//utils.mkdirp("/platform/sms_platform/common_service");


//utils.delete("/platform/sms_platform/common_service/127.0.0.1:9090");
//utils.setData("/platform/service_broker/CS_SMS", JSON.stringify(service));
//utils2.mkdirp("/platform/biz_platform/biz_service");
Fiber(function () {
    try {
        var exists = utils.existsSync("/platform/biz_platform/biz_service").wait();
        console.log("exists: ", exists);
        var del = utils.deleteSync("/platform/biz_platform/biz_service").wait();
        console.log("delete: ", del);
        var mkdirp = utils.mkdirpSync("/platform/biz_platform/biz_service").wait();
        console.log("mkdir: ", mkdirp)
        var create = utils.createSync("/platform/biz_platform/biz_service/127.0.0.1:9080", null, 1).wait();
        console.log("create: ", create)
        utils2.getChildren("/platform/biz_platform/biz_service", function (error, children) {
            console.log("------------------", children)
        });
    }catch (e){
        console.log(e)
    }
}).run();
//utils.create("/platform/biz_platform/biz_service/127.0.0.1:9090",null,1);