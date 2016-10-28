/**
 * 移动签名业务--RPC客户端类
 * 实现接口：IRPCClient
 */

var beanFactory = require("./BeanFactory")();
var log = require('../util/Logger').getLogger("system");
var msgRouterClass = require('../router/impl/MessageRouterImpl');
var constant = require('../util/Constants').Constants;
var Hashmap = require('../../../util/hashmap');
/**
 * 说明： 构造函数，
 */
function IntegrationClient(servType) {
    this.servType = servType;
    //map
    var connectorMap = {};
    var connectorReplyMap = {};
    // service类型，标识对外的Access，或者对内的RPC/Data service
    var serviceType = this.servType;
    //消息路由
    var msgRouter = msgRouterClass.create();

    //消息处理
    var msgProcessor = beanFactory.getBean('MessageProcessor');
    //本地缓存
    var lCacheFactory = beanFactory.getBean('LocalCache');


    //本地cb函数缓存
    var msg2CbMap = lCacheFactory.apply({name: servType + 'msg2cb', type: 'memory', max: 100000, ttl: 90});
    //消息缓存
    var msgCache = lCacheFactory.apply({name: servType + 'msg', type: 'memory', max: 100000, ttl: 90});

    this.getConnectorMap = function () {
        return connectorMap;
    };

    this.getConnectorReplyMap = function () {
        return connectorReplyMap;
    };

    this.getServType = function () {
        return serviceType;
    };

    this.getMsgRouter = function () {
        return msgRouter;
    };

    this.getMsgProcessor = function () {
        return msgProcessor;
    };

    this.getMsg2CbMap = function () {
        return msg2CbMap;
    };

    this.getMsgCache = function () {
        return msgCache;
    };
}

module.exports = IntegrationClient;

IntegrationClient.prototype = {

    /**
     * 说明： 初始化RPC服务
     */
    init: function () {

        //初始化 message processor
        var serviceType = this.getServType();
        this.getMsgProcessor().init(serviceType);

        //initialize connector map
        var serviceInfoMap;
        if (this.getServType() === 'rpcService') {
            serviceInfoMap = getApp().get(this.getServType())['service'];
        } else {
            serviceInfoMap = getApp().get(this.getServType())['apInfo'];
        }


        for (var serviceId in serviceInfoMap) {
            var connectorInfo = serviceInfoMap[serviceId];
            //获取connector实例,当一个service有多个instance的时候，将初始化一个ConnectorList
            var connectorList = [];
            var connectorReplyList = new Hashmap();
            var protocol = connectorInfo.protocol;
            var serviceInstanceInfoList = connectorInfo.instance;
            var args = connectorInfo.args;
            for (var i in serviceInstanceInfoList) {
                var connectorIP = serviceInstanceInfoList[i].ip;
                var connectorPort = serviceInstanceInfoList[i].port;
                var sid = serviceInstanceInfoList[i].sid;
                var protocolConnector = beanFactory.getBean(connectorInfo.impl);

                //初始化Connector
                if (protocol === "mq") {
                    var exChangeName = serviceInstanceInfoList[i].exChangeName;
                    var routingKey = serviceInstanceInfoList[i].routingKey;
                    var msgType = serviceInstanceInfoList[i].msgType;
                    protocolConnector.init(connectorIP, connectorPort, exChangeName, routingKey, msgType);
                } else if (protocol === "socket") {
                    protocolConnector.init(connectorIP, connectorPort, sid, args);
                } else if (protocol === "http") {
                    protocolConnector.init(serviceInstanceInfoList[i]);
                }
                connectorList.push(protocolConnector);
                connectorReplyList.set(sid,protocolConnector);
            }
            //将connector存入Map
            this.getConnectorMap()[serviceId] = connectorList;
            this.getConnectorReplyMap()[serviceId] = connectorReplyList;
        }

        //initialize router
        this.getMsgRouter().init(serviceInfoMap);
    },

    /**
     * 说明： 启动RPC服务
     */
    start: function () {
        var connectorMap = this.getConnectorMap();
        for (var serviceId in connectorMap) {
            var connectorList = connectorMap[serviceId];
            connectorList.forEach(function (connector) {
                connector.start();
            })
        }
    },

    /**
     * 说明： 调用RPC服务
     */
    invoke: function (serviceId, method, msg, options, cb, aspectFunc) {

        msg.header.msgname = method;
        msg.header.from = getApp().get('argv')['serviceId'] + ':' + getApp().get('argv')['sid'];
        msg.header.to = serviceId;
        msg.header.msgType = msg.header.msgType !== undefined ? msg.header.msgType : constant.message_type_req;

        //判断参数个数，如果cb不为空，则invoke mode===reqResp_stateful
        var invokeMode = options.invokeMode;
        var cbFunc;
        if (invokeMode === undefined) {
            if (arguments.length > 3) {
                if (typeof arguments[3] === 'function') {
                    invokeMode = constant.invoke_mode_reqResp_stateful;
                    cbFunc = arguments[3];
                } else {
                    if (arguments.length === 5) {
                        invokeMode = constant.invoke_mode_reqResp_stateful;
                        cbFunc = arguments[4];
                    } else {
                        invokeMode = constant.invoke_mode_req;
                    }
                }
            } else {
                invokeMode = constant.invoke_mode_req;
            }
        }

        msg.header.invokeMode = invokeMode;

        msg.header.resultcode = 0;

        //返回Filter链处理后的消息
        msg = this.getMsgProcessor().msgSend(msg, options);

        log.debug("Send Filter链处理后的消息为：" + JSON.stringify(msg));

        //对外服务判断是同步还是异步
        var type = this.getAppServiceType(serviceId, this.getServType());

        if (msg.header.resultcode === 0) {
            //filter chain处理正常
            delete msg.header.resultcode;
            //如果invoke mode===reqResp，则需要缓存callback函数和tid+rpcId的对应关系
            if (invokeMode == constant.invoke_mode_reqResp_stateful) {
                var invokeId = msg.header.tid + msg.header.rpcId;
                if (msg.header.apId) {
                    invokeId = msg.header.apId + invokeId;
                }
                this.getMsg2CbMap().set(invokeId, cbFunc);
                //为了将响应路由至正确的进程，添加下面的参数
                msg.header.from = msg.header.from + ':' + process.pid;

                //如果是作为客户端需要保存header
                if (type == constant.acs_type_sync) {
                    if ('socket' === msg.header.protocol) {
                        invokeId = msg.header.tid;
                        if (msg.header.apId) {
                            invokeId = msg.header.apId + invokeId;
                        }
                        //socket协议只缓存消息header
                        this.getMsgCache().set(invokeId, msg.header);
                    } else if ('http' === msg.header.protocol) {
                        invokeId = msg.header.tid;
                        if (msg.header.apId) {
                            invokeId = msg.header.apId + invokeId;
                        }
                        //socket协议只缓存消息header
                        this.getMsgCache().set(invokeId, msg);
                    }
                }
            }

            msg.header.protocol = ('http' === msg.header.protocol && type === constant.acs_type_sync) ? msg.header.protocol : this.getProtocolByService(serviceId, this.getServType());
            //获取连接
            var protocolConnector = this.getMsgRouter().route(serviceId, this.getConnectorMap()[serviceId]);
            /*var sid = getApp().get('rpcService')['serverInfo']['sid'];
             if(msg.header.from !== sid.concat(process.pid.toString()) &&
             msg.header.relayState !== undefined ){
             protocolConnector= routeBySid(msg.header.relayState,this.getConnectorMap()[serviceId]);
             }else{
             protocolConnector= this.getMsgRouter().route(serviceId,this.getConnectorMap()[serviceId]);
             }*/
            protocolConnector.send(msg);

        } else {
            //异常处理逻辑
            delete msg.header.resultcode;
        }
        /**
         * 说明：调用aop需要将该方法结果以回调函数的方式传入after
         * 第一个参数素error,第二个参数
         */
        aspectFunc && aspectFunc(null, msg);
    },

    /**
     * 说明： 回复RPC服务调用响应
     */
    reply: function (msg, method, options) {

        var _self = this;

        msg.header.msgType = constant.message_type_resp;

        //返回Filter链处理后的消息
        msg = this.getMsgProcessor().msgSend(msg, options);

        log.debug("Send filter链处理后的消息为：" + JSON.stringify(msg));

        //从cache获取消息header
        var sid = getApp().get('argv')['sid'];
        var relayState = msg.header.relayState[sid];

        _self.getMsgCache().get(relayState, function (err, header) {
            var invoker = header.from;
            header.from = header.to;
            header.to = invoker;
            msg.header = header;
            msg.header.msgType = constant.message_type_resp;
            method !== undefined && (msg.header.msgname = method);

            //获取连接
            var protocolConnector;
            var serviceId;
            var toSid;
            if (_self.getServType() === 'rpcService') {
                serviceId = msg.header.to.split(':')[0];
                toSid = msg.header.to.split(':')[1];
            } else {
                serviceId = msg.header.to;
            }
            if (msg.header.invokeMode == constant.invoke_mode_reqResp_stateful) {
                protocolConnector = _self.getMsgRouter().routeBySid(toSid, _self.getConnectorReplyMap()[serviceId]);
            } else if (msg.header.invokeMode == constant.invoke_mode_reqResp_stateless
                || options.invokeMode !== constant.invoke_mode_reqResp_stateful) {
                protocolConnector = _self.getMsgRouter().route(serviceId, _self.getConnectorMap()[serviceId]);
            }

            protocolConnector.send(msg);

            //清除本地缓存条目（如果考虑失败重传，需要保留一段时间，再手动清除，或者自动清除）
            _self.getMsgCache().remove(relayState);
        });

    },

    /**
     * 说明： 接收响应
     */
    receive: function (msg) {
        var _self = this;
        log.debug("Filter链处理后的消息为：" + JSON.stringify(msg));
        if (msg.header.msgType == constant.message_type_req) {
            msg.header.apId = msg.header.from;
            var rpcService = getApp().getService('rpcService');
            rpcService.receive(msg);
        } else {
            var pid = msg.header.from.split(':')[2];
            if (Number(process.pid) === Number(pid)) {
                var key = msg.header.tid + msg.header.rpcId;
                if (msg.header.apId) {
                    key = msg.header.apId + key;
                }

                _self.getMsg2CbMap().get(key, function (err, cb) {
                    if (typeof cb === 'function') {
                        cb(msg);
                    } else {
                        log.error("Don\'t Find Callback Function");
                    }
                });
            } else {
                log.debug('cluster inner msg route from ' + process.pid + ' to ' + pid);
                getApp().getService('cluster-worker').sendMsg(pid, msg);
            }
        }
        //验证响应消息状态
        //如果状态正确，即msg.header.resultcode = 0，做如下操作
        //暂时没有操作

        //如果状态异常，即msg.header.resultcode = -1，做如下操作
        //暂时没有操作，未来可以添加异常处理逻辑

    },

    /**
     *获取上下文变量 Application
     */
    getProtocolByService: function (serviceId, serverType) {
        if (this.getServType() === 'rpcService') {
            return getApp().get(serverType)['service'][serviceId]['protocol'];
        } else {
            return getApp().get(serverType)['apInfo'][serviceId]['protocol'];
        }
    },

    /**
     * 获取对外服务的类型（同步或异步）
     */
    getAppServiceType: function(serviceId, serverType) {
        var type = null;
        if (this.getServType() === 'accessService') {
            type = getApp().get(serverType)['apInfo'][serviceId]['type'];
        }
        return type;
    }
};


/**
 *获取上下文变量 Application
 */
function getApp() {
    return beanFactory.getBean("ApplicationImpl");
}