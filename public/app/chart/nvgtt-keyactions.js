//Module to handle keyboard actions
NvgttChart.KeyActions = new function() {

	d3.select("body").on("keyup", function() {

		switch(d3.event.keyCode) {

			//Handle delete key
			case 46:
				deleteSelection(NvgttChart.Select.getSelection());
				break;

			//Handle esc key
			case 27:
				NvgttChart.Select.deselectAll();
				break;
		}
	});

	function deleteSelection(selection) {
		if(selection == null)
			return;

		//if the selection is a node
		if(selection.hasOwnProperty('globalId')) {
			NvgttChart.Blocks.delete(selection);
			NvgttChart.Blocks.refresh();
			/*Navigatte.Nodes.Delete(selection);
			Navigatte.Nodes.Refresh();
			Navigatte.Links.Refresh();*/
		} 

		//if the selection is a link
		else if(selection.hasOwnProperty('sourceId')) {
			NvgttChart.Links.delete(selection); 
			NvgttChart.Blocks.refresh();
			/*Navigatte.Links.Delete(selection);
			Navigatte.Links.Refresh();*/
		}

		NvgttChart.Select.deselectAll();
	}	
}