const calc = require("../../utils/calc");
const history = require("../../utils/history");
const card = require("../../utils/card");

Page({
    data: {
        direction: "incl",
        amount: "",
        rates: calc.VAT_RATES,
        rateIndex: 0,
        result: null,
        primaryText: "—",
        rateHint: calc.VAT_RATES[0].hint,
        focus: true,
        share: null,
        cardPayload: null
    },
    onLoad(options) {
        const patch = {};
        if (options.dir === "excl" || options.dir === "incl") patch.direction = options.dir;
        if (options.amount) {
            patch.amount = options.amount;
            patch.focus = false;
        }
        if (options.rate) {
            const idx = calc.VAT_RATES.findIndex(function (item) {
                return String(item.value) === String(Number(options.rate));
            });
            if (idx >= 0) patch.rateIndex = idx;
        }
        if (Object.keys(patch).length) this.setData(patch);
        this.recalc();
    },
    switchDir(e) {
        this.setData({ direction: e.currentTarget.dataset.dir });
        this.recalc();
    },
    onAmount(e) {
        this.setData({ amount: e.detail.value });
        this.recalc();
    },
    pickRate(e) {
        this.setData({ rateIndex: Number(e.currentTarget.dataset.index) });
        this.recalc();
    },
    recalc() {
        const amount = Number(this.data.amount);
        if (!this.data.amount || !isFinite(amount) || amount < 0) {
            this.setData({
                result: null,
                primaryText: "—",
                rateHint: this.data.rates[this.data.rateIndex].hint,
                share: null,
                cardPayload: null
            });
            return;
        }
        const rate = this.data.rates[this.data.rateIndex];
        const raw = calc.splitVat(amount, rate.value, this.data.direction);
        const result = {
            inclusiveText: calc.formatMoney(raw.inclusive),
            exclusiveText: calc.formatMoney(raw.exclusive),
            taxText: calc.formatMoney(raw.tax),
            formula: this.data.direction === "incl"
                ? "不含税价 = " + calc.formatMoney(raw.inclusive) + " ÷ " + (1 + rate.value)
                : "含税价 = " + calc.formatMoney(raw.exclusive) + " × " + (1 + rate.value)
        };
        const path = "/pages/vat/index?dir=" + this.data.direction + "&amount=" + amount + "&rate=" + rate.value;
        const title = "不含税 " + result.exclusiveText + " · 税额 " + result.taxText;
        const cardPayload = {
            kicker: "价税分离 · " + rate.label,
            headline: "不含税 ¥" + result.exclusiveText,
            rows: [
                { label: "含税价", value: "¥" + result.inclusiveText },
                { label: "税额", value: "¥" + result.taxText },
                { label: "不含税价", value: "¥" + result.exclusiveText }
            ],
            note: result.formula
        };
        const primaryText = this.data.direction === "incl" ? result.exclusiveText : result.inclusiveText;
        this.setData({
            result,
            primaryText,
            rateHint: rate.hint,
            share: { title, path },
            cardPayload
        });
        history.scheduleHistory("vat", {
            type: "vat",
            title: "价税分离",
            summary: title,
            url: path
        });
    },
    makeImage() {
        if (!this.data.cardPayload) return;
        card.shareImage(this, this.data.cardPayload);
    },
    onShareAppMessage() {
        return this.data.share || { title: "价税分离计算器", path: "/pages/vat/index" };
    },
    onShareTimeline() {
        const share = this.data.share;
        if (!share) return { title: "价税分离计算器" };
        const query = share.path.split("?")[1] || "";
        return { title: share.title, query };
    }
});
