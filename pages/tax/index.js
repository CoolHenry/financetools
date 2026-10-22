const calc = require("../../utils/calc");
const history = require("../../utils/history");
const card = require("../../utils/card");

Page({
    data: {
        salary: "",
        insurance: "0",
        special: "0",
        bonus: "",
        months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        monthIndex: new Date().getMonth(),
        result: null,
        bonusResult: null,
        share: null,
        cardPayload: null
    },
    onLoad(options) {
        const patch = {};
        ["salary", "insurance", "special", "bonus"].forEach(function (key) {
            if (options[key] !== undefined && options[key] !== "") patch[key] = options[key];
        });
        if (options.month) {
            const month = parseInt(options.month, 10);
            if (month >= 1 && month <= 12) patch.monthIndex = month - 1;
        }
        if (Object.keys(patch).length) this.setData(patch);
        this.recalc();
    },
    onField(e) {
        const patch = {};
        patch[e.currentTarget.dataset.field] = e.detail.value;
        this.setData(patch);
        this.recalc();
    },
    onMonth(e) {
        this.setData({ monthIndex: Number(e.detail.value) });
        this.recalc();
    },
    recalc() {
        const salary = Number(this.data.salary);
        if (this.data.salary === "" || !isFinite(salary) || salary < 0) {
            this.setData({ result: null, bonusResult: null, share: null, cardPayload: null });
            return;
        }
        const insurance = Number(this.data.insurance) || 0;
        const special = Number(this.data.special) || 0;
        const month = this.data.monthIndex + 1;
        const raw = calc.monthlyWithholding({ salary, insurance, special, month });
        const result = {
            month,
            netText: calc.formatMoney(raw.net),
            taxText: calc.formatMoney(raw.tax),
            ytdText: calc.formatMoney(Math.max(0, raw.ytdTaxable))
        };
        let bonusResult = null;
        const bonus = Number(this.data.bonus);
        if (this.data.bonus !== "" && isFinite(bonus) && bonus > 0) {
            const separate = calc.separateBonus(bonus);
            const merged = calc.mergedBonus({ salary, insurance, special, bonus });
            let better = "两种算法税额相同";
            if (separate.tax < merged.tax) better = "单独计税更少";
            if (merged.tax < separate.tax) better = "并入综合所得更少";
            bonusResult = {
                better,
                separateNet: calc.formatMoney(separate.net),
                separateTax: calc.formatMoney(separate.tax),
                mergedNet: calc.formatMoney(merged.net),
                mergedTax: calc.formatMoney(merged.tax)
            };
        }
        const path = "/pages/tax/index?salary=" + salary + "&insurance=" + insurance
            + "&special=" + special + "&month=" + month + "&bonus=" + (this.data.bonus || "");
        const title = bonusResult
            ? "到手 " + result.netText + " · 年终奖" + bonusResult.better
            : "本月到手 " + result.netText + " · 个税 " + result.taxText;
        const rows = [
            { label: "本月到手", value: "¥" + result.netText },
            { label: "本月个税", value: "¥" + result.taxText }
        ];
        if (bonusResult) {
            rows.push({ label: "年终奖", value: bonusResult.better });
            rows.push({ label: "单独计税到手", value: "¥" + bonusResult.separateNet });
        }
        this.setData({
            result,
            bonusResult,
            share: { title, path },
            cardPayload: {
                kicker: "个税估算 · 第 " + month + " 个月",
                headline: "到手 ¥" + result.netText,
                rows,
                note: "累计预扣估算，申报以个税 APP 为准"
            }
        });
        history.scheduleHistory("tax", { type: "tax", title: "个税与年终奖", summary: title, url: path });
    },
    makeImage() {
        if (this.data.cardPayload) card.shareImage(this, this.data.cardPayload);
    },
    onShareAppMessage() {
        return this.data.share || { title: "个税与年终奖计算器", path: "/pages/tax/index" };
    },
    onShareTimeline() {
        const share = this.data.share;
        if (!share) return { title: "个税与年终奖计算器" };
        return { title: share.title, query: share.path.split("?")[1] || "" };
    }
});
