'use strict';
//Module to handle navigatte links

NvgttChart.Links = new function() {

	//Object to handle the nodes events
	var eventHandler = new EventHandler();
	this.on = function(event, callback) {
		eventHandler.on(event, callback);
		return self;
	}

	//Private variables
	var links = [];

	//Private Methods
	var addLink = function(link) {
		var existLink = getLinkByIdMerged(link.sourceId + "" + link.targetId);

		//If the link already exists, return
		if(existLink)
			return null;

		var newLink = new NvgttLink(link);

		//Push the link to the links array
		links.push(newLink);

		return newLink;
	}

	var deleteLinkByRef = function(link) {
		var linkIndex = links.indexOf(link);
		
		if(linkIndex == -1)
			return;

		//Clear the link sourceBlock output reference
		link.sourceBlock.outputs.splice(link.sourceBlock.outputs.indexOf(link.targetBlock), 1);

		//Clear the link targetBlock input reference
		link.targetBlock.inputs.splice(link.targetBlock.inputs.indexOf(link.sourceBlock), 1);

		links.splice(linkIndex, 1);

		eventHandler.fire("delete", link);
	}

	var getLinkByIdMerged = function(mergedId) {
		for(var i = 0; i < links.length; i++) {
			//If the link already exist, return it
			if((links[i].sourceId + "" + links[i].targetId) == mergedId)
				return links[i];
		}

		//otherwise, return null
		return null;
	}

	//Function to return an array of reference to all links attached to the specified node
	var getLinks = function(getAttr) {
		//Check if the minimum paremeters has been suplied, if not, return null
		if(!getAttr.hasOwnProperty("blockGlobalId") || (!getAttr.source && !getAttr.target))
			return null;

		//Array to store the links found
		var foundLinks = [];

		//Iterate thru the links to find them
		for(var i = 0; i < links.length; i++) {
			if(getAttr.source && links[i].sourceId == getAttr.blockGlobalId)
				foundLinks.push(links[i]);
			else if(getAttr.target && links[i].targetId == getAttr.blockGlobalId)
				foundLinks.push(links[i]);
		}

		return foundLinks; //return result
	}

	var refreshLinks = function() {
		//Match links with DOMs by the links ids merging
		var linksSelection = NvgttChart.Container.select().selectAll(".nvgtt-link")
			.data(links, function(d) { return d.sourceId + d.targetId; });

		//Create DOM for new links
		linksSelection.enter().insert("g", ":first-child")
			.classed("nvgtt-link", function(d) {
				d.d3Select = d3.select(this);
				return true;
			})
			.on("click", function(d) {
				eventHandler.fire.call(this,"click", d);
			})
			//Append link path and add its attributes
			.append("path")
			.classed("nvgtt-link-path", true)
			.attr("stroke-dasharray",function(link){
				if(link.projection)
					return "15 15";

				return null;
			}).attr("d", function(link) {
				return drawLinkPath(link);
			});

		//Remove DOM for deleted links
		linksSelection.exit().remove(); 
	}

	//Function to draw the path of a diagonal line (x and y are inverted for right line projection)
	var drawLinkPath = d3.svg.diagonal()
		.source(function(link) { 
			return { 
				x: link.sourceBlock.y + link.sourceBlock.height/2, 
				y: link.sourceBlock.x + link.sourceBlock.width 
			}; 
		})            
		.target(function(link) { 
			return { 
				x: link.targetBlock.y + link.targetBlock.height/2, 
				y: link.targetBlock.x 
			}; 
		})
		.projection(function(d) { 
			return [d.y, d.x]; 
		});


	//Private classes
	var NvgttLink = function(linkData) {
		var nvgttLink = this;

		nvgttLink.sourceId = linkData.sourceId;
		nvgttLink.targetId = linkData.targetId;

		nvgttLink.sourceBlock = NvgttChart.Blocks.get({ globalId: nvgttLink.sourceId });	
		nvgttLink.targetBlock = NvgttChart.Blocks.get({ globalId: nvgttLink.targetId });	

		nvgttLink.targetBlock.inputs.push(nvgttLink.sourceBlock);
		nvgttLink.sourceBlock.outputs.push(nvgttLink.targetBlock);

		if(linkData.projection)
			nvgttLink.projection = true;
	}

	//Dependent events

	//Set the event in case the nodes move, refresh the links attached to it
	NvgttChart.Blocks.on("move", function(d) {
		var foundLinks = getLinks({ blockGlobalId: d.globalId, source: true, target: true });

		//For each link, update its track
		for(var i = 0; i < foundLinks.length; i++){
			var currLink = foundLinks[i];

			currLink.d3Select.select(".nvgtt-link-path")
				//.transition().duration(1000)
				.attr("d", drawLinkPath(currLink));	
		}
	});

	//Set event to delete links attached to a deleted node
	NvgttChart.Blocks.on("delete", function(block) {
		//Get the node attached links and delete them
		var blockLinks = getLinks({ blockGlobalId: block.globalId, source:true, target:true });

		for(var i = 0; i < blockLinks.length; i++)
			deleteLinkByRef(blockLinks[i]);

		refreshLinks();
	});


	//Public Methods
	this.add = function(linkObj) {
		//Check if the arguments is and array
		if(linkObj.constructor === Array) {

			for(var i = 0; i < linkObj.length; i++)
				addLink(linkObj[i]);	

			refreshLinks();

		} else {
			var createdLink = addLink(linkObj);

			refreshLinks();
			
			return createdLink;
		}
	}

	this.delete = function(linkRef) {
		var deleteLink = deleteLinkByRef(linkRef);

		refreshLinks();

		return deleteLink;
	}

	this.get = function(searchObj) {
		return getLinks(searchObj);
	}

	/*this.refresh = function() {
		return refreshLinks();
	}*/
}


