//Load async module
var async = require("async");

//Models functions 
var Article;
var Wikiurl;

//Utils
var print = console.log;


//------------------Test Stuff ----------------//

//Module to execute crawling functions
/*var graphodb = require("./database.js");

//Get arguments passed
var page = process.argv[2];
var lang = process.argv[3] || "en";

//Init DB
print("Loading database...");
graphodb.init(function() {
    init(graphodb)
    print("Database loaded.");
    main();
});

function main() {
    //Get the article reference
    getArticleDataByUrl(page, lang,1, function(error, articleData){
        console.log(JSON.stringify(articleData));

    });
}*/

//---------------------------------------------//

module.exports = {
    init: init, 
    getArticleDataByUrl: getArticleDataByUrl
}


function init(graphodbReference) {
    //Get models
    Article = graphodbReference.models.Article;
    Wikiurl = graphodbReference.models.Wikiurl; 
}

function getArticleDataByUrl(url, lang, deepLevel, callback) {

    var articleData = {}

    getArticleByUrl(url, lang, function(error, article) {

        if(error)
            return callback(error);

        //Get the article links
        var resultObject = {}
        getArticleLinksRecursive(article, resultObject, deepLevel, function(error) {

            if(error)
                return callback(error);
            
            return callback(null, resultObject);

        });
    });
}

//Labels for the data
var artTitle = "name";
var artLinks = "children";

//Recursive function to populate a resultObject with articles and its links
function getArticleLinksRecursive(article, resultObject, deepLevel, callback, uniqueIdDict) {

    deepLevel = deepLevel || 1;

    uniqueIdDict = uniqueIdDict || {}

    resultObject[artTitle] = article.title;
    resultObject.id = article.id;

    //Check if the article Id is in the unique id rect
    if(uniqueIdDict[article.id]) {
        //If so, this id was already placed here, 
        //Place the article and its id for reference in the result obj
        //fire success callback and return
        callback(); //Fire callback successfully
        return;
    } else {
        //If not, place it and keep going
        uniqueIdDict[article.id] = true;
    }

    //Get links from the article
    //Must filter null links
    //Solved. The filter already do that on try to find null id articles (not allowed)
    article.getLinkFromHere({
            attributes: ['articleId']
        })
        
        .then(function(links) {

            if(!links)
                return callback("No links were return.");

            //Put all the links articleIds into an array
            var linksArticleIds = [];
            links.forEach(function(link) {
                linksArticleIds.push(link.articleId);        
            }, this);

            return Article.findAll({ where: { id: linksArticleIds }});
        })

        .then(function(articles) {
            
            //If articles length are 0, fire success callback and return
            if(articles.length == 0) {
                callback();
                return;
            }

            resultObject[artLinks] = [];

            deepLevel--; //Subtract one deep level
            if(deepLevel <= 0) { //If it is less or equal to zero, means recursion has ended,
                //Add article data to the result object
                articles.forEach(function(art) {
                    var newObject = {}
                    newObject[artTitle] = art.title;
                    newObject.id = art.id;
                    resultObject[artLinks].push(newObject);  

                }, this);
                callback(); //Fire callback successfully

            } else { //If not, recurse this function async for each link

                //Assign an asyncId to all the articles for control purposes
                for (var i = 0; i < articles.length; i++)
                    articles[i].asyncId = i;

                //Create async queue
                var asyncQueue = async.queue(function(art, taskCallback) {
                    //Create a object for the article async id
                    resultObject[artLinks][art.asyncId] = {}
                   
                    //call this function recursive
                    getArticleLinksRecursive(art, resultObject[artLinks][art.asyncId], deepLevel, function(err) {
                        if(err) //If some error, print it
                            print(err);

                        taskCallback(); //Fire task callback successfully
                    }, uniqueIdDict);

                }, 1);

                //Once tasks ends
                asyncQueue.drain = function() {
                    callback(); //Fire callback successfully
                }

                //Push all the articles to the queue
                asyncQueue.push(articles, function(err) {
                    if(err)
                        print(err);
                });
            }                  

        })
        
        .catch(function(error){
            callback(error);
        });
}


function getArticleByUrl(url, lang, callback) {

    //Get article by its url
    Wikiurl.findOne({where: {
        url: url,
        lang: lang
    }})
    .then(function(wikiurlRef){
        //If not found, return error
        if(wikiurlRef == null)
            return callback("Url not found");

        //Get article from the wikiurl articleID
        return Article.findOne({where: {
            id: wikiurlRef.articleId
        }});
    })
    .then(function(articleRef){
        callback(null, articleRef);
    })    
    
    .catch(function(err){
        callback(err);
    });
}



function logError(errorString) {
    print("ERROR: " + errorString);
}