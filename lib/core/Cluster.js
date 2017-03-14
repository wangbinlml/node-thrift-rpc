var log = require('../util/Logger').getLogger("system");
var constants = require('../util/Constants').Constants;
var events = require("events");
var util = require("util");
var net = require("net");

var cp = require('child_process');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

//获取配置
var app;
var rpcService;
var acsService;
var rpcInfoMap = [];
var accessInfoMap = [];
/**
 * 说明： 构造函数
 */
function Cluster() {
    events.EventEmitter.call(this);
}

util.inherits(Cluster, events.EventEmitter);
module.exports = Cluster;

/**
 * 说明： 初始化Access服务入口
 */
Cluster.prototype.init = function () {
    app = getApp();
    app.set('runMode', constants.runtime_runMode_multi_core);
    app.init();
    app.start();

    app.setService('cluster-worker', new Cluster());
    if (app.get('rpcService') !== undefined) {
        var rpcSockAcceptorInfoList = app.get('rpcService')['acceptorConfig']['socket'] || [];
        rpcSockAcceptorInfoList !== undefined && rpcSockAcceptorInfoList.forEach(function (acceptorInfo) {
            var obj = {};
            obj['protocol'] = 'socket';
            obj['port'] = acceptorInfo['port'];
            obj['ip'] = acceptorInfo['ip'] || '0.0.0.0';
            rpcInfoMap[acceptorInfo['port']] = obj;
        });
        var rpcHttpAcceptorInfoList = app.get('rpcService')['acceptorConfig']['http'] || [];
        rpcHttpAcceptorInfoList !== undefined && rpcHttpAcceptorInfoList.forEach(function (acceptorInfo) {
            var obj = {};
            obj['protocol'] = 'http';
            obj['port'] = acceptorInfo['port'];
            obj['ip'] = acceptorInfo['ip'] || '0.0.0.0';
            rpcInfoMap[acceptorInfo['port']] = obj;
        });
    }

    if (app.get('accessService') !== undefined) {
        var acsSockAcceptorInfoList = app.get('accessService')['acceptorConfig']['socket'] || [];
        acsSockAcceptorInfoList !== undefined && acsSockAcceptorInfoList.forEach(function (acceptorInfo) {
            var obj = {};
            obj['protocol'] = 'socket';
            obj['port'] = acceptorInfo['port'];
            obj['ip'] = acceptorInfo['ip'] || '0.0.0.0';
            accessInfoMap[acceptorInfo['port']] = obj;
        });
        var acsHttpAcceptorInfoList = app.get('accessService')['acceptorConfig']['http'] || [];
        acsHttpAcceptorInfoList !== undefined && acsHttpAcceptorInfoList.forEach(function (acceptorInfo) {
            var obj = {};
            obj['protocol'] = 'http';
            obj['port'] = acceptorInfo['port'];
            obj['ip'] = acceptorInfo['ip'] || '0.0.0.0';
            accessInfoMap[acceptorInfo['port']] = obj;
        });
    }
    rpcService = app.getService('rpcService').getRPCServer();
    acsService = app.getService('accessService');
};
/**
 * 说明： 启动Access服务
 */
Cluster.prototype.start = function () {
    if (cluster.isMaster) {
        // Fork workers.
        var runtimeConfig = getApp().get('runtime');
        var defaultZeroChildConfig = getDefaultZeroChildConfig();
        if (runtimeConfig['zero'] === undefined) {
            runtimeConfig['zero'] = defaultZeroChildConfig;
        } else {
            runtimeConfig['zero']['options'] = _extend(defaultZeroChildConfig, runtimeConfig['zero']['options']);
        }

        for (var childName in runtimeConfig) {
            if(childName != 'zero') {
                var childConf = runtimeConfig[childName];
                var workerFile = process.cwd() + childConf['worker'];
                cp.fork(workerFile);
            }
        }

        var numCpu = runtimeConfig['zero']['options']['children'] || numCPUs;
        for (var i = 0; i < numCpu; i++) {
            cluster.fork();
        }

        cluster.on('exit', function (worker, code, signal) {
            log.info('worker ' + worker.process.pid + ' died');
        });

        cluster.on('listening', function (worker, address) {
            log.info('listening: worker ' + worker.process.pid + ', Address: ' + address.address + ":" + address.port);
        });

        cluster.on('exit', function (worker, code, signal) {
            log.info('worker %d died (%s). restarting...',
                worker.process.pid, signal || code);
            cluster.fork();
        });

        // master进程 接收消息 -> 处理 -> 发送回信
        cluster.on('online', function (worker) {
            // 有worker进程建立，即开始监听message事件
            worker.on('message', function (data) {
                var name = data['name'];
                var to = data['to'];
                var msg = data['msg'];
                if (name == 'trans') {
                    //查找消息传输的进程
                    Object.keys(cluster.workers).forEach(function (index) {
                        var currentWorker = cluster.workers[index];
                        var id = currentWorker.process.pid;
                        if (id == to && msg.header.protocol === 'socket') {
                            currentWorker.send(msg);
                        }
                    });
                }
            });
        });

    } else {
        log.info('work %s', process.pid + ' connected !');
        //设置service引用
        var _self = this;
        rpcInfoMap.forEach(function (info) {
            _self.run(rpcService, acsService, info);
        });

        accessInfoMap.forEach(function (info) {
            _self.run(rpcService, acsService, info);
        });

        process.on('message', function (msg) {
            rpcService.receive(msg);
        });
    }
};

Cluster.prototype.run = function (rpcService, acsService, info) {

    var server = null;
    var protocol = info['protocol'];
    var port = info['port'];
    var host = info['ip'] || '0.0.0.0';
    var pattern = info['pattern'];
    var acceptorId = port + ':' + protocol;

    if (rpcInfoMap[port] !== undefined) {
        server = rpcService.getAcceptor(acceptorId);
    } else if (accessInfoMap[port] !== undefined) {
        if ('http' === protocol) {
            server = acsService.getAcceptor(acceptorId).getServer();
        } else if ('socket' === protocol) {
            server = acsService.getAcceptor(acceptorId);
        }
    }
    if (server !== null) {
        if (protocol === 'http') {
            server.listen(port, host, function () {
                log.info('http bound!', host + ':' + port);
            })
        } else if (protocol === 'socket') {
            var sock = new net.Server(function (c) {
                server.onConnection(c);
            });
            sock.listen(port, host, function () {
                log.info('socket server bound', host + ':' + port);
            });
        }
    } else {
        throw new Error('port is not listening by zero');
    }
};

/**
 * 不同进程之间数据传输
 * @param to
 * @param msg
 */
Cluster.prototype.sendMsg = function (to, msg) {
    process.send({
        name: 'trans',
        to: to,
        msg: msg
    });
};

function _extend(a, b) {
    a = a || {};
    for (var i in b) {
        a[i] = b[i];
    }
    return a;
}
