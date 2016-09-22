var wikipediaApi = require("./wikipediaApi.js");
var dbpediaApi = require("./dbpediaApi.js");
var async = require("async"); //Module to execute async ops
var fs = require("fs");

//Utils
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

//Excluded article types
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

//Get parameters
var mainArticleUrl = process.argv[2];
var lang = process.argv[3] || 'en';

//Object array to store all the articles references (init with main article)
var articlesObjs = [{ url: mainArticleUrl }];

//Execute serial functions
async.waterfall([

    //Get main article abstract links
    function(callback) {
        wikipediaApi.getPageAbstractLinks(articlesObjs[0].url, lang, function(err, result) {
            if(err) return callback(err);

            //Set main article abstract links
            articlesObjs[0].abstractLinks = result.links;

            //Create objects for every abstract link
            result.links.forEach(function(link) {
                articlesObjs.push({ url: link });        
            }, this);

            callback();
        });
    }






], function(err, results) {
    console.log(arguments);
    console.log(articlesObjs);
    console.log("DONE");
});


function populateArticlesAbstractLinks() {

    wikipediaApi.getPageAbstractLinks(encodeURIComponent(articleTitle), lang, function(err, result) {
        if(err) 
            return callback(err);
        
        var pageChilds = [];

        result.links.forEach(function(link) {
            pageChilds.push(decodeURIComponent(link.replaceAll("_", " ")));        
        }, this);

        callback(null, pageChilds);
    });


}