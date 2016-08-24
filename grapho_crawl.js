//Module to manage async calls
var async = require("async");

//Module to execute crawling functions
var graphodb = require("./grapho_database.js");

console.log("GRAPHO CRAWL")

var Article, ArticleTest;

graphodb.init(function() {
    Article = graphodb.models.Article;
    ArticleTest = graphodb.models.ArticleTest;    

    async.parallel([
        function(callback) {
            Article.create({
                title:"Test1",
                language:"en",
                url: "test1"
            }).then(function(article){
                callback(null, article);   
            }).catch(callback);
        },
        function(callback) {
            Article.create({
                title:"Test2",
                language:"en",
                url: "test2"
            }).then(function(article){
                callback(null, article);   
            }).catch(callback);
        }
    ], function(err, results){

        console.log(err);

        var article1 = results[0];
        var article2 = results[1];
            
        for (var key in article1) {
            //if(key.indexOf("count")!= -1)
                console.log(key);
        }

        must find better name for the columns
        analize fields of article models
        start crawling pages urls, titles, etc and only later craw links 
        check better way to solve case of page links redirect

        article1.addLinkFromHere(article2, {place: 'abstract'}).then(function(){
            article2.countLinkToHere().then(function(result){
                console.log(result)

            });
        });



    });



/*
    Article.create({
        title:"Test1",
        language:"en",
        url: "test1"
    })
    
    .then(function(){
        return Article.create({
            title:"Test2",
            language:"en",
            url: "test2"
        })
    })   
    
    
    .then(function(ref){
        console.log("CREATED");
        ref.addLink(ref, {place: 'abstract'});

        console.log(ref.getArticle);
        console.log(ref.getLink)

        for (var key in ref) {
            console.log(key)
        }
    });*/


});