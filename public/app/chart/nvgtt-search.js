//Module to handle all the kinds if searchs

NvgttChart.Search = new function() {

	this.Query = function(data, callback) {
		$.get("rest/search.php", data).always(callback);
	}
}