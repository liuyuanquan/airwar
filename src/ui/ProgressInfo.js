var ProgressInfo = (function (_super) {
    function ProgressInfo () {
        GameInfo.super(this)
    }
    // 注册类
    Laya.class(ProgressInfo, 'ProgressInfo', _super)
    var _proto = ProgressInfo.prototype
    _proto.update = function (progress) {
        this.progressBar.value = progress
    }
    return  ProgressInfo
})(ui.ProgressInfoUI)