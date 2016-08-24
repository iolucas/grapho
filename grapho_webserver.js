//Import express module
var express = require('express');


function init(callback) {
    // create a new express server
    var app = express();

    //Set static files folder
    app.use(express.static('public'));


}

