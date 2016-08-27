var neo4j = require('node-neo4j');
var Promise = require("bluebird");

var db; //Database connection

module.exports = new neo4jDB();

//Module to store the grapho database related stuff

function neo4jDB() {

    var self = this;

    this.init = function(callback) {

        //Connect to db
        db = new neo4j('http://neo4j:lucas@localhost:7474');

        //Define constraints
        var constQuery = "CREATE CONSTRAINT ON (wikiurl:Wikiurl) ASSERT wikiurl.url_lang IS UNIQUE";

        //Define models
/*



        var Article = {}

        Article.findOrCreate = function()

                Article
            .findOrCreate({
                where: { wikiPageId: pageInfo.pageId},
                defaults: { title: pageInfo.title, language: lang } //Data to use for the left fields
            })
*/

        

        //Extern models
        self.models = {
            Wikiurl: WikiurlModel,
            Article: ArticleModel,
            ArticleLink: {}
        }


        db.cypherQuery(constQuery, function(err, result) {
            callback(err); //Fire the done callback
        });
    }
}

var baseModel = new function() {

    this.checkInheritance = function() {
        if(!this.model)
            throw "This model must be inherited.";
    }

    this.findOne = function(options) {
        this.checkInheritance();

        var self = this;

        return new Promise(function(resolve, reject) {

            if(!options.where)
                return reject("where object is missing on findOne");

            //Construct where object
            var matchQuery = "MATCH (matched:" + self.model + ")";

            var whereObjQuery = getFindWhereQuery(options.where, "matched");
            
            var returnQuery = "RETURN matched LIMIT 1";
            var neoQuery = [matchQuery, whereObjQuery, returnQuery].join(" ");

            console.log(neoQuery);

            db.cypherQuery(neoQuery, function(err, result) {
                if(err) 
                    reject(err);
                else {
                    if(result.data.length == 0)
                        return reject("No results found.");
                     
                    var baseModelData = new self(result.data[0]);
                    resolve(baseModelData); //Resolve signaling when it is created
                }
            });
        });
    }

    this.findAll = function() {

    }

    this.findOrCreate = function(options) {
        this.checkInheritance();

        var self = this;

        return new Promise(function(resolve, reject) {

            if(!options.where)
                return reject("where object is missing on findOrCreate");

            //Construct where object
            var whereObjQuery = getWhereQuery(options.where);

            var matchQuery = "OPTIONAL MATCH (matched:" + self.model + " ";
            matchQuery += whereObjQuery + ")";

            var mergeQuery = "MERGE (node:" + self.model + " ";
            mergeQuery += whereObjQuery + ")";

            var createQuery = "";
            if(options.defaults) {
                createQuery += "ON CREATE SET";
                for (var key in options.defaults) {
                    var value = options.defaults[key];
                    if((typeof value) == 'string')
                        value = '"' + value + '"';

                    createQuery += " node." + key + " = " + value + ", ";
                }
                createQuery = createQuery.substr(0, createQuery.length - 2);
            }
            
            var returnQuery = "RETURN node, matched";
            var neoQuery = [matchQuery, "WITH matched", mergeQuery, createQuery, returnQuery].join(" ");

            db.cypherQuery(neoQuery, function(err, result) {
                if(err) 
                    reject(err);
                else {
                    var created = result.data[0][1] ? false : true;
                    var articleData = new self(result.data[0][0]);
                    resolve([articleData, created]); //Resolve signaling when it is created
                    //must create function to the obj instance
                }
            });
        });
    }

    function getFindWhereQuery(whereObject, matchVar) {
        var whereQuery = "WHERE "

        var whereValues = [];

        for (var key in whereObject) {
            var value = whereObject[key];

            var whereValue = "";

            if(key == "id")
                key = "id(" + matchVar + ")";
            else
                key = matchVar + "." + key;

            must fix this thing of regular expression for case insensitive
            must implement find all method

            if((typeof value) == 'string')
                whereValue += key + " = '" + value + "'";
            else
                whereValue += key + " = " + value;

            whereValues.push(whereValue);
        }

        return whereQuery + whereValues.join(" AND ");
    }


    function getWhereQuery(whereObject) {
        var whereObjQuery = "{ ";
        for (var key in whereObject) {
            if(key == "id")
                continue;
            var value = whereObject[key];

            whereObjQuery += key + ":"

            if((typeof value) == 'string')
                value = '"' + value + '"';

            whereObjQuery += value + ", ";
        }

        //In case no args on where object, return empty
        if(whereObjQuery.length <= 3)
            return "";

        whereObjQuery = whereObjQuery.substr(0, whereObjQuery.length - 2);
        whereObjQuery += " }";

        return whereObjQuery;
    }
}




var ArticleModel = function(articleData) {

    //Copy all data from the object data to this model
    for (var key in articleData)
        this[key] = articleData[key];

    this.id = this._id;

    //articleRef.addRedirectUrl(wikiurlRef);
    this.addRedirectUrl = function(wikiurl) {
        var self = this;
        return new Promise(function(resolve, reject) {

            var matchWikiurlQuery = "MATCH (url:Wikiurl) WHERE id(url) = " + wikiurl._id;
            var setArticleIdQuery = "SET url.articleId = " + self._id + " WITH url";
            var matchArticleQuery = "MATCH (art:Article) WHERE id(art) = " + self._id;
            var createUniqueRedirectToQuery = "CREATE UNIQUE (url)-[:RedirectsTo]->(art)";

            var neoQuery = [matchWikiurlQuery, setArticleIdQuery, matchArticleQuery, createUniqueRedirectToQuery].join(" ");

            db.cypherQuery(neoQuery, function(err) {
                if(err) 
                    reject(err);
                else
                    resolve();
            });
        });
    } 
    
    this.addLinkFromHere = function(wikiurl) {
        var self = this;
        return new Promise(function(resolve, reject) {

            var matchArticleQuery = "MATCH (art:Article) WHERE id(art) = " + self._id;
            var matchWikiurlQuery = "MATCH (url:Wikiurl) WHERE id(url) = " + wikiurl._id;
            var createUniqueRedirectToQuery = "CREATE UNIQUE (art)-[:LinksTo]->(url)";

            var neoQuery = [matchArticleQuery, matchWikiurlQuery, createUniqueRedirectToQuery].join(" ");

            db.cypherQuery(neoQuery, function(err) {
                if(err) 
                    reject(err);
                else
                    resolve();
            });
        });        
    }

    this.getLinkFromHere = function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            //MATCH (n:Article)-[:LinksTo]->(t) WHERE id(n) = 326 RETURN t

            var neoQuery = "MATCH (n:Article)-[:LinksTo]->(t) WHERE id(n) = " + self._id + " RETURN t";

            db.cypherQuery(neoQuery, function(err, results) {
                if(err) 
                    return reject(err);

                if(results.length == 0)
                    return reject("No results returned.");
                
                var resultObjs = [];
                for (var i = 0; i < results.data.length; i++)
                    resultObjs.push(new WikiurlModel(results.data[i]));  

                resolve(resultObjs);
            });
        }); 
    }   
}

var WikiurlModel = function(wikiurlData){
    //Copy all data from the object data to this model
    for (var key in wikiurlData)
        this[key] = wikiurlData[key];

    this.id = this._id;
}

ArticleModel.model = 'Article';
WikiurlModel.model = 'Wikiurl';
ArticleModel.__proto__ = baseModel;
WikiurlModel.__proto__ = baseModel;



