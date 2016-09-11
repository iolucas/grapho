//Module to extract data from wikipedia
var wikipediaApi = require("./wikipediaApi.js");
var fs = require("fs");


wikipediaApi.getPageBackLinks(process.argv[2], "en").then(function(result){
    console.log(result);
    console.log(result.length)
}, function(err) {
    console.log(err);
});


/*var async = require("async");

var asyncQueue = async.queue(function(msg, callback){

    console.log(msg);
    setTimeout(callback, 1000, msg);

},1);

asyncQueue.push([1,2,3,44,5,6,7,8], function(msg){
    console.log("Done with " + msg);
});

asyncQueue.drain = function() {
    console.log("Drained");
    asyncQueue.push(Math.random(), function(msg){
        console.log("Done with " + msg);
    });
}*/

/*var neo4j = require('node-neo4j');

//Database connection
var db = new neo4j('http://neo4j:lucas@localhost:7474');

db.cypherQuery("MATCH (n:Article)-[:ConnectsTo]->(t:Article) RETURN t, count(n) LIMIT 100000", function(err, results) {
    //console.log(results.data);

    var higherValue = 0;
    var higherValueIndex = 0;

    for (var i = 0; i < results.data.length; i++) {
        var data = results.data[i];

        if(data[1] > higherValue) {
            higherValue = data[1];
            higherValueIndex = i;
        }
    }

    console.log("");
    console.log("Most relevant link is: ");
    console.log(results.data[higherValueIndex]);

    //taskCallback(err); //Fire the taskCallback
});*/
