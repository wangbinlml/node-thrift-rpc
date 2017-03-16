/**
 * 统一认证业务类
 * 实现接口：IWebLoginBusiness
 */



/**
 * 说明： 构造函数，
 */

var app;

var constant = {
    'isResponse':1
};

var totaoReq = 0;

function SMSBusiness(){
}

module.exports = SMSBusiness;

SMSBusiness.prototype = {

    init:function(){
        console.log("SMSBusiness init finished");
    },

    //业务处理入口
    doBusiness:function(service, method, msg, cb){
        var body = JSON.parse(msg.body);
        body.res = 123;
        msg.body = JSON.stringify(body);
        cb(null, msg);
    }
};