var http = require('http');

var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&format=application%2Fsparql-results%2Bjson&timeout=30000&query=";


getArticlesTypes(["D3.js", "AngularJS", "Elon Musk"], "en", function(error, data) {
    console.log(error);
    console.log(data);

});

function getArticlesTypes(articles, lang, callback) {
    if(articles == null || articles.length == 0) {
        callback("Invalid articles used.");
        return;
    }

    lang = lang || "en";
    //Create the query string

    var queryString = "PREFIX dbo: <http://dbpedia.org/ontology/>\nPREFIX dbp: <http://dbpedia.org/property/>\n\nSELECT DISTINCT ?label ?type WHERE {\n";
    
    var articlesQueries = [];
    for(var i = 0; i < articles.length; i++)
        articlesQueries.push('    { ?article rdfs:label "' + articles[i] + '"@' + lang + ' . }\n');

    //Join all the queries together with UNION keyword
    queryString += '\n' + articlesQueries.join("    UNION \n");    

    //Put the regex filter on the query string
    queryString += '\n    FILTER (!regex(?article, "Category:","i"))\n'; 

    //set article variable
    queryString += '\n    { ?article rdfs:label ?label . }\n';
    //set article language filter
    queryString += '    FILTER ( lang(?label) = "' + lang + '" )\n';

    //set types properties to be gotten
    queryString += '\n' + [
        '    {?article rdf:type ?type . }', 
        '    {?article dbo:type ?type . }', 
        '    {?article dbp:type ?type . }'
    ].join("\n    UNION\n") + '\n';
    
    //set query end brace and order by
    queryString += '\n} ORDER BY ?label';

    //Encode queryString
    queryString = encodeURIComponent(queryString);

    //Execute query get
    simpleHttpGet(queryUrl + queryString, function(error, data) {
        if(error) {
            callback(error);
            return;
        }

        //Convert data to json
        data = JSON.parse(data);

        var resultObj = {}
        
        for(var i = 0; i < data.results.bindings.length; i++) {
            var row = data.results.bindings[i];    

            //Init result obj for the current label if it has not been initiated
            if(resultObj[row.label.value] == undefined)
                resultObj[row.label.value] = [];    

            resultObj[row.label.value].push(row.type.value);
        }

        callback(null, resultObj);

    });

}



/*
PREFIX+dbo%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2F%3E%0D%0APREFIX+dbp%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fproperty%2F%3E%0D%0A%0D%0ASELECT+DISTINCT+%3Farticle+%3Flabel+%3Ftype+%3Flucas+WHERE+%7B%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Microsoft%22%40en+.+%7D%0D%0A++++UNION%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Bill+Gates%22%40en+.+%7D%0D%0A++++UNION%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Paul+Allen%22%40en+.+%7D%0D%0A++++UNION%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Steve+Jobs%22%40en+.+%7D%0D%0A++++UNION%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Elon+Musk%22%40en+.+%7D%0D%0A++++UNION%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%22Barack+Obama%22%40en+.+%7D%0D%0A%0D%0A%0D%0A++++FILTER+%28%21regex%28%3Farticle%2C+%22Category%3A%22%2C%22i%22%29%29%0D%0A%0D%0A++++%7B+%3Farticle+rdfs%3Alabel+%3Flabel+.+%7D%0D%0A++++FILTER+%28+lang%28%3Flabel%29+%3D+%22en%22+%29%0D%0A++++%0D%0A++++%7B%3Farticle+rdf%3Atype+%3Ftype+.+%7D%0D%0A++++UNION%0D%0A++++%7B%3Farticle+dbo%3Atype+%3Ftype+.+%7D%0D%0A++++UNION%0D%0A++++%7B%3Farticle+dbp%3Atype+%3Ftype+.+%7D%0D%0A++++%0D%0A%7DORDER+BY+%3Flabel";
*/

/*var query = 'SELECT DISTINCT * WHERE {{ ?article rdfs:label "Microsoft"@en . }}';
query = encodeURIComponent(query);

simpleHttpGet(queryUrl + query, function(error, data) {
    console.log(error);
    console.log(data);
});*/



function simpleHttpGet(url, callback) {

    var recData = '';

    http.get(url, function(res) {
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            recData += chunk;
        });

        res.on('end', function() {
            callback(null, recData);
        });

        res.on('error', function(e) {
            callback(e);		
        });

    }).on('error', (e) => {
        callback(e);
    });
}