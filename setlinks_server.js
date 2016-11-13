var express = require('express');
var bodyParser = require('body-parser');
var neo4j = require('node-neo4j');
var fs = require("fs");

/*db.cypherQuery(constQuery, function(err, result) {
    taskCallback(err); //Fire the taskCallback
});*/

// create a new express server
var app = express();

//Database connection
var db = new neo4j('http://neo4j:lucas@localhost:7474');

//Utils
var print = console.log;
RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\\\$&");
};

app.use(express.static('public'));
app.use(bodyParser.json());//To support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); //To support URL-encoded bodies



//REST Api
app.get("/get/:article", function(req, res) {
    
    //Ensure regex chars are escaped
    var article = RegExp.escape(req.params.article);
    
    var neoQuery = "MATCH (n:Article)-[:ConnectsTo]->(t:Article)<-[r:ConnectsTo]-(:Article) WHERE n.title=~'(?i)^" + article + "$' RETURN n,t, count(r)";
    
    db.cypherQuery(neoQuery, function(err, result) {
        //Return error if any
        if(err)
            return res.json(err);

        //If no results, return msg
        if(result.data.length <= 0)
            return res.json(JSON.parse("{error: 'NO RESULTS RETURNED.'}"));

        //Get article title and put on response page
        var articleTitle = result.data[0][0].title;

        var returnObj = {
            article: articleTitle,
            links: []
        }

        //Sort result data
        result.data.sort(function(a,b) {
            return b[2] - a[2];
        });

        //Construct page link structure
        for (var i = 0; i < result.data.length; i++) {
            var data = result.data[i];
            returnObj.links.push({
                title: data[1].title,
                linksToHere: data[2]
            });
            
//            selectHTML +=  data[0].title + 
//                options.replace("<!-- TARGET-TITLE -->", data[1].title) + 
//                "<a href='/" + data[1].title + "' target='_blank'>" + data[1].title + "</a> " + 
//                "<a href='https://en.wikipedia.org/wiki/" + data[1].title + "' target='_blank'>Wikipedia</a> - " + data[2] + "<br><br>";
        }
        
//        indexPage = indexPage.replace("<!-- CONTENT-AREA -->", selectHTML);
//        
//        return res.send(indexPage);
        
        return res.json(returnObj);
    });
});





//Append method to response obj
app.response.jsonError = function(error) {
    return this.json({
        error: error
    });    
}

app.get("/", function(req, res){
    res.send("MISSING ARTICLE");
});

app.get("/:article", function(req, res) {

    //Load html page
    var indexPage = fs.readFileSync("public/set-links.html", "utf8");

    //Ensure regex chars are escaped
    var article = RegExp.escape(req.params.article);


    var neoQuery = "MATCH (n:Article)-[:ConnectsTo]->(t:Article)<-[r:ConnectsTo]-(:Article) WHERE n.title=~'(?i)^" + article + "$' RETURN n,t, count(r)";

    db.cypherQuery(neoQuery, function(err, result) {
        //Return error if any
        if(err)
            return res.json(err);

        //If no results, return msg
        if(result.data.length <= 0)
            return res.send("NO RESULTS RETURNED.");

        //console.log(result.data);

        //Get article title and put on response page
        var articleTitle = result.data[0][0].title;
        indexPage = indexPage.replace(/<!-- ARTICLE-TITLE -->/g, articleTitle);

        var selectHTML = "";

        /*var options = [
            '<select name="<!-- TARGET-TITLE -->">',
                '<option value="">-----------</option>',
                '<option value="needs">Pre-requisíto</option>',
                '<option value="related">Relacionado</option>',
                '<option value="charac">Característica</option>',
                '<option value="baseof">BaseOf</option>',
            '</select><br><br>'
        ].join("\n");*/

        var options = [
            ' <select name="<!-- TARGET-TITLE -->">',
                '<option value="">-----------</option>',
                '<option value="isChildOfMain"><-BelongsTo-</option>',
                '<option value="isParentOfMain">-BelongsTo-></option>',
                '<option value="infoFlowsToMain"><-Infoflow-</option>',
                '<option value="infoFlowsFromMain">-Infoflow-></option>',
            '</select> '
        ].join("\n");

        //Sort result data
        result.data.sort(function(a,b) {
            return b[2] - a[2];
        });

        //Construct page link structure
        for (var i = 0; i < result.data.length; i++) {
            var data = result.data[i];
            
            selectHTML +=  data[0].title + 
                options.replace("<!-- TARGET-TITLE -->", data[1].title) + 
                "<a href='/" + data[1].title + "' target='_blank'>" + data[1].title + "</a> " + 
                "<a href='https://en.wikipedia.org/wiki/" + data[1].title + "' target='_blank'>Wikipedia</a> - " + data[2] + "<br><br>";
        }
        
        indexPage = indexPage.replace("<!-- CONTENT-AREA -->", selectHTML);
        
        return res.send(indexPage);
    });
});


app.post("/test", function(req,res) {
    console.log(req.body);
    res.json(req.body);
});

app.post("/create-links", function(req,res) {

    var neoQuery = "MATCH (n:Article) WHERE n.title='" + req.body["--article-name"] + "'";
    for (var key in req.body) {
        if(key == "--article-name")
            continue;

        var relation = "";

        switch(req.body[key]) {
            /*case "pos":
                relation = "<-[:Needs{strong:100}]-";
                break;
            case "pre":
                relation = "-[:Needs{strong:100}]->";
                break;*/
            case "isChildOfMain":
                relation = "<-[:BelongsTo]-";
                break;
            case "isParentOfMain":
                relation = "-[:BelongsTo]->";
                break;
            case "infoFlowsToMain":
                relation = "<-[:Infoflow]-";
                break;
            case "infoFlowsFromMain":
                relation = "-[:Infoflow]->";
                break;
            default:
                continue;
        }
        neoQuery += " WITH n MATCH (t:Article) WHERE t.title='" + key +
            "' CREATE UNIQUE (n)" + relation + "(t)";
    }


    //MUST ENSURE HERE THAT THERE IS NO CYCLE
    db.cypherQuery(neoQuery, function(err, result) {
        res.json(arguments);
    });

    //console.log(req.body);
    //res.json(req.body);
    //res.send(neoQuery);
});



//Init server
print("Starting server...");
app.listen(7000, function () {
    console.log('Grapho Server running on port 7000.');
});