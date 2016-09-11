//Module to manage async calls
var async = require("async");

var neo4j = require('node-neo4j');
var db = new neo4j('http://neo4j:lucas@localhost:7474');

/*db.cypherQuery(neoQuery, function(err, result) {
    if(err) 
        reject(err);
    else {
        if(result.data.length == 0)
            return reject("No results found.");
            
        var baseModelData = new self(result.data[0]);
        resolve(baseModelData); //Resolve signaling when it is created
    }
});*/

//Module to execute crawling functions

//Check dbpedia for more data
//http://dbpedia.org/page/Index_of_Windows_games
//http://stackoverflow.com/questions/24600949/sparql-query-to-extract-wikipedia-infobox-data-using-dbpedia

//Database api to use
//var graphodb = require("./database.js");
var graphodb = require("./neo4jdb.js");

//Module to extract data from wikipedia
var wikipediaApi = require("./wikipediaApi.js");

//File system Module
var fs = require("fs");

//Utils
var print = console.log;
var exit = process.exit;
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};
RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\\\$&");
};

//Create error log file
var errorLog = "------------ Grapho Error Log ------------\r\n\r\n\r\n";
var errorLogFileName = "logs/error_log_" + Math.random()*1000 + ".txt";
fs.writeFileSync(errorLogFileName, errorLog);

var writeErrorLog = function(log) {
    if(log == null)
        return;

    var logText;
    
    try {
        logText = JSON.stringify(log);
    } catch (e){
        logText = log;
    } finally {
        //errorLog += logText + "\r\n\r\n\r\n";
        fs.appendFileSync(errorLogFileName, logText + "\r\n\r\n\r\n");
    }
    
}
var saveErrorLog = function() {
    //fs.writeFileSync("logs/error_log_" + Math.random()*1000 + ".txt", errorLog);
    //print("Error log saved.");
}

print("GRAPHO CRAWL")
print("");

//Get arguments passed
//var page = process.argv[2];
//var lang = process.argv[3] || "en";

//Models functions 
var Article, createNewArticle;
var Wikiurl, createNewWikiurl;

//Init DB

//Timeline, List of, etc must be removed from analysis

graphodb.init(function(error) {
    
    if(error){
        print("Starting DB Error:");
        print(error);
        return;
    }

    //Get models
    Article = graphodb.models.Article;
    Wikiurl = graphodb.models.Wikiurl; 

    createNewArticle = createModelAsyncFunction(Article, 'create');
    createNewWikiurl = createModelAsyncFunction(Wikiurl, 'create');

    //Crawl all links that has no appended article
    if(process.argv[2] == "--all-empty") {

        var lang = process.argv[3] || "en";
        var qty = parseInt(process.argv[4]) || 1000;

        print("Crawling every wikiurl with no article...");
        Wikiurl.findAll({where:{articleId:null, lang: lang }, limit: qty}).then(function(results){

            //Generate array of urls from the query results
            var urlCollection = [];
            for (var i = 0; i < results.length; i++)
                urlCollection.push(results[i].url);

            //Crawl the url collection
            crawlUrlCollection(urlCollection, lang, function(){
                print("Crawling finished.");
            });     

        }).catch(function(error){
            print(error);
        });  

    } 
    
    //Crawl every links that points to the target link
    else if(process.argv[2] == '--backlinks-of') {

        var page = process.argv[3];
        var lang = process.argv[4] || "en";

        //Get the page backlinks
        print("Getting backlinks...");
        wikipediaApi.getPageBackLinks(page, lang).then(function(backlinks) {
            print(backlinks.length + " backlinks got.");

            //Generate array of urls from the query results
            var urlCollection = [];
            for (var i = 0; i < backlinks.length; i++)
                urlCollection.push(encodeURIComponent(backlinks[i]));

            //Crawl the url collection
            crawlUrlCollection(urlCollection, lang, function(){
                print("Crawling finished.");
            });    

        }, function(err) {
            print("ERROR while getting backlinks:");
            print(err);
        });

    } 
    
    //Crawl all links that the target article linksTo
    else if(process.argv[2] == '--all-target') {

        var page = process.argv[3];
        var lang = process.argv[4] || "en";

        print("Crawling urls of the target url: " + page);

        //Get wikiurl ref
        Wikiurl.findOne({where:{url: page, lang: lang}})
            .then(function(wikiurlRef){
                
                //get article ref
                return Article.findOne({where:{wikiPageId: parseInt(wikiurlRef.articleId)}});
            })
            .then(function(artRef){
                //get article ref
                return artRef.getLinkFromHere();
            })
        
            .then(function(results){

                //Generate array of urls from the query results
                var urlCollection = [];
                for (var i = 0; i < results.length; i++)
                    urlCollection.push(results[i].url);

                //Crawl the url collection
                crawlUrlCollection(urlCollection, lang, function(){
                    print("Crawling finished.");
                }); 

            }).catch(function(error){
                print(error);
            });
    }

    //If no arg has been passed, crawl a unique url passed
    else {

        var page = process.argv[2];
        var lang = process.argv[3] || "en";

        print("Crawling unique page: " + page);

        //Craw a unique page
        crawlUrlCollection([page], lang, function(error){
            if(error) {
                print("Error:")
                print(error);
                writeErrorLog(error);
            } else {
                print("Done Crawling.")
            }
        });
    }

});


//Crawl any collection of wikipedia urls
function crawlUrlCollection(urlCollection, lang, callback) {

    var urlQty = urlCollection.length;
    var downloadsLeft = urlCollection.length;
    var doneQty = 0;

    print("Pages left: " + downloadsLeft);

    var urlCollectionEmptyFlag = false;

    //Queue to handle addition of items into the database
    var databaseQueue = async.queue(function(pageInfo, taskCallback) {
        
        //Add this pageInfo data to the database
        addArticleDataToDb(pageInfo, lang, function(err) {
            taskCallback(err, pageInfo.title);
        });

    }, 1);

    //Callback to be called when the database queue are empty
    databaseQueue.drain = function() {
        console.log("Database queue is empty.");

        //If the url collection to be download is empty, call the finish callback
        if(urlCollectionEmptyFlag)
            callback();
    }

    //Queue to handle the download of the wikipedia pages
    var wikipageQueue = async.queue(function(url, taskCallback) {

        print("Getting links for page: '" + url + "'");

        wikipediaApi.getPageAbstractLinks(url, lang, function(error, pageInfo) {

            downloadsLeft--;

            //If error, exit with it
            if(error) {
                taskCallback(getErrorString(error, 
                    "Crawl Error with page: '" + url + "': "));
                return;
            }

            pageInfo.url = url;

            //Push this pageinfo to the database queue
            databaseQueue.push(pageInfo, function(err, articleTitle) {
                doneQty++;
                if(err) {
                    var errorString = getErrorString(err, 
                        "Error while adding data to database from url " + articleTitle + ": ");
                    print(errorString);
                    writeErrorLog(errorString);
                } else {
                    print("Article '" + articleTitle + "' added to the database.");
                } 
                print("Articles done: " + doneQty + "/" + urlQty);
            });

            //Call the task finish callback
            taskCallback(null, url);
        });

    }, 100);

    //Callback to be called when the wikipages queue are empty
    wikipageQueue.drain = function() {
        console.log("Wikipages queue is empty.");
        urlCollectionEmptyFlag = true;
    }

    wikipageQueue.push(urlCollection, function(err, url){
        if(err) {
            var errorString = getErrorString(err, "Error while downloading page: " + url);
            console.log(errorString);
            writeErrorLog(errorString);
        } else {
            print("Page '" + url + "' downloaded. Pages left: " + downloadsLeft);
        }
    });
}

//Create and execute queries to add the page crawled info into the database
function addArticleDataToDb(pageInfo, lang, callback) {

    //Ensure to escape quotes from the title and url before query
    pageInfo.title = pageInfo.title.replace(/['\\]/g, "\\$&");
    pageInfo.url = pageInfo.url.replace(/['\\]/g, "\\$&");

    //Construct query
    var neoQuery = 
        "MERGE (article:Article { wikiPageId:" + pageInfo.pageId + "})" + 
        " ON CREATE SET article.title = '" + pageInfo.title + "', article.language = '" + lang + "'" + 
        " MERGE (articleUrl:Wikiurl { url_lang:'" + pageInfo.url + "_" + lang + "' })" +
        " ON CREATE SET articleUrl.url = '" + pageInfo.url + "', articleUrl.lang = '" + lang + "'" +
        " SET articleUrl.articleId = '" + pageInfo.pageId + "'" +
        " CREATE UNIQUE (articleUrl)-[:RedirectsTo]->(article)";
        
    for (var i = 0; i < pageInfo.links.length; i++) {
        //Ensure to escape quotes from the link before query
        var link = pageInfo.links[i].replace(/['\\]/g, "\\$&");

        neoQuery += 
            " MERGE (articleLink" + i + ":Wikiurl { url_lang:'" + link + "_" + lang + "' })" +
            " ON CREATE SET articleLink" + i + ".url = '" + link + "', articleLink" + i + ".lang = '" + lang + "'" +
            " CREATE UNIQUE (article)-[:LinksTo]->(articleLink" + i + ")";
    }

    //Add in/out ConnectsTo relation to this article 
    neoQuery += 
        " WITH article MATCH (article)-[:LinksTo]->(:Wikiurl)-[:RedirectsTo]->(targetArticle:Article)" + 
        " CREATE UNIQUE (article)-[:ConnectsTo]->(targetArticle)" +
        " WITH article MATCH (targetArticle:Article)-[:LinksTo]->(:Wikiurl)-[:RedirectsTo]->(article)" + 
        " CREATE UNIQUE (targetArticle)-[:ConnectsTo]->(article)";

    db.cypherQuery(neoQuery, function(error, result) {
        if(error) {
            console.log(error);
            callback(getErrorString(error, 
                "Error while executing query on page: " + pageInfo.title + ": "));
        } else {
            callback();
        }        
    });
}


//Crawl an unique page, register it if not regitered and register its abstract links
function crawlUnique(page, lang, crawlNumber, callback) {

    print("Getting links for page: " + page);

    wikipediaApi.getPageAbstractLinks(page, lang, function(error, pageInfo) {

        //If error, exit with it
        if(error) {
            callback(getErrorString(error, 
                "Crawl Error with page: " + page + ", crawl number " + crawlNumber + ": "));
            return;
        }

        //print(pageInfo.links);

        //print("Data gotten. Filling database...")

        //Try to get a instance of Article with page info or create if not found
        Article
            .findOrCreate({
                where: { wikiPageId: pageInfo.pageId},
                defaults: { title: pageInfo.title, language: lang } //Data to use for the left fields
            })
            .spread(function(articleRef, artCreated) {
                
                //Try to get instance of page wikiurl or create it if not found
                Wikiurl
                    .findOrCreate({ 
                        where: { url: page, lang: lang },
                        defaults: { url_lang: page + "_" + lang }
                    })
                    .spread(function(wikiurlRef, urlCreated) {
                        //Add the wikiurl ref to the article redirection
                        return articleRef.addRedirectUrl(wikiurlRef);
                    })
                    .then(function() {
                        //If the article is already created, return
                        if(!artCreated) {
                            callback(null, crawlNumber);
                            return;
                        }

                        //Add links to article async
                        asyncAddLinksToArticle(articleRef, pageInfo.links, lang, function(error){
                            callback(error, crawlNumber);
                        });
                               
                    })
                    .catch(function(error) {   
                        callback(getErrorString(error, 
                            "Error while find creating article, adding redirect url or adding links to the article:"));
                    });
            })
            .catch(function(error){
                callback(getErrorString(error, "Error while finding or spreading article in database:"));
            });
            

    });
}


//KNOW ISSUES:
//WHEN DEALING WITH TOO MUCH DATA, CONFLICTS ON ADDING LINKS TO ARTICLES ARE FIRED
//APARENTLY OF USE THE SAME ARTICLE SAME TIME
//WHEN TRY TO ADD AN ALREADY PLACE LINK INTO AN ARTICLE, NOTHING HAPPENS
function asyncAddLinksToArticle(article, links, lang, callback) {
    
    //Create or find all links references

    /*var wikiUrlFindOrCreateFunctions = [];
    links.forEach(function(link) {
    
        wikiUrlFindOrCreateFunctions.push(function(taskCallback) {
            Wikiurl
                .findOrCreate({ where: { //Try get or create the wikiurl ref
                    url: link,
                    lang: lang
                }})
                .spread(function(wikiurlRef, created) {
                    taskCallback(null, wikiurlRef);
                })
                .catch(function(err) {
                    taskCallback(getErrorString(err, "Error while getting wikiurl references:\r\n"));
                });
        });
        
    }, this);

    async.parallel(wikiUrlFindOrCreateFunctions, function(error, wikiurls) {
        //Fire error if any
        if(error)
            return callback(getErrorString(error, "Error while asyncAddLinksToArticle:\r\n"));

        //Add the links references to the target article
        article.addLinkFromHere(wikiurls).then(function() {
            callback(); //fire the success callback
        }).catch(function(err){
            //Fire error if any
            callback(getErrorString(err, "Error while adding links to the articles:\r\n"));
        });

    });

    return;*/

    //....Diferent method to do the same thing

    //Create a queue object
    var queue = async.queue(function(link, taskCallback) {
        Wikiurl
            .findOrCreate({  //Try get or create the wikiurl ref
                where: { url: link, lang: lang },
                defaults: { url_lang: link + "_" + lang }
            })
            .spread(function(wikiurlRef, created) {

                //if(!created)
                    //print("LINK " + wikiurlRef.id + " ALREADY EXISTS!")

                //Add the wikiurl ref to the article links
                return article.addLinkFromHere(wikiurlRef);
            })
            .then(function() {
                taskCallback(); //Fire the task callback
            })
            .catch(function(err) {
                var errorString = getErrorString(err, "Error while finding/creating wikiurl or adding wikiurl to article (" 
                    + article.title + "):");
                taskCallback(errorString);
            });

    }, 100);

    queue.drain = function() {
        callback(null, "AsyncAddLinksToArticle finished successfully."); //Fire the callback with success    
    }

    queue.push(links, function(err) {
        if(err) {
            //Write log error here because it is not passed forward
            writeErrorLog(err);
            print("ERROR while adding link to article:");
            print(err);
            return;
        }
    });
}

function getErrorString(errorObj, errorMsg) {
    var errorString;
    try {
        errorString = JSON.stringify(errorObj);
    } catch(e) {
        errorString = errorObj;
    } finally {
        return errorMsg + errorString;
    }
}


function createModelAsyncFunction(model, method) {

    //This will return a function that will return a asyncjs way function
    return function() {
        var args = arguments;
        return function(callback) {
            //'This'' must be the model
            model[method].apply(model, args)
                .then(function(result) {
                    callback(null, result);
                })
                .catch(callback);
        }
    }
}
