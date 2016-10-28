var log=require('./util/Logger').getLogger("system");
var beanFactory = require("./core/BeanFactory")();

var Rpc = module.exports = {};

/**
 * create a zero application
 *
 * @param opts
 * @returns {Application}
 */
Rpc.createApp = function (opts) {
    var app = beanFactory.getBean("Cluster");
    app.init();
    log.info("Application created!");
    return app;
};


/**
 * Get application base path
 *
 *  // cwd: /home/game/
 *  // app.getBase() -> /home/game
 *
 * @return {String} application base path
 *
 * @memberOf zero
 */
Rpc.getAppBase = function() {
    return process.cwd();
};

