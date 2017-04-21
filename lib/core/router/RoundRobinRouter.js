var Hashmap = require('../../util/hashmap');

var RoundRobinRouter = module.exports = {};

//factory method
RoundRobinRouter.create = function () {
    return new RoundRobinRouterClass();
};
//class refference
RoundRobinRouter.Class = RoundRobinRouterClass;


/**
 * 说明： 构造函数
 */
function RoundRobinRouterClass() {

    var routeTable = new Hashmap();

    this.getRouteTable = function () {
        return routeTable;
    };
}

RoundRobinRouterClass.prototype = {

    /**
     * 说明： 初始化路由表
     */
    init: function (serviceInfo) {
        //初始化路由表，当前是round-robin算法，初始化每个service的connector index为0
        for (serviceId in serviceInfo) {
            var connectorInfo = serviceInfo[serviceId];
            if (connectorInfo['routePolicy'] === 'round-robin') {
                var len = connectorInfo.length;
                this.getRouteTable().set(serviceId, {index: 0, length: len});
            }
        }
    },

    /**
     * 说明： 选择路由
     */
    route: function (serviceId) {

        var routeTable = this.getRouteTable();
        var routeInfo = routeTable.get(serviceId);

        //更新路由表
        routeInfo.index < routeInfo.length - 1 ? ++routeInfo.index : routeInfo.index = 0;
        routeTable.set(serviceId, routeInfo);

        return routeInfo.index;
    },

    /**
     * 说明： 选择路由
     */
    update: function (serviceId, length) {
        this.getRouteTable().set(serviceId, {index: 0, length: length});
    }

};
