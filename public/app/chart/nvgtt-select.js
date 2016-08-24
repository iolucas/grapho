//Module to execute task to enable path selections and deselections
NvgttChart.Select = new function() {

    //Private variables
    var selection = null;   //current selection storage

    //Private Functions

    function unfocusAll() {
        //Unfocus all nodes
        d3.selectAll(".nvgtt-block").style("opacity", .05);

        //Unfocus all links
        d3.selectAll(".nvgtt-link").style("opacity", .05);        
    }

    function focusAll() {
        //Unfocus all nodes
        d3.selectAll(".nvgtt-block").style("opacity", 1);

        //Unfocus all links
        d3.selectAll(".nvgtt-link").style("opacity", 1);        
    }

    function deselectAll() {
        if(selection == null)
            return;

        selection = null;   //clear selection storage

        focusAll(); //focus everything on the screen

        //Clear any selected class from blocks
        d3.selectAll(".nvgtt-block-path-selected")
            .classed("nvgtt-block-path-selected", false);

        //Clear any selected class from blocks
        d3.selectAll(".nvgtt-link-path-selected")
            .classed("nvgtt-link-path-selected", false);
    }

    function selectBlock(block) {
        deselectAll();

        selection = block;

        unfocusAll();

        //Highlight target node selected class
        block.d3Select.select(".nvgtt-block-path")
            .classed("nvgtt-block-path-selected", true);

        recurseHighlightBlocks(block);
    }

    function recurseHighlightBlocks(block) {
        block.d3Select.style("opacity", 1);  

        var blockTargetLinks = NvgttChart.Links.get({ blockGlobalId: block.globalId, target: true });

        //iterate thru all target links
        for(var i = 0; i < blockTargetLinks.length; i++) {
            var currLink = blockTargetLinks[i];

            currLink.d3Select.style("opacity", 1);   

            //recurse this function on the target block
            recurseHighlightBlocks(NvgttChart.Blocks.get({ globalId: currLink.sourceId }));            
        }
    }

    function selectLink(link) {
        deselectAll();

        selection = link;

        //Highlight target link selected class
        link.d3Select.select(".nvgtt-link-path").classed("nvgtt-link-path-selected", true);
    }


    //Events for selection module
    
    //Add page event listener
    NvgttChart.Container.on("click", deselectAll);


    //Register drag event to not select in case node is dragged
    var blockDragged = false;
    NvgttChart.Blocks.on("drag", function() {
        blockDragged = true;
    });

    NvgttChart.Blocks.on("click", function(d) {

        if(blockDragged) {
            blockDragged = false;
            return;
        }

        selectBlock(d);
    });

    NvgttChart.Blocks.on("delete", deselectAll);

    NvgttChart.Links.on("click", selectLink);
    NvgttChart.Links.on("delete", deselectAll);

    //Public methods
    
    this.getSelection = function() {
        return selection;
    }

    this.selectBlock = function(block) {
        return selectBlock(block);
    }


    this.deselectAll = function() {
        return deselectAll();
    }

}