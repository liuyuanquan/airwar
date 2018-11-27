var CLASS$=Laya.class;
var STATICATTR$=Laya.static;
var View=laya.ui.View;
var Dialog=laya.ui.Dialog;
var GameInfoUI=(function(_super){
		function GameInfoUI(){
			
		    this.pauseBtn=null;
		    this.hpLabel=null;
		    this.levelLabel=null;
		    this.scoreLabel=null;
		    this.infoLabel=null;

			GameInfoUI.__super.call(this);
		}

		CLASS$(GameInfoUI,'ui.GameInfoUI',_super);
		var __proto__=GameInfoUI.prototype;
		__proto__.createChildren=function(){
		    
			laya.ui.Component.prototype.createChildren.call(this);
			this.createView(GameInfoUI.uiView);

		}

		GameInfoUI.uiView={"type":"View","props":{"width":480,"height":852},"child":[{"type":"Button","props":{"y":22,"x":400,"var":"pauseBtn","stateNum":1,"skin":"war/btn_pause.png"}},{"type":"Label","props":{"y":30,"x":14,"width":88,"var":"hpLabel","text":"HP:10","styleSkin":"war/label.png","height":28,"fontSize":24,"color":"#00ff00","align":"center"}},{"type":"Label","props":{"y":30,"x":136,"width":101,"var":"levelLabel","text":"Level:10","styleSkin":"war/label.png","height":28,"fontSize":24,"color":"#ffffff"}},{"type":"Label","props":{"y":30,"x":270,"var":"scoreLabel","text":"Score:50","styleSkin":"war/label.png","height":28,"fontSize":24,"color":"#ffff00","align":"center"}},{"type":"Label","props":{"y":375,"x":90,"wordWrap":true,"width":300,"var":"infoLabel","text":"战斗结束","styleSkin":"war/label.png","height":101,"fontSize":30,"color":"#FFFFFF","align":"center"}}]};
		return GameInfoUI;
	})(View);