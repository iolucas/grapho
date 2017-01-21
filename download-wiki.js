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
var Article;
var Wikiurl;

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

        wikipediaApi.getPageWikiLinks(url, lang, function(error, pageInfo) {

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

    }, 10);

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
    pageInfo.html = pageInfo.html.replace(/['\\]/g, "\\$&");

    //Construct query
    
    //We try to get the current article by its id, if it does not exists, we create it
    //We try to get the wikiurl that led us to the article by its url, if it doest no exists, we create it
    //Finally we create a relation between the url and the article if it does not exists (create unique)
    
    var neoQuery = 
        "MERGE (article:Article { wikiPageId:" + pageInfo.pageId + "})" + 
        " ON CREATE SET article.name = '" + pageInfo.title + 
        "', article.language = '" + lang + 
        // "', article.html = '" + pageInfo.html +
        "' MERGE (articleUrl:Wikiurl { url_lang:'" + pageInfo.url + "_" + lang + "' })" +
        " ON CREATE SET articleUrl.url = '" + pageInfo.url + "', articleUrl.lang = '" + lang + "'" +
        " SET articleUrl.articleId = '" + pageInfo.pageId + "'" +
        " CREATE UNIQUE (articleUrl)-[:RedirectsTo]->(article)";
        
    
    //We iterate thry the article links
    //We try to get the wikiurl by the link url, if we do not suceed, we create it
    //then we create a link between the wikiurl and the article if it does not exists (create unique)
    

    console.log(pageInfo.links.length);
    for (var i = 0; i < pageInfo.links.length; i++) {
        //Ensure to escape quotes from the link before query
        var link = pageInfo.links[i].replace(/['\\]/g, "\\$&");

        neoQuery += 
            " MERGE (articleLink" + i + ":Wikiurl { url_lang:'" + link + "_" + lang + "' })" +
            " ON CREATE SET articleLink" + i + ".url = '" + link + "', articleLink" + i + ".lang = '" + lang + "'" +
            " CREATE UNIQUE (article)-[:LinksTo]->(articleLink" + i + ")";
    }

    //Add in/out ConnectsTo relation to this article 
    //TODO: check how much does this part of code slow down the whole thing, if it is much, we must try to improve it
    // neoQuery += 
    //     " WITH article MATCH (article)-[:LinksTo]->(:Wikiurl)-[:RedirectsTo]->(targetArticle:Article)" + 
    //     " CREATE UNIQUE (article)-[:ConnectsTo]->(targetArticle)" +
    //     " WITH article MATCH (targetArticle:Article)-[:LinksTo]->(:Wikiurl)-[:RedirectsTo]->(article)" + 
    //     " CREATE UNIQUE (targetArticle)-[:ConnectsTo]->(article)";


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


