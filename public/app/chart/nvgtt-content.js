//Module to enable block content to be show
//For now, only register a double click event on blocks to open its page

NvgttChart.Blocks.on("dblclick", function(block) {

	if(block.localId == undefined) {

		//alertify.error("Salve as alterações para editar o conteudo desse bloco.");
		console.error("Salve as alterações para editar o conteudo desse bloco.");
		return;
	}	

	var tempLink = d3.select("body")
		.append("a")
		.attr("href", "#content/" + block.localId);

	tempLink.node().click();
	tempLink.remove();

});