var wikipediaApi = require("./wikipediaApi.js");
var async = require("async");

var page1 = process.argv[2]
var page2 = process.argv[3]

if(page1 == undefined || page2 == undefined)
    throw "Not enough arguments.";

async.parallel([
    function(callback) {
        wikipediaApi.getPageLinks(page1, "en")
            .then(function(links){callback(null, links);});
    },
    function(callback) {
        wikipediaApi.getPageLinks(page2, "en")
            .then(function(links){callback(null, links);});
    }
],

//Process results
function(err, results) {
    page1Links = results[0];
    page2Links = results[1];

    var intersect = []
    
    for(var i = 0; i < page1Links.length; i++) {
        if(page2Links.indexOf(page1Links[i]) != -1) {
            intersect.push(page1Links[i]);
        }
    }

    console.log(page1 + ": " + page1Links.length);
    console.log(page2 + ": " + page2Links.length);
    console.log("intersect: " + intersect.length);
    console.log("Prob that " + page2 + " needs " + page1 + ": " + intersect.length/page1Links.length);
    console.log("Prob that " + page1 + " needs " + page2 + ": " + intersect.length/page2Links.length);

    console.log(intersect)
});