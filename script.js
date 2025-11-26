// Constants derived from Excel analysis
const FEES = {
    REGISTRATION: 172,
    TRANSFER: 463,
    OTHER: 1500
};

// Stamp Duty Table (Threshold, Base, Rate)
// Based on Sheet3
const STAMP_DUTY_RATES = [
    { threshold: 1455000, base: 0, rate: 4.54 }, // Special case for high value? Logic in Excel was complex, using XLOOKUP.
    // Let's re-examine the Excel logic for Stamp Duty.
    // Excel Formula: ((((B2+1)-XLOOKUP(...))/100) * XLOOKUP(...)) + XLOOKUP(...)
    // It looks like a standard progressive tax or tiered bracket, but the table in Sheet3 is:
    // 0 -> 0 base, 1.2 rate
    // 200001 -> 2400 base, 2.2 rate
    // 300001 -> 4600 base, 3.4 rate
    // 500001 -> 11400 base, 4.32 rate
    // 750001 -> 22200 base, 5.9 rate
    // 1000001 -> 36950 base, 6.4 rate
    // 1455000 -> 0 base, 4.54 rate (This seems to be a flat rate or override?)

    // Let's implement based on the table structure found in Sheet3
    { threshold: 1000001, base: 36950, rate: 6.4 },
    { threshold: 750001, base: 22200, rate: 5.9 },
    { threshold: 500001, base: 11400, rate: 4.32 },
    { threshold: 300001, base: 4600, rate: 3.4 },
    { threshold: 200001, base: 2400, rate: 2.2 },
    { threshold: 0, base: 0, rate: 1.2 }
];

// LMI Table (LVR Tiers, Loan Amount Tiers)
// Based on Sheet4
// Columns: 300k, 500k, 600k, 750k, 1m
const LMI_LOAN_TIERS = [300000, 500000, 600000, 750000, 1000000];
const LMI_DATA = [
    { lvr: 80.01, rates: [0.00475, 0.00568, 0.00904, 0.00904, 0.00913] },
    { lvr: 81.01, rates: [0.00485, 0.00568, 0.00904, 0.00904, 0.00913] },
    { lvr: 82.01, rates: [0.00596, 0.00699, 0.00932, 0.01090, 0.01109] },
    { lvr: 83.01, rates: [0.00662, 0.00829, 0.00960, 0.01090, 0.01146] },
    { lvr: 84.01, rates: [0.00727, 0.00969, 0.01165, 0.01333, 0.01407] },
    { lvr: 85.01, rates: [0.00876, 0.01081, 0.01258, 0.01407, 0.01463] },
    { lvr: 86.01, rates: [0.00932, 0.01146, 0.01407, 0.01631, 0.01733] },
    { lvr: 87.01, rates: [0.01062, 0.01305, 0.01463, 0.01631, 0.01752] },
    { lvr: 88.01, rates: [0.01295, 0.01621, 0.01948, 0.02218, 0.02395] },
    { lvr: 89.01, rates: [0.01463, 0.01873, 0.02180, 0.02367, 0.02516] },
    { lvr: 90.01, rates: [0.02013, 0.02618, 0.03513, 0.03783, 0.03820] },
    { lvr: 91.01, rates: [0.02013, 0.02674, 0.03569, 0.03867, 0.03932] },
    { lvr: 92.01, rates: [0.02330, 0.03028, 0.03802, 0.04081, 0.04156] },
    { lvr: 93.01, rates: [0.02376, 0.03028, 0.03802, 0.04286, 0.04324] },
    { lvr: 94.01, rates: [0.02609, 0.03345, 0.03998, 0.04613, 0.04603] }
];

function calculateStampDuty(propertyValue) {
    // Special case from Excel Sheet3: If > 1,455,000, rate is 4.54% flat?
    // The Excel logic was:
    // ((((B2+1)-XLOOKUP(...))/100) * XLOOKUP(...)) + XLOOKUP(...)
    // This implies a progressive calculation for the bracket it falls into.

    // However, the last entry in Sheet3 is 1,455,000 with Base 0 and Rate 4.54.
    // This usually implies a flat rate for the entire amount if it exceeds this, OR a different calculation.
    // Given the "Base 0", it likely means: if > 1455000, Duty = Value * 4.54%

    if (propertyValue > 1455000) {
        return propertyValue * (4.54 / 100);
    }

    // Find the bracket
    // The table is sorted ascending in the sheet, but I sorted descending in JS for easier 'find'.
    // Actually, let's stick to the logic: Find the highest threshold <= propertyValue.

    // Re-sorting to match logic: find the largest threshold that is <= value
    const bracket = STAMP_DUTY_RATES.find(tier => propertyValue >= tier.threshold && tier.threshold !== 1455000);

    if (!bracket) return 0; // Should not happen given 0 threshold

    // Calculation: Base + ((Value - Threshold) * Rate / 100)
    // Note: The Excel formula used (B2+1) in the lookup, which is weird, but standard is (Value - Threshold).
    // Let's assume standard progressive tax logic.
    // Wait, the Excel formula was:
    // ((((B2+1)-Threshold)/100) * Rate) + Base
    // The (B2+1) might be to handle boundary conditions or just an Excel quirk.
    // We will use (Value - Threshold).

    return bracket.base + ((propertyValue - bracket.threshold) * (bracket.rate / 100));
}

function calculateLMI(lvr, loanAmount) {
    if (lvr <= 80) return 0;

    // Find LVR tier
    // The table has 80.01, 81.01 etc.
    // We need to find the row where lvr matches or is slightly less?
    // Excel uses XMATCH with -1 (exact match or next smaller item).
    // So if LVR is 80.5, it matches 80.01.

    const lvrRow = LMI_DATA.slice().reverse().find(row => lvr >= row.lvr);
    if (!lvrRow) return 0; // LVR too high (above max) or logic error? 
    // If LVR > 94.01, it should probably use the last row or be rejected. 
    // For now, let's assume it caps at the last row if valid, or maybe 0 if banks don't lend.
    // Let's use the highest tier if it exceeds.

    // Find Loan Amount column
    // Excel uses XMATCH with 1 (exact match or next larger item).
    // So if Loan is 400k, it matches 500k column.

    const colIndex = LMI_LOAN_TIERS.findIndex(tier => loanAmount <= tier);
    if (colIndex === -1) {
        // Loan amount > 1m. Use the last column?
        // Excel behavior with match type 1 on sorted list: if larger than all, returns N/A?
        // Let's assume it caps at 1m rates for now, or maybe it's not supported.
        // We'll use the last column.
        return lvrRow.rates[LMI_LOAN_TIERS.length - 1] * loanAmount;
    }

    const rate = lvrRow.rates[colIndex];
    return loanAmount * rate;
}

function calculatePMT(rate, nper, pv) {
    // rate: annual rate / 100
    // nper: number of payments (years * 12)
    // pv: principal

    if (rate === 0) return pv / nper;

    const monthlyRate = rate / 12 / 100;
    const numPayments = nper * 12;

    // PMT formula: PV * r * (1 + r)^n / ((1 + r)^n - 1)
    const x = Math.pow(1 + monthlyRate, numPayments);
    return (pv * monthlyRate * x) / (x - 1);
}

/**
 * Safely retrieves and validates numeric input from the DOM.
 * @param {string} id - The element ID.
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @param {number} defaultValue - Fallback value if invalid.
 * @returns {number} - The validated number.
 */
function getSafeValue(id, min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0) {
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    let val = parseFloat(el.value);
    if (isNaN(val)) return defaultValue;
    return Math.min(max, Math.max(min, val));
}

function updateCalculator() {
    const propertyValue = getSafeValue('propertyValue', 0, 1000000000); // Max 1B
    const depositPercent = getSafeValue('depositPercent', 0, 100);
    const interestRate = getSafeValue('interestRate', 0, 100); // Max 100%
    const loanTerm = getSafeValue('loanTerm', 1, 100); // Max 100 years

    // 1. Calculate Deposit Amount
    const depositAmount = propertyValue * (depositPercent / 100);

    // 2. Calculate Fees
    const stampDuty = calculateStampDuty(propertyValue);
    const totalFees = stampDuty + FEES.REGISTRATION + FEES.TRANSFER + FEES.OTHER;

    // 3. Calculate Base Loan
    // Base Loan = (Property Value - Deposit) + Fees
    // Wait, usually you pay fees upfront or capitalize them.
    // The Excel formula for Base Loan (B5) was: (B2-C3)+B12+B9+B10+B11
    // (Property Value - Deposit Amount) + StampDuty + Reg + Transfer + Other
    // So fees are capitalized into the loan.
    let baseLoan = (propertyValue - depositAmount) + totalFees;

    // 4. Calculate LVR
    const lvr = (baseLoan / propertyValue) * 100;

    // 5. Calculate LMI
    // LMI is based on Base Loan amount?
    // Excel: INDEX(LMI!..., MATCH(LVR...), MATCH(BaseLoan...))
    // Yes, uses Base Loan.
    const lmiCost = calculateLMI(lvr, baseLoan);

    // 6. Total Loan
    const totalLoan = baseLoan + lmiCost;

    // 7. Repayments
    const monthlyPayment = calculatePMT(interestRate, loanTerm, totalLoan);
    const weeklyPayment = monthlyPayment * 12 / 52;
    const annualPayment = monthlyPayment * 12;

    // Update UI
    const formatCurrency = (val) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);

    document.getElementById('monthlyRepayment').textContent = formatCurrency(monthlyPayment);
    document.getElementById('weeklyRepayment').textContent = formatCurrency(weeklyPayment);
    document.getElementById('annualRepayment').textContent = formatCurrency(annualPayment);

    document.getElementById('stampDuty').textContent = formatCurrency(stampDuty);
    document.getElementById('transferFee').textContent = formatCurrency(FEES.TRANSFER);
    document.getElementById('regFee').textContent = formatCurrency(FEES.REGISTRATION);
    document.getElementById('otherFees').textContent = formatCurrency(FEES.OTHER);
    document.getElementById('lmiCost').textContent = formatCurrency(lmiCost);
    document.getElementById('totalLoanAmount').textContent = formatCurrency(totalLoan);
    document.getElementById('depositAmountDisplay').textContent = formatCurrency(depositAmount);

    const lvrEl = document.getElementById('lvrValue');
    lvrEl.textContent = lvr.toFixed(2) + '%';
    if (lvr > 95) {
        lvrEl.style.color = 'red';
    } else {
        lvrEl.style.color = 'var(--text-main)';
    }

    updateInvestmentAnalysis(monthlyPayment, totalLoan, stampDuty, lmiCost, propertyValue);
}

// Investment Analysis Logic
let rentChart = null;
let termCostsChart = null;
let termCashflowChart = null;
let amortizationChart = null;
let equityChart = null;
let holdingCostsChart = null;
let rentalIncomeChart = null;
let netCashflowChart = null;
let holdingCostsBreakdownChart = null;
let cashflowComparisonChart = null;
let cumulativeCashflowChart = null;

// View State
let globalView = 'annual';

function updateInvestmentAnalysis(monthlyLoanRepayment, totalLoan, stampDuty, lmiCost, propertyValue) {
    // Inputs
    const councilRates = getSafeValue('councilRates', 0, 1000000);
    const strataFees = getSafeValue('strataFees', 0, 1000000);
    const landTax = getSafeValue('landTax', 0, 1000000);
    const sinkingFund = getSafeValue('sinkingFund', 0, 1000000);
    const otherCosts = getSafeValue('otherInvestmentCosts', 0, 1000000);

    const targetRent = getSafeValue('targetRentInput', 0, 50000); // Max 50k/week
    const loanTermYears = getSafeValue('loanTerm', 1, 100);

    // Calculations
    const totalAnnualHoldingCosts = councilRates + strataFees + landTax + sinkingFund + otherCosts;
    const monthlyHoldingCosts = totalAnnualHoldingCosts / 12;
    const weeklyHoldingCosts = totalAnnualHoldingCosts / 52;

    const totalMonthlyCosts = monthlyLoanRepayment + monthlyHoldingCosts;
    const totalWeeklyCosts = (monthlyLoanRepayment * 12 / 52) + weeklyHoldingCosts;

    const monthlyRentIncome = (targetRent * 52) / 12;
    const netMonthlyPosition = monthlyRentIncome - totalMonthlyCosts;
    const netWeeklyPosition = targetRent - totalWeeklyCosts;

    // Break-even Rent (Weekly)
    const breakEvenRent = totalMonthlyCosts * 12 / 52;

    // Update UI
    const formatCurrency = (val) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);

    document.getElementById('totalMonthlyCosts').textContent = formatCurrency(totalMonthlyCosts);
    document.getElementById('totalWeeklyCosts').textContent = formatCurrency(totalWeeklyCosts);

    const netPosEl = document.getElementById('netMonthlyPosition');
    netPosEl.textContent = formatCurrency(netMonthlyPosition);
    document.getElementById('netWeeklyPosition').textContent = formatCurrency(netWeeklyPosition);

    const weeklyLabel = netPosEl.nextElementSibling;
    weeklyLabel.innerHTML = ''; // Clear existing content
    weeklyLabel.append('Weekly: ');

    const span = document.createElement('span');
    span.id = 'netWeeklyPosition';
    span.textContent = formatCurrency(netWeeklyPosition);
    weeklyLabel.append(span);

    if (netMonthlyPosition < 0) {
        netPosEl.parentElement.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; // Red
        weeklyLabel.append(' (Out of Pocket)');
    } else {
        netPosEl.parentElement.style.background = 'linear-gradient(135deg, #10b981, #059669)'; // Green
        weeklyLabel.append(' (Positive Cashflow)');
    }

    document.getElementById('breakEvenRent').textContent = formatCurrency(breakEvenRent);

    updateChart(targetRent, totalMonthlyCosts);
    updateTermAnalysis(totalLoan, monthlyLoanRepayment, totalAnnualHoldingCosts, targetRent, loanTermYears, stampDuty, lmiCost, propertyValue);
}

function updateTermAnalysis(totalLoan, monthlyRepayment, annualHoldingCosts, weeklyRent, years, stampDuty, lmiCost, propertyValue) {
    // Toggle State
    const isInflationEnabled = document.getElementById('inflationToggle').checked;

    // UI Visibility
    const detailedCharts = document.querySelectorAll('.detailed-chart');
    const projectionsInputs = document.getElementById('projectionsInputs');

    if (isInflationEnabled) {
        detailedCharts.forEach(el => el.classList.remove('hidden'));
        projectionsInputs.classList.remove('hidden');
    } else {
        detailedCharts.forEach(el => el.classList.add('hidden'));
        projectionsInputs.classList.add('hidden');
    }

    // Inputs for Projections
    const capitalGrowthInput = document.getElementById('capitalGrowth');
    const inflationRateInput = document.getElementById('inflationRate');

    // If disabled, force 0% growth/inflation
    const capitalGrowthRate = isInflationEnabled ? (getSafeValue('capitalGrowth', -100, 100, 3.0) / 100) : 0;
    const inflationRate = isInflationEnabled ? (getSafeValue('inflationRate', -100, 100, 2.5) / 100) : 0;

    // Detailed Cost Inputs (Annual)
    let councilRates = getSafeValue('councilRates', 0, 1000000);
    let strataFees = getSafeValue('strataFees', 0, 1000000);
    let landTax = getSafeValue('landTax', 0, 1000000);
    let sinkingFund = getSafeValue('sinkingFund', 0, 1000000);
    let otherCosts = getSafeValue('otherInvestmentCosts', 0, 1000000);

    // Calculate Totals with Inflation
    let totalRepayments = 0;
    let totalInterest = 0;
    let totalHoldingCosts = 0;
    let totalRentalIncome = 0;

    let balance = totalLoan;
    let currentPropValue = propertyValue;
    let currentAnnualHoldingCosts = annualHoldingCosts;
    let currentWeeklyRent = weeklyRent;

    const monthlyRate = getSafeValue('interestRate', 0, 100) / 100 / 12;

    // Arrays for Charts
    const labels = [];
    const principalPaidData = [];
    const interestPaidData = [];
    const remainingBalanceData = [];
    const propertyValueData = [];
    const equityData = [];
    const holdingCostsData = [];
    const rentalIncomeData = [];
    const netCashflowData = [];
    const totalOutgoingsData = [];
    const cumulativeCashflowData = [];
    const totalNetPositionData = [];
    const realNetPositionData = [];

    // Detailed Costs Arrays

    // Detailed Costs Arrays
    const ratesData = [];
    const strataData = [];
    const landTaxData = [];
    const sinkingData = [];
    const otherCostsData = [];

    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;
    let breakEvenYear = null;

    // Initial Cash Position (Negative): Deposit + Stamp Duty + LMI + Other Fees
    // Note: If fees are capitalized (added to loan), they are not out of pocket upfront, 
    // but usually Deposit + Stamp Duty are upfront.
    // Let's assume Deposit + Stamp Duty + Other Fees are upfront costs. LMI is usually capitalized.
    // If LMI is capitalized, it's part of the loan, not upfront cash.
    // Base Loan calculation in updateCalculator: (Prop - Deposit) + Fees.
    // So Fees ARE capitalized in this logic.
    // Thus, upfront cash = Deposit Amount.
    // Wait, Stamp Duty is usually paid upfront.
    // Let's assume upfront = Deposit + Stamp Duty + Fees (if not capitalized).
    // But the calculator adds fees to loan. So upfront is just Deposit?
    // Let's stick to Deposit for now, or maybe Deposit + Stamp Duty if that's standard.
    // Actually, let's track "Net Cashflow" accumulation.
    // Year 0 = -(Deposit + Stamp Duty + Fees). Even if capitalized, it's debt, but we are tracking CASH position.
    // If fees are capitalized, you didn't pay them cash. You paid Deposit.
    // So Initial Cash = -Deposit.
    // BUT, usually you have to pay Stamp Duty cash. Banks rarely lend 100% of Stamp Duty + LVR > 95%.
    // Let's assume Initial Cash = -(Deposit + Stamp Duty + Fees).
    // If they are capitalized, the loan is higher, so interest is higher, which is captured in repayments.
    // If we assume they are paid cash, then loan is smaller.
    // The current logic adds fees to loan. So they are NOT paid cash.
    // So Initial Cash Position = -Deposit.

    let currentCumulativeCash = -1 * (propertyValue * (parseFloat(document.getElementById('depositPercent').value) || 0) / 100);

    for (let y = 1; y <= years; y++) {
        labels.push(`Year ${y}`);

        // Loan Calcs (Standard Amortization)
        let yearlyPrincipal = 0;
        let yearlyInterest = 0;

        for (let m = 0; m < 12; m++) {
            const interest = balance * monthlyRate;
            const principal = monthlyRepayment - interest;

            yearlyInterest += interest;
            yearlyPrincipal += principal;
            balance -= principal;
            if (balance < 0) balance = 0;
        }

        totalRepayments += (yearlyPrincipal + yearlyInterest);
        totalInterest += yearlyInterest;
        cumulativePrincipal += yearlyPrincipal;
        cumulativeInterest += yearlyInterest;

        // Inflation Calcs
        const annualRent = currentWeeklyRent * 52;
        const currentTotalHolding = councilRates + strataFees + landTax + sinkingFund + otherCosts;

        totalHoldingCosts += currentTotalHolding;
        totalRentalIncome += annualRent;

        holdingCostsData.push(currentTotalHolding);
        rentalIncomeData.push(annualRent);

        // Push detailed costs
        ratesData.push(councilRates);
        strataData.push(strataFees);
        landTaxData.push(landTax);
        sinkingData.push(sinkingFund);
        otherCostsData.push(otherCosts);

        // Net Cashflow for this year
        const annualRepayments = yearlyPrincipal + yearlyInterest;
        const annualNetCashflow = annualRent - (annualRepayments + currentTotalHolding);
        netCashflowData.push(annualNetCashflow);
        totalOutgoingsData.push(annualRepayments + currentTotalHolding);

        // Cumulative Cashflow
        currentCumulativeCash += annualNetCashflow;
        cumulativeCashflowData.push(currentCumulativeCash);

        // Total Net Position (Equity + Cumulative Cash)
        // Equity = Value - Debt. Cumulative Cash = -Deposit + NetCashflow.
        // Total = (Value - Debt) + (-Deposit + NetCashflow)
        // This represents total wealth created since inception.
        const currentEquity = currentPropValue - balance;
        const totalPos = currentEquity + currentCumulativeCash;
        totalNetPositionData.push(totalPos);

        // Real Total Position (Inflation Adjusted)
        // Discount back to present value
        const discountFactor = Math.pow(1 + inflationRate, y);
        realNetPositionData.push(totalPos / discountFactor);

        // Check Break Even
        if (breakEvenYear === null && annualNetCashflow > 0) {
            breakEvenYear = y;
        }

        // Update for next year (Inflate everything)
        councilRates *= (1 + inflationRate);
        strataFees *= (1 + inflationRate);
        landTax *= (1 + inflationRate);
        sinkingFund *= (1 + inflationRate);
        otherCosts *= (1 + inflationRate);

        currentWeeklyRent *= (1 + inflationRate);
        currentPropValue *= (1 + capitalGrowthRate);

        principalPaidData.push(cumulativePrincipal);
        interestPaidData.push(cumulativeInterest);
        remainingBalanceData.push(balance);
        propertyValueData.push(currentPropValue);
        equityData.push(currentPropValue - balance);
    }

    // Net Cashflow Total
    const netCashflowTotal = totalRentalIncome - (totalRepayments + totalHoldingCosts);

    const formatCurrency = (val) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);

    document.getElementById('totalRepayments').textContent = formatCurrency(totalRepayments);
    document.getElementById('totalInterestPaid').textContent = formatCurrency(totalInterest);
    document.getElementById('totalHoldingCosts').textContent = formatCurrency(totalHoldingCosts);
    document.getElementById('totalRentalIncome').textContent = formatCurrency(totalRentalIncome);

    const netCashflowEl = document.getElementById('netTermCashflow');
    netCashflowEl.textContent = formatCurrency(netCashflowTotal);
    netCashflowEl.style.color = netCashflowTotal < 0 ? '#ef4444' : '#10b981';

    document.getElementById('breakEvenYear').textContent = breakEvenYear ? `Year ${breakEvenYear}` : 'Never';

    // Charts Contexts
    const ctxCosts = document.getElementById('termCostsChart').getContext('2d');
    const ctxCashflow = document.getElementById('termCashflowChart').getContext('2d');
    const ctxAmortization = document.getElementById('amortizationChart').getContext('2d');
    const ctxEquity = document.getElementById('equityChart').getContext('2d');
    const ctxHolding = document.getElementById('holdingCostsChart').getContext('2d');
    const ctxRental = document.getElementById('rentalIncomeChart').getContext('2d');
    const ctxNetCashflow = document.getElementById('netCashflowChart').getContext('2d');
    const ctxHoldingBreakdown = document.getElementById('holdingCostsBreakdownChart').getContext('2d');
    const ctxCashflowComparison = document.getElementById('cashflowComparisonChart').getContext('2d');
    const ctxCumulativeCashflow = document.getElementById('cumulativeCashflowChart').getContext('2d');

    // Helper for Views
    const getViewFactor = (view) => {
        if (view === 'monthly') return 12;
        if (view === 'weekly') return 52;
        return 1;
    };

    const formatViewLabel = (view) => {
        if (view === 'monthly') return 'Monthly';
        if (view === 'weekly') return 'Weekly';
        return 'Annual';
    };

    const viewFactor = getViewFactor(globalView);
    const viewLabel = formatViewLabel(globalView);

    // Pie Chart: Costs Breakdown (Always Annual/Total Term - Unchanged)
    const otherFees = FEES.REGISTRATION + FEES.TRANSFER + FEES.OTHER;

    if (termCostsChart) {
        termCostsChart.data.datasets[0].data = [totalInterest, stampDuty, lmiCost, totalHoldingCosts, otherFees];
        termCostsChart.update();
    } else {
        termCostsChart = new Chart(ctxCosts, {
            type: 'doughnut',
            data: {
                labels: ['Interest', 'Stamp Duty', 'LMI', 'Holding Costs', 'Other Fees'],
                datasets: [{
                    data: [totalInterest, stampDuty, lmiCost, totalHoldingCosts, otherFees],
                    backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    // Bar Chart: Income vs Outgoings (Total Term)
    const totalOutgoings = totalRepayments + totalHoldingCosts;

    if (termCashflowChart) {
        termCashflowChart.data.datasets[0].data = [totalRentalIncome, totalOutgoings];
        termCashflowChart.update();
    } else {
        termCashflowChart = new Chart(ctxCashflow, {
            type: 'bar',
            data: {
                labels: ['Total Income', 'Total Outgoings'],
                datasets: [{
                    label: 'Amount ($)',
                    data: [totalRentalIncome, totalOutgoings],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // Amortization Chart
    if (amortizationChart) {
        amortizationChart.data.labels = labels;
        amortizationChart.data.datasets[0].data = principalPaidData;
        amortizationChart.data.datasets[1].data = interestPaidData;
        amortizationChart.update();
    } else {
        amortizationChart = new Chart(ctxAmortization, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cumulative Principal Paid',
                        data: principalPaidData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Cumulative Interest Paid',
                        data: interestPaidData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Equity Chart
    if (equityChart) {
        equityChart.data.labels = labels;
        equityChart.data.datasets[0].data = propertyValueData;
        equityChart.data.datasets[1].data = remainingBalanceData;
        equityChart.data.datasets[2].data = equityData;
        equityChart.update();
    } else {
        equityChart = new Chart(ctxEquity, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Property Value',
                        data: propertyValueData,
                        borderColor: '#6366f1',
                        borderDash: [5, 5],
                        fill: false
                    },
                    {
                        label: 'Remaining Debt',
                        data: remainingBalanceData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Equity',
                        data: equityData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Holding Costs Chart (Total)
    if (holdingCostsChart) {
        holdingCostsChart.data.labels = labels;
        holdingCostsChart.data.datasets[0].data = holdingCostsData.map(v => v / viewFactor);
        holdingCostsChart.data.datasets[0].label = `Total ${viewLabel} Holding Costs`;
        holdingCostsChart.options.scales.y.title = { display: true, text: viewLabel };
        holdingCostsChart.update();
    } else {
        holdingCostsChart = new Chart(ctxHolding, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Total ${viewLabel} Holding Costs`,
                    data: holdingCostsData.map(v => v / viewFactor),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: viewLabel } } }
            }
        });
    }

    // Detailed Holding Costs Breakdown (Stacked Bar)
    if (holdingCostsBreakdownChart) {
        holdingCostsBreakdownChart.data.labels = labels;
        holdingCostsBreakdownChart.data.datasets[0].data = ratesData.map(v => v / viewFactor);
        holdingCostsBreakdownChart.data.datasets[1].data = strataData.map(v => v / viewFactor);
        holdingCostsBreakdownChart.data.datasets[2].data = landTaxData.map(v => v / viewFactor);
        holdingCostsBreakdownChart.data.datasets[3].data = sinkingData.map(v => v / viewFactor);
        holdingCostsBreakdownChart.data.datasets[4].data = otherCostsData.map(v => v / viewFactor);
        holdingCostsBreakdownChart.options.scales.y.title = { display: true, text: viewLabel };
        holdingCostsBreakdownChart.update();
    } else {
        holdingCostsBreakdownChart = new Chart(ctxHoldingBreakdown, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Council Rates', data: ratesData.map(v => v / viewFactor), backgroundColor: '#3b82f6' },
                    { label: 'Strata Fees', data: strataData.map(v => v / viewFactor), backgroundColor: '#8b5cf6' },
                    { label: 'Land Tax', data: landTaxData.map(v => v / viewFactor), backgroundColor: '#ef4444' },
                    { label: 'Sinking Fund', data: sinkingData.map(v => v / viewFactor), backgroundColor: '#10b981' },
                    { label: 'Other Costs', data: otherCostsData.map(v => v / viewFactor), backgroundColor: '#f59e0b' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    },
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: viewLabel } }
                }
            }
        });
    }

    // Rental Income Chart
    if (rentalIncomeChart) {
        rentalIncomeChart.data.labels = labels;
        rentalIncomeChart.data.datasets[0].data = rentalIncomeData.map(v => v / viewFactor);
        rentalIncomeChart.data.datasets[0].label = `${viewLabel} Rental Income (Inflated)`;
        rentalIncomeChart.options.scales.y.title = { display: true, text: viewLabel };
        rentalIncomeChart.update();
    } else {
        rentalIncomeChart = new Chart(ctxRental, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${viewLabel} Rental Income (Inflated)`,
                    data: rentalIncomeData.map(v => v / viewFactor),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: viewLabel } } }
            }
        });
    }

    // Cashflow Comparison Chart (Line)
    if (cashflowComparisonChart) {
        cashflowComparisonChart.data.labels = labels;
        cashflowComparisonChart.data.datasets[0].data = rentalIncomeData.map(v => v / viewFactor);
        cashflowComparisonChart.data.datasets[1].data = totalOutgoingsData.map(v => v / viewFactor);
        cashflowComparisonChart.data.datasets[0].label = `${viewLabel} Income`;
        cashflowComparisonChart.data.datasets[1].label = `${viewLabel} Outgoings`;
        cashflowComparisonChart.options.scales.y.title = { display: true, text: viewLabel };
        cashflowComparisonChart.update();
    } else {
        cashflowComparisonChart = new Chart(ctxCashflowComparison, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `${viewLabel} Income`,
                        data: rentalIncomeData.map(v => v / viewFactor),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: `${viewLabel} Outgoings`,
                        data: totalOutgoingsData.map(v => v / viewFactor),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true, title: { display: true, text: viewLabel } } }
            }
        });
    }

    // Net Cashflow Chart
    const netCashflowColors = netCashflowData.map(val => val < 0 ? '#ef4444' : '#10b981');

    if (netCashflowChart) {
        netCashflowChart.data.labels = labels;
        netCashflowChart.data.datasets[0].data = netCashflowData.map(v => v / viewFactor);
        netCashflowChart.data.datasets[0].label = `${viewLabel} Net Cashflow`;
        netCashflowChart.data.datasets[0].backgroundColor = netCashflowColors;
        netCashflowChart.data.datasets[0].borderColor = netCashflowColors;
        netCashflowChart.options.scales.y.title = { display: true, text: viewLabel };
        netCashflowChart.update();
    } else {
        netCashflowChart = new Chart(ctxNetCashflow, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${viewLabel} Net Cashflow`,
                    data: netCashflowData.map(v => v / viewFactor),
                    backgroundColor: netCashflowColors,
                    borderColor: netCashflowColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: false, title: { display: true, text: viewLabel } } }
            }
        });
    }

    // Cumulative Cashflow Chart (New)
    if (cumulativeCashflowChart) {
        cumulativeCashflowChart.data.labels = labels;
        cumulativeCashflowChart.data.datasets[0].data = cumulativeCashflowData;
        cumulativeCashflowChart.data.datasets[1].data = totalNetPositionData;
        cumulativeCashflowChart.data.datasets[2].data = realNetPositionData;
        cumulativeCashflowChart.update();
    } else {
        cumulativeCashflowChart = new Chart(ctxCumulativeCashflow, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cash Position (Liquidity)',
                        data: cumulativeCashflowData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        fill: false, // Don't fill to avoid clutter
                        segment: {
                            borderColor: ctx => ctx.p0.parsed.y < 0 ? '#ef4444' : '#10b981'
                        },
                        borderWidth: 2
                    },
                    {
                        label: 'Total Net Position (Wealth)',
                        data: totalNetPositionData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Real Total Position (Inflation Adjusted)',
                        data: realNetPositionData,
                        borderColor: '#8b5cf6', // Violet
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderDash: [5, 5],
                        fill: false,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(0,0,0,0.3)',
                                borderWidth: 1,
                                borderDash: [5, 5]
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: false, title: { display: true, text: 'Net Position ($)' } } }
            }
        });
    }
}

function updateChart(targetRent, totalMonthlyCosts) {
    const ctx = document.getElementById('rentAnalysisChart').getContext('2d');

    // Generate Data Points
    // Range: Target - 150 to Target + 150 in steps of 50
    const scenarios = [];
    const startRent = Math.max(0, Math.floor((targetRent - 150) / 50) * 50);
    for (let r = startRent; r <= targetRent + 150; r += 50) {
        scenarios.push(r);
    }

    const dataPoints = scenarios.map(rent => {
        const monthlyIncome = (rent * 52) / 12;
        return monthlyIncome - totalMonthlyCosts;
    });

    const backgroundColors = dataPoints.map(val => val < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)');
    const borderColors = dataPoints.map(val => val < 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)');

    if (rentChart) {
        rentChart.data.labels = scenarios.map(r => `$${r}/wk`);
        rentChart.data.datasets[0].data = dataPoints;
        rentChart.data.datasets[0].backgroundColor = backgroundColors;
        rentChart.data.datasets[0].borderColor = borderColors;
        rentChart.update();
    } else {
        rentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: scenarios.map(r => `$${r}/wk`),
                datasets: [{
                    label: 'Net Monthly Position',
                    data: dataPoints,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Net Monthly Position ($)'
                        },
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#666' : '#e2e8f0',
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Event Listeners
const inputs = ['propertyValue', 'depositPercent', 'interestRate', 'loanTerm'];
inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalculator);
});

// Investment Inputs
const invInputs = ['councilRates', 'strataFees', 'landTax', 'sinkingFund', 'otherInvestmentCosts'];
invInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateCalculator);
});

document.getElementById('targetRentSlider').addEventListener('input', (e) => {
    document.getElementById('targetRentInput').value = e.target.value;
    updateCalculator();
});
document.getElementById('targetRentInput').addEventListener('input', (e) => {
    document.getElementById('targetRentSlider').value = e.target.value;
    updateCalculator();
});

// New Inputs Listeners
document.getElementById('capitalGrowth').addEventListener('input', updateCalculator);
document.getElementById('inflationRate').addEventListener('input', updateCalculator);

// Toggle Listener
document.getElementById('inflationToggle').addEventListener('change', updateCalculator);

// View Buttons Listener
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active state
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update view and recalculate
        globalView = e.target.dataset.view;
        updateCalculator();
    });
});

// Initial Calculation
updateCalculator();
