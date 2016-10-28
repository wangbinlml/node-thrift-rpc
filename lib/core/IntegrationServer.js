/**
 * 接入层，所有业务的消息人口
 */

var log=require('../../../util/logger.js').getLogger("system");

var beanFactory = require("../../../core/ioc/impl/BeanFactoryImpl")();
var util = require('../../../util/commonUtil');
var constant = require('../../../util/Constants').Constants;
var commonUtil = require('../../../util/commonUtil');

/**
 * 说明： 构造函数
 */
function IntegrationServer(servType){
    //注入消息分发器
    this.bizDispatcher = null;

    // 存放各种protocol Manager，key是protocol
    var acceptorMap = {};
    // service类型，标识对外的access，或者对内的RPC server
    var serviceType = servType;

    //message processor
    var msgProcessor = beanFactory.getBean('MessageProcessor');

    //本地缓存
    var lCacheFactory = beanFactory.getBean('LocalCache');

    //消息缓存
    var msgCache = lCacheFactory.apply({name:servType+'msg',type:'memory',max:100000,ttl:90});
    //本地cb函数缓存
    var msg2CbMap = lCacheFactory.apply({name:servType+'msg2cb',type:'memory',max:100000,ttl:90});

    this.getAcceptorMap = function(){
        return acceptorMap;
    };
    this.getServType = function(){
        return serviceType;
    };

    this.getMsgProcessor = function(){
        return msgProcessor;
    };

    this.getMsgCache = function(){
        return msgCache;
    };

    this.getMsg2CbMap = function(){
        return msg2CbMap;
    };

}


module.exports  = IntegrationServer;


IntegrationServer.prototype = {

    /**
     * 说明： 初始化Access服务入口
    */
    init: function(){

        var _self = this;

        var serviceType = _self.getServType();
        this.getMsgProcessor().init(serviceType);

        var acceptorInfoMap = getApp().get(serviceType)['acceptorConfig'];
        for(var protocol in acceptorInfoMap){
            var protocolAcceptorInfoList = acceptorInfoMap[protocol];
            protocolAcceptorInfoList.forEach(function(acceptorInfo){
                //获取Acceptor实例
                var acceptorImplClass = acceptorInfo.impl === undefined ? ucFirst(protocol) + 'Acceptor':acceptorInfo.impl;

                var acceptor = beanFactory.getBean(acceptorImplClass);
                //初始化Acceptor
                acceptor.init(acceptorInfo,{serviceType:serviceType});
                //将Acceptor存入Map
                var acceptorId = acceptorInfo['port']+':'+protocol;
                _self.getAcceptorMap()[acceptorId]= acceptor;
            })
        }
    },

    /**
     * 说明： 启动服务
     */
    start: function(){
        var acceptorMap = this.getAcceptorMap();
        for(var acceptorId in acceptorMap){
            acceptorMap[acceptorId].start();
        }
    },

    /**
     * 说明： 接收消息
     */
    receive:function(msg){

        var _self = this;
        //保存一些原始值
        var originalRpcId = msg.header.rpcId||'';
        //处理消息
        msg.header.resultcode = 0;
        //调用msgProcessor处理消息
        msg = _self.getMsgProcessor().msgReceive(msg,{type:_self.getServType()});
        log.debug("Receive filter链处理后的消息Header为：" + JSON.stringify(msg.header));

        if(msg.header.msgType == constant.message_type_req){
            //处理请求消息

            //缓存消息header
            //下面设的默认值有待商榷，因为会带来内存泄漏的风险，如果local cache使用memcached，设置了过期时间就没问题
            msg.header.invokeMode === undefined && (msg.header.invokeMode = constant.invoke_mode_reqResp_stateless);
            if(msg.header.invokeMode == constant.invoke_mode_reqResp_stateful
                || msg.header.invokeMode == constant.invoke_mode_reqResp_stateless){

                //拼装relayState,设置特殊字段
                var invokeId;
                if(_self.getServType() === 'accessService'){
                    invokeId = msg.header.tid;
                    //在header中添加apId
                    msg.header.apId = msg.header.from;
                }else if(_self.getServType() === 'rpcService'){
                    invokeId = msg.header.tid + originalRpcId;
                }

                if(msg.header.apId) {
                    invokeId = msg.header.apId + invokeId;
                }
                var sid = getApp().get('argv')['sid'];
                msg.header.relayState === undefined && (msg.header.relayState = {});
                msg.header.relayState[sid] = invokeId;

                //在invokeMode === reqResp***的情况下，需要缓存消息
                //clone header
                var header = util.clone(msg.header);
                //在filter中，rpcId可能被修改
                header.rpcId = originalRpcId;
                if('socket' === msg.header.protocol){
                    //socket协议只缓存消息header
                    _self.getMsgCache().set(invokeId, header);
                }else if('http' === msg.header.protocol){
                    //http协议缓存完整的消息
                    //在express下的req和res都不能被clone，因为有循环引用，这里的风险就是如果body被修改，缓存也同时被修改
                    var cacheMsg = {};
                    cacheMsg.header = header;
                    cacheMsg.body = msg.body;
                    _self.getMsgCache().set(invokeId, cacheMsg);
                }

            }

            //分发请求消息到业务类
            if(msg.header.resultcode === 0){
                delete msg.header.resultcode;
                //正常逻辑
                if(msg.header.msgname.indexOf('ConnectAuthenticate') < 0){
                    //业务请求，不是连接验证请求

                    //回复响应
                    //this.send(msg);
                    //调用dispatch方法
                    this.bizDispatcher.dispatch(msg);
                }else{
                    //验证连接请求
                    //针对socket，验证逻辑待补充
                    //如果验证通过，则做如下操作
                    //msg.header.resultcode = 0;
                    //msg.header.resultdesc = '';
                    //如果验证不通过，则做如下操作
                    //msg.header.resultcode = -1;
                    //msg.header.resultdesc = '错误原因';

                    //回复连接建立响应
                    //_self.send(msg);
                }
            }else{
                //异常逻辑，返回错误响应
                delete msg.header.resultcode;
            }

        }else if(msg.header.msgType === constant.message_type_resp){
            if(msg.header.invokeMode === constant.invoke_mode_reqResp_stateful){
                //处理返回的响应消息
                //判断该消息是否由本进程处理，如果不是则路由至相关进程
                var pid = msg.header.to.split(':')[2];
                if(Number(process.pid) === Number(pid)){
                    var key = msg.header.tid + msg.header.rpcId;
                    if(msg.header.apId) {
                        key = msg.header.apId + key;
                    }
                    _self.getMsg2CbMap().get(key, function(err,cb){
                        if(typeof cb === 'function'){
                            cb(msg);
                        } else {
                            log.error("Don\'t Find Callback Function");
                        }
                    });
                } else {
                    log.debug('cluster inner msg route from ' + process.pid + ' to '+ pid);
                    getApp().getService('cluster-worker').sendMsg(pid, msg);
                }
            }else if(msg.header.invokeMode === constant.invoke_mode_reqResp_stateless){
                //分发响应消息到业务类
                if(msg.header.resultcode === 0){
                    delete msg.header.resultcode;
                    //调用dispatch方法
                    this.bizDispatcher.dispatch(msg);
                }else{
                    //异常逻辑，返回错误响应
                    delete msg.header.resultcode;
                }
            }
        }
    },

    /**
     * 说明： 发送消息
     * 特殊:目前通过IntegrationServer的send方法发送请求消息时，invokeMode仅支持invoke_mode_reqResp_stateless和invoke_mode_req
     * 如果需要类似于IntegrationClient的invoke方法的实现，可后续进行补充
     */
    send:function(msg,method,options){
        var _self = this;
        var msgType = options['msgType'];

        if(this.getServType() === 'accessService' ){
            if(msgType === constant.message_type_resp){
                msg.header.msgType = constant.message_type_resp;

                //返回Filter链处理后的消息
                msg = _self.getMsgProcessor().msgSend(msg,options);

                log.debug("Send filter链处理后的消息为：" + JSON.stringify(msg));

                //从cache获取缓存消息
                var sid = getApp().get('argv')['sid'];
                var relayState = msg.header.relayState[sid];
                _self.getMsgCache().get(relayState,function(err,cacheMsg){
                    var header;
                    if(cacheMsg.header !== undefined && cacheMsg.header.protocol === 'http'){
                        header = cacheMsg.header;
                        msg.body = _extend(msg.body,cacheMsg.body);
                    }else{
                        header = cacheMsg;

                    }
                    var invoker = header.from;
                    header.from = header.to;
                    header.to = invoker;
                    msg.header = header;
                    msg.header.msgType = constant.message_type_resp;
                    method !== undefined && (msg.header.msgname = method);


                    //获取Acceptor
                    var protocolAcceptor;
                    var acceptorId = msg.header.connectionId.local+':'+ msg.header.protocol;
                    protocolAcceptor = _self.getAcceptorMap()[acceptorId];

                    protocolAcceptor.send(msg);

                    //清除本地缓存条目（如果考虑失败重传，需要保留一段时间，再手动清除，或者自动清除）
                    //接入外部系统需要保存一段时间*******
                    _self.getMsgCache().remove(relayState);
                });
            }else{
                msg.header.msgType = constant.message_type_req;

                var apId = msg.header.to;
                var protocol =  getApp().get('accessService')['apInfo'][apId]['protocol'];
                msg.header.protocol = protocol;
                //查找某个AP连接到平台时的接口
                var localPort = getApp().get('accessService')['apInfo'][apId]['acsPort'];

                //返回Filter链处理后的消息
                msg = _self.getMsgProcessor().msgSend(msg,options);

                log.debug("Send filter链处理后的消息为：" + JSON.stringify(msg));

                //获取Acceptor
                var protocolAcceptor;
                var acceptorId = localPort +':'+ protocol;
                protocolAcceptor = _self.getAcceptorMap()[acceptorId];

                protocolAcceptor.send(msg);
            }
        }else{
            //在不是accessService的情况下，如rpc情况下的逻辑，暂时不补充
        }
    },

    /**
     * 说明： 根据通信协议获取protocol acceptor
     */
    getAcceptor:function(acceptorId){
        return this.getAcceptorMap()[acceptorId];
    }

};

/**
 *获取上下文变量 Application
 */
function getApp(){
    return beanFactory.getBean("ApplicationImpl");
}

/**
 *首字母变换为大写
 */
function ucFirst(str){
    var result = str.toLowerCase();
    result = result.replace(/\b\w+\b/g, function(word){
        return word.substring(0,1).toUpperCase()+word.substring(1);
    });

    return result;
}

function _extend(a, b) {
    a = a || {};
    for (var i in b) {
        a[i] = b[i];
    }
    return a;
}





