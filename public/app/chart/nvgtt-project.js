'use strict';

//TODO: MUST FIX BUG THAT ALLOW US TO DELETE PROJECTIONS NODES AND LINKS AND COMPUTE THEM

//Module to enable and handle projections
NvgttChart.Project = new function() {

    //Private variables
    var projBlocks = [];
    var projLinks = [];

    //Private methods

    var createProjection = function(projBlock) {
        //Request the projection block path
        d3.json("rest/node_path.php?id=" + projBlock.localId, function(error, response) {
            if(error) {
                console.log("Error while gathering projection data");
                console.log(error);
                return;
            }

            //Clear any projection on going
            clearProjection();

            //Filter nodes which we already have
            for(var i = 0; i < response.nodes.length; i++){
                //If the block exist, proceed next iteration, if not, put it into the result array

                if(NvgttChart.Blocks.get({ globalId:response.nodes[i].globalId }))
                    continue;

                projBlocks.push(response.nodes[i]);
            }

            //Filter links which the target is one of the already filtered items
            for(var i = 0; i < response.links.length; i++) {
                var currLink = response.links[i];

                for(var j = 0; j < projBlocks.length; j++) {
                    if(currLink.targetId == projBlocks[j].globalId) {
                        currLink.projection = true;
                        projLinks.push(currLink);
                        break;        
                    }
                }
            }

            NvgttChart.Blocks.add(projBlocks);
            NvgttChart.Links.add(projLinks);
            NvgttChart.Blocks.refresh();

            NvgttChart.Select.selectBlock(NvgttChart.Blocks.get({ localId: projBlock.localId }));
        });

    }


    //Links dont need to be removed thru here, since they are removed when nodes are deleted
    //TODO: Maybe in the future we should remove links too to avoid bugs that might happen
    //TODO: keep better management of links since we are adding them and letting the links module discard the existing ones
    
    var clearProjection = function() {
        //Remove projection blocks
        if(projBlocks.length > 0) {

            for(var i = 0; i < projBlocks.length; i++) {
                var projBlockRef = NvgttChart.Blocks.get({ localId: projBlocks[i].localId });
            
                if(projBlockRef)
                    NvgttChart.Blocks.delete(projBlockRef);    
            }

            NvgttChart.Blocks.refresh();
            projBlocks = [];
        }

        //Remove projection links (in a normal operation would be none left)
        if(projLinks.length > 0) {

            projLinks = [];
        }              

    }


    //Public methods

    this.create = function(projBlock) {
        return createProjection(projBlock);
    }

    this.clear = function() {
        return clearProjection();
    }
}





//Module to handle nodes projections
/*Navigatte.Project2 = function(projObj) {

    //console.log(projObj);

    Navigatte.Nodes.ClearProjection();
    Navigatte.Links.ClearProjection();
    Navigatte.Nodes.Refresh();
    Navigatte.Links.Refresh();

    //Got to filter necessary nodes
    var mainNode = projObj.nodes[0];

    var projNodes = [];
    var projLinks = [];

    getMissingNodes(mainNode);

    getRelatedLinks(projNodes);

    //console.log(projNodes);
    //console.log(projLinks);

        //Prepare nodes
    for(var i = 0; i < projNodes.length; i++){
        var cNode = projNodes[i];    

        cNode.bgcolor = "#fff";
        cNode.fgcolor = "#000";
        cNode.x = 500;
        cNode.y = 0;
    }

    //Level object to handle its value
    var levelObj = new function() {
    	var level = 0;
    	var maxLevel = 0;

    	this.Inc = function() {
    		level++;
    		
    		if(maxLevel < level)
    			maxLevel = level;
    	}

    	this.Dec = function() {
    		level--;
    	}

    	this.Get = function() {
    		return level;
    	}

    	this.GetMax = function() {
    		return maxLevel - 1;
    	}
    }

    getLevels(mainNode, projNodes, projLinks, levelObj);

    var containerBox = Navigatte.Container.Select().node().getBBox();

    var levelPos = [];

    for(var i = 0; i < projNodes.length; i++) {
    	var cNode = projNodes[i];

        if(levelPos[cNode.level] == undefined)
            levelPos[cNode.level] = 0;
        else
            levelPos[cNode.level] += 60;    

        cNode.x = parseInt(containerBox.x + containerBox.width + (cNode.level-levelObj.GetMax())*-250) + 50;
        cNode.y = parseInt(containerBox.y + containerBox.height*0 + levelPos[cNode.level]) + 50;
    }


    //console.log(levelObj.GetMax());


    //console.log(containerBox);   
    
    //console.log(projNodes);
    //console.log(projLinks);


    Navigatte.Nodes.Project(projNodes);
    Navigatte.Nodes.Refresh();

    Navigatte.Links.Project(projLinks);
    Navigatte.Links.Refresh();

	//function to filter the nodes that don't exists on this container
    function getMissingNodes(node) {
    	//Check if it were not put
    	if(projNodes.indexOf(node) != -1)
    		return;

    	//Push the node
    	projNodes.push(node);

    	for(var i = 0; i < projObj.links.length; i++) {
    		var cLink = projObj.links[i];

    		//If the target id, is the current id
    		if(cLink.targetId == node.globalId) {

    			//check if the source node doest exists 
    			if(Navigatte.Nodes.Get(cLink.sourceId) == null) {

    				//if it did not exists, find it and add it recursivelly
    				for(var j = 0; j < projObj.nodes.length; j++) {
    					if(projObj.nodes[j].globalId == cLink.sourceId) {
    						getMissingNodes(projObj.nodes[j])
    						break;
    					}
    				}    				
    			}
    		}
    	}
    }

    //Function to get the links related to the passed nodes
    function getRelatedLinks(projNodes) {
    	for(var i = 0; i < projObj.links.length; i++) {
    		for(var j = 0; j < projNodes.length; j++) {
    			if(projObj.links[i].targetId == projNodes[j].globalId) {
                    projObj.links[i].projection = true; //set flag for link projection
    				projLinks.push(projObj.links[i]);
                }

    		}
    	}
    }

    function getLevels(node, nodes, links, levelObj) {
        if(levelObj.Get() > 100) {
        	console.log("ERROR_CIRCULAR_BUG");	//avoid circular bug
            return;
        }

        if(node.level == undefined || node.level < levelObj.Get()) {
           	node.level = levelObj.Get();
        }

        levelObj.Inc();

        //iterate thru the links
        for(var i = 0; i < links.length; i++) {

        	//If the target of the current is not the specified, proceed next iteration
        	if(links[i].targetId != node.globalId)
        		continue;

        	//Find the source node of this link
        	var cNode = null;
        	for(var j = 0; j < nodes.length; j++) {
        		if(nodes[j].globalId == links[i].sourceId) {
        			cNode = nodes[j];
        			break;
        		}
        	}

        	//If no parent were found
        	if(cNode == null) {
        		//console.log("root node");
        		continue;
        	}

            getLevels(cNode, nodes, links, levelObj);
        }

        levelObj.Dec();
    }
}*/