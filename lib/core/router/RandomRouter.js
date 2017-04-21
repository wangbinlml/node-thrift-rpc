var Hashmap = require('../../util/hashmap');

var connectorMgr;

var routeMap = new Hashmap();

/**
 * 说明： 构造函数
 */
function MessageRouterImpl(){
}

module.exports = MessageRouterImpl;

MessageRouterImpl.prototype = {

    /**
     * 说明： 初始化路由表
     */
    init:function(serviceInfo){
        //初始化路由表，当前是round-robin算法，初始化每个service的connector index为0
        for(serviceId in serviceInfo){
            var index = 0;
            routeMap.set(serviceId,index);
        }
    },
    /**
     * 说明： 选择路由
     */
    route:function(serviceId){

        var connectorList = connectorMgr.getConnectorList(serviceId);
        //获取当前的index
        var currentIndex = routeMap.get(serviceId);
        //更新路由表
        if(currentIndex < connectorList.length-1){
            routeMap.set(serviceId,currentIndex+1);
        }else{
            routeMap.set(serviceId,0);
        }

        return connectorList[currentIndex];
    }

};
