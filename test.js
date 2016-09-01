//Module to extract data from wikipedia
var wikipediaApi = require("./wikipediaApi.js");
var fs = require("fs");


wikipediaApi.getPageBackLinks(process.argv[2], "en").then(function(result){
    console.log(result);
    console.log(result.length);

    fs.writeFileSync("result.txt", result.join("\r\n"));

}, function(err) {
    console.log(err);
});