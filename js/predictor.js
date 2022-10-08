// p = JSON.parse(sessionStorage.getItem("predictor"));
// Temporal Predictor object for testing purposes
p = {
	level: 1,
	bits: 1,
	brHistory: -1,
	bhr: "",
	bht: "global",
	subps: [ // hybrid predictors
		{
			level: -1,
			bits: -1,
			brHistory: -1,
			bhr: "",
			bht: "",
		},
		{
			level: -1,
			bits: -1,
			brHistory: -1,
			bhr: "",
			bht: "", 
		}
	]
}

var jumps = [];
var currJump = 0;

step = -1;

const fileInput = $("#fileInput");
const fileSelect = $("#fileSelect");
const inputPattern = document.getElementById("input");
const patternOption = $(".predefined-pattern");
const patternInput = $("#patternInput");

const histTable = $("#histTable");
const seqTable = $("#seqTable tr:eq(0)");

// L1
const l1 = $("#l1");
const l1BTB = $("#l1BTB");
const gCounter = {
	bit: p.bits,
	state: 0,
	take: function() { return this.state >= Math.pow(2, p.bits)/2 },
	strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
};
const lCounter = [];
let jumpIds;
let jumpHitMiss = [];

// L2
const l2 = $("#l2");

// Hybrid
const hybrid = $("#hybrid");

// Global Hit/Miss chart
const globalHMctx = document.getElementById("globalHM").getContext("2d");
const globaHMChart = new Chart(globalHMctx, {
    type: 'pie',
    data: {
        labels: ["Hit", "Miss"],
        datasets: [
			{
				data: [0, 0],
				backgroundColor: ["#2ecc71","#e74c3c"]
        	}
		]
    },
	options: {
		title: {
			display: true,
			text: 'Global Hit/Miss'
		},
		responsive: true
    }
});

// Local Hit/Miss chart
const localHMctx = document.getElementById("localHM").getContext("2d");
const localHMChart = new Chart(localHMctx, {
    type: 'bar',
    data: {
		labels: [],
		datasets: [
			{
				label: "Instructions",
				data: [],
			},
			{
				label: "Hits",
				data: [],
				backgroundColor: "#2ecc71"
			},
			{
				label: "Misses",
				data: [],
				backgroundColor: "#e74c3c"
			},
		]
	},
	options: {
		scales: {
			yAxes: [{
				ticks: {
					beginAtZero:true
				}
			}]
		}
	}
});

buildPredictor();

function addHM(id, isHit) {
	// Update global HM chart
	globaHMChart.data.datasets[0].data[isHit ? 0 : 1]++;
    globaHMChart.update();

	// Update local HM Chart
	i = localHMChart.data.labels.indexOf(id);
	localHMChart.data.datasets[0].data[i]++;
	localHMChart.data.datasets[isHit ? 1 : 2].data[i]++;
	localHMChart.update();
}


function updatePatternInput(pattern) {
	pat = "";
	switch(pattern) {
		case 0: // all 0's
			pat = "S0 0 S0 0 S0 0 S0 0 S0 0 S0 0 S0 0 S0 0"
			break;
		case 1: // all 1's
			pat = "S0 1 S0 1 S0 1 S0 1 S0 1 S0 1 S0 1 S0 1"
			break;
		case 2: // alternate
			pat = "S0 0 S0 1 S0 0 S0 1 S0 0 S0 1 S0 0 S0 1"
			break;
		case 3: // alternate in pairs
			pat = "S0 0 S0 0 S0 1 S0 1 S0 0 S0 0 S0 1 S0 1"
			break;
		default:
			pat = "S0 0 S0 0 S0 0 S0 0 S0 0 S0 0 S0 0 S0 0"
	}
	patternInput.val(pat);
}

function loadDataFile(input) {
	let file = input.files[0];
	if (file) {
		var reader = new FileReader();
		reader.readAsText(file, "UTF-8");
		reader.onload = (evt) => generatePattern(evt.target.result);
		reader.onerror = (evt) => alert("There was an error reading the file");
	}
}

function getPattern() {
		let patternInput = $("#patternInput").val().trim() + " ";
		let n = $("#patternTimes").val().trim();

		if (!n.length || n <= 0) return alert("The number of repetitions must be positive.");
		
		n = parseInt(n);
		let fullPattern = patternInput.repeat(n);

		if (!generatePattern(fullPattern)) $("#patternModal").modal("hide");
}

function generatePattern(data) {
	// Clear previous data
	clearData();

	let inputValues = data.trim().split(/\s+/);
	
	if (inputValues.length % 2 != 0) {
		alert("The introduced pattern is not valid.")
		return 1;
	}

	for (i = 0; i < inputValues.length; i+=2) {
		let jump = parseInt(inputValues[i+1]);
		if (isNaN(jump)) return "The introduced pattern is not valid"; 
		jumps[i/2] = [inputValues[i], parseInt(inputValues[i+1])];
	}
	fillTable();
	fillSequence();
}

function fillTable() {
	let tHead = histTable.find("thead tr");
	let lastRows = [];

	for (jump of jumps) {   
		let ths = tHead.find("th");
		let currTh;
		let found = false;

		// Find jump identifier
		for (th of ths) {
			currTh = $(th);
			if (currTh.html() === jump[0]) {
				found = true;
				break;
			}
		}

		if (found)lastRows[currTh.index()]++;
		else {
			lastRows.push(0);
			currTh = $('<th></th>').text(jump[0]).appendTo(tHead);

			// Create all td's in the column
			for (let i = 0 ; i < histTable.find("tbody tr").length; i++)
				histTable.find("tbody tr").eq(i).append($('<td></td>'));
		}

		if (histTable.find("tbody tr").length <= lastRows[currTh.index()]) {
			let tr = $('<tr></tr>');
			for (let i = 0; i < lastRows.length; i++) tr.append("<td></td>");
			
			histTable.find("tbody").append(tr);
		}

		histTable.find("tbody tr").eq(lastRows[currTh.index()]).find("td").eq(currTh.index()).html(jump[1]);
	}
}

function fillSequence() {
	for (jump of jumps) {
		seqTable.append($("<td>" + jump[0] + " -> " + jump[1] + "</td>"));
	}
}

function buildPredictor() {
	switch(p.level) {
		case 1:
			buildL1();
			break;
		case 2:
			buildL2();
			break;
		case 3:
			buildHybrid();
			break;
	}
}

function buildL1() {
	l1.css("display", "block");
}

function buildL2() {
	l2.css("display", "block");
}

function buildHybrid() {
	hybrid.css("display", "block");
}

function loadData() {
	let ids = jumps.map(v => v[0]);
	jumpIds = ids.filter((v, i, a) => a.indexOf(v) === i); // indexOf finds first occurrence
	
	// Add starting information to chart
	jumpIds.map(j => jumpHitMiss.push([j, 0, 0]));
	localHMChart.data.labels = jumpIds;
	localHMChart.data.datasets[0].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[1].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[2].data = new Array(jumpIds.length).fill(0);
	localHMChart.update();

	if (p.bht === "local") {
		jumpIds.forEach(e => {
			lCounter.push({
				id: e,
				bit: p.bits,
				state: 0,
				take: function() {return this.state >= Math.pow(2, p.bits)/2},
				strongState: function() {return this.state === 0 || this.state === Math.pow(2, p.bits)-1}
			});
		});
	}

	switch(p.level) {
		case 1:
			loadDataL1();
			break;
		case 2:
			loadDataL2();
			break;
		case 3:
			loadDataHybrid();
			break;
	}
	message("Branch data has been correctly loaded.");
	step++;
}

function loadDataL1() {
	// Create one tr for each direction
	for (id of jumpIds) {
		let tr = $("<tr></tr>");
		tr.append(`<td>${id}</td>`);
		tr.append(`<td>@dest</td>`);
		tr.append(`<td>${'0'.padStart(p.bits, '0')}</td>`);
		l1BTB.find("tbody").append(tr);
	}
}

function loadDataL2() {
}

function loadDataHybrid() {

}

function next() {
	step++;
	if (currJump === jumps.length) return end();
	
	switch (p.level) {
		case 1:
			nextL1();
			
			break;
		case 2:
			nextL2();
			break;
		case 3:
			nextHybrid();
			break;
	}

}

function nextL1() {
	let currLCounter = p.bht === "local" ? lCounter.find(e => e.id === jumps[currJump][0]) : {};

	switch(step) {
		case 1: // Fetch instruction
			if (p.bht == "local") message(`The address @${currLCounter.id} is used to check the prediction in the BTB.`);
			else message(`The result of the instruction @${jumps[currJump][0]} is directly compared with the decision of the global saturation counter.`);
			break;
		case 2: // Check hit/miss
			let isCorrect, changeState;

			if (p.bht === "local") {			
				isCorrect = currLCounter.take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !currLCounter.strongState())
				addHM(currLCounter.id, isCorrect);

				message(`The prediction was ${currLCounter.take() ? `to take the branch` : `not to take the branch`} (${currLCounter.state.toString(2).padStart(p.bits, '0')}), so it is ${isCorrect ? `` : `not `}correct.`);
				if (changeState) {
					message(` The local saturation counter is ${isCorrect ? (currLCounter.take() ? `increased` : `decreased`) : (currLCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (currLCounter.take() ? ++currLCounter.state : --currLCounter.state) : (currLCounter.take() ? --currLCounter.state : ++currLCounter.state)).toString(2)).padStart(p.bits, '0')}.`, 1)
					l1BTB.find(`tbody tr:eq(${lCounter.indexOf(currLCounter)}) td:eq(2)`).html(currLCounter.state.toString(2).padStart(p.bits, '0'));
				} else message(` The saturation counter stays in ${currLCounter.state.toString(2).padStart(p.bits, '0')}.`, 1);

			} else {
				isCorrect = gCounter.take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !gCounter.strongState())
				addHM(jumps[currJump][0], isCorrect);

				message(`The prediction was ${gCounter.take() ? `to take the branch` : `not to take the branch`} (${gCounter.state.toString(2).padStart(p.bits, '0')}), so it is ${isCorrect ? `` : `not `}correct.`);
				if (changeState) {
					message(` The local saturation counter is ${isCorrect ? (gCounter.take() ? `increased` : `decreased`) : (gCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (gCounter.take() ? ++gCounter.state : --gCounter.state) : (gCounter.take() ? --gCounter.state : ++gCounter.state)).toString(2)).padStart(p.bits, '0')}.`, 1)
					l1BTB.find(`tbody tr`).each((i, tr) => $(tr).find(`td:eq(2)`).html(gCounter.state.toString(2).padStart(p.bits, '0')));
				} else message(` The saturation counter stays in ${gCounter.state.toString(2).padStart(p.bits, '0')}.`, 1);
			}
			console.log("Binary state: ", gCounter.state.toString(2));
			step = 0;
			if (++currJump != jumps.length) message(` Next branch instruction is fetched.`, 1)
			break;
	}
}

function nextL2() {

}

function nextHybrid() {

}

function clearData() {
	jumps = [];

	histTable.find("thead tr:eq(0)").empty();
	histTable.find("tbody").empty();
	seqTable.empty();

	switch(p.level) {
		case 1:
			l1BTB.find("tbody").empty();
			break;
		case 2:
			break;
		case 3:
			break;
	}

	step = -1;
}

function end() {
	alert("Simulation finished");
}

function message(str, append = 0, type = 0) {
	let wrapper = $("#helper-text-wrapper");
	if (append == 0) wrapper.html(str);
	else wrapper.append(str);	
}

fileSelect.on("click", e => {
	fileInput.click();
});