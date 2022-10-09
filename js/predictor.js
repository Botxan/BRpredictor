p = JSON.parse(sessionStorage.getItem("predictor"));
// Temporal Predictor object for testing purposes
// p = {
// 	level: 2,
// 	bits: 2,
// 	brHistory: 4,
// 	bhr: "local",
// 	bht: "local",
// 	subps: [ // hybrid predictors
// 		{
// 			level: -1,
// 			bits: -1,
// 			brHistory: -1,
// 			bhr: "",
// 			bht: "",
// 		},
// 		{
// 			level: -1,
// 			bits: -1,
// 			brHistory: -1,
// 			bhr: "",
// 			bht: "", 
// 		}
// 	]
// }

var jumps = [];
var currJump = 0;

step = -1;

const fileInput = $("#fileInput");
const btnImport = $("#btnImport");
const inputPattern = document.getElementById("input");
const patternOption = $(".predefined-pattern");
const patternInput = $("#patternInput");

const histTable = $("#histTable");
const seqTable = $("#seqTable tr:eq(0)");

let jumpIds;
let jumpHitMiss = [];

// L1
const l1 = $("#l1");
const l1BHT = $("#l1BHT");
const l1BTB = $("#l1BTB");
const gCounter = {
	state: 0,
	take: function() { return this.state >= Math.pow(2, p.bits)/2 },
	strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
};
const lCounter = []; // [id, BHR (if local) and PHT values (if local)]

// L2
const l2 = $("#l2");
const l2BHR = $("#l2BHR");
const l2BHT = $("#l2BHT");
const l2BTB = $("#l2BTB");

let btb = [];
let gBHR = [];
let gBHT = [];

let isCorrect, changeState, currEntry, row;

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
		title: {
			display: true,
			text: 'Local Hit/Miss'
		},
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
loadPredictorDescription();
enableInput();

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

function loadPredictorDescription() {
	let t = $("#descriptionTable");
	t.find("tr:eq(0) td").html(p.level === 1 ? "1 level" : (p.level === 2 ? "2 level" : `hybrid (${p.subps[0] === 1 ? "L1" : "L2"} and ${p.subps[1] === 1 ? "L1" : "L2"})`));
	t.find("tr:eq(1) td").html(`${p.bits} b`);
	t.find("tr:eq(2) td").html(p.brHistory === -1 ? `-`: `${p.brHistory} jumps`);
	t.find("tr:eq(3) td").html(p.bhr == "" ? "-" : p.bhr);
	t.find("tr:eq(4) td").html(p.bht);
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

	disableInput();

	$("#jumpCounter").html(`${jumps.length} jump${jumps.length > 1 ? 's' : ''} loaded`);
}

function fillTable() {
	let tHead = histTable.find("thead tr");
	let lastRows = [];
	let used = [];

	for (jump of jumps) {   
		let currTh;
		let found = false;

		// Find jump identifier
		for (const [i,u] of used.entries()) {
			currTh = tHead.find(`th:eq(${i})`);
			if (u === jump[0]) {
				found = true;
				break;
			}
		}
	
		if (found) lastRows[currTh.index()]++;
		else {
			used.push(jump[0]);
			lastRows.push(0);
			currTh = $(`<th><i class="fa-solid fa-at blue-text"></i> ${jump[0]}</th>`).appendTo(tHead);

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
	for (jump of jumps) 
		seqTable.append(`<td><i class="fa-solid fa-at blue-text"></i> ${jump[0]} <i class="fa-solid fa-arrow-right-long"></i> ${jump[1]}</td>`);
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
	// Disable load btn
	$("#btnLoad").css({
		"pointer-events": "none",
		"opacity": ".5"
	})

	let ids = jumps.map(v => v[0]);
	jumpIds = ids.filter((v, i, a) => a.indexOf(v) === i); // indexOf finds first occurrence
	
	// Add starting information to chart
	jumpIds.map(j => jumpHitMiss.push([j, 0, 0]));
	localHMChart.data.labels = jumpIds;
	localHMChart.data.datasets[0].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[1].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[2].data = new Array(jumpIds.length).fill(0);
	localHMChart.update();

	if(p.bht === "local") {
		jumpIds.forEach(j => {
			lCounter.push({
				id: j,
				state: 0,
				take: function() {return this.state >= Math.pow(2, p.bits)/2},
				strongState: function() {return this.state === 0 || this.state === Math.pow(2, p.bits)-1}
			});
		});
	}

	// Generate BTB entries
	btb = jumpIds.map(j => ({
		id: j,
		bhr: p.bhr === "local" ? new Array(p.brHistory).fill(0) : null,
		bht: (function() {
			if (p.bht === "local") {
				let bhtArr = [];
				for (let i = 0; i < Math.pow(2, p.brHistory) ; i++) {
					bhtArr.push({
						state: 0,
						take: function() { return this.state >= Math.pow(2, p.bits)/2 },
						strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
					});
				}
				return bhtArr;
			} else return null;
		}())
	}));

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
	if (p.bhr === "local" || p.bht === "local") message(" Assume that BTB is associative, so all addresses have an entry in the BTB.", 1);
	step++;
}

function loadDataL1() 
{
	// Create one tr for each address
	for (id of jumpIds) {
		let tr = $("<tr></tr>");
		tr.append(`<td>${id}</td>`);
		tr.append(`<td>@dest</td>`);
		tr.append(`<td ${p.bht === `global` ? `style="display: none;"` : ``}>${'0'.padStart(p.bits, '0')}</td>`);
		l1BTB.find("tbody").append(tr);
	}

	if (p.bht === "global") {
		l1BTB.find("thead tr th:eq(2)").css("display", "none");
		l1BHT.find("tbody tr td").html(gCounter.state.toString(2).padStart(p.bits, '0'));
	} else l1BHT.css("display", "none");
}

function loadDataL2() {
	// If bhr and bht are global, no BTB required
	if (p.bhr === "global" && p.bht === "global") l2BTB.css("display", "none");
	else {
		// Create one tr for each @address
		let tbody = l2BTB.find("tbody");
		for (e of btb) {
			let tr = $("<tr></tr>");
			// @dir
			tr.append(`<td>${e.id}</td>`);
			// @dest
			tr.append(`<td>@dest</td>`);
			// BHR
			tr.append(`<td ${p.bhr === `global` ? "style='display: none;'" : ``}>${'0'.padStart(p.brHistory, `0`)}</td>`);
			// BHT
			for (let i = 0; i < Math.pow(2, p.brHistory); i++) 
				tr.append(`<td ${p.bht === `global` ? `style=display: none;` : ``}>${'0'.padStart(p.bits, '0')}</td>`);
			tbody.append(tr);
		}
	}
	
	if (p.bhr === "global") {
		// Display and load global BHR
		gBHR = new Array(p.brHistory).fill(0);
		l2BHR.find("thead tr th").attr("colspan", p.brHistory);
		for(let i = 0; i < p.brHistory; i++) l2BHR.find("tbody tr").append(`<td>0</td>`);

		// Hide local BHR header and columns
		l2BTB.find("thead tr th:eq(2)").css("display", "none");
	} else {
		// Hide global BHR
		l2BHR.css("display", "none");	
	}

	if (p.bht === "global") {
		// Display and load global BHT
		for (let i = 0; i < Math.pow(2, p.brHistory); i++) 
			gBHT.push({
				state: 0,
				take: function() { return this.state >= Math.pow(2, p.bits)/2 },
				strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
			})
		

		l2BHT.find("thead tr:eq(0) th").attr("colspan", Math.pow(2, p.brHistory));
		for (let i = 0; i < Math.pow(2, p.brHistory); i++) {
			l2BHT.find("thead tr:eq(1)").append(`<th>${i.toString(2).padStart(p.brHistory, '0')}</th>`);
			l2BHT.find("tbody tr").append(`<td>${gBHT[i].state.toString(2).padStart(p.bits, '0')}</td>`);
		}

		// Hide local BHT columns
		l2BTB.find("thead tr th:eq(3)").css("display", "none");
		l2BTB.find("tbody tr").each((i, e) =>
			$(e).find("td").slice(3, Math.pow(2, p.brHistory)+3).css("display", "none")
		);
	}  else {
		// Hide global BHT 
		l2BHT.css("display", "none");
		// Expand local BHT header
		l2BTB.find("thead tr:eq(0) th:eq(3)").attr("colspan", Math.pow(2, p.brHistory));
		// Create sub-headers for all the BHT
		let h = l2BTB.find("thead tr:eq(1)");
		for (let i = 0; i < Math.pow(2, p.brHistory); i++) 
			h.append(`<th>${i.toString(2).padStart(p.brHistory, '0')}</th>`);
	}

	
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
			if (p.bht == "global") message(`The result of the instruction @${jumps[currJump][0]} is directly compared with the decision of the global BHT.`);
			else message(`The address @${currLCounter.id} is used to check the prediction in the BTB.`);
			break;
		case 2: // Check hit/miss
			let isCorrect, changeState;

			if (p.bht === "global") {
				isCorrect = gCounter.take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !gCounter.strongState());

				message(`The prediction was ${gCounter.take() ? `to take the branch` : `not to take the branch`} (${gCounter.state.toString(2).padStart(p.bits, '0')}), so it is ${isCorrect ? `` : `not `}correct.`);
				if (changeState) {
					message(` The global BHT counter is ${isCorrect ? (gCounter.take() ? `increased` : `decreased`) : (gCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (gCounter.take() ? ++gCounter.state : --gCounter.state) : (gCounter.take() ? --gCounter.state : ++gCounter.state)).toString(2)).padStart(p.bits, '0')}.`, 1)
					l1BHT.find("tbody tr td").html(gCounter.state.toString(2).padStart(p.bits, '0'));
				} else message(` The BHT stays in ${gCounter.state.toString(2).padStart(p.bits, '0')}.`, 1);
			} else {
				isCorrect = currLCounter.take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !currLCounter.strongState());

				message(`The prediction was ${currLCounter.take() ? `to take the branch` : `not to take the branch`} (${currLCounter.state.toString(2).padStart(p.bits, '0')}), so it is ${isCorrect ? `` : `not `}correct.`);
				if (changeState) {
					message(` The local BHT is ${isCorrect ? (currLCounter.take() ? `increased` : `decreased`) : (currLCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (currLCounter.take() ? ++currLCounter.state : --currLCounter.state) : (currLCounter.take() ? --currLCounter.state : ++currLCounter.state)).toString(2)).padStart(p.bits, '0')}.`, 1)
					l1BTB.find(`tbody tr:eq(${lCounter.indexOf(currLCounter)}) td:eq(2)`).html(currLCounter.state.toString(2).padStart(p.bits, '0'));
				} else message(` The BHT stays in ${currLCounter.state.toString(2).padStart(p.bits, '0')}.`, 1);
			}
			
			addHM(jumps[currJump][0], isCorrect);
			step = 0;
			if (++currJump != jumps.length) message(` Next branch instruction is fetched.`, 1)
			break;
	}
}

function nextL2() {
	if (p.bhr === "local" || p.bht === "local") {
		currEntry = btb.find(e => e.id === jumps[currJump][0]);
		row = l2BTB.find(`tbody tr:eq(${btb.indexOf(currEntry)})`);
	}
	let bhrVal = p.bhr === "global" ? parseInt(gBHR.join(""), 2) : parseInt(currEntry.bhr.join(""), 2);

	switch(step) {
		case 1: // Access to BTB or global BHR/BHT
			message(`The prediction is checked using the ${(p.bhr === "local" || p.bht === "local") ? `address @${jumps[currJump][0]} and the` : ``} the value of the ${p.bhr} BHR. Then, the corresponding column of the ${p.bht} BHT is accessed.`);
			break;
		case 2: // Check if prediction is correct
			if (p.bht === "global") {
				isCorrect = gBHT[bhrVal].take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !gBHT[bhrVal].strongState());
			} else {
				isCorrect = currEntry.bht[bhrVal].take() == jumps[currJump][1];
				changeState = !isCorrect || (isCorrect && !currEntry.bht[bhrVal].strongState());
			}

			message(`The result of the instruction @${jumps[currJump][0]} is ${jumps[currJump][1] ? `` : `not`} to take the branch (${jumps[currJump][1]}), and the BHT value is ${(p.bht === `global` ? gBHT[bhrVal].state : currEntry.bht[bhrVal].state).toString(2).padStart(p.bits, '0')}. So the prediction is ${isCorrect ? `` : `not`} correct.`);
			addHM(jumps[currJump][0], isCorrect);
			break;

		case 3: // Update BHR and BHT. Fetch next instruction (if any)
			// Update BHT
			if (changeState) {
				if (p.bht === "global") {
					l2BHT.find(`tbody tr td:eq(${bhrVal})`).html((++gBHT[bhrVal].state).toString(2).padStart(p.bits, '0'));	
					message(`The corresponding ${p.bht} BHT counter is ${isCorrect ? (gBHT[bhrVal].take() ? `increased`: `decreased`) : (gBHT[bhrVal].take() ? `decreased` : `increased`)} to ${gBHT[bhrVal].state.toString(2).padStart(p.bits, '0')}.`);
				} else {
					row.find(`td:eq(${bhrVal+3})`).html((++currEntry.bht[bhrVal].state).toString(2).padStart(p.bits, '0'));
					message(`The corresponding ${p.bht} BHT counter is ${isCorrect ? (currEntry.bht[bhrVal].take() ? `increased`: `decreased`) : (currEntry.bht[bhrVal].take() ? `decreased` : `increased`)} to ${currEntry.bht[bhrVal].state.toString(2).padStart(p.bits, '0')}.`);
				}		
			} else message(`The ${p.bht} BHT counter stays in ${(p.bht === "global" ? gBHT[bhrVal].state : currEntry.bht[bhrVal].state).toString(2).padStart(p.bits, '0')}.`)
			
			// Update BR
			if (p.bhr === "global") {
				gBHR.shift();
				gBHR.push(jumps[currJump][1]);
				for (let i = 0; i < p.brHistory; i++)
					l2BHR.find(`td:eq(${i})`).html(gBHR[i]);		
			} else {
				currEntry.bhr.shift();
				currEntry.bhr.push(jumps[currJump][1]);
				row.find(`td:eq(2)`).html(currEntry.bhr.join("").padStart(p.brHistory, '0'));
			}

			message(` ${p.bhr.charAt(0).toUpperCase() + p.bhr.slice(1)} BHR is shifted to ${(p.bhr === "global" ? gBHR.join("") : currEntry.bhr.join("")).padStart(p.brHistory, '0')}.` , 1);
			step = 0;
			if (++currJump != jumps.length) message(` Next branch instruction is fetched.`, 1)
			break;
	}
}

function nextHybrid() {

}

function clearData() {
	jumps = [];

	histTable.find("thead tr:eq(0)").empty();
	histTable.find("tbody").empty();
	seqTable.empty();

	$("#jumpCounter").html("Waiting for input... ");

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
	enableInput();
}

function end() {
	alert("Simulation finished");
}

function message(str, append = 0, type = 0) {
	let wrapper = $("#helper-text-wrapper");
	if (append == 0) wrapper.html(str);
	else wrapper.append(str);	
}

function disableInput() {
	// Disable input-related buttons
	$("#btnImport, #btnGenerate").css({
		"pointer-events": "none",
		"opacity": ".5"
	});

	// Enable clear
	$("#btnClear, #btnLoad").css({
		"pointer-events": "auto",
		"opacity": "1"
	});
}

function enableInput() {
	// Enable input-related buttons
	$("#btnImport, #btnGenerate").css({
		"pointer-events": "auto",
		"opacity": "1"
	});

	// Disable clear
	$("#btnClear, #btnLoad").css({
		"pointer-events": "none",
		"opacity": ".5"
	});
}

btnImport.on("click", e => {
	fileInput.click();
});