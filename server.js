var express = require('express');

// create a new express server
var app = express();

//load fastcsv
var csv = require("fast-csv");

//load async JSON
var async = require("async");

//Module to execute crawling functions
var graphodb = require("./database.js");

//Utils
var print = console.log;

//Models functions 
var Article;
var Wikiurl;

app.use(express.static('public'));


//Append method to response obj
app.response.jsonError = function(error) {
    return this.json({
        error: error
    });    
}


app.get("/get_article", function(req, res) {
    var url = req.query.url;
    var lang = req.query.lang || "en";
    
    if(!url)
        return res.jsonError("Url is missing.");

    var responseObj = {
        url: url,
        lang: lang
    }

    //Get article by its url
    Wikiurl.findOne({where: {
        url: url,
        lang: lang
    }}).then(function(wikiUrlRef){
        //If not found
        if(wikiUrlRef == null)
            return res.jsonError("Url not found");

        //return res.json(arguments);

        //Get article reference
        return Article.findOne({where: {
            id: wikiUrlRef.articleId
        }});
    })
    .then(function(articleRef){
        //If not found
        if(articleRef == null)
            return res.jsonError("Article not found");


        //Get links from this page
        return articleRef.getLinkFromHere({
            attributes: ['url']
        });
    })
    .then(function(articleLinks){

        var links = []

        articleLinks.forEach(function(link) {
            links.push(link.url);        
        }, this);

        will need to add id for compare links
        links that do not have articles cant participate
        

        responseObj.links = links;
        res.json(responseObj);
    })
    
    .catch(function(error) {
        if(!error)
            return res.json("Unknown error.");

        return res.jsonError(error);
    });


});

app.get('/get_nodes_and_links', function (req, res) {

    //Get objects
    async.parallel([
        function(callback) { 
            readCsv("database/nodes.csv",function(nodes) {
                callback(null, nodes);
            });
        },
        function(callback) { 
            readCsv("database/links.csv",function(links) {
                callback(null, links)
            });
        }
    ], function(err, results) {
        // optional callback
        res.send(JSON.stringify({
            result: "SUCCESS",
            nodes: results[0],
            links: results[1]        
        }));
    });


});


//Init DB
print("Loading database...");
graphodb.init(function() {

    //Get models
    Article = graphodb.models.Article;
    Wikiurl = graphodb.models.Wikiurl; 

    print("Database loaded.");
    print("Starting server...");

    //Init server
    app.listen(8000, function () {
        console.log('Grapho Server running on port 8000.');
    });

});


function readCsv(path, callback) {
    var objects = []

    csv.fromPath(path, { headers:true })
        .on("data", function(data){
            objects.push(data);
        })
        .on("end", function(){
            callback(objects);
        });
}