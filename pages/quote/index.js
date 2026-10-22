const calc = require("../../utils/calc");
const history = require("../../utils/history");
const card = require("../../utils/card");

Page({
    data: {
        price: "",
        cost: "",
        priceTax: "incl",
        costTax: "excl",
        rates: calc.VAT_RATES,
        rateIndex: 0,
        result: null,
        share: null,
        cardPayload: null
    },
    onLoad(options) {
        const patch = {};
        ["price", "cost"].forEach(function (key) {
            if (options[key]) patch[key] = options[key];
        });
        if (options.priceTax === "incl" || options.priceTax === "excl") patch.priceTax = options.priceTax;
        if (options.costTax === "incl" || options.costTax === "excl") patch.costTax = options.costTax;
        if (options.rate) {
            const idx = calc.VAT_RATES.findIndex(function (item) {
                return item.value === Number(options.rate);
            });
            if (idx >= 0) patch.rateIndex = idx;
        }
        if (Object.keys(patch).length) this.setData(patch);
        this.recalc();
    },
    onPrice(e) {
        this.setData({ price: e.detail.value });
        this.recalc();
    },
    onCost(e) {
        this.setData({ cost: e.detail.value });
        this.recalc();
    },
    switchTax(e) {
        const patch = {};
        patch[e.currentTarget.dataset.field] = e.currentTarget.dataset.value;
        this.setData(patch);
        this.recalc();
    },
    pickRate(e) {
        this.setData({ rateIndex: Number(e.currentTarget.dataset.index) });
        this.recalc();
    },
    recalc() {
        const price = Number(this.data.price);
        const cost = Number(this.data.cost);
        if (!isFinite(price) || price < 0 || this.data.price === "" || !isFinite(cost) || cost < 0 || this.data.cost === "") {
            this.setData({ result: null, share: null, cardPayload: null });
            return;
        }
        const rate = this.data.rates[this.data.rateIndex];
        const raw = calc.quoteMargin({
            price,
            cost,
            rate: rate.value,
            priceIncludesTax: this.data.priceTax === "incl",
            costIncludesTax: this.data.costTax === "incl"
        });
        const result = {
            margin: raw.margin,
            marginText: calc.formatMoney(raw.margin),
            marginRateText: calc.formatPercent(raw.marginRate),
            revenueText: calc.formatMoney(raw.price.exclusive),
            costText: calc.formatMoney(raw.cost.exclusive),
            inclusiveText: calc.formatMoney(raw.price.inclusive)
        };
        const path = "/pages/quote/index?price=" + price + "&cost=" + cost
            + "&priceTax=" + this.data.priceTax + "&costTax=" + this.data.costTax + "&rate=" + rate.value;
        const title = "毛利 " + result.marginText + " · 毛利率 " + result.marginRateText;
        this.setData({
            result,
            share: { title, path },
            cardPayload: {
                kicker: "报价毛利 · " + rate.label,
                headline: "毛利 ¥" + result.marginText,
                rows: [
                    { label: "毛利率", value: result.marginRateText },
                    { label: "不含税收入", value: "¥" + result.revenueText },
                    { label: "不含税成本", value: "¥" + result.costText },
                    { label: "价税合计", value: "¥" + result.inclusiveText }
                ],
                note: "毛利 = 不含税收入 − 不含税成本"
            }
        });
        history.scheduleHistory("quote", { type: "quote", title: "报价毛利", summary: title, url: path });
    },
    makeImage() {
        if (this.data.cardPayload) card.shareImage(this, this.data.cardPayload);
    },
    onShareAppMessage() {
        return this.data.share || { title: "报价毛利计算器", path: "/pages/quote/index" };
    },
    onShareTimeline() {
        const share = this.data.share;
        if (!share) return { title: "报价毛利计算器" };
        return { title: share.title, query: share.path.split("?")[1] || "" };
    }
});
