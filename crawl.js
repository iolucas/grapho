//Module to manage async calls
var async = require("async");

//Module to execute crawling functions
var graphodb = require("./database.js");

//Module to extract data from wikipedia
var wikipediaApi = require("./wikipediaApi.js")

//Utils
var print = console.log;
var exit = process.exit;

print("GRAPHO CRAWL")

//Get arguments passed
var page = process.argv[2];
var lang = process.argv[3] || "en";

//Models functions 
var Article, createNewArticle;
var Wikiurl, createNewWikiurl;

//Init DB

graphodb.init(function() {
    
    //Get models
    Article = graphodb.models.Article;
    Wikiurl = graphodb.models.Wikiurl; 

    createNewArticle = createModelAsyncFunction(Article, 'create');
    createNewWikiurl = createModelAsyncFunction(Wikiurl, 'create');

    //Methods:
    //addRedirectUrl
    //addLinkFromHere

    //Craw a unique page
    crawlUnique(page, lang);
    return;


    var a = async.parallel([
        //test
        createNewArticle({title:"Teste1"}),
        createNewArticle({title:"Teste2"}),
        createNewWikiurl({url: 'Teste1', lang: 'pt'}),
        createNewWikiurl({url: 'Teste_1', lang: 'pt'}),
        createNewWikiurl({url: 'Teste2', lang: 'pt'}),
        createNewWikiurl({url: 'Teste_2', lang: 'pt'})

    ], function(err, results) {
        var art1 = results[0];
        var art2 = results[1];
        var url1 = results[2];
        var url2 = results[3];
        var url3 = results[4];
        var url4 = results[5];

        art1.addRedirectUrl([url1, url2])
            .then(function() {
                return art2.addRedirectUrl([url3, url4]);
            })

            .then(function() {
                return art1.addLinkFromHere(url3, {place: 'abstract'});
            })

            .then(function() {
                console.log("Done.")
            })

            .catch(function(error){
                print(error);
            });

        for (var key in art1) {
            console.log(key);
        }   
/*
        url1.update({articleId: art2.get('id')}).then(function() {
            return art1.countWikiurls();
        }).then(function(results) {
            console.log(results);

        });*/

        /*art1.addWikiurl(url1).then(function() {
            return art1.countWikiurls();
        }).then(function(results) {
            console.log(results);

        });*/
    });





});

//Crawl an unique page, register it if not regitered and register its abstract links
function crawlUnique(page, lang) {

    print("Getting links for page: " + page);

    wikipediaApi.getPageAbstractLinks(page, lang, function(error, pageInfo) {

        //If error, exit with it
        if(error) {
            print("Crawl Error");
            print(error);
            exit(1);
        }

        //print(pageInfo.links);

        print("Data gotten. Filling database...")

        //Try to get a instance of Article with page info or create if not found
        Article
            .findOrCreate({
                where: { wikiPageId: pageInfo.pageId},
                defaults: { title: pageInfo.title, language: lang } //Data to use for the left fields
            })
            .spread(function(articleRef, created) {
                
                //Try to get instance of page wikiurl or create it if not found
                Wikiurl
                    .findOrCreate({ where: {
                        url: page,
                        lang: lang
                    }})
                    .spread(function(wikiurlRef, created) {
                        //Add the wikiurl ref to the article redirection
                        return articleRef.addRedirectUrl(wikiurlRef);
                    })
                    .then(function() {
                        //Add links to article async
                        asyncAddLinksToArticle(articleRef, pageInfo.links, lang, function(error, results){
                            print("Crawl done."); 
                        });
                               
                    })
                    .catch(function(err) {    
                        print("Error while find creating article, adding redirect url or adding links to the article.");
                        print(err);
                    });
            })
            .catch(print);
            

    });
}



function asyncAddLinksToArticle(article, links, lang, callback) {

    //Create a queue object
    var queue = async.queue(function(link, taskCallback) {
        Wikiurl
            .findOrCreate({ where: { //Try get or create the wikiurl ref
                url: link,
                lang: lang
            }})
            .spread(function(wikiurlRef, created) {

                //Add the wikiurl ref to the article links
                return article.addLinkFromHere(wikiurlRef, { place: 'abstract' });
            })
            .then(function() {
                taskCallback(); //Fire the task callback
            })
            .catch(taskCallback);

    }, 1);

    queue.drain = function() {
        callback(null, "AsyncAddLinksToArticle finished successfully."); //Fire the callback with success    
    }

    queue.push(links, function(err) {

        if(err) {
            print("ERROR while adding link to article:");
            print(err);
            return;
        }
        
        print("Link done.");
    });
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
