var neo4j = require('node-neo4j');

var queryString = process.argv[2];

console.log(queryString);

//Connect to db
var db = new neo4j('http://neo4j:lucas@localhost:7474');

db.cypherQuery(queryString, function(err, result) {
    console.log(result.data);
});