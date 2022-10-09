// Predictor object
p = {
    level: -1,
    bits: -1,
    brHistory: -1,
    bhr: "",
    bht: "",
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

// Predictor setup
var currSubPred = -1;
var currentStep = 0;

// DOM elements
const l1Bits = $("#l1Bits");

// Disable controls by default
updateControls();
$("#subpred-0-del-icon").addClass("disabled");
$("#subpred-1-del-icon").addClass("disabled");

/**
 * Getter for predictor type
 * @param {Number} t the type of predictor:
 *      1 => One level
 *      2 => Two level
 *      3 => Hybrid (Tournament)
 */
function getPredictorLevel(l) {
    if (p.level === 3) p.subps[currSubPred].level = l;
    else p.level = l;
}

function goSetupStep(step) {
    currStepDOM = $("#step-" + currentStep);
    nextStepDOM = $("#step-" + step);

    // Fade out of current step
    currStepDOM.toggleClass("setup--step-active");

    setTimeout(function() {
        currStepDOM.css("display", "none");

        // Disable hybrid if the current configuration refers to sub-predictor of hybrid predictor.
        let hybridPredictor = $("#hybridPredictorOption");
        if (p.level === 3) hybridPredictor.addClass("disabled");
        else hybridPredictor.removeClass("disabled");

        nextStepDOM.css("display", "flex");

        updateControls();
    }, 290);

    // Fade in of next step
    setTimeout(function() {
        nextStepDOM.toggleClass("setup--step-active");
    }, 310);

    // Update the new current step
    currentStep = step;
}

/**
 * Initiates the configuration for the predictor passed by parameter
 * @param {Number} p the predictor (1 or 2) 
 */
 function configureHybrid(p) {
    currSubPred = p;
    goSetupStep(0);
}

/**
 * Updates the selected predictor from hybrid predictor
 * @param {Number} subPred the subpredictor to be updated
 * @param {Number} erase if the update consist of erasing the configuration
 * of the selected predictor
 */
function updateHybrid(subPred, erase = 0) {
    let icon = $("#subpredictor-" + subPred + "-icon");
    let subPredDiv = $("#predictor" + subPred);
    let predDescription = $("#subpredictor-" + subPred + "-title");
    let delIcon = $("#subpred-" + subPred + "-del-icon");

    if (erase) {
        // Erase predictor data
        p.subps[subPred] = {
            level: -1,
            bits: -1,
            brHistory: -1,
            bhr: "",
            bht: "",
        }

        // Update DOM
        subPredDiv.removeClass("selected-card");
        icon.removeClass("fa-plus selected-card-icon");
        icon.addClass("fa-plus");
        delIcon.addClass("disabled");
        predDescription.text("Select");
    } else {
        // Update DOM
        subPredDiv.addClass("selected-card");
        icon.removeClass("fa-plus");
        icon.addClass("fa-circle-check selected-card-icon");
        delIcon.removeClass("disabled");
        predDescription.text(p.subps[subPred].level + " level predictor");
    }
}

/**
 * Updates controls depending on the current step
 */
function updateControls() {
    prev = 0; // 0 => disabled, 1 => enabled, 2 => finish config

    switch(currentStep) {
        case 0:
            // Allow back to tournament predictor configuration
            prev = p.level === 3 ? 1 : 0;
            break;
        case 1:
        case 2:
        case 3:
            prev = 1;
            break;
        default:
    }

    $("#previous").css(prev === 1 ? 
        {"pointer-events": "auto", "opacity": "1"} : 
        {"pointer-events": "none", "opacity": ".4"});
}

function selectL1Bits(bits) {
    let panels = [$("#l1-1"), $("#l1-2"), $("#l1-3")];

    for (panel of panels) panel.removeClass("selected-card");
    
    if (bits < 1) {
        l1Bits.removeClass("valid-input");
        l1Bits.addClass("invalid-input");
    } else {
        l1Bits.removeClass("invalid-input");
        l1Bits.addClass("valid-input");

        if (bits >= 1 && bits <= 3 ){
            $("#l1-" + bits).addClass("selected-card");
            l1Bits.val(bits);
        }
    }      
}

function stepBack() { 
    if (currentStep === 0 && p.level === 3) goSetupStep(3);
    else {
        // If leaving hybrid configuration without doing anything,
        // allow to click again on hybrid predictor
        if (currentStep == 3 && p.subps[0].level === -1 && p.subps[0].level) p.level = 0;
        goSetupStep(0);
    }
}

/**
 * Validates and stores the data obtained from level 1 predictor setup
 */
function validateL1() {
    let bits = l1Bits.val().trim();
    let bht = $("#satCounterScope").val();

    if (!bits.length || bits <= 0) 
        return alert("Bit number must be positive.");

    bits = parseInt(bits);

    // Save configuration
    if (p.level === 3) { // hybrid sub predictor
        p.subps[currSubPred].level = 1;
        p.subps[currSubPred].bits = bits;
        p.subps[currSubPred].bht = bht;
        updateHybrid(currSubPred);
        goSetupStep(3);
    } else {
        p.bits = bits;
        p.bht = bht;
        launchPredictor();
    }
}

/**
 * Validates and stores the data obtained from level 2 predictor setup
 */
function validateL2() {
    let BH = $("#BHInput").val().trim();
    let predBits = $("#PredictorBitsInput").val().trim();
    let BHR = $("#BHRInput").val();
    let PHT = $("#PHTInput").val();

    if (!BH.length || BH <= 0) 
        return alert("Branch history must be a positive number.");
    else BH = parseInt(BH);

    if (!predBits.length || predBits <= 0)
        return alert("Predictor bits must be a positve number.");
    else predBits = parseInt(predBits);

    // Save configuration
    if (p.level === 3) { // hybrid subpredictor
        p.subps[currSubPred].level = 2;
        p.subps[currSubPred].bits = predBits;
        p.subps[currSubPred].brHistory = BH;
        p.subps[currSubPred].bhr = BHR;
        p.subps[currSubPred].bht = PHT;
        updateHybrid(currSubPred);
        goSetupStep(3);
    } else {
        p.bits = predBits;
        p.brHistory = BH;
        p.bhr = BHR;
        p.bht = PHT;
        launchPredictor();
    }
}

/**
 * Validates and stores the data obtained from hybrid predictor setup
 */
function validateHybrid() {
    if (p.subps[0].level == -1 || p.subps[1].level == -1)
        return alert("Complete the configuration for both predictors.");
    else launchPredictor();
}

function launchPredictor() {
    sessionStorage.setItem("predictor", JSON.stringify(p));
    window.location.href = "/predictor";
}

l1Bits.on("input", (e) => selectL1Bits(e.target.value));