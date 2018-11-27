// 游戏UI文件
var GameInfo = (function (_super) {
    function GameInfo () {
        GameInfo.super(this)
        // 注册按钮的监听事件,点击后暂停游戏
        this.pauseBtn.on(Laya.Event.CLICK, this, this.onPauseBtnClick)
        // 初始化UI显示
        this.reset()
    }
    // 注册类
    Laya.class(GameInfo, 'GameInfo', _super)
    var _proto = GameInfo.prototype
    _proto.reset = function () {
        this.infoLabel.text = ''
        this.hp(5)
        this.level(0)
        this.score(0)
    }
    _proto.onPauseBtnClick = function (e) {
        e.stopPropagation()
        // 暂停游戏
        this.infoLabel.text = '游戏已暂停,点击任意地方恢复游戏'
        pause()
        Laya.stage.once(Laya.Event.CLICK, this, this.onStageClick)
    }   
    _proto.onStageClick = function () {
        this.infoLabel.text = ''
        resume()
    }
    // 显示当前血量
    _proto.hp = function (value) {
        this.hpLabel.text = 'HP:' + value
    }
    // 显示关卡级别
    _proto.level = function (value) {
        this.levelLabel.text = 'Level:' + value
    }
    // 显示积分
    _proto.score = function (value) {
        this.scoreLabel.text = 'Score:' + value
    }
    return GameInfo
})(ui.GameInfoUI)