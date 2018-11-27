// 角色类
var Role = (function (_super) {
    function Role () {
        Role.super(this)
    }
    // 是否缓存了动画
    Role.cached = false
    // 注册类
    Laya.class(Role, 'Role', _super)
    var _proto = Role.prototype
    _proto.init = function (_type, _camp, _hp, _speed, _hitRadius, _heroType) {
        if (!_heroType) _heroType = 0
        // 角色类型
        this.type = _type
        // 阵营
        this.camp = _camp
        // 血量
        this.hp = _hp
        // 速度
        this.speed = _speed
        // 被击半径
        this.hitRadius = _hitRadius
        // 0普通 1子弹 2炸药 3补给品
        this.heroType = _heroType

        // 射击类型
        this.shootType = 0
        // 射击间隔
        this.shootInterval = 500
        // 下次射击时间
        this.shootTime = Laya.Browser.now() + 2000
        // 当前动作
        this.action = ''
        //是否是子弹
        this.isBullet = _heroType === 1;
        if (!Role.cached) {
            // 缓存飞机的动作
            Laya.Animation.createFrames(['war/hero_fly1.png', 'war/hero_fly2.png'], 'hero_fly')
            // 缓存集中爆炸动作
            Laya.Animation.createFrames(['war/hero_down1.png', 'war/hero_down2.png', 'war/hero_down3.png', 'war/hero_down4.png'], 'hero_down')

            // 缓存敌机1飞行动作
            Laya.Animation.createFrames(['war/enemy1_fly1.png'], 'enemy1_fly')
            // 缓存敌机1爆炸动作
            Laya.Animation.createFrames(['war/enemy1_down1.png', 'war/enemy1_down2.png', 'war/enemy1_down3.png', 'war/enemy1_down4.png'], 'enemy1_down')
            
            // 缓存敌机2飞行动作
            Laya.Animation.createFrames(['war/enemy2_fly1.png'], 'enemy2_fly')
            // 缓存敌机2爆炸动作
            Laya.Animation.createFrames(['war/enemy2_down1.png', 'war/enemy2_down2.png', 'war/enemy2_down3.png', 'war/enemy2_down4.png'], 'enemy2_down')
            // 缓存敌机2碰撞动作
            Laya.Animation.createFrames(['war/enemy2_hit.png'], 'enemy2_hit')
            
            // 缓存敌机3飞行动作
            Laya.Animation.createFrames(['war/enemy3_fly1.png', 'war/enemy3_fly2.png'], 'enemy3_fly')
            // 缓存敌机3爆炸动作
            Laya.Animation.createFrames(['war/enemy3_down1.png', 'war/enemy3_down2.png', 'war/enemy3_down3.png', 'war/enemy3_down4.png', 'war/enemy3_down5.png', 'war/enemy3_down6.png'], 'enemy3_down')
            // 缓存敌机3碰撞动作
            Laya.Animation.createFrames(['war/enemy3_hit.png'], 'enemy3_hit')
            
            // 缓存子弹动画
            Laya.Animation.createFrames(['war/bullet1.png'], 'bullet1_fly')

            // 缓存强化包
            Laya.Animation.createFrames(['war/ufo1.png'], 'ufo1_fly')

            // 缓存医疗包
            Laya.Animation.createFrames(['war/ufo2.png'], 'ufo2_fly')
            
            Role.cached = true
        }   
        if (!this.body) {
            // 创建一个动画作为飞机的身体
            this.body = new Laya.Animation()
            // 把机体添加到容器
            this.addChild(this.body)
            // 
            this.body.on(Laya.Event.COMPLETE, this, this.onPlayComplete)
        }
        // 播放飞行动画
        this.playAction('fly')
    }
    _proto.onPlayComplete = function () {
        // 击毁动画,则隐藏
        if (this.action === 'down') {
            // 停止动画播放
            this.body.stop()
            // 隐藏显示
            this.visible = false
        } else if (this.action === 'hit') {
            // 如果是被击动画播放完毕,则接着播放飞行动画
            this.playAction('fly')
        }
    }
    _proto.playAction = function (action) {
        // 记录当前播放动画类型
        this.action = action
        // 根据类型播放动画
        this.body.play(0, true, this.type + '_' + action)
        // 获取动画大小区域
        this.bounds = this.body.getBounds()
        // 设置机身居中
        this.body.pos(-this.bounds.width / 2, -this.bounds.height / 2)
    }
    return Role
})(Laya.Sprite)