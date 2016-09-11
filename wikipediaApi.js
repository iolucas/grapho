var https = require('https');
var Promise = require('promise');
var cheerio = require('cheerio');
var async = require('async');

//Utils
var print = console.log;

var wikipediaApiUrl = ".wikipedia.org/w/api.php";

//https://en.wikipedia.org/w/api.php?action=query&redirects&pllimit=500&format=jsonfm&prop=links&titles=TCP/IP
//https://en.wikipedia.org/w/api.php?action=parse&redirects&section=0&prop=text&format=jsonfm&page=c_sharp


//Get page reference in other languages
//https://en.wikipedia.org/w/api.php?action=parse&redirects&section=0&prop=langlinks&format=jsonfm&page=MQTT

//Get page categories (more pages may be passed using |)
//https://en.wikipedia.org/w/api.php?action=query&titles=MQTT&prop=categories

//True search page
//https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Java&utf8=&srprop=titlesnippet|size|wordcount|timestamp|snippet|redirecttitle|redirectsnippet|sectiontitle|sectionsnippet&srlimit=500&srinterwiki


//Get some page back links
//https://en.wikipedia.org/w/api.php?action=query&list=backlinks&bllimit=250&blfilterredir=all&blnamespace=0&bltitle=Tibia_(video_game)&blredirect

module.exports = {

    getPageNonReverseAbstractLinks: null,

    getPageAbstractLinks: getAbstractLinks,

    getPageLinks: getPageLinks,

    getPageBackLinks: getPageBackLinks,

    getPageWikiLinks: getPageWikiLinks
}

//Get all the page wiki links base on the page parse
function getPageWikiLinks(page, lang, callback) {
    //Obs.: Page must already been encoded

    if(!page || !lang) {
        callback("ERROR: Insuficient arguments.");
        return;
    }

    var reqUrl = "https://" + lang + wikipediaApiUrl + "?action=parse&redirects&prop=text&format=json&page=" + page;

    simpleHttpsGet(reqUrl, function(error, reqData) {
        if(error) {
            callback("ERROR:" + error);
            return;
        }

        //Parse json object that contains only the abstract portion of the page
        var reqObj = JSON.parse(reqData);            


        //Check some error
        if(reqObj['error']) {
            //Throw reject error
            callback("ERROR:" + reqObj['error']['code'] + " | " + reqObj['error']['info']);
            return;
        }

        //Get page info
        var pageTitle = reqObj['parse']['title'];
        var pageId = reqObj['parse']['pageid'];

        //Check if page has subtitle
        //Regex get the data inside some () found
        //var subtitleMatch = pageTitle.match(/\((.+)\)/)
        //print(testString.match(/\((.+)\)/));

        //Get the abstract html data
        var htmlData = reqObj['parse']['text']['*']
    
        //Load it on cheerio (jQuery like module)
        $ = cheerio.load(htmlData);

        var links = []

        //Get all the <a> tags inside the <p> tags,(where the abstract is placed) and put them into the links array
        $('a').each(function(i, elem) {
                
            var link = $(this).attr('href');

            //var notAllowedChars

            //Check the link exists and is a wiki link
            //Get only wikipedia links
            //Remove pages that contains a colon (":"). Their offen are special pages. Not sure if there is articles with colon
            if(link 
                && link.indexOf("/wiki/") == 0 
                && link.indexOf(":") == -1
            ) { 
                //We MUST NOT use last index of / to get the path cause some titles like TCP/IP, have bar in the title
                //var lastPathIndex = link.lastIndexOf("/") + 1;
                //We should use the '/wiki/' string length
                var linkName = link.substring(6);

                //Remove hashtag from url if any
                var hashIndex = linkName.indexOf("#");
                if(hashIndex != -1)
                    linkName = linkName.substring(0, hashIndex);

                //If the link is not in the links array, push it 
                //if(links.indexOf(linkName) == -1)
                links.push(linkName);
            }                
        });

        //Return success with the page abstract links
        callback(null, {
            title: pageTitle,
            pageId: pageId,
            links: links    
        });  

    });
}



function getAbstractLinks(page, lang, callback) {

    //Obs.: Page must already been encoded

    if(!page || !lang) {
        callback("ERROR: Insuficient arguments.");
        return;
    }

    var reqUrl = "https://" + lang + wikipediaApiUrl + "?action=parse&redirects&section=0&prop=text&format=json&page=" + page;

    simpleHttpsGet(reqUrl, function(error, reqData) {

        if(error) {
            callback("ERROR:" + error);
            return;
        }

        //Parse json object that contains only the abstract portion of the page
        var reqObj = JSON.parse(reqData);            


        //Check some error
        if(reqObj['error']) {
            //Throw reject error
            callback("ERROR:" + reqObj['error']['code'] + " | " + reqObj['error']['info']);
            return;
        }

        //Get page info
        var pageTitle = reqObj['parse']['title'];
        var pageId = reqObj['parse']['pageid'];

        //Check if page has subtitle
        //Regex get the data inside some () found
        //var subtitleMatch = pageTitle.match(/\((.+)\)/)
        //print(testString.match(/\((.+)\)/));

        //Get the abstract html data
        var htmlData = reqObj['parse']['text']['*']
    
        //Load it on cheerio (jQuery like module)
        $ = cheerio.load(htmlData);

        var links = []

        //Get all the <a> tags inside the <p> tags,(where the abstract is placed) and put them into the links array
        $('a', 'p').each(function(i, elem) {
                
            var link = $(this).attr('href');

            //var notAllowedChars

            //Check the link exists and is a wiki link
            //Get only wikipedia links
            //Remove pages that contains a colon (":"). Their offen are special pages. Not sure if there is articles with colon
            if(link 
                && link.indexOf("/wiki/") == 0 
                && link.indexOf(":") == -1
            ) { 
                //We MUST NOT use last index of / to get the path cause some titles like TCP/IP, have bar in the title
                //var lastPathIndex = link.lastIndexOf("/") + 1;
                //We should use the '/wiki/' string length
                var linkName = link.substring(6);

                //Remove hashtag from url if any
                var hashIndex = linkName.indexOf("#");
                if(hashIndex != -1)
                    linkName = linkName.substring(0, hashIndex);

                //If the link is not in the links array, push it 
                if(links.indexOf(linkName) == -1)
                    links.push(linkName);
            }                
        });

        //Return success with the page abstract links
        callback(null, {
            title: pageTitle,
            pageId: pageId,
            links: links    
        });     

    });
}


/*getPageAbstractNonReverseLinks("Tibia_(computer_game)").then(function(links) {
    console.log(JSON.stringify(links));
}, function(err) {
    console.log(err);
});*/


// create a queue object with concurrency 2
/*var q = async.queue(function(task, callback) {
    console.log('hello ' + task.name);
    callback();
}, 2);

// assign a callback
q.drain = function() {
    console.log('all items have been processed');
};

// add some items to the queue
q.push({name: 'foo'}, function(err) {
    console.log('finished processing foo');
});
q.push({name: 'bar'}, function (err) {
    console.log('finished processing bar');
});

// add some items to the queue (batch-wise)
q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
    console.log('finished processing item');
});

// add some items to the front of the queue
q.unshift({name: 'bar'}, function (err) {
    console.log('finished processing bar');
});*/



/*function getPageAbstractNonReverseLinks(page, lang) {

    lang = lang || "en";

    return new Promise(function(resolve, reject) {

        var nonReverseLinks = [];

        getNormalizeWikiLink(page, lang)

            //Normalize page address
            .then(function(normPage){
                return getPageAbstractLinksFromLinks(normPage, lang);
            }, reject)

            //Get the links from the links
            .then(function(linksCollection) {
        
                var mainLinks = linksCollection['links'];
                var mainPage = linksCollection['page'];

                mainLinks.forEach(function(childLink) {
                    
                    var childLinkLinks = childLink['links'];




                }, this);



                //Accumulator to detect end of the request
                var iterationAccumulator = mainLinks.length;

                for (var i = 0; i < mainLinks.length; i++) {
                    var childLink = links[i];


                    
                    getNormalizeWikiLink(link, lang)
                        .then(function(normChildPage){
                            //If the current link
                            if(normChildPage != links['page'])           

                        }, reject);    
                }



            }, reject);
    });
}*/


/*getPageAbstractNonReverseLinks("C%2B%2b").then(function(links) {
    console.log(links);
    console.log(links.length);
}, function(err) {
    console.log(err);
});*/



function getPageAbstractNonReverseLinks(page, lang) {

    lang = lang || "en";

    var nonReverseLinks = [];

    return new Promise(function(resolve, reject) {

        //Get the specified page links
        getPageAbstractLinks(page, lang).then(function(links) {

            var asyncQueue = async.queue(function(link, callback) {
                //console.log("Processing: " + link)

                getPageAbstractLinks(link, lang).then(function(childLinks) {
                    
                    //Check if the main page is not in the childLink links
                    print(page);
                    if(childLinks.indexOf(page.toUpperCase()) == -1)
                        nonReverseLinks.push(link); //If not (nonReverse) add it

                    callback();
                }, function(err) {
                    callback(err);
                });
                
            }, 100);

            //On all the tasks end
            asyncQueue.drain = function() {
                //console.log("Non reverse finished.");
                resolve(nonReverseLinks);
            }

            //Push the links to the queue
            asyncQueue.push(links, function(err) {
                if(err)
                    reject(err);    
            });

        }, reject);

    });
}


function getPageAbstractLinks(page, lang) {
    console.log(page);
    //Page must already been encoded

    lang = lang || "en";    //If the language was not specified, set en (English)

    return new Promise(function (resolve, reject) {
        
        console.log("Test");

        //If no page specified, return error
        if(!page)
            reject("ERROR: No page specified.");

        var requestUrl = "https://" + lang + ".wikipedia.org/w/api.php?action=parse&redirects&section=0&prop=text&format=json&page=" + page;

        httpsGet(requestUrl).then(function(reqData) {

            //Parse json object that contains only the abstract portion of the page
            var reqObj = JSON.parse(reqData)

            //Check some error
            if(reqObj['error']) {
                //Throw reject error
                reject("ERROR:" + reqObj['error']['code'] + " | " + reqObj['error']['info']);
                return;
            }

            //Get the abstract html data
            htmlData = reqObj['parse']['text']['*']
    
            //Load it on cheerio (jQuery like module)
            $ = cheerio.load(htmlData);

            var links = []

            //Get all the a tags inside the (<p> tags, where the abstract is placed) and put them into the links array
            $('a', 'p').each(function(i, elem) {
                 
                var link = $(this).attr('href');

                //Check the link exists and is a wiki link
                if(link && link.indexOf("/wiki/") == 0) { //Get only wikipedia links
                    var lastPathIndex = link.lastIndexOf("/") + 1;
                    linkName = link.substring(lastPathIndex);

                    //If the link is not in the links array, push it 
                    if(links.indexOf(linkName) == -1)
                        links.push(linkName);
                }                 
            });

            //Check and normalize all the links

            var normalizedLinks = [];

            var asyncQueue = async.queue(function(link, callback) {
                //console.log("Processing: " + link)

                getNormalizeWikiLink(link, lang).then(function(normLink) {
                    
                    //Push if it does not exists
                    if(normalizedLinks.indexOf(normLink) == -1)
                        normalizedLinks.push(normLink);

                    callback();
                }, function(err) {
                    //Dont care about error here
                    callback();
                });
                
            }, 100);

            //On all the tasks end
            asyncQueue.drain = function() {
                //console.log("Normalize finished.");
                resolve(normalizedLinks);
            }

            //Push the links to the queue
            asyncQueue.push(links, function(err) {
                if(err)
                    reject(err);    
            });

        }, reject);
    });
}

function getPageLinks(page, lang) {

    return new Promise(function (resolve, reject) {
        
        //If no page specified, return error
        if(!page)
            reject("ERROR: No page specified.");

        lang = lang || "en";    //If the language was not specified, set en (English)

        var requestUrl = "https://" + lang + ".wikipedia.org/w/api.php?action=query&redirects&pllimit=500&format=json&prop=links&titles=" + page;

        getPartialPageLinks(requestUrl, function(buffer, err) {
            //If error
            if(err) //reject with error obj
                reject(err);
            else //if no error, resolve with buffer
                resolve(buffer);
        });

    });
}

function getPartialPageLinks(url, callback, originalUrl, buffer) {

    //Set optional options
    originalUrl = originalUrl || url;   //Original url to be used for continue options
    buffer = buffer || [];  //Buffer to store links

    //Execute get request
    httpsGet(url).then(function(recData) {

        //Parse json result
        recObj = JSON.parse(recData);            

        //Iterate thru the pages
        for(var page in recObj['query']['pages']) {

            var pageObj = recObj['query']['pages'][page];

            //Iterate thru the links on the page
            for(var link in pageObj['links']) {
                var linkObj = pageObj['links'][link];
                buffer.push(linkObj['title']);
            }
        }

        //If we still got results to go
        if(recObj['continue']) {
            //Recurse this function again
            var continueUrl = originalUrl + "&plcontinue=" + recObj['continue']["plcontinue"];
            getPartialPageLinks(continueUrl, callback, originalUrl, buffer);
        } else {
            //If there is no continue (results to gather), resolve the callback
            callback(buffer);
        }

    }, function(err) {
        //If some error, resolve callback with null
        callback(null, err);
    });
}

function getPageBackLinks(page, lang) {
    return new Promise(function (resolve, reject) {
        
        //If no page specified, return error
        if(!page)
            reject("ERROR: No page specified.");

        lang = lang || "en";    //If the language was not specified, set en (English)

        var queryString = "?action=query&format=json&list=backlinks&bllimit=250&blnamespace=0&blredirect&bltitle=" + page;

        var requestUrl = "https://" + lang + wikipediaApiUrl + queryString;

        getPartialPageBackLinks(requestUrl, function(buffer, err) {
            //If error
            if(err) //reject with error obj
                reject(err);
            else //if no error, resolve with buffer
                resolve(buffer);
        });

    });
}



function encodeContinueUnicodeChar(text) {
    return text.replace(/\|0\|(.+)\|0\|/gi, function(match, character) {
        return "|0|" + encodeURIComponent(character) + "|0|";
    });
}

function getPartialPageBackLinks(url, callback, originalUrl, buffer) {

    //Set optional options
    originalUrl = originalUrl || url;   //Original url to be used for continue options
    buffer = buffer || [];  //Buffer to store links

    //Execute get request
    httpsGet(url).then(function(recData) {
        
        //Parse json result
        var recObj = JSON.parse(recData);        

        //Iterate thru the pages
        for(var page in recObj['query']['backlinks']) {

            var pageObj = recObj['query']['backlinks'][page];
            
            buffer.push(pageObj['title']);

            //If there is redirect links, push them to the buffer too
            if(pageObj['redirlinks']) {
                pageObj['redirlinks'].forEach(function(redirlink) {
                    buffer.push(pageObj['title']);    
                }, this);
            }

        }

    
        //If we still got results to go
        if(recObj['continue']) {
            //Recurse this function again
            var continueValue = encodeContinueUnicodeChar(recObj['continue']["blcontinue"]);
            var continueUrl = originalUrl + "&blcontinue=" + continueValue;
            getPartialPageBackLinks(continueUrl, callback, originalUrl, buffer);
        } else {
            //If there is no continue (results to gather), prepare results
            var pageBackLinks = [];

            for (var i = 0; i < buffer.length; i++) {
                var link = buffer[i];
                
                //If the link already exists, proceed next iteration
                if(pageBackLinks.indexOf(link) != -1)
                    continue;
                
                //If the link is a desambiguation page
                if(link.indexOf("(disambiguation)") != -1)
                    continue;

                //If the link is a list of something
                if(link.indexOf("List of") == 0)
                    continue;

                //If the link is a index of something
                if(link.indexOf("Index of") == 0)
                    continue;

                //If the link is a glossary of something
                if(link.indexOf("Glossary of") == 0)
                    continue;

                pageBackLinks.push(link);
            }
            
            //resolve the callback
            callback(pageBackLinks);
        }

    }, function(err) {
        //If some error, resolve callback with null
        callback(null, err);
    });
}


//Function to return the true link in case of any redirection is present on the page
//Example url: https://en.wikipedia.org/w/api.php?action=opensearch&redirects=resolve&limit=1&format=jsonfm&search=Tibia_(computer_game)
function getNormalizeWikiLink(page, lang) {
    //Page arg must already be encoded

    lang = lang || "en";

    var queryString = "?action=opensearch&redirects=resolve&limit=1&format=json&search=" + page;

    return new Promise(function(resolve, reject) {

        httpsGet("https://" + lang + wikipediaApiUrl + queryString)
            .then(function(reqData) {
                var reqObj = JSON.parse(reqData);
                
                //If some error, reject it
                if(reqObj['error']) {
                    reject(JSON.stringify(reqObj['error']));
                    return;
                }

                //If the third array is empty, reject as no results error
                if(reqObj[3].length == 0) {
                    reject('NormalizeWikiLink ERROR: No results for ' + page);   
                    return;
                }

                //Get the result string
                var resultAddr = reqObj[3][0];
                //Get the last path index
                var lastPathIndex = resultAddr.lastIndexOf("/") + 1;
                //Return the last path (true link)
                resolve(resultAddr.substring(lastPathIndex));
        
            }, function(err) {
                reject(err);
            });
    });

}


function simpleHttpsGet(url, callback) {

    var recData = '';

    https.get(url, function(res) {
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

function httpsGet(url) {

	return new Promise(function (resolve, reject) {
		
		var recData = '';

		https.get(url, function(res) {
  			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				recData += chunk;
			});

			res.on('end', () => {

				resolve(recData);	
			});

			res.on('error', (e) => {
				reject(e);		
			});

		}).on('error', (e) => {
  			reject(e);
		});
	});
}