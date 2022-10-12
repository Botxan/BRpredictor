// Array to store all the connected elements;
var connections = [];
var svg = $("#circuitsSVG");
var sets;

$(document).ready(function () {
	connectAll();
});

/**
 * Draws the path in the screen depending on the given parameters.
 * @param {SVGPathElement} path the path to be drawn
 * @param {Number} startX the starting X position
 * @param {Number} startY the starting Y position
 * @param {Number} endX the ending X position
 * @param {Number} endY the ending Y position
 * @param {String} outputDir the side from where the path is arriving to the element
 * @param {String} inputDir the side from where the path is leaving the source element
 */
function drawPath(path, startX, startY, endX, endY, outputDir, inputDir) {
	if (outputDir === "bottom" && inputDir === "top")
        // From arbiter to mux
		path.attr("d", "M" + startX + " " + startY + " V" + (startY + 65) + " H" + endX + " V" + endY);
	else if (outputDir === "right" && inputDir === "left")
        // p -> mux / mux -> result
        path.attr("d", "M" + startX + " " + startY + " V" + (startY + 0) + " H" + (endX - 30) + " V" + endY + " H" + endX);
}

/**
 * Adjusts the input and output of the given path.
 * @param {SVGPathElement} path the SVG path to be adjusted
 * @param {HTMLElement} outputEl the element that marks the end point of the path
 * @param {HTMLElement} inputEl the element that marks the starting point of the path
 * @param {String} outputDir the side from where the path is arriving to the element
 * @param {String} inputDir the side from where the path is leaving the source element
 * @param {Number} inputN in case the destination element has more than one input
 * it is the flag that indicates the output position of the path
 */
function connectElements(path, outputEl, inputEl, outputDir, inputDir, inputN) {
    // if first element is lower than the second, swap!

	// get (top, left) corner coordinates of the svg container
	var svgTop = svg.offset().top;
	var svgLeft = svg.offset().left;

	// get (top, left) coordinates for the two elements
	var startCoord = outputEl.offset();
	var endCoord = inputEl.offset();
	// calculate path's start (x,y) coords depending on outputDir parameter
	var startX;
	var startY;
	switch (outputDir) {
		case "top":
			startX = startCoord.left + 0.5 * outputEl.outerWidth() - svgLeft;
			startY = startCoord.top - svgTop;
			break;
		case "right":
			startX = startCoord.left + outputEl.outerWidth() - svgLeft;
			startY = startCoord.top + 0.5 * outputEl.outerHeight() - svgTop;
			break;
		case "bottom":
			startX = startCoord.left + 0.5 * outputEl.outerWidth() - svgLeft;
			startY = startCoord.top + outputEl.outerHeight() - svgTop;
			break;
		case "left":
			startX = startCoord.left - svgLeft;
			startY = startCoord.top + 0.5 * outputEl.outerHeight() - svgTop;
			break;
	}

	// calculate path's end (x,y) coords depending on inputDir parameter
	var endX;
	var endY;
	switch (inputDir) {
		case "top":
			endY = endCoord.top;
			break;
		case "right":
			endX = endCoord.left + inputEl.outerWidth() - svgLeft;
			endY = endCoord.top + 0.5 * inputEl.outerHeight() - svgTop;
			break;
		case "bottom":
			endX = endCoord.left + 0.5 * inputEl.outerWidth() - svgLeft;
			endY = endCoord.top + inputEl.outerHeight() - svgTop;
			break;
		case "left":
			endX = endCoord.left - svgLeft;
            if (inputN === 1) endY = endCoord.top + 0.25 * inputEl.outerHeight() - svgTop;
			else if (inputN === 2) endY = endCoord.top + 0.75 * inputEl.outerHeight() - svgTop;
			else endY = endCoord.top + 0.5 * inputEl.outerHeight() - svgTop;
			break;
	}

	// call function for drawing the path
	drawPath(path, startX, startY, endX, endY, outputDir, inputDir, inputN);
}

/**
 * Calls to connectElement with all the paths stored in connections array.
 */
function connectAll() {
	// connect all elements that are in connections array
	connections.forEach(function (connection) {
		connectElements(connection[0], connection[1], connection[2], connection[3], connection[4], connection[5], connection[6]);
	});
}

/**
 * Creates an SVG path element with the id passed by parameter.
 * @param {String} id the path id attribute
 * @returns SVG path element
 */
function createPath(id) {
	let newpath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	$(newpath).attr({
		id: "path"+id,
		d: "M0 0",
		style: "stroke: #555; stroke-width: 0.2em; fill: none; opacity: 1;"
	});
	svg.append(newpath);
	return newpath;
}

/**
 * Creates the corresponding wires for the hybrid predictor.
 */
function drawCircuits() {
    // From p to mux
    addCircuitWire("p1", $("#p1"), $("#mux-border"), "right", "left", 1);
    addCircuitWire("p2", $("#p2"), $("#mux-border"), "right", "left", 2);

    // From arbiter to mux
    addCircuitWire("p2", $("#arbiter"), $("#mux-border"), "bottom", "top");

    // From mux to result
    addCircuitWire("p2", $("#mux-border"), $("#result"), "right", "left", 0);

	connectAll();
}

/**
 * Auxiliar function to create a path and push it to the array of connections.
 * @param {String} id path id
 * @param {HTMLElement} output path source HTML element
 * @param {HTMLElement} input path destination HTML element
 * @param {String} outputDir the side from where the path is arriving to the element
 * @param {String} inputDir the side from where the path is leaving the source element
 * @param {Number} nInput in case the destination element has more than one input
 * it is the flag that indicates the output position of the path
 */
function addCircuitWire(id, output, input, outputDir, inputDir, nInput) {
	// Create the path
	newpath = createPath(id);
	// Add new wire to array of wires
	connections.push([$(newpath), output, input, outputDir, inputDir, nInput]);
}

/**
 * Shows/Hides the given circuit element, with the color passed
 * by parameter.
 * @param {HTMLElement} el the element of the circuit
 * @param {String} color the color with which display the element
 */
function toggleCircuitEl(el, color = "") {
	// Remove element if no color is specified
	if (!color) {
		el.css({
			opacity: 0,
			stroke: "#555",
		});
	} else {
		el.css({
			opacity: 1,
			stroke: color,
		});
	}
}

/**
 * Maintains SVG's responsiveness when resizing the window/browser.
 */
$(window).resize(function () {
	
    setTimeout(() => {
        $("#circuitsSVG").css("width", window.document.body.scrollWidth);
        $("#circuitsSVG").css("height", window.document.body.scrollHeight);
        connectAll()
    }, 1)
});