//Module to manage async calls
var async = require("async");

//Module to execute crawling functions

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


//Get arguments passed
var page = process.argv[2];
var lang = process.argv[3] || "en";

//Models functions 
var Article, createNewArticle;
var Wikiurl, createNewWikiurl;

//Init DB

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

    if(page == '--backlinks-of') {
        page = process.argv[3];
        lang = process.argv[4] || "en";

        //Get the page backlinks
        print("Getting backlinks...");
        wikipediaApi.getPageBackLinks(page, lang).then(function(backlinks) {
            print(backlinks.length + " backlinks got.");

            totalLinks = backlinks.length;
            currentLink = 0;
            doneLinks = 0;

            //Create a queue object
            var queue = async.queue(function(wikiLink, taskCallback) {
                //encoded the backlink
                wikiLink = encodeURIComponent(wikiLink);

                currentLink++;
                print("Crawling link " + currentLink + " of " + totalLinks + "...");
                crawlUnique(wikiLink, lang, currentLink, function(err, crawlNumber) {
                    doneLinks++;

                    if(err) {
                        print(err);
                        writeErrorLog(err);
                    } else {
                        print("Done with crawl number " + crawlNumber);
                    }

                    var leftLinks = totalLinks - doneLinks;

                    print(leftLinks + " links left.");    

                    //In case a crawl fails here just print error, keep with the queue (call taskcallback with no errors)
                    taskCallback(err);
                });

            }, 100);

            queue.drain = function(err) {
                if(err) {
                    print("ERROR while adding crawling:");
                    print(err);
                } else {
                    print("Crawl empty article wikiUrls finished successfully."); //Fire the callback with success
                } 
                saveErrorLog();                   
            }

            queue.push(backlinks, function(err) {

                if(err) {
                    print("ERROR while adding crawling:");
                    writeErrorLog(err);
                    print(err);
                    return;
                }
                
                //print("Link done.");
            });        



        }, function(err) {
            print("ERROR while getting backlinks:");
            print(err);
        });

    } else if(page == '--all-target') {

        page = process.argv[3];
        lang = process.argv[4] || "en";

        crawlLinksOfTargetPage(page, lang, function(err) {
            if(err)
                print(err)

            print("Done all links on the target");
        });
    }

    //If this is true, we must crawl all the links with empty articles
    else if(page == '--all-empty') {
        var totalLinks, doneLinks, currentLink;
        print("Crawling every wikilink without article...")
        Wikiurl.findAll({where:{articleId:null}}).then(function(results){

            /*result.forEach(function(link) {
                print(link.url);
            }, this);*/

            totalLinks = results.length;
            currentLink = 0;
            doneLinks = 0;


            //Create a queue object
            var queue = async.queue(function(wikiLink, taskCallback) {
                currentLink++;
                print("Crawling link " + currentLink + " of " + totalLinks + "...");
                crawlUnique(wikiLink.url, wikiLink.lang, currentLink, function(err, crawlNumber) {
                    doneLinks++;

                    if(err) {
                        print(err);
                        writeErrorLog(err);
                    } else {
                        print("Done with crawl number " + crawlNumber);
                    }

                    var leftLinks = totalLinks - doneLinks;

                    print(leftLinks + " links left.");    

                    //In case a crawl fails here just print error, keep with the queue (call taskcallback with no errors)
                    taskCallback(err);
                });

            }, 100);

            queue.drain = function(err) {
                if(err) {
                    print("ERROR while adding crawling:");
                    print(err);
                } else {
                    print("Crawl empty article wikiUrls finished successfully."); //Fire the callback with success
                } 
                saveErrorLog();                   
            }

            queue.push(results, function(err) {

                if(err) {
                    print("ERROR while adding crawling:");
                    writeErrorLog(err);
                    print(err);
                    return;
                }
                
                //print("Link done.");
            });        

        }).catch(function(error){
            print(error);
        });     
    } else {

        //Craw a unique page
        crawlUnique(page, lang, 1, function(error){
            if(error) {
                print("Error:")
                print(error);
                writeErrorLog(error);
            } else {
                print("Done Crawling.")
            }
            saveErrorLog();
        });
    }

});


function crawlLinksOfTargetPage(page, lang, callback) {
    var totalLinks, doneLinks, currentLink;

    //Get wikiurl ref
    Wikiurl.findOne({where:{url: page, lang: lang}})
        .then(function(wikiurlRef){
            
            //get article ref
            return Article.findOne({where:{id: wikiurlRef.articleId}});
        })
        .then(function(artRef){
            //get article ref
            return artRef.getLinkFromHere();
        })
        
        /*.then(function(links) {
            console.log(links)
            if(!links) {
                print("No links were return.")
                return;
            }

            //Put all the links articleIds into an array
            var linksArticleIds = [];
            links.forEach(function(link) {
                linksArticleIds.push(link.articleId);        
            }, this);

            print("Crawling every target page link...");
            
            return Wikiurl.findAll({ where: { id: linksArticleIds }});
        })*/
    
        .then(function(results){
            
            /*result.forEach(function(link) {
                print(link.url);
            }, this);*/

            totalLinks = results.length;
            currentLink = 0;
            doneLinks = 0;


            //Create a queue object
            var queue = async.queue(function(wikiLink, taskCallback) {
                currentLink++;
                print("Crawling link " + currentLink + " of " + totalLinks + "...");
                crawlUnique(wikiLink.url, wikiLink.lang, currentLink, function(err, crawlNumber) {
                    doneLinks++;

                    if(err) {
                        print(err);
                        writeErrorLog(err);
                    } else {
                        print("Done with crawl number " + crawlNumber);
                    }

                    var leftLinks = totalLinks - doneLinks;

                    print(leftLinks + " links left.");    

                    //In case a crawl fails here just print error, keep with the queue (call taskcallback with no errors)
                    taskCallback(err);
                });

            }, 100);

            queue.drain = function(err) {
                if(err) {
                    print("ERROR while adding crawling:");
                    print(err);
                } else {
                    print("Crawl empty article wikiUrls finished successfully."); //Fire the callback with success
                } 
                saveErrorLog();
                callback();                   
            }

            queue.push(results, function(err) {

                if(err) {
                    print("ERROR while adding crawling:");
                    writeErrorLog(err);
                    print(err);
                    return;
                }
                
                //print("Link done.");
            });        

        }).catch(function(error){
            print(error);
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
                    .findOrCreate({ where: {
                        url: page,
                        lang: lang
                    }})
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
            .findOrCreate({ where: { //Try get or create the wikiurl ref
                url: link,
                lang: lang
            }})
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
