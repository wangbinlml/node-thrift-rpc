var random = new Random();
var underscore = require('underscore');

/**
 * 说明： string字符转换为ucs2
 */
exports.str2ucs = function(str){

    var str = new Buffer(str,'ucs2');
    var ucs2 = new Buffer(str.length);
    for(var i=0;i<str.length/2;i++){
        ucs2[2*i+0] = str[2*i+1];
        ucs2[2*i+1] = str[2*i];
    }

    return ucs2.toString('hex',0,str.length);
};


/**
 * 获取JSON中对象的个数
 */
exports.getJsonLength = function(jsonData){
    var jsonLength = 0;
    for(var i in jsonData){
        jsonLength++;
    }
    return jsonLength;
};


/**
 * 生成日期，格式YYYYMMDDHHMMSS
 */
exports.getCurrentData = function(){
    var date = new Date();
    var str="";
    str+=date.getFullYear();//年
    str+= AppendZero(date.getMonth()+1);
    str+=AppendZero(date.getDate());//日
    str+=AppendZero(date.getHours());//HH
    str+=AppendZero(date.getMinutes());//MM
    str+=AppendZero(date.getSeconds());//SS
    return str;
};

function AppendZero(obj){
    if(obj<10) return "0" +""+ obj;
    else return obj;
}

/**
 * 获取系统时间，格式为:2009-06-12 12:00
 */
exports.getCurrentTime = function()
{
    var now = new Date();

    var year = now.getFullYear();       //年
    var month = now.getMonth() + 1;     //月
    var day = now.getDate();            //日

    var hh = now.getHours();            //时
    var mm = now.getMinutes();          //分

    var clock = year + "-";

    if(month < 10)
        clock += "0";

    clock += month + "-";

    if(day < 10)
        clock += "0";

    clock += day + " ";

    if(hh < 10)
        clock += "0";

    clock += hh + ":";
    if (mm < 10) clock += '0';
    clock += mm;
    return(clock);
};


/**
 * 生存消息的transaction id
 */
exports.genTid=function (len){
    return process.pid.toString().concat(random.uid(len));
};

/**
 * 生存消息的transaction id
 */
exports.genString=function (len){
    return random.word(len);
};

/**
 * COPY Object
 */

exports.clone = function(obj){
    return underscore.clone(obj);
    /*var str,newObj;
    str= JSON.stringify(obj, function(key, value) {
        return (typeof value == 'function' ? value.toString().replace(/^function(.*)/g, "jsonFunction$1") : value);
    });
    newObj = JSON.parse(str, function (key, value) {
        if (/^jsonFunction(.*)/.test(value)) {
            var strFun = '('+value.replace(/^jsonFunction(.*)/, "function$1")+')';
            value = eval(strFun);
        }
        return value;
    });
    return newObj;*/
};

exports.getConfigPath = function(){
    var configPath = process.cwd() + '/config';
    var applicationPath = process.argv.splice(4);
    if (applicationPath.length > 0) {
        applicationPath = applicationPath[0];
        applicationPath = applicationPath.split("=");
        applicationPath = applicationPath[1];
        configPath = applicationPath + '/config';
    }
    return configPath
};

/**
 * Inner Class
 * Random: generate random string/word/ID/Number
 */
function Random(){
    // Load Chance
    var Chance = require('chance');
    var chance = new Chance();
    // Load hat
    var hat = require('hat');

    this.getChance = function(){
        return chance;
    };

    this.getHat = function(){
        return hat;
    }
}

/**
 * generate a word with length
 */
Random.prototype.word=function(length){
    return this.getChance().word({length: length});
};

/**
 * generate a uid with bit length
 */
Random.prototype.uid=function(length){
    return this.getHat().rack()(length*4);
};

/**
 * generate a natural number
 */
Random.prototype.natural=function(min,max){
    return this.getChance().natural({min: min, max: max});
};

exports.getRandomForArray  = function (data) {
    if(data.length == 1) {
        return data[0];
    }
    return data[Math.floor(Math.random() * data.length)];
};


