var wikipediaApi = require("./wikipediaApi.js");
var async = require("async");
var fs = require("fs");

function loadDatabase(filename) {
    var db;
    
    try {
        db = JSON.parse(fs.readFileSync(filename));
    } catch(e) {
        db = {}
    }

    return db;
}

function saveDatabase(filename, db) {
    fs.writeFileSync(filename, JSON.stringify(db));
}

var db = loadDatabase("db.json");

keep studying this to match wikipedia theory with the information group theory

var targetArticle = process.argv[2];
var mainPageLinks;

var currentPage = 0;
var donePages = 0;

var pageLinksDict = {}

//Queue to handle addition of items into the database
var databaseQueue = async.queue(function(page, taskCallback) {
    console.log("Downloading page " + ++currentPage + "/" + mainPageLinks.length);
    
    downloadAndFillDict(page, function() {
        console.log("Done " + ++donePages + "/" + mainPageLinks.length);
        taskCallback();
    }); 

}, 5);

function downloadAndFillDict(page, callback) {
    if(pageLinksDict[page] != undefined) {
        callback();
        return;
    }

    wikipediaApi.getPageLinks(page, "en").then(function(pageLinks) {
        pageLinksDict[page] = pageLinks;
        callback();
    }, function(e) {
        console.log(e);
        callback();
    });
}

//Callback to be called when the database queue are empty
databaseQueue.drain = function() {
    console.log("DONE");
    console.log(pageLinksDict)
}

//Download main page
// console.log("Downloading main page...");
// wikipediaApi.getPageLinks(targetArticle, "en").then(function(links) {

//     mainPageLinks = links;
//     pageLinksDict[targetArticle] = links;

//     console.log("Main page downloaded.");

//     //Push this pageinfo to the database queue
//     databaseQueue.push(mainPageLinks);

// });