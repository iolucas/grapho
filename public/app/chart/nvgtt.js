'use strict';

//Main navigatte module
//Dependent of D3js http://d3js.org

//var Navigatte = {}

var NvgttChart = new function() {

	this.load = function(username) {

		var dataPath = "get_nodes_and_links";
		//dataPath = "data/data.json";

		d3.json(dataPath, function(error, response) {
        	
			console.log(response)

        	if(response.result != "SUCCESS") {
        		console.log("Error while getting user blocks");
        		console.log(response);
        		return;
        	}

        	//Load nodes
        	NvgttChart.Blocks.add(response.nodes);
            NvgttChart.Links.add(response.links);
            NvgttChart.Blocks.refresh();            

            NvgttChart.Container.fitScreen();

            /*NvgttChart.Blocks.on("click", function(d) {
                console.log(d);
            });*/

    	});

	}
}

//var Navigatte = NvgttChart;