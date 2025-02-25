Page({
    data: {
        items: [], // 盘子中的物品
        slots: [], // 底部槽中的物品
        slotSize: 7, // 底部槽最大容量（优化为7）
        obstacleType: 'X', // 障碍方块的类型
        timeLeft: 600, // 10分钟倒计时（秒）
        gameStatus: 'playing', // 游戏状态：playing, win, lose
        timeDisplay: '10:00', // 格式化时间显示
    },

    onLoad: function () {
        this.initGame();
    },

    onShow: function () {
        wx.onAccelerometerChange(this.handleShake);
    },

    // 初始化游戏
    initGame: function () {
        this.initItems();
        this.startTimer();
        wx.showToast({ title: '开始游戏吧！', icon: 'none' });
    },

    // 初始化物品堆
    initItems: function () {
        const types = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const itemsPerType = 9;
        const obstacleCount = 3;
        const items = [];
        const typeToImage = {
            1: '/packageGames/image/games/dae/dae1.jpeg',
            2: '/packageGames/image/games/dae/dae2.jpeg',
            3: '/packageGames/image/games/dae/dae3.jpeg',
            4: '/packageGames/image/games/dae/dae4.jpeg',
            5: '/packageGames/image/games/dae/dae5.jpeg',
            6: '/packageGames/image/games/dae/dae6.jpeg',
            7: '/packageGames/image/games/dae/dae7.jpeg',
            8: '/packageGames/image/games/dae/dae8.jpeg',
            9: '/packageGames/image/games/dae/dae9.jpeg',
        };

        types.forEach(type => {
            for (let i = 0; i < itemsPerType; i++) {
                const x = Math.random() * 270;
                const y = Math.random() * 270;
                const zIndex = items.length;
                const rotation = Math.random() * 360;
                console.log('hs---i', type, typeToImage[type])
                items.push({ type, x, y, zIndex, image: typeToImage[type], rotation });
            }
        });

        for (let i = 0; i < obstacleCount; i++) {
            const x = Math.random() * 270;
            const y = Math.random() * 270;
            const zIndex = items.length;
            items.push({ type: this.data.obstacleType, x, y, zIndex });
        }

        this.setData({ items, slots: [], gameStatus: 'playing', timeLeft: 600, timeDisplay: '10:00' });
    },

    // 启动倒计时
    startTimer: function () {
        this.timer = setInterval(() => {
            if (this.data.timeLeft > 0) {
                const timeLeft = this.data.timeLeft - 1;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                const timeDisplay = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`; // 格式化如 6:40
                this.setData({ timeLeft, timeDisplay });
            } else {
                clearInterval(this.timer);
                if (this.data.gameStatus === 'playing') {
                    this.setData({ gameStatus: 'lose' });
                    wx.showToast({ title: '时间到，游戏失败！', icon: 'none' });
                }
            }
        }, 1000);
    },

    // 选择物品
    selectItem: function (e) {
        if (this.data.gameStatus !== 'playing') return;

        const index = e.currentTarget.dataset.index;
        const item = this.data.items[index];
        let slots = this.data.slots;

        if (slots.length >= this.data.slotSize) {
            this.checkGameOver();
            return;
        }

        let items = this.data.items;
        items.splice(index, 1);
        slots.push(item);
        this.setData({ items, slots });
        this.checkSlots();
    },

    // 检查并消除槽中的物品
    checkSlots: function () {
        let slots = this.data.slots;
        const typeCount = {};
        slots.forEach(item => {
            if (item.type !== this.data.obstacleType) {
                typeCount[item.type] = (typeCount[item.type] || 0) + 1;
            }
        });

        const toRemove = [];
        for (let type in typeCount) {
            if (typeCount[type] >= 3) {
                toRemove.push(type);
            }
        }

        if (toRemove.length > 0) {
            slots = slots.filter(item => !toRemove.includes(item.type.toString()) || item.type === this.data.obstacleType);
            this.setData({ slots });

            if (this.data.items.length === 0 && slots.every(item => item.type === this.data.obstacleType)) {
                clearInterval(this.timer);
                this.setData({ gameStatus: 'win' });
                wx.showToast({ title: '恭喜你，胜利啦！', icon: 'success' });
            }
        } else if (slots.length >= this.data.slotSize) {
            this.checkGameOver();
        }
    },

    // 检查游戏是否失败
    checkGameOver: function () {
        const slots = this.data.slots;
        const typeCount = {};
        slots.forEach(item => {
            if (item.type !== this.data.obstacleType) {
                typeCount[item.type] = (typeCount[item.type] || 0) + 1;
            }
        });

        for (let type in typeCount) {
            if (typeCount[type] >= 3) {
                return;
            }
        }
        clearInterval(this.timer);
        this.setData({ gameStatus: 'lose' });
        wx.showToast({ title: '哎呀，游戏失败了！', icon: 'none' });
    },

    // 处理摇晃事件
    handleShake: function (res) {
        if (this.data.gameStatus !== 'playing') return;
        if (res.x > 1 || res.y > 1 || res.z > 1) {
            this.shakeItems();
            wx.offAccelerometerChange(this.handleShake);
            setTimeout(() => {
                wx.onAccelerometerChange(this.handleShake);
            }, 1000);
        }
    },

    // 摇晃物品，重新排列位置
    shakeItems: function () {
        const items = this.data.items;
        items.forEach(item => {
            item.x = Math.random() * 270;
            item.y = Math.random() * 270;
        });
        this.setData({ items });
    },

    // 手动打乱
    manualShake: function () {
        if (this.data.gameStatus === 'playing') {
            this.shakeItems();
        }
    },

    // 重新开始
    restartGame: function () {
        clearInterval(this.timer);
        this.initGame();
    },
});