/**
 * Created by root on 3/27/17.
 */

var future = require('fibers/future')
var utils = require('./ZookeeperUtils').fn();

var createSync = future.wrap(function (path, data, mode, cb) {
    utils.create(path, data, mode, function (error, path) {
        cb(error, path);
    });
});
var getChildrenSync = future.wrap(function (path, cb) {
    utils.getChildren(path, function (error, stat) {
        cb(error, stat);
    });
});
var mkdirpSync = future.wrap(function (path, cb) {
    utils.mkdirp(path, function (error, success) {
        cb(error, success);
    });
});
var deleteSync = future.wrap(function (path, cb) {
    utils.remove(path, function (error, success) {
        cb(error, success);
    });
});
var existsSync = future.wrap(function (path, cb) {
    utils.exists(path, function (error, success) {
        cb(error, success);
    });
});

exports.createSync = createSync;
exports.mkdirpSync = mkdirpSync;
exports.getChildrenSync = getChildrenSync;
exports.deleteSync = deleteSync;
exports.existsSync = existsSync;