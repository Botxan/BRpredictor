// p = JSON.parse(sessionStorage.getItem("predictor"));
// Temporal Predictor object for testing purposes
p = {
	level: 3,
	bits: 2,
	brHistory: -1,
	bhr: "",
	bht: "global",
	subps: [ // hybrid predictors
		{
			level: 1,
			bits: 1,
			brHistory: -1,
			bhr: "",
			bht: "global",
		},
		{
			level: 2,
			bits: 2,
			brHistory: 6,
			bhr: "global",
			bht: "local",
		}
	]
}

var jumps = [];
var currJump = 0;

let step = 0;

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
const L1Counters = [];

// L2
const l2 = $("#l2");
const l2BHR = $("#l2BHR");
const l2BHT = $("#l2BHT");
const l2BTB = $("#l2BTB");

let gBHR = [];
let gBHT = [];
let gBTB = [];

// Hybrid
const hybridDiv = $("#hybrid");
// Predictors P1 and P2
let ps = [
    {
        btb: [], // BTB for P1
        L2bhr: [], // Global BHR for P1
        L1bht: [], // Saturated counters for P1
        L2bht: [], // Global BHT for P1
        L1DOM: $("#p1l1"),
        L1bhtDOM: $("#p1l1BHT"),
        L1btbDOM: $("#p1l1BTB"),
        L2DOM: $("#p1l2"),
        L2bhrDOM: $("#p1l2BHR"),
        L2bhtDOM: $("#p1l2BHT"),
        L2btbDOM: $("#p1l2BTB")      
    },
    {
        btb: [], // BTB for P2
        L2bhr: [], // Global BHR for P2
        L1bht: [], // Saturated counters for P2
        L2bht: [], // Global BHT for P2
        L1DOM: $("#p2l1"),
        L1bhtDOM: $("#p2l1BHT"),
        L1btbDOM: $("#p2l1BTB"),
        L2DOM: $("#p2l2"),
        L2bhrDOM: $("#p2l2BHR"),
        L2bhtDOM: $("#p2l2BHT"),
        L2btbDOM: $("#p2l2BTB")
    }
];

let arbiter = [];

let currEntry, row;
let isCorrectHybrid = [];
let changeHybrid = [];

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

const arbCounter = $("#arbiterCounter"); // If arbiter is global
const choiceTable = $("#choiceTable"); // If arbiter is local

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
disableSimControls();

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
	t.find("tr:eq(0) td").html(p.level === 1 ? "1 level" : (p.level === 2 ? "2 level" : `hybrid (${p.subps[0].level === 1 ? "L1" : "L2"} and ${p.subps[1].level === 1 ? "L1" : "L2"})`));
	t.find("tr:eq(1) td").html(`${p.bits} b`);
	t.find("tr:eq(2) td").html(p.brHistory === -1 ? `-`: `${p.brHistory} jumps`);
	t.find("tr:eq(3) td").html(p.bhr === "" ? "-" : p.bhr);
	t.find("tr:eq(4) td").html(p.bht === "" ? "-" : p.bht);
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

function buildL1(subPred = -1) {
    let L1DOM = subPred >= 0 ? ps[subPred].L1DOM : l1;
	L1DOM.css("display", "block");
}

function buildL2(subPred = -1) {
    let L2DOM = subPred >= 0 ? ps[subPred].L2DOM : l2;
	L2DOM.css("display", "block");
}

function buildHybrid() {
	hybridDiv.css("display", "block");

    for (let [i, subp] of p.subps.entries())
        subp.level == 1 ? buildL1(i) : buildL2(i);

    // Display hybrid wires
    $("#circuitsSVG").css("width", window.document.body.scrollWidth);
	$("#circuitsSVG").css("height", window.document.body.scrollHeight);
	drawCircuits();
}

/**
 * Loads data common to every type of predictor
 */
function loadCommonData() {
    // Get a list of unique identifiers from the jumps
    let ids = jumps.map(v => v[0]);
	jumpIds = ids.filter((v, i, a) => a.indexOf(v) === i); // indexOf finds first occurrence

    // Initialize charts
	jumpIds.map(j => jumpHitMiss.push([j, 0, 0]));
	localHMChart.data.labels = jumpIds;
	localHMChart.data.datasets[0].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[1].data = new Array(jumpIds.length).fill(0);
	localHMChart.data.datasets[2].data = new Array(jumpIds.length).fill(0);
	localHMChart.update();

    // If hybrid, load specific data for each predictor and arbiter
    if (p.level === 3) {
        for (let i = 0; i < p.subps.length; i++) loadData(i);

        // Build arbiter
        if (p.bht === "global") {
            arbiter.push({
                id: null,
                state: 0,
                take: function() { return this.state >= Math.pow(2, p.bits)/2 },
                strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
            });

            arbCounter.find("tbody tr td").html('0'.padStart(p.bits, '0'));
            choiceTable.css("display", "none");
        } else {
            for (j of jumpIds) {
                arbiter.push({
                    id: j,
                    state: 0,
                    take: function() { return this.state >= Math.pow(2, p.bits)/2 },
                    strongState: function() { return this.state === 0 || this.state === Math.pow(2, p.bits)-1 }
                });
                let tr = $("<tr></tr>");
                tr.append($(`<td>${j}</td>`));
                tr.append($(`<td>${'0'.padStart(p.bits, '0')}</td>`));
                choiceTable.find("tbody").append(tr);
            }

            arbCounter.css("display", "none");
        }
    } else loadData(-1);
}

function loadData(subPred = -1) {
    let pr, prbht, prbhr, btb, counters;

    if (subPred >= 0) {
        pr = p.subps[subPred];
        prbht = p.subps[subPred].bht;
        prbhr = p.subps[subPred].bhr;
        counters = ps[subPred].L1bht;
        btb = ps[subPred].btb;
    } else {
        pr = p;
        prbht = p.bht;
        prbhr = p.bhr;
        counters = L1Counters;
        btb = gBTB;
    }

	// Generate BTB entries (if needed)
    if (prbhr === "local" || prbht === "local") {
        jumpIds.forEach(j => (
            btb.push({
                id: j,
                bhr: pr.bhr === "local" ? new Array(pr.brHistory).fill(0) : null,
                bht: (function() {
                    if (prbht === "local") {
                        let bhtArr = [];
                        for (let i = 0; i < Math.pow(2, pr.brHistory) ; i++) {
                            bhtArr.push({
                                state: 0,
                                take: function() { return this.state >= Math.pow(2, pr.bits)/2 },
                                strongState: function() { return this.state === 0 || this.state === Math.pow(2, pr.bits)-1 }
                            });
                        }
                        return bhtArr;
                    } else return null;
                }())
        })))
    }

    // Generate local counters (if needed)
	if (prbht === "local") {
		jumpIds.forEach(j => {
			counters.push({
				id: j,
				state: 0,
				take: function() {return this.state >= Math.pow(2, pr.bits)/2},
				strongState: function() {return this.state === 0 || this.state === Math.pow(2, pr.bits)-1}
			});
		});
	}

	switch(pr.level) {
		case 1:
			loadDataL1(subPred);
			break;
		case 2:
			loadDataL2(subPred);
			break;
	}

    // Disable load btn
	$("#btnLoad").css({
		"pointer-events": "none",
		"opacity": ".5"
	})

	message(subPred, "Branch data has been correctly loaded.");
	if (pr.bhr === "local" || pr.bht === "local") 
        message(-1, " Assume that BTB is associative, so all addresses have an entry in the BTB.", 1);

	// Enable simulator controls
	enableSimControls();
}

function loadDataL1(subPred = -1) {
    let btbDOM, bhtDOM, pr, pCounter;
    
    if (subPred >= 0) {
        btbDOM = ps[subPred].L1btbDOM;
        bhtDOM = ps[subPred].L1bhtDOM;
        pr = p.subps[subPred];
        pCounter = ps[subPred].L1bht;
    } else {
        btbDOM = l1BTB;
        bhtDOM = l1BHT;
        pr = p;
        pCounter = L1Counters;
    }

	// Create one tr for each address
	for (id of jumpIds) {
		let tr = $("<tr></tr>");
		tr.append(`<td>${id}</td>`);
		tr.append(`<td>@dest</td>`);
		tr.append(`<td ${pr.bht === `global` ? `style="display: none;"` : ``}>${'0'.padStart(pr.bits, '0')}</td>`);
		btbDOM.find("tbody").append(tr);
	}

	if (pr.bht === "global") {
        pCounter.push({
            id: null,
            state: 0,
            take: function() { return this.state >= Math.pow(2, pr.bits)/2},
            strongState: function() { return this.state === 0 || this.state === Math.pow(2, pr.bits)-1 }
        });

        bhtDOM.find("tbody tr td").html(pCounter[0].state.toString(2).padStart(pr.bits, '0'));
        btbDOM.css("display", "none");
	} else {
        bhtDOM.css("display", "none");
    }
}

function loadDataL2(subPred = -1) {
    let pr, bhr, bht, btb, bhrDOM, bhtDOM, btbDOM;

    if (subPred >= 0) {
        pr = p.subps[subPred];
        bhr = ps[subPred].L2bhr;
        bht = ps[subPred].L2bht;
        btb = ps[subPred].btb;
        bhrDOM = ps[subPred].L2bhrDOM;
        bhtDOM = ps[subPred].L2bhtDOM;
        btbDOM = ps[subPred].L2btbDOM;
    } else {
        pr = p;
        bhr = gBHR;
        bht = gBHT;
        btb = gBTB;
        bhrDOM = l2BHR;
        bhtDOM = l2BHT;
        btbDOM = l2BTB;
    }

	// If bhr and bht are global, no BTB required
	if (pr.bhr === "global" && pr.bht === "global") btbDOM.css("display", "none");
	else {
		// Create one tr for each @address
		let tbody = btbDOM.find("tbody");
		for (e of btb) {
			let tr = $("<tr></tr>");
			// @dir
			tr.append(`<td>${e.id}</td>`);
			// @dest
			tr.append(`<td>@dest</td>`);
			// BHR
			tr.append(`<td ${pr.bhr === `global` ? "style='display: none;'" : ``}>${'0'.padStart(pr.brHistory, `0`)}</td>`);
			// BHT
			for (let i = 0; i < Math.pow(2, pr.brHistory); i++) 
				tr.append(`<td ${pr.bht === `global` ? `style=display: none;` : ``}>${'0'.padStart(pr.bits, '0')}</td>`);
			tbody.append(tr);
		}
	}
	
	if (pr.bhr === "global") {
		// Display and load global BHR
        for (let i = 0; i < pr.brHistory; i++) bhr.push(0)
		bhrDOM.find("thead tr th").attr("colspan", pr.brHistory);
		for(let i = 0; i < pr.brHistory; i++) bhrDOM.find("tbody tr").append(`<td>0</td>`);

		// Hide local BHR header and columns
		btbDOM.find("thead tr th:eq(2)").css("display", "none");
	} else {
		// Hide global BHR
		bhrDOM.css("display", "none");	
	}

	if (pr.bht === "global") {
		// Display and load global BHT
		for (let i = 0; i < Math.pow(2, pr.brHistory); i++) 
        bht.push({
				state: 0,
				take: function() { return this.state >= Math.pow(2, pr.bits)/2 },
				strongState: function() { return this.state === 0 || this.state === Math.pow(2, pr.bits)-1 }
			});

            bhtDOM.find("thead tr:eq(0) th").attr("colspan", Math.pow(2, pr.brHistory));
		for (let i = 0; i < Math.pow(2, pr.brHistory); i++) {
			bhtDOM.find("thead tr:eq(1)").append(`<th>${i.toString(2).padStart(pr.brHistory, '0')}</th>`);
			bhtDOM.find("tbody tr").append(`<td>${bht[i].state.toString(2).padStart(pr.bits, '0')}</td>`);
		}

		// Hide local BHT columns
		btbDOM.find("thead tr th:eq(3)").css("display", "none");
		btbDOM.find("tbody tr").each((i, e) =>
			$(e).find("td").slice(3, Math.pow(2, pr.brHistory)+3).css("display", "none")
		);
	}  else {
		// Hide global BHT 
		bhtDOM.css("display", "none");
		// Expand local BHT header
		btbDOM.find("thead tr:eq(0) th:eq(3)").attr("colspan", Math.pow(2, pr.brHistory));
		// Create sub-headers for all the BHT
		let h = btbDOM.find("thead tr:eq(1)");
		for (let i = 0; i < Math.pow(2, pr.brHistory); i++) 
			h.append(`<th>${i.toString(2).padStart(pr.brHistory, '0')}</th>`);
	}	
}

function next() {
	step++;
	if (currJump === jumps.length) return end();
	
    if (step < 4) { // Depending on predictor
        switch (p.level) {
            case 1:
                nextL1();	
                break;
            case 2:
                nextL2();
                break;
            case 3:
                for ([i, pr] of p.subps.entries()) pr.level === 1  ? nextL1(i) : nextL2(i);
                break;
        }
    } else { // Arbiter
        nextArbiter();
    }
}

function nextL1(subPred = -1) {
    let pr, prbht, counter, bthDOM, btbDOM;

    // Save hit/miss in array if hybrid predictor
    if (subPred >= 0) {
        pr = p.subps[subPred];
        prbht = p.subps[subPred].bht;
        counter = ps[subPred].L1bht;
        bthDOM = ps[subPred].L1bhtDOM;
        btbDOM = ps[subPred].L1btbDOM;
 
    } else {
        pr = p;
        prbht = p.bht;
        counter = L1Counters;
        bthDOM = l1BHT;
        btbDOM = l1BTB;
    }   

	let currCounter = prbht === "local" ? counter.find(e => e.id === jumps[currJump][0]) : counter[0];

    let isCorrect = currCounter.take() == jumps[currJump][1];
    let changeState = !isCorrect || (isCorrect && !currCounter.strongState());

	switch(step) {

		case 1: // Access to BTB or global BHT
			if (prbht == "global") message(subPred, `The prediction for @${jumps[currJump][0]} is directly compared to the decision of the global BHT.`);
			else message(subPred, `The address @${currCounter.id} is used to check the prediction in the BTB.`);
			break;

		case 2: // Check if prediction/s is/are correct
            message(subPred, `The result of the instruction @${jumps[currJump][0]} is ${jumps[currJump][1] ? `` : `not`} to take the branch (${jumps[currJump][1]}), and the BHT value is ${(currCounter.state).toString(2).padStart(pr.bits, '0')}. So the prediction is ${isCorrect ? `` : `not`} correct.`);
            if (subPred === -1) addHM(jumps[currJump][0], isCorrect);
            else isCorrectHybrid[subPred] = isCorrect;
            break;

        case 3: // Update BHT. End op. if non-hybrid
            if (changeState) {
                if (prbht === "global") {
                    message(subPred, `The global BHT counter is ${isCorrect ? (currCounter.take() ? `increased` : `decreased`) : (currCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (currCounter.take() ? ++currCounter.state : --currCounter.state) : (currCounter.take() ? --currCounter.state : ++currCounter.state)).toString(2)).padStart(pr.bits, '0')}.`)
                    bthDOM.find("tbody tr td").html(currCounter.state.toString(2).padStart(pr.bits, '0'));
                } else {
                    message(subPred, `The local BHT is ${isCorrect ? (currCounter.take() ? `increased` : `decreased`) : (currCounter.take() ? `decreased` : `increased`)} to state ${String((isCorrect ? (currCounter.take() ? ++currCounter.state : --currCounter.state) : (currCounter.take() ? --currCounter.state : ++currCounter.state)).toString(2)).padStart(pr.bits, '0')}.`);
                    btbDOM.find(`tbody tr:eq(${counter.indexOf(currCounter)}) td:eq(2)`).html(currCounter.state.toString(2).padStart(pr.bits, '0'));
                }
            } else message(subPred, `The BHT stays in ${currCounter.state.toString(2).padStart(pr.bits, '0')}.`);
            if (subPred === -1) {
                step = 0;
                currJump++;
                if (currJump != jumps.length) message(-1, ` Next branch instruction is fetched.`, 1)
            }     
	}
}

function nextL2(subPred = -1) {
    let pr, btb, bhr, bht, btbDOM, bhtDOM, bhrDOM, isCorrect, changeState;
    
    if (subPred >= 0) {
        pr = p.subps[subPred];
        bhr = ps[subPred].L2bhr;
        bht = ps[subPred].L2bht;
        btb = ps[subPred].btb;
        btbDOM = ps[subPred].L2btbDOM;
        bhtDOM = ps[subPred].L2bhtDOM;
        bhrDOM = ps[subPred].L2bhrDOM;
    } else {
        pr = p;
        bhr = gBHR;
        bht = gBHT;
        btb = gBTB;
        btbDOM = l2BTB;
        bhtDOM = l2BHT;
        bhrDOM = l2BHR;
    }

    if (pr.bhr === "local" || pr.bht === "local") {
		currEntry = btb.find(e => e.id === jumps[currJump][0]);
		row = btbDOM.find(`tbody tr:eq(${btb.indexOf(currEntry)})`);
	}

    let bhrVal = pr.bhr === "global" ? parseInt(bhr.join(""), 2) : parseInt(currEntry.bhr.join(""), 2);
 
    if (pr.bht === "global") {
        isCorrect = bht[bhrVal].take() == jumps[currJump][1];
        changeState = !isCorrect || (isCorrect && !bht[bhrVal].strongState());
    } else {
        isCorrect = currEntry.bht[bhrVal].take() == jumps[currJump][1];
        changeState = !isCorrect || (isCorrect && !currEntry.bht[bhrVal].strongState());
    }  

	switch(step) {
		case 1: // Access to BTB or global BHR/BHT
			message(subPred, `The prediction is checked using the ${(pr.bhr === "local" || pr.bht === "local") ? `address @${jumps[currJump][0]} and the` : ``} the value of the ${pr.bhr} BHR. Then, the corresponding column of the ${pr.bht} BHT is accessed.`);
			break;
		case 2: // Check if prediction/s is/are correct
            // Save hit/miss in array if hybrid predictor
            if (subPred != -1) isCorrectHybrid[subPred] = isCorrect;

			message(subPred, `The prediction for @${jumps[currJump][0]} is ${jumps[currJump][1] ? `` : `not`} to take the branch (${jumps[currJump][1]}), and the BHT value is ${(pr.bht === `global` ? bht[bhrVal].state : currEntry.bht[bhrVal].state).toString(2).padStart(pr.bits, '0')}. So the prediction is ${isCorrect ? `` : `not`} correct.`);
			if (subPred === -1) addHM(jumps[currJump][0], isCorrect);
			break;

		case 3: // Update BHR and BHT.
			// Update BHT
			if (changeState) {
				if (pr.bht === "global") {
					bhtDOM.find(`tbody tr td:eq(${bhrVal})`).html((++bht[bhrVal].state).toString(2).padStart(pr.bits, '0'));	
					message(subPred, `The ${pr.bht} BHT state is ${isCorrect ? (bht[bhrVal].take() ? `increased`: `decreased`) : (bht[bhrVal].take() ? `decreased` : `increased`)} to ${bht[bhrVal].state.toString(2).padStart(pr.bits, '0')}.`);
				} else {
					row.find(`td:eq(${bhrVal+3})`).html((++currEntry.bht[bhrVal].state).toString(2).padStart(pr.bits, '0'));
					message(subPred, `The ${pr.bht} BHT state is ${isCorrect ? (currEntry.bht[bhrVal].take() ? `increased`: `decreased`) : (currEntry.bht[bhrVal].take() ? `decreased` : `increased`)} to ${currEntry.bht[bhrVal].state.toString(2).padStart(pr.bits, '0')}.`);
				}		
			} else message(subPred, `The ${pr.bht} BHT stays in ${(pr.bht === "global" ? bht[bhrVal].state : currEntry.bht[bhrVal].state).toString(2).padStart(pr.bits, '0')} state.`)
			
			// Update BR
			if (pr.bhr === "global") {
				bhr.shift();
				bhr.push(jumps[currJump][1]);
				for (let i = 0; i < pr.brHistory; i++)
                    bhrDOM.find(`td:eq(${i})`).html(bhr[i]);		
			} else {
				currEntry.bhr.shift();
				currEntry.bhr.push(jumps[currJump][1]);
				row.find(`td:eq(2)`).html(currEntry.bhr.join("").padStart(pr.brHistory, '0'));
			}

			message(-1, ` ${pr.bhr.charAt(0).toUpperCase() + pr.bhr.slice(1)} BHR is shifted to ${(pr.bhr === "global" ? bhr.join("") : currEntry.bhr.join("")).padStart(pr.brHistory, '0')}.`, 1);

            if (subPred < 1) {
                step = 0;
                if (++currJump != jumps.length) message(subPred, ` Next branch instruction is fetched.`, 1)
            }
			break;
	}
}

function nextArbiter() {
    let currArbiter = p.bht === "global" ? arbiter[0] : arbiter.find(a => a.id === jumps[currJump][0]);
    let arbiterDOM = p.bht === "global" ? arbCounter : choiceTable.find(`tbody tr:eq(${arbiter.indexOf(currArbiter)}) td:eq(1)`);
    console.log(arbiter.indexOf(currArbiter))

    switch(step) {
        case 4: // (if-hybrid) use arbiter to select prediction
            message(-1, `Since arbiter decisión was to use the prediction of predictor ${+currArbiter.take() + 1} (${currArbiter.state.toString(2).padStart(p.bits, '0')}), the result of the prediction is ${isCorrectHybrid[+currArbiter.take()] ? "correct" : "wrong"}.`);
			break;

        case 5: // Update arbiter
            selectedCorrect = isCorrectHybrid[+currArbiter.take()];

            // Both fail: don't change
            if (isCorrectHybrid[0] && isCorrectHybrid[1]) message(-1, `Both predictions are correct. Arbiter stays in state ${currArbiter.state.toString(2).padStart(p.bits, '0')}.`);
            // Both correct: don't change
            else if (!isCorrectHybrid[0] && !isCorrectHybrid[1]) message(-1, `Both predictions are wrong. Arbiter stays in state ${currArbiter.state.toString(2).padStart(p.bits, '0')}.`);
            // 1 correct, 2 wrong: decrease if possible
            else if (isCorrectHybrid[0] && !isCorrectHybrid[1]) {
                message(-1, `Prediction 1 is correct and prediction 2 is wrong.`);
                if (currArbiter.state === 0) message(-1, ` Arbiter stays in state ${currArbiter.state.toString(2).padStart(p.bits, '0')}.`);
                else {
                    message(-1, ` Arbiter descreases its state to ${(--currArbiter.state).toString(2).padStart(p.bits, '0')}.`);
                    arbiterDOM.html(currArbiter.state.toString(2).padStart(p.bits, '0'));
                }
            // 1 wrong, 2 correct: increase if possible
            } else if (!isCorrectHybrid[0] && isCorrectHybrid[1]) {
                message(-1, `Prediction 1 is wrong and prediction 2 is correct.`);
                if (currArbiter.state === Math.pow(2, p.bits)-1) message(-1, ` Arbiter stays in state ${currArbiter.state.toString(2).padStart(p.bits, '0')}.`);
                else {
                    message(-1, ` Arbiter increases its state to ${(++currArbiter.state).toString(2).padStart(p.bits, '0')}.`);
                    arbiterDOM.html(currArbiter.state.toString(2).padStart(p.bits, '0'));
                }
            }

            step = 0;
            currJump++;
            if (currJump != jumps.length) message(-1, ` Next branch instruction is fetched.`, 1);
    }
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

	step = 0;
	enableInput();
	disableSimControls();
}

function end() {
	alert("Simulation finished");
}

function message(subPred, str, append = 0, type = 0) {
    pIDPrefix = subPred >= 0 ? `Predictor ${subPred}: ` : ``;
	let wrapper = $("#helper-text-wrapper");
	if (append === 0 && (subPred === -1 || subPred === 0)) wrapper.html(`${pIDPrefix}${str}`);
	else {   
        wrapper.append(`${subPred === 1 ? "<br><br>" : ""}${pIDPrefix}${str}`);
    }	
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

function enableSimControls() {
	$("#btnNext, #btnFastForward").css({
		"pointer-events": "auto",
		"opacity": "1"
	});
}

function disableSimControls() {
	$("#btnNext, #btnFastForward").css({
		"pointer-events": "none",
		"opacity": ".5"
	});
}

btnImport.on("click", e => {
	fileInput.click();
});