//Module to handle changes of any kind 
NvgttChart.Changes = new function() {

	//Array to store objects changes
	var changes = [];

	//flag to signalize whether a save is in progress
	var saveInProgress = false;

	this.Add = function(changeData) {

		//Check if an entry for the specified object exists
		var existIndex = indexOf(changeData);


		//If a change entry for this element exists
		if(existIndex != -1) {
			//If the existing entry is delete, return

			if(changes[existIndex].action == "delete")
				return;

			switch(changeData.action) {

				//If the action is create, just update the existing register for creation with the new attributes
				case "create":
					for(prop in changeData)
						changes[existIndex][prop] = changeData[prop];
					break;

				case "delete":

					//If we got a create entry and the next is delete, 
					if(changes[existIndex].action == "create") {
						delete changes[existIndex];	//just remove the prev entry
					} else {
						changes.push(changeData);	//Push the new entry
						delete changes[existIndex];	//Remove the prev entry
					}

					break;

				case "update":
					//Copy the new attributes to the prev entry, avoiding change the create action
					for(prop in changeData) {
						if(prop == "action" && changes[existIndex][prop] == "create")
							continue;

						changes[existIndex][prop] = changeData[prop];
					}

					break;

			}

		} else {
			//If no prev register, just push the change attr
			changes.push(changeData);
		}
	}


	function indexOf(findData) {

		for(var i = 0; i < changes.length; i++) {
			var currChange = changes[i];

			if(currChange == undefined)
				continue;

			if(currChange.id != findData.id)
				continue;

			if(currChange.element != findData.element)
				continue;

			return i;
		}

		return -1
	}

//TODO: MUST FIND AWAY TO AVOID BUG IN CASE CREATE NODES AND LINK THEM THAT THE ID GOES WRONG
//MAYBE WE CAN REQUEST AN ID POOL OR A DYNAMIC ID TO ATTACH TO THESE ELEMENTS ON CREATION TO AVOID SUCH SITUATIONS
//OR SAVE EVERY MOVEMENT

	this.Save = function() {

		//If a save is in progress, or there is no change, do nothing
		if(saveInProgress || changes.getValidLength() == 0)
			return;

		//Remove all invalid members of the changes array
		var changesArray = [];
		for(var i = 0; i < changes.length; i++)
			if(changes[i] != undefined)
				changesArray.push(changes[i]);


		var changesString = JSON.stringify(changesArray);
		console.log("Saving changes...");
		//alertify.delay(5000).log("Saving changes...");

		$.post("rest/save_changes.php", { action: "save_node_changes", changes: changesString })
			.done(function(responseObj) {

				responseObj = JSON.parse(responseObj);

				if(responseObj.result && responseObj.result == "SUCCESS") {
					console.log("Changes saved!");
					//alertify.delay(5000).success("Changes saved!");

					//Set created nodes ids
					if(responseObj.createdNodes) {
						for(var i = 0; i < responseObj.createdNodes.length; i++) {
							var newNodeIds = responseObj.createdNodes[i];
							NvgttChart.Blocks.setLocalId(newNodeIds.globalId, newNodeIds.localId);
						}
					}
					
					//Reset changes object storage
					changes = [];

				} else {
					console.log("Unknown error while saving. Please try again.");	
					//alertify.delay(5000).error("Unknown error while saving. Please try again.");
				}
				
			})
			.fail(function() {
				console.log("Error while saving. Please try again.");
				//alertify.delay(5000).error("Error while saving. Please try again.");
			})
			.always(function(){
				saveInProgress = false;
			});
	}
}