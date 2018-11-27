    // 子弹发射偏移位置表
    this.bulletPos = [[0], [-15, 15], [-30, 0, 30], [-45, -15, 15, 45]]
    // 关卡等级
    this.level = 0
    // 积分成绩
    this.score = 0
    // 升级等级所需的成绩数量
    this.levelUpScore = 0
    // 子弹级别
    this.bulletLevel = 0
    // 敌机血量
    this.hps = [1, 2, 2]
    // 敌机速度
    this.speeds = [3, 2, 1]
    // 敌机被击半径
    this.radius = [15, 30, 70]
    // 初始化
    Laya.init(480, 852, Laya.WebGL)
    // 屏幕适配
    Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
    Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
    Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL
    Laya.stage.screenMode = Laya.Stage.SCREEN_VERTICAL;
    // 加载图集资源
    Laya.loader.load('res/atlas/war.atlas', Laya.Handler.create(this, onLoaded), null, Laya.Loader.ATLAS)
    function onLoaded () {
        // 创建循环滚动的背景
        this.bg = new Background()
        // 添加到舞台
        Laya.stage.addChild(this.bg)

        // 实例化角色容器
        this.roleBox = new Laya.Sprite()
        // 添加到舞台上
        Laya.stage.addChild(this.roleBox)

        // 创建UI界面
        this.gameInfo = new GameInfo()
        // 添加到舞台上
        Laya.stage.addChild(this.gameInfo)

        // 创建一个主角(主战斗机)
        this.hero = new Role()
        // 添加到舞台上
        this.roleBox.addChild(this.hero)

        // 开始游戏
        restart()
    }
    function onLoop () {
        // 遍历所有飞机,更改飞机状态
        for (var i = this.roleBox.numChildren - 1;i > -1;i--) {
            var role = this.roleBox.getChildAt(i)
            if (role && role.speed) {
                // 根据飞机速度更改飞机位置
                role.y += role.speed
                // 如果敌机移动到显示区域外,或者敌机被击毁,或者子弹移动到显示区域外
                if (role.y > 1000 || !role.visible || (role.isBullet && role.y < -20)) {
                    // 从舞台移除
                    role.removeSelf()
                    // 回收并重置属性信息
                    role.isBullet = false
                    role.visible = true
                    // 回收到对象池
                    Laya.Pool.recover('role', role)
                }
            }
            // 处理发射子弹逻辑
            if (role.shootType > 0) {
                // 获取当前浏览器时间
                var time = Laya.Browser.now() 
                // 如果当前时间大于下次射击时间
                if (time > role.shootTime) {
                    // 更新下次射击时间
                    role.shootTime = time + role.shootInterval
                    // 根据不同的子弹类型,设置不同不同的数量及位置
                    var pos = this.bulletPos[role.shootType - 1]
                    for (var i = 0;i < pos.length;i++) {
                        // 从对象池里创建一个子弹
                        var bullet = Laya.Pool.getItemByClass('role', Role)
                        // 初始化子弹信息
                        bullet.init('bullet1', role.camp, 1, -4 - role.shootType - Math.floor(this.level / 15), 1, 1)
                        // 设置子弹发射初始化位置
                        bullet.pos(role.x + pos[i], role.y - role.hitRadius - 10)
                        // 添加到舞台上
                        this.roleBox.addChild(bullet)
                    }
                    // 为发射子弹添加音效
                    Laya.SoundManager.playSound('res/sound/bullet.mp3')
                }
            }
        }
        // 碰撞检测
        for (var i = this.roleBox.numChildren - 1;i > -1;i--) {
            // 获取角色对象1
            var role1 = this.roleBox.getChildAt(i)
            //  如果角色死亡则忽略
            if (role1.hp < 1) continue
            for (var j = i - 1;j > -1;j--) {
                // 如果角色死亡则忽略
                if (!role1.visible) continue
                var role2 = this.roleBox.getChildAt(j)
                // 如果角色未死亡，并且阵营不同，才行进碰撞
                if (role2.hp > 0 && role1.camp !== role2.camp) {
                    // 计算碰撞区域
                    var hitRadius = role1.hitRadius = role2.hitRadius
                    // 根据距离判断是否碰撞
                    if (Math.abs(role1.x - role2.x) < hitRadius && Math.abs(role1.y - role2.y) < hitRadius) {
                        // 碰撞后掉血
                        loseHp(role1, 1)
                        loseHp(role2, 1)
                        // 每掉一滴血,积分加1
                        this.score++
                        // 在UI上显示积分
                        this.gameInfo.score(this.score)
                        // 积分大于升级积分,则升级
                        if (this.score > this.levelUpScore) {
                            // 升级关卡
                            this.level++
                            // 在UI上显示关卡等级
                            this.gameInfo.level(this.level)
                            // 提高下一级升级难度
                            this.levelUpScore += this.level * 5
                        }
                    }
                }
            }
        }
        // 如果主角死亡,则停止游戏循环
        if (this.hero.hp < 1) {
            Laya.timer.clear(this, onLoop)
            // 添加游戏结束音效
            Laya.SoundManager.playSound('res/sound/game_over.mp3')
            // UI上显示提示信息
            this.gameInfo.infoLabel.text = 'GameOver,分数:' + this.score + '\n点击这里重新开始'
            // 注册点击事件,点击重新开始
            this.gameInfo.infoLabel.once(Laya.Event.CLICK, this, restart)
        }
        // 每隔30帧创建新的敌机
        // if (Laya.timer.currFrame % 60 === 0) {
        //     createEnemy(2)
        // }

        // 关卡越高,创建敌机间隔越短
        var currTime = this.level < 30 ? this.level * 2 : 30
        // 关卡越高,敌机飞行速度越高
        var speedUp = Math.floor(this.level / 6)
        // 关卡越高,敌机血量越高
        var hpUp = Math.floor(this.level / 8)
        // 关卡越高,敌机数量越高
        var numUp = Math.floor(this.level / 10)
        // 生成小飞机
        if (Laya.timer.currFrame % (80 - currTime) === 0) {
            createEnemy(0, 2 + numUp, 3 + speedUp, 1)
        }   
        // 生成中型飞机
        if (Laya.timer.currFrame % (150 - currTime * 4) === 0) {
            createEnemy(1, 1 + numUp, 2 + speedUp, 2 + hpUp * 2)
        }
        // 生成boss
        if (Laya.timer.currFrame % (900 - currTime * 4) === 0) {
            createEnemy(2, 1, 1 + speedUp, 10 + hpUp * 6)
            // boss出场音效
            Laya.SoundManager.playSound('res/sound/enemy3_out.mp3')
        }
    }
    function loseHp(role, loseHp) {
        // 减血
        role.hp -= loseHp
        if (role.heroType === 2) {
            // 每吃一个子弹道具,子弹升级加1
            this.bulletLevel++
            // 子弹每升两级,子弹数量加1,最大数量四个
            this.hero.shootType = Math.min(4, Math.floor(this.bulletLevel / 2) + 1)
            // 子弹级别越高,发射频率越快
            this.hero.shootInterval = 500 - 20 * (this.bulletLevel > 20? 20 : this.bulletLevel)
            // 隐藏道具
            role.visible = false
            // 添加获得道具音效
            Laya.SoundManager.playSound('res/sound/achievement.mp3')
        }
        if (role.heroType === 3) {
            //  每吃一个血瓶血量加1, 设置最大血量不超过10
            this.hero.hp = Math.min(this.hero.hp + 1, 10)
            // 设置主角血量
            this.gameInfo.hp(this.hero.hp)
            //  隐藏道具
            role.visible = false
        }
        if (role.hp > 0) {
            // 如果未死亡,播放击中动画
            role.playAction('hit')
        } else {
            if (role.heroType) {
                // 如果是子弹,则直接隐藏
                role.visible = false
            } else {
                if (role.type !== 'hero') {
                    // 播放爆炸声音
                    Laya.SoundManager.playSound('res/sound/' + role.type + '_down.mp3')
                }
                role.playAction('down')
                // 击中boss掉落血瓶或者子弹升级道具
                if (role.type === 'enemy3') {
                    //  随机子弹还是血瓶
                    var type = Math.random() < 0.7 ? 2 : 3
                    var item = Laya.Pool.getItemByClass('role', Role)
                    // 初始化信息
                    item.init('ufo' + (type - 1), role.camp, 1, 1, 15, type)
                    // 设置位置
                    item.pos(role.x, role.y)
                    // 添加到舞台
                    this.roleBox.addChild(item)
                }
            }
        }
        // 设置主角血量
        if (role == this.hero) {
            this.gameInfo.hp(role.hp)
        }
    }
    // 开始游戏
    function restart () {
        // 重置数据
        this.score = 0
        this.level = 0
        this;levelUpScore = 10
        this.bulletLevel = 0
        this.gameInfo.reset()

        // 初始化角色
        this.hero.init('hero', 0, 5, 0, 30)
        // 设置射击类型
        this.hero.shootType = 1;
        // 设置主角位置
        this.hero.pos(240, 500)
        // 重置射击间隔
        this.hero.shootInterval = 500
        // 显示角色
        this.hero.visible = true

        for (var i = this.roleBox.numChildren - 1;i > -1;i--) {
            var role = this.roleBox.getChildAt(i)
            if (role !== this.hero) {
                role.removeSelf()
                // 回收之前重置信息
                role.visible = true
                // 回收到对象池
                Laya.Pool.recover('role', role)
            }
        }
        // 恢复游戏
        resume()
    }
    // 暂停游戏
    function pause () {
        // 停止游戏主循环
        Laya.timer.clear(this, onLoop)
        // 移除舞台的鼠标移动事件
        Laya.stage.off(Laya.Event.onMouseMove, this, onMouseMove)
    }
    // 恢复游戏
    function resume () {
        // 在循环中创建敌人
        Laya.timer.frameLoop(1, this, onLoop)
        // 监听舞台的鼠标移动事件
        Laya.stage.on(Laya.Event.MOUSE_MOVE, this, onMouseMove)
    }
    function onMouseMove (e) {
        this.hero.pos(Laya.stage.mouseX, Laya.stage.mouseY)
    }
    function createEnemy(type, num, speed, hp) {
        for (var i = 0;i < num;i++) {
            // 创建敌人(对象池创建,性能优化)
            var enemy = Laya.Pool.getItemByClass('role', Role)
            // 初始化角色
            enemy.init('enemy' + (type + 1), 1, hp, speed, this.radius[type])
            // 随机位置
            enemy.pos(Math.random() * 400 + 40, -Math.random() * 200 - 100)
            // 添加到舞台上
            this.roleBox.addChild(enemy)
        }
    }