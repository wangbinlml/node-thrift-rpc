/**
 * Module dependencies.
 */

var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var expressSession = require('express-session');
var fs = require("fs");
var https = require('https');
var http = require('http');
var path = require('path');
var passport = require('passport');
var getBody = require('body-parser/node_modules/raw-body');
var typeis = require('body-parser/node_modules/type-is');
var qs = require('body-parser/node_modules/qs');

var constants = require('../../../../util/Constants').Constants;
var commonUtil = require('../../../../util/commonUtil');

var log = require('../../../../util/logger').getLogger("system");
var beanFactory = require("../../../../core/ioc/impl/BeanFactoryImpl")();


/**
 * 说明： 构造函数
 */
function HttpAcceptor() {
    var app = express();
    var options = {};
    var server;
    var serviceRef;
    var serviceType;

    this.getHttpApp = function () {
        return app;
    };

    this.getServer = function () {
        return server;
    };

    this.setServer = function (s) {
        server = s;
    };

    this.getOptions = function () {
        return options;
    };

    this.setOptions = function (opt) {
        options = opt;
    };

    this.getServiceRef = function () {
        return serviceRef;
    };

    this.setServiceRef = function (ref) {
        serviceRef = ref;
    };

    this.getServType = function () {
        return serviceType;
    };

    this.setServType = function (servType) {
        serviceType = servType;
    };

}

module.exports = HttpAcceptor;

// 定义限流参数
// 限流开关，限流阀值，请求计数器
var rateLimit, rateLimit_num, req_num = 0;

HttpAcceptor.prototype = {
    /**
     * 说明： 初始化HttpServer
     */
    init: function (config, opt) {

        // 限流参数赋值
        rateLimit = config.useRateLimit;

        if (rateLimit && rateLimit === "true") {
            rateLimit_num = Number(config.rateLimitNum);
        }

        var _self = this;

        //设置该acceptor所属的服务
        _self.setServType(opt.serviceType);

        //初始化Service引用
        if (_self.getServType() === 'rpcService') {
            _self.setServiceRef(getApp().getService(this.getServType()).getRPCServer());
        } else {
            _self.setServiceRef(getApp().getService(this.getServType()));
        }

        var app = _self.getHttpApp();

        var options = _self.getOptions();
        if (config.tls !== undefined) {
            var filePath = process.cwd() + '/config/cert/';
            var privateKey = fs.readFileSync(filePath + config.tls.keyFile).toString();
            var certificate = fs.readFileSync(filePath + config.tls.certFile).toString();

            options = {
                security: 1,
                key: privateKey,
                cert: certificate
            };

            config.tls.requireClientCert === undefined ? options : options.requestCert = true;
        } else {
            options = {security: 0};
        }
        _self.setOptions(options);

        app = configHttpApp(app, config);

        app.all(config.root + '/*', function (req, res) {
	    res.header("Access-Control-Allow-Origin", "*");
	    res.header("Access-Control-Allow-Headers", "X-Requested-With");
 	    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");	
            _self.receive(req, res);
        });
    },

    /**
     * 说明： 启动HttpServer监听
     */
    start: function () {
        var _self = this;
        var app = _self.getHttpApp();

        var s = _self.getOptions().security ? https.createServer(this.getOptions(), app) : http.createServer(app);

        var isCluster = getApp().get('runMode') === constants.runtime_runMode_multi_core;
        if (!isCluster) {
            s.listen(app.get('port'), function () {
                log.debug('Access-http is running in single instance mode,listening on port ' + app.get('port'));
            });
        }

        _self.setServer(s);
    },

    /**
     * 说明： 接收消息
     */
    receive: function (req, res) {
        // 限流逻辑添加
        if (rateLimit == true) {
            // 增加监控日志
            if (req_num % 10 == 0) {
                log.debug("current request num is :" + req_num + " at " + new Date());
            }

            // 限流处理
            if (req_num <= rateLimit_num) {
                // 计数器自增
                req_num++;
                this.receiveMsg(req, res);
            } else {
                // 超越限流阀值逻辑
                // TODO 执行告警处理，调用告警接口
                // 异常处理
                var user_agent = req.headers['user-agent'].toLowerCase();
                var isMobile = user_agent.match(/(iphone|ipod|ipad|android)/);
                if (isMobile) { // 客户端

                } else { // web
                    res.redirect("http://www.baidu.com/");
                }
            }
        } else {
            this.receiveMsg(req, res);
        }
    },
    /**
     * 接收消息
     * @param req
     * @param res
     */
    receiveMsg: function (req, res) {
        //组装消息
        var message = {};
        var header = {};
        var body = {};
        header.protocol = 'http';
        //下面这个处理是为了测试的临时处理，待http的接口定义完成后再修改
        header.tid = req.header.tid === undefined ? commonUtil.genTid(8) : req.header.tid;
        header.msgType = header.msgType === undefined ? constants.message_type_req : req.header.msgType;
        header.invokeMode = header.invokeMode === undefined ? constants.invoke_mode_reqResp_stateful : req.header.invokeMode;

        header.connectionId = {local: this.getHttpApp().get('port')};
        header.msgname = req.path;
        body.req = req;
        body.res = res;
        body.passport = passport;
        message.header = header;
        message.body = body;

        this.getServiceRef().receive(message);
    },
    /**
     * 说明： 发送消息
     */
    send: function (msg, options) {
        if (msg.header.msgType === constants.message_type_resp) {
            //发送的是响应消息
            if (msg.body.commond.redirect !== undefined) {
                //重定向的场景
                var redirectStatus = msg.body.commond.redirect['status'];
                var redirectUrl = msg.body.commond.redirect['url'];
                // 判断是否有cookies,以及对cookies的操作
                var cookies = msg.body.commond.cookies;
                if(cookies && cookies['operate'] == "set") {
                    msg.body.res.cookie("access_token", cookies['access_token'], {maxAge: 4*3600*1000});
                } else if (cookies && cookies['operate'] == "clear") {
                    msg.body.res.cookie("access_token", cookies['access_token'], {maxAge: 0});
                }
                status !== undefined ? msg.body.res.redirect(redirectStatus, redirectUrl) : msg.body.res.redirect(redirectUrl);
            } else {
                //正常响应的场景
                var status = msg.body.commond.response['status'];
                var content = msg.body.content;
                //status !== undefined ? msg.body.res.status(status).send(content) : msg.body.res.send(content);
                msg.body.viewName ? msg.body.res.status(status).render(msg.body.viewName, content) : msg.body.res.send(content);
            }

            // 限流逻辑添加
            // 请求处理完成，计数器自减
            req_num--;
        }
    }
};


/**
 * 配置Express的app
 * @param config
 */
function configHttpApp(app, config) {
    //设置监听端口
    app.set('port', config.port || 3000);
    //设置view路径和模板引擎
    app.set('views', process.cwd() + '/webContent/' + config.viewPath);
    app.set('view engine', config.viewEngine || 'ejs');
    //设置网站图标，下面就是默认用了Express的图标
    //app.use(express.favicon());
    //设置使用消息体解析中间件
    app.use(bodyParser());
    // 用于解析application/octest-stream参数
    app.use(streamParser());
    //挂载cookie解析中间件，传递secret来sign cookie
    app.use(cookieParser('your secret here'));
    //挂载router中间件
    //app.use(app.router);
    //挂载passport中间件，支持http basic和digest认证
    config.authenticate !== undefined && app.use(passport.initialize());
    //支持PUT,DELETE等方法
    config.useMethodOverride !== undefined && app.use(methodOverride());
    //挂载session中间件
    config.useSession !== undefined && app.use(expressSession({
        resave: false, // don't save session if unmodified
        saveUninitialized: false, // don't create session until something stored
        secret: 'keyboard cat'
    }));
    //挂载静态文件中间件
    app.use(express.static(process.cwd() + '/webContent/'));

    return app;
}

function streamParser(options) {
    options = options || {};
    var strict = options.strict !== false;
    return function streamParser(req, res, next) {
        if (req._body) return next();
        req.body = req.body || {};

        //if (!typeis(req, 'stream')) return next();
        if (req.headers["content-type"] && req.headers["content-type"].indexOf("stream") == -1) {
            return next();
        }

        // flag as parsed
        req._body = true;

        // parse
        getBody(req, {
            limit: options.limit || '100kb',
            length: req.headers['content-length'],
            encoding: 'utf8'
        }, function (err, buf) {
            if (err) return next(err);

            var first = buf.trim()[0];

            if (0 == buf.length) {
                return next();
            }

            if (strict && '{' != first && '[' != first) return next(error(400, 'invalid json'));
            try {
                req.body = JSON.parse(buf, options.reviver);
            } catch (err) {
                err.body = buf;
                err.status = 400;
                return next(err);
            }
            next();
        })
    }
}


/**
 *获取上下文变量 Application
 */
function getApp() {
    return beanFactory.getBean("ApplicationImpl");
}

function error(code, msg) {
    var err = new Error(msg || http.STATUS_CODES[code]);
    err.status = code;
    return err;
}
