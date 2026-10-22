function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function drawResultCard(canvas, payload) {
    const width = 600;
    const height = 780;
    const dpr = wx.getSystemInfoSync().pixelRatio || 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#F6F7F9";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#1677FF";
    ctx.fillRect(0, 0, width, 12);

    roundRect(ctx, 36, 48, 528, 620, 24);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.fillStyle = "#86909C";
    ctx.font = "24px sans-serif";
    ctx.fillText(payload.kicker || "价税计算", 68, 112);

    ctx.fillStyle = "#1677FF";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(payload.headline || "", 68, 176);

    let y = 240;
    const rows = payload.rows || [];
    rows.forEach(function (row) {
        ctx.fillStyle = "#86909C";
        ctx.font = "26px sans-serif";
        ctx.fillText(row.label, 68, y);
        ctx.fillStyle = "#1D2129";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(row.value, 532, y);
        ctx.textAlign = "left";
        y += 64;
    });

    if (payload.note) {
        ctx.fillStyle = "#86909C";
        ctx.font = "22px sans-serif";
        ctx.fillText(payload.note, 68, 600);
    }

    ctx.fillStyle = "#86909C";
    ctx.font = "22px sans-serif";
    ctx.fillText("结果供核对，正式开票和申报以票面为准", 36, 724);
    ctx.fillText("打开小程序，可以按同样的数再算一笔", 36, 758);

    return { width: width, height: height };
}

function exportCard(page, payload) {
    return new Promise(function (resolve, reject) {
        const query = wx.createSelectorQuery().in(page);
        query.select("#card").fields({ node: true, size: true }).exec(function (res) {
            const canvas = res && res[0] && res[0].node;
            if (!canvas) {
                reject(new Error("canvas missing"));
                return;
            }
            const size = drawResultCard(canvas, payload);
            wx.canvasToTempFilePath({
                canvas: canvas,
                width: size.width,
                height: size.height,
                destWidth: canvas.width,
                destHeight: canvas.height,
                fileType: "png",
                success: function (file) {
                    resolve(file.tempFilePath);
                },
                fail: reject
            });
        });
    });
}

function shareImage(page, payload) {
    wx.showLoading({ title: "生成图片", mask: true });
    exportCard(page, payload).then(function (path) {
        wx.hideLoading();
        if (wx.showShareImageMenu) {
            wx.showShareImageMenu({
                path: path,
                fail: function () {
                    wx.previewImage({ urls: [path] });
                }
            });
            return;
        }
        wx.previewImage({ urls: [path] });
    }).catch(function () {
        wx.hideLoading();
        wx.showToast({ title: "图片生成失败", icon: "none" });
    });
}

module.exports = {
    shareImage
};
