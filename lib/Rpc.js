var Rpc = module.exports = {};
var app;
Rpc.createApp = function (opt) {
    if(opt && opt.cluster) {

    } else {
        var App = require('./core/Application');
        app = new App();
    }
    app.init(opt);
    return app;
};

Rpc.getRpcService = function () {
    return app.getRpcService();
};

Rpc.getAccessService = function () {
    return app.getAccessService();
};

Rpc.getAppBase = function () {
    return process.cwd();
};


