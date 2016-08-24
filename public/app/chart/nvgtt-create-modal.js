NvgttChart.CreateModal = new function() {

	var availableColors = [
		["#400040","#ffffff"],
		["#003e00","#ffffff"],
		["#00ff00","#000000"],
		["#ff0000","#ffffff"],
		["#000f00","#ffffff"],
		["#0f00ff","#000000"],
		["#0000A0","#ffffff"],
		["#fbaea8","#ffffff"],	//soft red

		//Bootstrap schema

		["#337ab7","#fff"],	//dark blue
		["#5cb85c","#fff"],	//green
		["#5bc0de","#fff"],	//light blue
		["#f0ad4e","#fff"],	//orange
		["#d9534f","#fff"]	//red
	];


	this.Open = function(e) {
		var clickButton = $(this);

		GrowModal.Show({

			/*startX: clickButton.css("left").replace("px", "") || 0,
			startY: clickButton.css("top").replace("px", "") || 0,
			startWidth: clickButton.css("width").replace("px", "") || 0,
			startHeight: clickButton.css("height").replace("px", "") || 0,*/
			startX: 10,
			startY: 10,
			startWidth: 10,
			startHeight: 10,
			endWidth: 700,
			endHeight: 400,
			topColor: "lightblue"

		}, function(m) {

			//Create area to place options for creation
			var modal = d3.select(m).append("div")
				.style("text-align", "center");

			//Set modal dialog title
			modal.append("div")
				.attr("class", "node-modal-title")
				.text("Create New Node");

			var searchTimeout = null;

			//Create div and input to write the node text
			var nodeNameInput = modal.append("div").append("input")
				.attr("type", "text")
				.attr("placeholder", "Node Name")
				.style("margin", "10px 0 0 0")
				.style("height", "30px")
				.style("width", "200px")
				.style("background-color", availableColors[0][0])
				.style("color", availableColors[0][1])
				.style("border", "1px solid #555")
           		.on("keyup", function(event) {

           			nodeNameSearchResultDiv.selectAll("*").remove();           			
           			nodeIdInput.node().value = "";

               		if(searchTimeout)
                    	clearTimeout(searchTimeout);

	                //Must set timeout to give time for the field register its new value and avoid too many ajax requests
	                searchTimeout = setTimeout(function() { 
	                    searchTimeout = null;

	                    var inputValue = nodeNameInput.node().value;

	                    //If no input, hide result list and return
	                    if(inputValue == "") {
	                    	nodeNameSearchResultDiv.selectAll("*").remove();
	                    	return;
	                    }
	                    	
	                    NvgttChart.Search.Query({ nodename: inputValue }, function(response, result) {
	                    	if(result == "success") {

	                    		var resultDataBind = nodeNameSearchResultDiv
	                    			.selectAll(".node-name-search-result")
	                    			.data(JSON.parse(response), 
	                    				function(d){ return d.name });

	                    		resultDataBind.enter().append("div")
	                    			.classed("node-name-search-result", true)
	                    			.text(function(d){ return d.name; })
	                    			.on("click", function(d) {
	                    				nodeNameInput.node().value = d.name;
	                    				nodeIdInput.node().value = d.id;	
	                    				nodeNameSearchResultDiv.selectAll("*").remove();
	                    			});

	                    		resultDataBind.exit().remove();
	                    	}
	                    });

	                }, 500);    
            	});

			var nodeIdInput = modal.append("input")
				.attr("type", "hidden")
				.attr("value", "");

           	var nodeNameSearchResultDiv = modal.append("div")
           		.style({
					"background-color": "#fff",
					"border": "1px solid #bbb",
					"margin-left": "250px",
					"position": "fixed",
					"text-align": "left",
					"min-width": "200px"
				})


			//Focus the node input
			nodeNameInput.node().focus();

			var selectedColors = availableColors[0];

			modal.append("div").selectAll(".block-color").data(availableColors).enter()
				.append("div")
				.classed("block-color", true)
				.style({
					"cursor": "pointer",
					"margin": "10px 2px 2px 2px",
					"display": "inline-block",
					"height":"30px",
					"width":"30px"
				})
				.style("background-color", function(d) {
					return d[0];
				})
				.on("click", function(d){
					selectedColors = d;
					nodeNameInput.style("background-color", d[0]);
					nodeNameInput.style("color", d[1]);					
				})
				.append("div")
				.style({
					"margin": "7px",
					"height":"16px",
					"width":"16px"
				})
				.style("background-color", function(d) {
					return d[1];
				});

			//Create div to choose the background color
			/*var bgColorDiv = modal.append("div")
				.style("margin", "10px 0 10px 0");

			bgColorDiv.text("Background Color: ");

			var bgColorInput = bgColorDiv.append("input")
				.attr("type", "color");
			
			bgColorInput.node().value = "#bbbbbb";

			//Create div to choose the foreground color
			var fgColorDiv = modal.append("div")
				.style("margin", "10px 0 10px 0");

			fgColorDiv.text("Foreground Color: ");

			var fgColorInput = fgColorDiv.append("input")
				.attr("type", "color");
				
			fgColorInput.node().value = "#000000";*/

			//Create button to submit the node creation
			var createButton = modal.append("div").append("button")
				.style("height", "50px")
				.style("width", "200px")
				.style("margin", "10px 0 10px 0")
				.text("Create")
				.on("click", function() {

					if(nodeNameInput.node().value == "")
						return;

					createButton.attr("disabled", "true")
						.text("Creating...");

					var xPos = (360 - NvgttChart.Container.position().X) / NvgttChart.Container.scale();
					var yPos = (80 - NvgttChart.Container.position().Y) / NvgttChart.Container.scale();

					//If there is no id for this node, get or create it
					if(nodeIdInput.node().value == "") {

						$.post("rest/create_master_node.php", { nodename: nodeNameInput.node().value })
							.done(function(response) {
								response = JSON.parse(response);

								if(response.result == "SUCCESS") {
									createNode(response.value);

								} else {
									console.log("Error while creating node: " + response.result);
									//alertify.error("Error while creating node: " + response.result);		
								}
							})
							.fail(function(error){
								console.log("Error while creating node: " + error);
								//alertify.error("Error while creating node: " + error);
							})
							.always(function(){
								createButton.attr("disabled", "false")
									.text("Create");
							});

					} else {	//If there is, create the node with it
						createNode(nodeIdInput.node().value);
						createButton.attr("disabled", "false")
							.text("Create");					
					}

					function createNode(nodeId) {

						//Create the new node
						//var newNode = Navigatte.Nodes.Create({
						var newNode = NvgttChart.Create.newBlock({
							name: nodeNameInput.node().value,
							globalId: nodeId,
							x: xPos,
							y: yPos,
							bgcolor: selectedColors[0],//bgColorInput.node().value,
							fgcolor: selectedColors[1] //fgColorInput.node().value
						});

						if(newNode == null)
							return;

						//Refresh nodes
						NvgttChart.Blocks.refresh();

						newNode.d3Select.attr("display", "none");
											
						//Update the modal screen attributes
						/*GrowModal.Refresh({
							startX: Navigatte.Container.Position.X + newNode.x * Navigatte.Container.Scale,
							startY: Navigatte.Container.Position.Y + newNode.y * Navigatte.Container.Scale,
							startWidth: newNode.containerWidth * Navigatte.Container.Scale,
							startHeight: newNode.containerHeight * Navigatte.Container.Scale,
						});*/

						GrowModal.Close(function(){
							newNode.d3Select.attr("display", "");
						});
					}


				});

		});

	};
}