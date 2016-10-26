var path = require('path');
//单例模式
var instance = null;

/**
 * 说明： 构造函数
 *
 */
var BeanFactory = function () {
};

/**
 * 单例模式暴露beanfactory
 *
 * @returns {BeanFactory}
 */
module.exports = function () {
    if (instance === null) {

    }
    return new BeanFactory();
};

BeanFactory.prototype = {

    /**
     * 说明： 根据类ID获取类的实例
     * 参数 objID ： ObjectConfigure中的objID对应的值
     * 返回值：如果存在，则返回类的实例，否则返回null
     */
    getBean: function (objID) {

    },
    getInstance: function () {
        return instance;
    }
};