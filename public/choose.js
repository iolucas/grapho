//Utils
Array.prototype.popObject = function(obj) {
    var objIndex = this.indexOf(obj);
    
    if(objIndex == -1)
        return null;
    
    this.splice(objIndex, 1);
    
    return obj;
}

var notRelatedObjs = [
//    {title: "Linear Algebra1"},
//    {title: "Linear Algebra2"}
]

var innerRelatedObjs = [
//    {title: "Linear Algebra3"},
//    {title: "Linear Algebra4"}
]
var outerRelatedObjs = [    
//    {title: "Linear Algebra5"},
//    {title: "Linear Algebra6"}
]

function startApp(data) {
    notRelatedObjs = data.links;
    
    //Update title
    d3.select("#targetArticleTitle")
        .append("a")
        .attr("target", "_blank")
        .attr("href", "https://en.wikipedia.org/wiki/" + data.article)        
        .text(data.article);
    
    updatePositions();
}

//Get desired data
//d3.json("http://localhost:7000/get/mqtt", function(error, data) {
//    console.log(window.location)
//    if(error)
//        return console.log(error);
//    
//    if(data.hasOwnProperty("error"))
//        return console.log(data);
//    
//
//    
//});




//console.log(notRelatedObjs);
//notRelatedObjs.popObject(notRelatedObjs[1]);
//console.log(notRelatedObjs);

function updatePositions() {
    
    updateNotRelatedObjects();
    updateInnerRelatedObjects();
    updateOuterRelatedObjects();
    
//    console.log(notRelatedObjs);
//    console.log(innerRelatedObjs);
//    console.log(outerRelatedObjs);
}



function updateOuterRelatedObjects() {
    
    var DOMSelection = updateArea("#outerRelationArea", outerRelatedObjs);
    
    DOMSelection.append("button")
        .text('<')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            outerRelatedObjs.popObject(d);
            notRelatedObjs.push(d);
            updatePositions();
        });   
    
        
    DOMSelection.append("button")
        .text('\\/')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            outerRelatedObjs.popObject(d);
            innerRelatedObjs.push(d);
            updatePositions();
        });   
}

function updateInnerRelatedObjects() {
    
    var DOMSelection = updateArea("#innerRelationArea", innerRelatedObjs);
        
    DOMSelection.append("button")
        .text('<')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            innerRelatedObjs.popObject(d);
            notRelatedObjs.push(d);
            updatePositions();
        });   
    
    DOMSelection.append("button")
        .text('/\\')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            innerRelatedObjs.popObject(d);
            outerRelatedObjs.push(d);
            updatePositions();
        });   
}


function updateNotRelatedObjects() {
    
    var DOMSelection = updateArea("#noRelationArea", notRelatedObjs);
        
    DOMSelection.append("button")
        .text('/\\')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            notRelatedObjs.popObject(d);
            outerRelatedObjs.push(d);
            updatePositions();
        });   
    
    
    DOMSelection.append("button")
        .text('\\/')
        .on("click", function(d) {
            //Delete object from array and put it in to another
            notRelatedObjs.popObject(d);
            innerRelatedObjs.push(d);
            updatePositions();
        });  
}

//Function to update icons on any of the areas
function updateArea(areaId, areaArray) {
    
    var objSelection = d3.select(areaId) //Select target container
        .selectAll(".articleIcon") //Select all icons that are inside of it
        .data(areaArray, function(d) {return d.title;}) //Get the objects from target array
    
    //Remove every object that has exited
    objSelection.exit().remove();
    
    //Add and return news objects
    return objSelection.enter()
        .append("div")
        .classed("articleIcon", true)
        .text(function(d){
            return d.title + " - " + d.linksToHere;
        });
}