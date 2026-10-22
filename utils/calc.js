function roundCents(yuan) {
    const n = Number(yuan);
    if (!isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatMoney(yuan) {
    const v = roundCents(yuan);
    const sign = v < 0 ? "-" : "";
    const parts = Math.abs(v).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + parts.join(".");
}

function formatPercent(rate) {
    if (!isFinite(rate)) return "—";
    return (rate * 100).toFixed(2) + "%";
}

const VAT_RATES = [
    { short: "13%", label: "13% 货物", hint: "销售货物、加工修理修配", value: 0.13 },
    { short: "9%", label: "9% 交通建筑", hint: "交通、邮政、建筑、不动产", value: 0.09 },
    { short: "6%", label: "6% 服务", hint: "现代服务、金融、生活服务", value: 0.06 },
    { short: "1%", label: "1% 小规模优惠", hint: "符合条件的小规模业务，以当期政策为准", value: 0.01 },
    { short: "3%", label: "3% 征收率", hint: "简易计税或小规模征收率", value: 0.03 },
    { short: "5%", label: "5% 不动产等", hint: "不动产销售、租赁等特定征收率", value: 0.05 },
    { short: "0%", label: "0%", hint: "出口等适用 0% 的业务", value: 0 }
];

function splitVat(amountYuan, rate, direction) {
    const rateNum = Number(rate) || 0;
    if (direction === "excl") {
        const exclusive = roundCents(amountYuan);
        const tax = roundCents(exclusive * rateNum);
        const inclusive = roundCents(exclusive + tax);
        return { inclusive, exclusive, tax, rate: rateNum };
    }
    const inclusive = roundCents(amountYuan);
    const exclusive = roundCents(inclusive / (1 + rateNum));
    const tax = roundCents(inclusive - exclusive);
    return { inclusive, exclusive, tax, rate: rateNum };
}

function quoteMargin(input) {
    const price = splitVat(input.price, input.rate, input.priceIncludesTax ? "incl" : "excl");
    const cost = splitVat(input.cost, input.rate, input.costIncludesTax ? "incl" : "excl");
    const margin = roundCents(price.exclusive - cost.exclusive);
    const marginRate = price.exclusive > 0 ? margin / price.exclusive : NaN;
    return { price, cost, margin, marginRate };
}

function splitBill(totalYuan, people) {
    const count = Math.max(2, Math.min(30, parseInt(people, 10) || 2));
    const total = roundCents(totalYuan);
    const totalCents = Math.round(total * 100);
    const base = Math.floor(totalCents / count);
    const remainder = totalCents - base * count;
    const shares = [];
    for (let i = 0; i < count; i++) {
        const cents = base + (i === count - 1 ? remainder : 0);
        shares.push(cents / 100);
    }
    return { total, count, each: base / 100, last: shares[count - 1], shares };
}

const ANNUAL_BRACKETS = [
    [36000, 0.03, 0],
    [144000, 0.1, 2520],
    [300000, 0.2, 16920],
    [420000, 0.25, 31920],
    [660000, 0.3, 52920],
    [960000, 0.35, 85920],
    [Infinity, 0.45, 181920]
];

const BONUS_BRACKETS = [
    [3000, 0.03, 0],
    [12000, 0.1, 210],
    [25000, 0.2, 1410],
    [35000, 0.25, 2660],
    [55000, 0.3, 4410],
    [80000, 0.35, 7160],
    [Infinity, 0.45, 15160]
];

function annualTax(taxableYuan) {
    const taxable = Number(taxableYuan) || 0;
    if (taxable <= 0) return 0;
    for (let i = 0; i < ANNUAL_BRACKETS.length; i++) {
        const limit = ANNUAL_BRACKETS[i][0];
        const rate = ANNUAL_BRACKETS[i][1];
        const deduction = ANNUAL_BRACKETS[i][2];
        if (taxable <= limit) return roundCents(taxable * rate - deduction);
    }
    return 0;
}

function monthlyWithholding(input) {
    const salary = Number(input.salary) || 0;
    const insurance = Number(input.insurance) || 0;
    const special = Number(input.special) || 0;
    const month = Math.max(1, Math.min(12, parseInt(input.month, 10) || 1));
    const monthBase = salary - insurance - special - 5000;
    const ytdTaxable = monthBase * month;
    const prevTaxable = monthBase * (month - 1);
    const ytdTax = annualTax(ytdTaxable);
    const prevTax = annualTax(prevTaxable);
    const tax = Math.max(0, roundCents(ytdTax - prevTax));
    const net = roundCents(salary - insurance - tax);
    return {
        month,
        tax,
        net,
        ytdTaxable: roundCents(ytdTaxable),
        ytdTax
    };
}

function separateBonus(bonusYuan) {
    const bonus = roundCents(bonusYuan);
    if (bonus <= 0) return null;
    const avg = bonus / 12;
    for (let i = 0; i < BONUS_BRACKETS.length; i++) {
        if (avg <= BONUS_BRACKETS[i][0]) {
            const rate = BONUS_BRACKETS[i][1];
            const deduction = BONUS_BRACKETS[i][2];
            const tax = Math.max(0, roundCents(bonus * rate - deduction));
            return { tax, net: roundCents(bonus - tax), rate };
        }
    }
    return null;
}

function mergedBonus(input) {
    const bonus = roundCents(input.bonus);
    if (bonus <= 0) return null;
    const salary = Number(input.salary) || 0;
    const insurance = Number(input.insurance) || 0;
    const special = Number(input.special) || 0;
    const yearBase = (salary - insurance - special - 5000) * 12;
    const tax = Math.max(0, roundCents(annualTax(yearBase + bonus) - annualTax(yearBase)));
    return { tax, net: roundCents(bonus - tax) };
}

module.exports = {
    roundCents,
    formatMoney,
    formatPercent,
    VAT_RATES,
    splitVat,
    quoteMargin,
    splitBill,
    annualTax,
    monthlyWithholding,
    separateBonus,
    mergedBonus
};
