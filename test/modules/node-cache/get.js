/**
 * Created by wangbin on 17-1-6.
 */
var NodeCache = require( "node-cache" );
var myCache = new NodeCache( { stdTTL: 100, checkperiod: 120 } );
myCache.get( "data", function( err, value ){
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