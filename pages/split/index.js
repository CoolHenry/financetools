const calc = require("../../utils/calc");
const history = require("../../utils/history");
const card = require("../../utils/card");

Page({
    data: {
        total: "",
        people: 2,
        result: null,
        share: null,
        cardPayload: null
    },
    onLoad(options) {
        const patch = {};
        if (options.total) patch.total = options.total;
        if (options.people) patch.people = Math.max(2, Math.min(30, parseInt(options.people, 10) || 2));
        if (Object.keys(patch).length) this.setData(patch);
        this.recalc();
    },
    onTotal(e) {
        this.setData({ total: e.detail.value });
        this.recalc();
    },
    changePeople(e) {
        const next = this.data.people + Number(e.currentTarget.dataset.delta);
        this.setData({ people: Math.max(2, Math.min(30, next)) });
        this.recalc();
    },
    recalc() {
        const total = Number(this.data.total);
        if (this.data.total === "" || !isFinite(total) || total < 0) {
            this.setData({ result: null, share: null, cardPayload: null });
            return;
        }
        const raw = calc.splitBill(total, this.data.people);
        const hasRemainder = raw.last !== raw.each;
        const result = {
            eachText: calc.formatMoney(raw.each),
            lastText: calc.formatMoney(raw.last),
            totalText: calc.formatMoney(raw.total),
            count: raw.count,
            hasRemainder,
            formula: hasRemainder
                ? "前 " + (raw.count - 1) + " 人各 " + calc.formatMoney(raw.each) + "，最后一人 " + calc.formatMoney(raw.last)
                : raw.count + " 人每人 " + calc.formatMoney(raw.each)
        };
        const path = "/pages/split/index?total=" + total + "&people=" + raw.count;
        const title = raw.count + "人分摊 · 每人 " + result.eachText;
        this.setData({
            result,
            share: { title, path },
            cardPayload: {
                kicker: "报销分摊",
                headline: "每人 ¥" + result.eachText,
                rows: [
                    { label: "总金额", value: "¥" + result.totalText },
                    { label: "人数", value: raw.count + " 人" },
                    { label: "最后一人", value: "¥" + result.lastText }
                ],
                note: result.formula
            }
        });
        history.scheduleHistory("split", { type: "split", title: "报销分摊", summary: title, url: path });
    },
    makeImage() {
        if (this.data.cardPayload) card.shareImage(this, this.data.cardPayload);
    },
    onShareAppMessage() {
        return this.data.share || { title: "报销分摊", path: "/pages/split/index" };
    },
    onShareTimeline() {
        const share = this.data.share;
        if (!share) return { title: "报销分摊" };
        return { title: share.title, query: share.path.split("?")[1] || "" };
    }
});
