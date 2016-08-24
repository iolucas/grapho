var express = require('express');

// create a new express server
var app = express();

//load fastcsv
var csv = require("fast-csv");

//load async JSON
var async = require("async")


//Get nodes and links on the file


app.use(express.static('public'));

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

app.listen(8000, function () {
    console.log('Example app listening on port 8000!');
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