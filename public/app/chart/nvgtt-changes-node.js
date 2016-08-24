//Module to compute node changes
//Navigatte.Nodes.on("dragend", function(node) {
NvgttChart.Blocks.on("dragend", function(node) {

	//Push the change to the change manager
	NvgttChart.Changes.Add({ id: node.globalId, element: "node", action: "update", x: node.x, y: node.y });
});

//Navigatte.Nodes.on("delete", function(node) {
NvgttChart.Blocks.on("delete", function(node) {

	//Push the change to the change manager
	NvgttChart.Changes.Add({ id: node.globalId, element: "node", action: "delete" });
});

//Navigatte.Nodes.on("create", function(node) {
NvgttChart.Create.on("createBlock", function(node) {

	//Push the change to the change manager

	NvgttChart.Changes.Add({ 
		id: node.globalId, 
		action: "create",
		element: "node", 
		x: node.x, 
		y: node.y,
		bgcolor: node.bgcolor,
		fgcolor: node.fgcolor
	});
});