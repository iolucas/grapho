'use strict';

//Module to handle creating of any stuff, blocks, links
NvgttChart.Create = new function() {

	//Object to handle the nodes events
	var eventHandler = new EventHandler();
	this.on = function(event, callback) {
		eventHandler.on(event, callback);
		return self;
	}

	this.newBlock = function(newNode) {

		//If the desire node to create already exists, notify it and return null
		//if(indexOf(newNode.globalId) != -1) {
		if(NvgttChart.Blocks.get({globalId:newNode.globalId})) {
			//alertify.error("This node already exists!");
			console.error("This node already exists!");
			return null;
		}

		//Add the new node and get its internal ref
		var newBlock = NvgttChart.Blocks.add(newNode);

		eventHandler.fire("createBlock", newBlock);

		return newBlock;
	}

	this.newLink = function(link) {

		if(link.sourceId == undefined || link.targetId == undefined)
			return null;

		if(link.sourceId == link.targetId)
			return null;

		var createdLink = NvgttChart.Links.add(link);

		//If the created link already exists, return
		if(createdLink == null)
			return null;

		eventHandler.fire("createLink", createdLink);

		return createdLink;
	}
}