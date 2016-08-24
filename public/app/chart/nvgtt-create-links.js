//Anonymous object to execute task and set eventsfor new link creation
(new function() {

	var onCreationLink = {};

	NvgttChart.Blocks.on("output_click", function(d) {

		//If there is no target id, just crate the source id
		if(onCreationLink.targetId == undefined) {
			onCreationLink.sourceId = d.globalId;
		
		//If the existing target id is different from the new target
		} else if(onCreationLink.targetId != d.globalId) {

			onCreationLink.sourceId = d.globalId;
			NvgttChart.Create.newLink(onCreationLink);
			NvgttChart.Blocks.refresh();

			onCreationLink = {};					

		//If the target id and source id is the same, clear all, cause a recursive link is not allowed		
		} else {
			onCreationLink = {};
		}

	});

	NvgttChart.Blocks.on("input_click", function(d) {

		//If there is no source id, just crate the source id
		if(onCreationLink.sourceId == undefined) {
			onCreationLink.targetId = d.globalId;
		
		//If the existing source id is different from the new target id
		} else if(onCreationLink.sourceId != d.globalId) {

			onCreationLink.targetId = d.globalId;
			NvgttChart.Create.newLink(onCreationLink);
			NvgttChart.Blocks.refresh();
			onCreationLink = {};					

		//If the siurce id and source id is the same, clear all, cause a recursive link is not allowed		
		} else {
			onCreationLink = {};
		}
							
	});

	//On container click, clear all on creation links
	NvgttChart.Container.on("click", function() {
		onCreationLink = {};	
	});
});


