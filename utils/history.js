const KEY = "work_history";

function readHistory() {
    const list = wx.getStorageSync(KEY);
    return Array.isArray(list) ? list : [];
}

function pushHistory(item) {
    const list = readHistory().filter(function (row) {
        return row.summary !== item.summary || row.type !== item.type;
    });
    list.unshift({
        type: item.type,
        title: item.title,
        summary: item.summary,
        url: item.url,
        time: Date.now()
    });
    wx.setStorageSync(KEY, list.slice(0, 20));
}

const timers = {};

function scheduleHistory(token, item) {
    if (timers[token]) clearTimeout(timers[token]);
    timers[token] = setTimeout(function () {
        pushHistory(item);
    }, 700);
}

module.exports = {
    readHistory,
    pushHistory,
    scheduleHistory
};
