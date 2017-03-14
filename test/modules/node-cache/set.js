/**
 * Created by wangbin on 17-1-6.
 */
var NodeCache = require( "node-cache" );
var myCache = new NodeCache( { stdTTL: 5, checkperiod: 3 } );
var data = {
    "access_token": "cxx",
    "current_user_id": "9",
    "client_role": "0",
    //"api_version": "2.0",
    class_id: 120,
    "user_id": "3000000302",
    "content": "要排100",
    "created_at": "1474624620731",
    "creator_avatar": "3b0abf5e1779e47da7c180b44e2f77b0",
    "creator_display_name": "高原",
    "creator_id": "3000000302",
    "creator_role": 0,
    "images": [{
        "datetime": "1474624620736",
        "imageLength": "960",
        "imageWidth": "540",
        "name": "S60916-102052",
        "orientation": "0",
        "originPath": "/storage/emulated/0/hbb/compressImage/8096b522-ca74-48a8-b7cf-8e7ba7de5522_w540h960.jpeg",
        "path": "a80b83ea9fa0ea9c553535154f30137e",
        "size": "65201"
    }],
    "label_type": 2,
    "resource_type": 0,
    "school_id": "52",
    "user_id": "3000000302"
};
myCache.set("data",data,function (error,success) {
    if(!error && success ){
        console.log( success );
    }
});

setInterval(function(){
    myCache.get( "data", function( err, value ){
        console.log(  err, value );
        if( !err ){
            if(value == undefined){

                // key not found
            }else{
                console.log( value );
                //{ my: "Special", variable: 42 }
                // ... do something ...
            }
        }
    });
},4000);
