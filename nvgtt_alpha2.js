var neo4j = require('node-neo4j');
var wikipediaApi = require("./wikipediaApi.js");
var dbpediaApi = require("./dbpediaApi.js");
var checkLoop = require("./checkloop.js");
var async = require("async"); //Module to execute async ops
var fs = require("fs");

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

//var db = new neo4j('http://neo4j:lucas@localhost:7474');

var excludedTypes = [
    'http://schema.org/Organization',
    'http://schema.org/Person',
    'http://schema.org/Place',
    'http://dbpedia.org/class/yago/Company108058098',
    'http://dbpedia.org/page/OpenGov_Foundation',
    'http://dbpedia.org/ontology/Newspaper',
    'http://dbpedia.org/ontology/Website',
    'http://dbpedia.org/ontology/Organisation',
    'http://dbpedia.org/ontology/Company'
];

var mainArticleTitle = process.argv[2];
var lang = process.argv[3] || 'en';

//Variables to store the articles objects of the request
var mainArticleObj = {
    title: mainArticleTitle
}

var childArticlesObjs = [];

//Object array to store all the articles references
var articlesObjs;

//Init app






//Once the queue is empty, fire callback
asyncQueue.drain = function() { callback(); }

//asyncQueue.push(articlesObjs);
asyncQueue.push(childArticlesObjs);   

var asyncQueue = async.queue(function())


async.waterfall([
    //Get the requested article links
    function(callback) {
        console.log("Getting main article abstract links...");

        getArticleAbstractLinks(mainArticleTitle, lang, function(error, links) {
            console.log("\n Abstract Links");
            console.log(links);
            mainArticleObj.abstractLinks = links;
            callback(error, links);
        });
    },

    //Get the types of each abstract link
    function(links, callback) {
        console.log("Populating articles types...");

        dbpediaApi.getArticlesTypes(links, lang, function(error, artTypes) {
            if(error) return callback(error);

            //Iterate thru the results
            for (var childArt in artTypes) {
                var types = artTypes[childArt];

                //Get only valid articles (articles whose are not in the "not valid type" list)
                if(!checkArrayIntersection(types, excludedTypes))
                    childArticlesObjs.push({ title: childArt });
                else
                    console.log("Not included by filtering: " + childArt);
            }

            //Populate articles objs array
            articlesObjs = [mainArticleObj].concat(childArticlesObjs);

            callback();
        });
    },

    //Populate articles with their redirect urls
    function(callback) {
        console.log("Populating articles redirect urls...");

        //Get every article title
        var articlesTitles = [mainArticleTitle].concat(mainArticleObj.abstractLinks);
        dbpediaApi.getArticlesRedirects(articlesTitles, lang, function(error, artRedirects) {
            if(error) return callback(error);

            //Iterate thru all the articles objects
            articlesObjs.forEach(function(articleObj) {
                //If there is a redirects data for this article, populate it
                if(artRedirects[articleObj.title])
                    articleObj.redirectUrls = artRedirects[articleObj.title];
                else {
                    console.log("NO REDIRECT DATA FOR")
                    console.log(articleObj);
                }

            }, this);

            callback();

        });
    },

    //Populate child articles abstract links
    function(callback) {
        console.log("Populating child articles abstractlinks...");

        //Get the links on each of the pages
        var asyncQueue = async.queue(function(articleObj, taskCallback) {
            
            getArticleAbstractLinks(articleObj.redirectUrls[0], lang, function(err, links) {

                if(err) {
                    console.log(err);
                    console.log(articleObj.redirectUrls[0]);
                    return;
                }

                articleObj.abstractLinks = links;
                taskCallback();
            });
            
            
            /*wikipediaApi.getPageWikiLinks(articleObj.redirectUrls[0], lang, function(err, result) {
                if(err) {
                    console.log(err);
                    console.log(articleObj.redirectUrls[0]);
                }
                
                articleObj.links = result.links;
                taskCallback();
            });*/
        }, 20);

        //Once the queue is empty, fire callback
        asyncQueue.drain = function() { callback(); }

        //asyncQueue.push(articlesObjs);
        asyncQueue.push(childArticlesObjs);   
    },

    //Populate articles backlinks
    function(callback) {
        return callback();

        console.log("Populating articles backlinks...");

        //Get the links on each of the pages
        var asyncQueue = async.queue(function(articleObj, taskCallback) {
            //console.log("Getting backlink of " + articleObj.title);
            wikipediaApi.getPageBackLinks(encodeURIComponent(articleObj.title), lang).then(function(links) {
                articleObj.backlinks = links;
                taskCallback();
            }, function(err) {
                console.log(err);
                //taskCallback();
            });
        }, 20);

        //Once the queue is empty, fire callback
        asyncQueue.drain = function() { callback(); }

        asyncQueue.push(articlesObjs); 
    },

    //Populate cross data with child abstractlinks and the main article
    function(callback) {

        console.log("Populating cross abstract link data...");    

        childArticlesObjs.forEach(function(childArtObj) {
            childArtObj.mainLinkCitations = countArrayIntersection(childArtObj.abstractLinks, mainArticleObj.redirectUrls);
            childArtObj.citedByMainLink = countArrayIntersection(mainArticleObj.abstractLinks, childArtObj.redirectUrls);      
        }, this);

        callback();
    },

    //Check heuristically the data and decide which node are a pre-requisite to the main article
    function(callback) {
        console.log("Checking data heuristically...")

        var finalChildArticles = [];

        childArticlesObjs.forEach(function(childArtObj) {

            finalChildArticles.push(childArtObj.title);
            return;

            //Save everything to a file
            /*var fileBuffer = "";
            articlesObjs.forEach(function(article) {
                
            }, this);*/

            
            //console.log(childArtObj.title);

            //If the child art does not cite the main article, just add it and return
            if(childArtObj.mainLinkCitations == 0) {
                finalChildArticles.push(childArtObj.title);
                return;
            }

            //If not, compare the ratios 

            //Check citation ratios
            var mainLinkCitationRatio = childArtObj.mainLinkCitations / childArtObj.links.length;
            var citedByMainLinkRatio = childArtObj.citedByMainLink / mainArticleObj.links.length;

            //if(mainLinkCitationRatio < citedByMainLinkRatio)
                finalChildArticles.push(childArtObj.title + " MainLinkCitation: " + mainLinkCitationRatio + 
                    " CitedbyMainLink: " + citedByMainLinkRatio);
            //else
                //console.log("Not included for loop with main article: " + childArtObj.title);

            return;    


            var notTrusted = false;
            //If the main article cites the child art only once and 
            //the child link does no cite the main links
            //Determine that it has nothing to do with the main link
            //This constraint must take in consideration number of links on the page
            if(childArtObj.citedByMainLink <= 1 && childArtObj.mainLinkCitations <= 0)
                notTrusted = true;

            //Check citation ratios
            var mainLinkCitationRatio = childArtObj.mainLinkCitations / childArtObj.links.length;
            var citedByMainLinkRatio = childArtObj.citedByMainLink / mainArticleObj.links.length;

            //If the amount of time the child link cites the main link is greater than the inverse
            //set child link as not trusted

            if(mainLinkCitationRatio > citedByMainLinkRatio)
                notTrusted = true;

            //if(!notTrusted)
                finalChildArticles.push(childArtObj.title + (notTrusted ? " (Not Trusted)" : ""));

            var ratiosPercentage = (citedByMainLinkRatio - mainLinkCitationRatio) / citedByMainLinkRatio;

            //console.log(childArtObj.title + ": " + ratiosPercentage);

        }, this);

        callback(null, finalChildArticles);

/*
        //Print results
        //Check back links qty of each one
        console.log(page1Data.title + " has " + page1Data.backlinks.length + " backlinks.");
        console.log(page2Data.title + " has " + page2Data.backlinks.length + " backlinks.");

        console.log(page1Data.title + " cites " + page2Data.title + " " + numberOfLinksOfPage2OnPage1 + " times." + 
            " Ratio: " + numberOfLinksOfPage2OnPage1 / page1Data.links.length);

        console.log(page2Data.title + " cites " + page1Data.title + " " + numberOfLinksOfPage1OnPage2 + " times." + 
            " Ratio: " + numberOfLinksOfPage1OnPage2 / page2Data.links.length);*/

    } 

], function(error, result) {
    //console.log(articlesObjs);
    console.log("\n Final Links");
    console.log(result);
    console.log("DONE");
});




function getArticleAbstractLinks(articleTitle, lang, callback) {

    wikipediaApi.getPageAbstractLinks(encodeURIComponent(articleTitle), lang, function(err, result) {
        if(err) 
            return callback(err);
        
        var pageChilds = [];

        result.links.forEach(function(link) {
            pageChilds.push(decodeURIComponent(link.replaceAll("_", " ")));        
        }, this);

        callback(null, pageChilds);
    });



    //Create query string
    /*var neoQuery = 'MATCH (n:Article)-[:ConnectsTo]->(t:Article) WHERE n.title="' + articleTitle + '" RETURN t';

    db.cypherQuery(neoQuery, function(err, result) {
        if(err) 
            return callback(err);

        var pageChilds = [];

        result.data.forEach(function(child) {
            pageChilds.push(child.title);        
        }, this);

        callback(null, pageChilds);
    });*/
} 



/*
db.cypherQuery(neoQuery, function(err, result) {
    if(err) 
        return console.log(err);

    var pageChilds = [];

    result.data.forEach(function(child) {
        pageChilds.push(child.title);        
    }, this);


    //Get the types of the child pages
    dbpediaApi.getArticlesTypes(pageChilds, "en", function(error, data) {
        
        //Populate main and child articles objects
        var mainArticleObj = {
            title: targetArticleTitle
        }
        
        var childArticlesObjs = [];
        for (var key in data) {
            var value = data[key];

            //Get only valid articles (articles whose are not in the not valid type list)
            if(!checkArrayIntersection(value, excludedTypes)) {
                //validArticles.push(key);
                childArticlesObjs.push({
                    title: value
                }); 
            }
        }

        //Create array with articles all the articles
        var articlesObjs = [mainArticleObj].concat(childArticlesObjs);
        
        console.log(articlesObjs);

        //populateArticleData(validArticles[0]);

        //Validate child articles
        validateChildArticles(targetArticleTitle, validArticles, function(err, result) {

        });

    });
});*/

function populateArticleData(articleObj, callback) {

    //Get pages redirect links
    var neoQuery = "MATCH (n:Article)<-[:RedirectsTo]-(t:Wikiurl) WHERE n.title='" +  articleObj.title + "' RETURN t";

    //Get links that redirect to the target pages
    db.cypherQuery(neoQuery, function(err, result) {
        console.log(articleObj);
        console.log(result);

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

function validateChildArticles(mainArticle, childArticles, callback) {
    //Populate main and child articles objects
    var mainArticleObj = {
        title: mainArticle
    }

    var childArticlesObjs = [];
    childArticles.forEach(function(childArticle) {
        childArticlesObjs.push({
            title: childArticle
        });  
    }, this);

    //Create array with articles to get the links
    var articlesToGetLinks = [mainArticleObj].concat(childArticlesObjs);

    //Get forward and backlinks
    var asyncQueue = async.queue(function(article, taskCallback) {

        //get forward links and backlinks in parallel
        async.parallel([
            function(parallelCallback) {
                
                /*wikipediaApi.getPageWikiLinks(article.title, lang, function(err, result) {
                    
                    if(err)
                        console.log(err);
                    else
                        article.links = result.links; //Save forardlinks on the current article

                    parallelCallback();
                });*/
                parallelCallback();
            }, 
            function(parallelCallback) {
                wikipediaApi.getPageBackLinks("MQTT", "en").then(function(links) {
                    console.log("test");
                    //console.log(links);
                    //article.backlinks = links; //Save backlinks on the current article
                    parallelCallback();
                }, function(err){
                    console.log("test2");
                    //console.log(err);
                    parallelCallback();
                });
                //parallelCallback();
            }
        ], function() { 
            
            //Once finish, call taskcallback
            taskCallback(); 
        });

    }, 1);

    //Handle page links
    asyncQueue.drain = function() {
        //callback();       
        console.log(articlesToGetLinks); 
    }

    asyncQueue.push(articlesToGetLinks);   
}


function getArticlesOrder(article1, article2, callback) {
    var page1Title = article1;
    var page2Title = article2;

    checkLoop.getPagesBackAndFowardLinks(page1Title, page2Title, function(pagesData) {
        var page1Data = pagesData[0];
        var page2Data = pagesData[1];

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
        //Check back links qty of each one
        console.log(page1Data.title + " has " + page1Data.backlinks.length + " backlinks.");
        console.log(page2Data.title + " has " + page2Data.backlinks.length + " backlinks.");

        console.log(page1Data.title + " cites " + page2Data.title + " " + numberOfLinksOfPage2OnPage1 + " times." + 
            " Ratio: " + numberOfLinksOfPage2OnPage1 / page1Data.links.length);

        console.log(page2Data.title + " cites " + page1Data.title + " " + numberOfLinksOfPage1OnPage2 + " times." + 
            " Ratio: " + numberOfLinksOfPage1OnPage2 / page2Data.links.length);
    });
}


function getDifferenceArray(array1, array2) {
    var resultArray = [];

    for (var i = 0; i < array1.length; i++) {

        var exclusiveValue = true;

        for (var j = 0; j < array2.length; j++) {
            if(array1[i] == array2[j]) {
                exclusiveValue = false;
                break;
            }
        }

        if(exclusiveValue)
            resultArray.push(array1[i]);
    }

    return resultArray;
}

function countArrayIntersection(array1, array2) {
    var count = 0;
    for (var i = 0; i < array1.length; i++) {
        for (var j = 0; j < array2.length; j++) {
            //Use exception hack in case array elements are not strings
            try { var isEqual = array1[i].toLowerCase() == array2[j].toLowerCase() }
            catch(e) { var isEqual = array1[i] == array2[j] }

            if(isEqual) {
                count++;
                break;
            }
        }
    }

    return count;
}

function checkArrayIntersection(array1, array2) {
    //check the largest array
    for (var i = 0; i < array1.length; i++)
        for (var j = 0; j < array2.length; j++)
            if(array1[i].toLowerCase() == array2[j].toLowerCase())
                return true;

    return false;
}
