var wikipediaApi = require("./wikipediaApi.js");

var neo4j = require('node-neo4j');
var db = new neo4j('http://neo4j:lucas@localhost:7474');

//load async JSON
var async = require("async");


/*var page1Title = process.argv[2];
var page2Title = process.argv[3];

console.log("");*/

module.exports = {
    getPagesBackAndFowardLinks: getPagesBackAndFowardLinks    
}

function checkLoop(page1Title, page2Title, callback) {

    getPagesBackAndFowardLinks(page1Title, page2Title, function(pagesData) {
        var page1Data = pagesData[0];
        var page2Data = pagesData[1];

        //Check back links qty of each one
        console.log(page1Data.title + " has " + page1Data.backlinks.length + " backlinks.");
        console.log(page2Data.title + " has " + page2Data.backlinks.length + " backlinks.");

        //Check number of links from one article that is present on the other
        var numberOfLinksOfPage2OnPage1 = 0;
        //Iterate thru page1 links
        for (var i = 0; i < page1Data.links.length; i++) {
            var link = page1Data.links[i];
            
            //Iterate thru page 2 pointing urls
            for (var j = 0; j < page2Data.urls.length; j++) {
                var pageUrl = page2Data.urls[j];

                //If the page pointing url matches the current link, 
                if(pageUrl == link) {
                    numberOfLinksOfPage2OnPage1++; //Increment the counter
                    break;  //And exit (since the page pointing urls are different, no matches will occurr anymore)
                }   
            }
        }

        //Check number of links from one article that is present on the other
        var numberOfLinksOfPage1OnPage2 = 0;
        //Iterate thru page2 links
        for (var i = 0; i < page2Data.links.length; i++) {
            var link = page2Data.links[i];
            
            //Iterate thru page 1 pointing urls
            for (var j = 0; j < page1Data.urls.length; j++) {
                var pageUrl = page1Data.urls[j];

                //If the page pointing url matches the current link, 
                if(pageUrl == link) {
                    numberOfLinksOfPage1OnPage2++; //Increment the counter
                    break;  //And exit (since the page pointing urls are different, no matches will occurr anymore)
                }   
            }
        }

        //Print results
        console.log(page1Data.title + " cites " + page2Data.title + " " + numberOfLinksOfPage2OnPage1 + " times." + 
            " Ratio: " + numberOfLinksOfPage2OnPage1 / page1Data.links.length);

        console.log(page2Data.title + " cites " + page1Data.title + " " + numberOfLinksOfPage1OnPage2 + " times." + 
            " Ratio: " + numberOfLinksOfPage1OnPage2 / page2Data.links.length);
    });
}


function getPagesBackAndFowardLinks(page1Title, page2Title, callback) {

    //Get pages redirect links
    var neoQuery = [
        "MATCH (n:Article)<-[:RedirectsTo]-(t:Wikiurl) WHERE n.title='", page1Title, 
        "' OR n.title='", page2Title,
        "' RETURN n,t"
    ].join("");


    //Get links that redirect to the target pages
    db.cypherQuery(neoQuery, function(err, result) {
        if(err) 
            return console.log(err);

        var links = {}

        for (var i = 0; i < result.data.length; i++) {
            var data = result.data[i];

            if(!links[data[0].title])
                links[data[0].title] = [];
            
            links[data[0].title].push(data[1].url);  
        }


        var linkUrls = [];

        //Parse links to array object form
        for (var key in links) {
            linkUrls.push({
                title: key,
                urls: links[key]
            });
        }

        fillPagesLinks(linkUrls, function() {
        
            //Get the links on each of the pages
            var asyncQueue = async.queue(function(linkUrl, taskCallback) {
                fillPageBackLinks(linkUrl, function() { taskCallback(); });
            }, 2);

            //Handle page links
            asyncQueue.drain = function() {
                //console.log(linkUrls);   
                //console.log("Done.");
                callback(linkUrls); 
            }

            asyncQueue.push(linkUrls); 
        });
    });
}


function fillPagesLinks(pages, callback) {

    //Get the links on each of the pages
    var asyncQueue = async.queue(function(taskData, taskCallback) {
        wikipediaApi.getPageWikiLinks(taskData.urls[0], "en", function(err, result) {
            taskData.links = result.links;
            taskCallback();
        });
    }, 2);

    //Handle page links
    asyncQueue.drain = function() {
        callback();        
    }

    asyncQueue.push(pages);    
}

function fillPageBackLinks(page, callback) {
    
    var pageBacklinks = [];

    //Get the links on each of the pages
    var asyncQueue = async.queue(function(pageUrl, taskCallback) {
        wikipediaApi.getPageBackLinks(pageUrl, "en").then(function(links) {
            pageBacklinks = pageBacklinks.concat(links);
            taskCallback();
        });
    }, 1);

    //Handle page links
    asyncQueue.drain = function() {
        page.backlinks = pageBacklinks;
        callback();        
    }

    asyncQueue.push(page.urls);  
}





