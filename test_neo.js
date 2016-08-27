//Module to execute crawling functions
var graphodb = require("./neo4jdb.js");

//Utils
var print = console.log;

//Models functions 
var Article, createNewArticle;
var Wikiurl, createNewWikiurl;

graphodb.init(function(error) {
    if(error)
        return console.log(error);

    console.log("DB Started.\n");

    //Get models
    Article = graphodb.models.Article;
    Wikiurl = graphodb.models.Wikiurl; 

    /*Wikiurl.findOrCreate({
        where:{wikipageid:5640394356, teste:"lucasssas"},
        default:{name:1000}
    }).spread(function(data, created){
        console.log(data);
        console.log(created);
    });
    return;*/
    Article.findOne({where:{id: 292}})
    //Wikiurl.findOne({where:{url: "MQTT", lang: "en"}})
        .then(function(wikiurlRef){
            console.log(wikiurlRef);
            //get article ref
            //return Article.findOne({where:{id: wikiurlRef.articleId}});
        })
        /*.then(function(artRef){
            //get article ref
            return artRef.getLinkFromHere();
        })*/
        .catch(function(err){
            print(err);
        });


});