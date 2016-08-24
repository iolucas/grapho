'use strict';
//Module to handle navigatte blocks

NvgttChart.Blocks = new function() {

	//Object to handle the nodes events
	var eventHandler = new EventHandler();
	this.on = function(event, callback) {
		eventHandler.on(event, callback);
		return self;
	}

	//Private variables
	var blocks = [];

	//Private Methods
	var addBlock = function(block) {
		//Check if the block exists
		var existBlock = getBlock({ globalId: block.globalId });

		//If the block already exists, return
		if(existBlock)
			return;

		var newBlock = new NvgttBlock(block);

		//Push the block to the blocks array
		blocks.push(newBlock);

		return newBlock;
	}

	var deleteBlockByIndex = function(blockIndex) {

		//Delete the current block @ target index
		var deletedBlock = blocks[blockIndex];

		blocks.splice(blockIndex, 1);

		eventHandler.fire("delete", deletedBlock);

		return deletedBlock;	
	}

	var deleteBlockByRef = function(blockRef) {
		var refIndex = blocks.indexOf(blockRef);
		
		if(refIndex == -1)
			return null;

		return deleteBlockByIndex(refIndex);
	}

	var getBlock = function(searchObject) {

		if(searchObject.hasOwnProperty('localId')) {
			
			for(var i = 0; i < blocks.length; i++) {
				if(blocks[i].localId == searchObject.localId)
					return blocks[i];
			}

		} else if(searchObject.hasOwnProperty('globalId')) {

			for(var i = 0; i < blocks.length; i++) {
				if(blocks[i].globalId == searchObject.globalId)
					return blocks[i];
			}
		}

		//If the search object is invalid, or no block were found, return null
		return null;
	}


	var refreshBlocks = function() {

		//Match blocks with DOMs by the blocks global ids
		var blocksSelection = NvgttChart.Container.select().selectAll(".nvgtt-block")
			.data(blocks, function(d) { return d.globalId; });

		//Create DOM for new blocks
		createDOMs(blocksSelection.enter());

		//Remove DOM for deleted blocks
		blocksSelection.exit().remove();


		//Update all DOM according to their datas

		//Set block text
		blocksSelection.select(".nvgtt-block-text")
			.text(function(d) {
				//Check if the text has been changed
				if(d.name != this.textContent)
					d.textChanged = true;	//set text changed flag

				return d.name; 
			})
			.attr("x", function(d) {
				if(!d.textChanged)
					return this.getAttribute("x");

				d.textBox = this.getBBox();

				//Set block width and height
				var margin = 30;

				if(d.textBox.width < 40)
					d.textBox.width = 40;

				d.width = d.textBox.width + margin*2;

				d.leftHeight = 50 + d.inputs.length*10;
				//if(d.inputs.length > 0)	
					//d.leftHeight += (d.inputs.length - 1) * 10;

				d.rightHeight = 50 + d.outputs.length*10;
				//if(d.outputs.length > 0)	
					//d.rightHeight += (d.outputs.length - 1) * 10;

				d.height = d.leftHeight > d.rightHeight ? d.leftHeight : d.rightHeight;

				return d.width/2;
			})
			.attr("y", function(d) {
				if(!d.textChanged)
					return this.getAttribute("y");

				//Get the current Y
				var currY = parseInt(this.getAttribute("y")) || 0;
				var newY = (d.height - d.textBox.height) / 2 - d.textBox.y + currY;

				return newY;
			})
			.attr("fill", function(d) {
				return d.fgcolor || "#000";
			});

		//Set block path coordinates
		blocksSelection.select(".nvgtt-block-path")
			.attr("d", function(d){
				if(!d.textChanged)
					return this.getAttribute("d");

				/*var x0 = 0;
				var y0 = ((d.leftHeight - d.rightHeight) / 2);

				var x1 = d.width;
				var y1 = 0;

				var y2 = d.rightHeight;

				var x3 = 0;
				var y3 = -(d.leftHeight - y0);*/
				if(d.leftHeight > d.rightHeight) {
					return "M0,0 L" + d.width + "," + ((d.leftHeight - d.rightHeight) / 2) + " v" + 
						d.rightHeight + " L0," + d.leftHeight + "z";
				} else {
					var heightsGap = (d.rightHeight - d.leftHeight) / 2;

					return "M0," + heightsGap + " L" + d.width + ",0" + " v" +
						d.rightHeight + " L0," + (d.leftHeight + heightsGap) + "z";
				}


				/*return "M0,0 h" + d.width + 
				"v" + d.height + 
				"h-" + d.width + "z";*/
			})
			.attr("fill", function(d) {
				return d.bgcolor || "#fff";
			});

		//Set position of input and output symbols
		blocksSelection.select(".nvgtt-block-input")
			.attr("transform", function(d) {
				if(!d.textChanged)
					return this.getAttribute("transform");

				return "translate(-5 " + (d.height - 12) / 2 + ")";
			});

		blocksSelection.select(".nvgtt-block-output")
			.attr("transform", function(d) {
				if(!d.textChanged)
					return this.getAttribute("transform");

				return "translate(" + (d.width - 0) + " " + (d.height - 12) / 2 + ")";
			});


		var posColumns = [];
		var blocksYGap = 20;
		var xPos = 10;

		blocksSelection.each(function(d) {
			var column = d.GetColumn();

			if(posColumns[column] == undefined)
				posColumns[column] = {
					members: [],
					width: 0,
					height: 0
				}

			posColumns[column].height += d.height + blocksYGap;

			posColumns[column].members.push(d);

			if(d.width > posColumns[column].width)
				posColumns[column].width = d.width; 
		});

		//Get the highest col
		var higherCol = 0;
		for(var i = 0; i < posColumns.length; i++) {
			if(posColumns[i].height > higherCol)
				higherCol = posColumns[i].height;
		}

		for(var i = 0; i < posColumns.length; i++) {

			var yPos = (higherCol - posColumns[i].height) / 2 + 10;

			var column = posColumns[i];

			for(var j = 0; j < column.members.length; j++) {
				var cBlock = column.members[j];

				if(cBlock.x != xPos || cBlock.y != yPos) {

					cBlock.x = xPos;
					cBlock.y = yPos;

					//Update node position
					cBlock.d3Select//.transition().duration(1000)
						.attr("transform", "translate(" + xPos + " " + yPos + ")");	

					eventHandler.fire("move", cBlock);
				}

				yPos += cBlock.height + 20;
			}

			xPos += column.width + 150;
		}


		//Translate DOM according to its columns
		//var nextY = [];
		/*blocksSelection.each(function(d) {
			var column = d.GetColumn();

			if(nextY[column] == undefined)
				nextY[column] = 10;
				
			var newX = column*500 + 10;
			var newY = nextY[column];

			nextY[column] += 60;
					
			if(d.x != newX || d.y != newY) {

				d.x = newX;
				d.y = newY;

				//Update node position
				d.d3Select//.transition().duration(1000)
					.attr("transform", "translate(" + d.x + " " + d.y + ")");	

				eventHandler.fire("move", d);
			}
		});*/
	}

	var createDOMs = function(createSelection) {

		var debugColors = ["#337ab7","#5cb85c","#5bc0de","#f0ad4e","#d9534f"];

		var blockGroup = createSelection.append("g")
			.classed("nvgtt-block", function(d) {
				d.d3Select = d3.select(this);
				return true;
			});

		var blockPathGroup = blockGroup.append("g")
			.on("click", function(d) {
				eventHandler.fire("click", d);
			})
			.on("dblclick", function(d) {
				eventHandler.fire("dblclick", d);
			});

		var blockPath = blockPathGroup.append("path")
			.classed("nvgtt-block-path", true);

		//Block name text
		var blockText = blockPathGroup.append("text")
			.classed("nvgtt-block-text", true)
			.attr("text-anchor", "middle");


		//Draw input symbol
		blockGroup.append("path")
			.classed("nvgtt-block-input", true)
			.attr("d", "M0,0 h5 v12 h-5z")
			.on("mousedown", function(d){
				d3.event.cancelBubble = true;
				eventHandler.fire("input_mousedown", d);
			})
			.on("mouseup", function(d){
				d3.event.cancelBubble = true;
				eventHandler.fire("input_mouseup", d);
			})
			.on("click", function(d) {
				d3.event.cancelBubble = true;
				eventHandler.fire("input_click", d);
			});

		//Draw output symbol
		blockGroup.append("path")
			.classed("nvgtt-block-output", true)
			.attr("d", "M0,0 h5 v12 h-5z")
			.on("mousedown", function(d){
				d3.event.cancelBubble = true;
				eventHandler.fire("output_mousedown", d);
			})
			.on("mouseup", function(d){
				d3.event.cancelBubble = true;
				eventHandler.fire("output_mouseup", d);
			})
			.on("click", function(d) {
				d3.event.cancelBubble = true;
				eventHandler.fire("output_click", d);				
			});

		//Enable nodes to be dragged
		//blockGroup.call(nodeDrag);
	}

	//Object to handle nodes drag
	var nodeDrag = d3.behavior.drag()
		.origin(function(d) { return d; })

		.on("drag", function(d) {

			if(d.x != d3.event.x || d.y != d3.event.y) {

				d.x = d3.event.x;
				d.y = d3.event.y;

				//Update node position
				d.d3Select.attr("transform", "translate(" + d.x + " " + d.y + ")");	

				eventHandler.fire("drag", d);
				eventHandler.fire("move", d);
			}
		})

		.on("dragend", function(d) {
			eventHandler.fire("dragend", d);	
		});



	//Private Class
	var NvgttBlock = function(blockData) {
		var nvgttBlock = this;

		nvgttBlock.name = blockData.name;

		nvgttBlock.globalId = blockData.globalId;
		nvgttBlock.localId = blockData.localId;

		nvgttBlock.bgcolor = blockData.bgcolor;
		nvgttBlock.fgcolor = blockData.fgcolor;

		nvgttBlock.x = parseInt(blockData.x) || 0;
		nvgttBlock.y = parseInt(blockData.y) || 0;
		nvgttBlock.width = 0;
		nvgttBlock.height = 0;

		nvgttBlock.inputs = [];
		nvgttBlock.outputs = [];
	}

	NvgttBlock.prototype.GetColumn = function() {
		var column = 0;

		for(var i = 0; i < this.inputs.length; i++) {
			var inputColumn = this.inputs[i].GetColumn();

			if(column <= inputColumn)
				column = inputColumn + 1;
		}

		return column;
	} 


	//Public methods
	this.add = function(blockObj) {
		//Check if the arguments is and array
		if(blockObj.constructor === Array) {

			for(var i = 0; i < blockObj.length; i++)
				addBlock(blockObj[i]);	

		} else {
			return addBlock(blockObj);
		}
	}

	//bbi = block Or Blocks Or Index
	this.delete = function(bbi) {
		return deleteBlockByRef(bbi);

		/*switch(bbi.constructor) {

			case 'Number':
				return deleteBlockByIndex(bbi);

			case 'Object':
				return deleteBlockByRef(bbi);

			case 'Array':
				var deletedBlocks = []
				for(var i = 0; i < bbi.length; i++)
					deletedBlocks.push(deleteBlockByRef(bbi[i]));
				return deletedBlocks;
		}*/
	}

	this.get = function(searchObject) {
		return getBlock(searchObject);
	}

	this.refresh = function() {
		return refreshBlocks();
	}

	this.setLocalId = function(globalId, localId) {
		for(var i = 0; i < blocks.length; i++) {
			if(blocks[i].globalId == globalId && !blocks[i].localId) {
				blocks[i].localId = localId;
				return;
			}
		}
	}
}