/**
 * Created by wangbin on 17-4-10.
 */
var Pool = require('./Pool');
var pool = new Pool();
pool.create("127.0.0.1","5000");
pool.create("127.0.0.1","6000");
var map = pool.getMap();
for (var name in map) {
    var p = map[name];
    console.log(p.getName());
}
