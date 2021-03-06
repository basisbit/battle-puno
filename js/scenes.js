/**
 * The Superclass of all scene within the game.
 *
 * @class Scene_Base
 * @constructor
 * @extends Stage
 * @property {boolean} _active      - acitve flag
 * @property {number}  _fadingFlag  - fade type flag
 * @property {number}  _fadingTimer - timer of fade effect
 * @property {Sprite}  _fadeSprite  - sprite of fade effect
 */
class Scene_Base extends Stage{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Base
   */
  constructor(){
    super();
    this._active  = false;
    this._windows = [];
    this._fadingFlag = 0;
    this._fadingTimer = 0;
    this.fadeDuration = 30;
    this._buttonCooldown = new Array(0xff);
    this._fadingSprite = Graphics.fadingSprite;
    this._terminating  = false;
  }
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Scene_Base
   */
  update(){
    this.updateFading();
    this.updateChildren();
    this.updateShake();
  }
  /*-------------------------------------------------------------------------*/
  updateChildren(){
    this.children.forEach(function(child){
      if(child.update){
        if(this._terminating && child.isWindow){return ;}
        if(!this.overlay || !child.isWindow || child === this.overlay){
          child.update();
        }
      }
    }.bind(this))
  }
  /*------------------------------------------------------------------------*/
  updateShake(){
    if(!this._shaking){return ;}
    if(this._shakeTimer <= 0){
      this.x = 0; this.y = 0;
      this._shaking = false;
      return ;
    }
    let dis = 2 * this._shakeLevel;
    let dx = randInt(0, 2 * dis) - dis;
    let dy = randInt(0, 2 * dis) - dis;
    this.x = dx;
    this.y = dy;
    this._shakeTimer -= 1;
  }
  /*------------------------------------------------------------------------*/
  sortChildren(){
    this.children.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
  }
  /*-------------------------------------------------------------------------*/
  prepare(){
    // reserved
  }
  /*-------------------------------------------------------------------------*/
  shake(level = 1, duration = 30){
    this._shaking    = true;
    this._shakeLevel = level;
    this._shakeTimer = duration;
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - whether scene is fading
   */
  isBusy(){
    return this._fadingTimer > 0;
  }
  /*-------------------------------------------------------------------------*/
  preTerminate(){
    debug_log("Scene pre-terminate: " + getClassName(this));
    this._terminating = true;
    this.fadeOutAll();
    this.deactivateChildren();
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    debug_log("Scene terminated: " + getClassName(this));
    this.disposeAllWindows();
  }
  /**-------------------------------------------------------------------------
   * > Create the components and add them to the rendering process.
   */
  create(){
    this.createBackground();
  }
  /**-------------------------------------------------------------------------
   * Deactivate all sprites to prevent interaction during terminating
   */
  deactivateChildren(){
    this.children.forEach(function(sp){
      sp.deactivate();
    })
  }
  /**-------------------------------------------------------------------------
   * > Remove windows from page
   */
  disposeAllWindows(){
    for(let i=0;i<this._windows.length;++i){
      this.disposeWindowAt(i);
    }
    this._windows = [];
  }
  /**-------------------------------------------------------------------------
   * > Remove a single window
   */
  removeWindow(win){
    this.disposeWindowAt(this._windows.indexOf(win));
  }
  /**-------------------------------------------------------------------------
   * > Dispose window
   */
  disposeWindowAt(index){
    if(index <= -1){
      console.error("Trying to dispose the window not rendered yet")
      return ;
    }
    debug_log("Dispose window: " + getClassName(this._windows[index]));
    if(Graphics.globalWindows.indexOf(this._windows[index]) == -1){
      this._windows[index].clear(true)
    }else{this._windows[index].hide()}
    this._windows.splice(index, 1);
  }
  /**-------------------------------------------------------------------------
   * > Create background
   */
  createBackground(){
    // reserved for inherited class
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - whether current scene is active
   */
  isActive(){
    return this._active;
  }
  /*-------------------------------------------------------------------------*/
  start(){
    this._active = true;
    this._fadingSprite = Graphics.fadingSprite;
    if(DebugMode){this.addChild(Graphics.FPSSprite)}
    this.renderGlobalSprites();
    this.renderGlobalWindows();
  }
  /*-------------------------------------------------------------------------*/
  stop(){
    this._active = false;
  }
  /*-------------------------------------------------------------------------*/
  renderGlobalSprites(){
    Graphics.globalSprites.forEach(function(sp){
      Graphics.renderSprite(sp);
      if(sp.defaultActiveState){sp.activate(); sp.show();}
    });
    this.optionSprite = Graphics.optionSprite;
  }
  /*-------------------------------------------------------------------------*/
  renderGlobalWindows(){
    Graphics.globalWindows.forEach(function(win){
      Graphics.renderWindow(win);
      if(win.defaultActiveState){win.activate(); win.show();}
    });
    this.optionWindow = Graphics.optionWindow;
  }
  /*-------------------------------------------------------------------------*/
  startFadeIn(duration = this.fadeDuration){
    Graphics.renderSprite(Graphics.fadingSprite);
    this._fadingSprite.show();
    this._fadeSign = 1;
    this._fadingTimer = duration;
    this._fadingSprite.setOpacity(1);
  }
  /*-------------------------------------------------------------------------*/
  startFadeOut(duration = this.fadeDuration){
    Graphics.renderSprite(Graphics.fadingSprite);
    this._fadingSprite.show();
    this._fadeSign = -1;
    this._fadingTimer = duration;
    this._fadingSprite.setOpacity(0);
  }
  /*-------------------------------------------------------------------------*/
  updateFading(){
    if(this._fadingTimer <= 0){return ;}
    let d = this._fadingTimer;
    let opa = this._fadingSprite.opacity;
    if(this._fadeSign > 0){
      this._fadingSprite.setOpacity(opa - opa / d)
    }
    else{
      this._fadingSprite.setOpacity(opa + (1 - opa) / d)
    }
    this._fadingTimer -= 1;
    if(this._fadingTimer <= 0){this.onFadeComplete();}
  }
  /**-------------------------------------------------------------------------
   * > Fade out screen and sound
   */
  fadeOutAll(){
    Sound.fadeOutAll();
    this.startFadeOut();
  }
  /*-------------------------------------------------------------------------*/
  onFadeComplete(){
    this._fadingFlag  = 0;
    this._fadingTimer = 0;
  }
  /**-------------------------------------------------------------------------
   * @returns {number} - frames before fade completed, slower one
   */
  slowFadeSpeed(){
    return this.fadeSpeed() * 2;
  }
  /**-------------------------------------------------------------------------
   * @returns {number} - frames before fade completed
   */
  fadeSpeed(){
    return 24;
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - Graphics is loaded and ready
   */
  isReady(){
    return Graphics.isReady();
  }
  /**-------------------------------------------------------------------------
   * > Add window to page view
   * @param {Window_Base} win - the window class
   */
  addWindow(win, forced = false){
    if(!this.isActive() && !forced){
      console.error("Trying to add window to stopped scene")
      return ;
    }
    if(win.isDisposed()){
      console.error("Try to add disposed window: " + getClassName(win));
      return ;
    }
    if(this._windows.indexOf(win) >= 0){
      return ;
    }
    this._windows.push(win);
    this.addChild(win);
  }
  /**-------------------------------------------------------------------------
   * > Pause animate sprites
   */
  pause(){
    this.children.forEach(function(sp){
      Graphics.pauseAnimatedSprite(sp);
      if(sp.isActive()){sp.lastActiveState = sp.isActive();}
      sp.deactivate();
    })
  }
  /**-------------------------------------------------------------------------
   * > Resume paused animate sprites
   */
  resume(){
    this.children.forEach(function(sp){
      Graphics.resumeAnimatedSprite(sp);
      if(sp.lastActiveState){
        sp.activate();
      }
    })
  }
  /*-------------------------------------------------------------------------*/
  heatupButton(kid){
    this._buttonCooldown[kid] = 4;
  }
  /*-------------------------------------------------------------------------*/
  isButtonCooled(kid){
    return (this._buttonCooldown[kid] || 0) == 0;
  }
  /*-------------------------------------------------------------------------*/
  raiseOverlay(ovs, fallback=null){
    if(!ovs){return ;}
    if(ovs !== this.optionWindow){
      this.optionSprite.deactivate();
      this.optionSprite.Xmark.show();
    }
    debug_log("Raise overlay: " + getClassName(ovs));
    this.overlay = ovs;
    this.overlay.oriZ = ovs.z;
    this.overlay.setZ(0x111).render();
    this.overlayFallback = fallback;
    this.children.forEach(function(sp){
      if(sp.alwaysActive){return ;}
      if(sp !== ovs){
        sp.lastActiveState = sp.isActive();
        sp.deactivate();
      }
    })
    Graphics.renderSprite(Graphics.dimSprite);
    ovs.show(); ovs.activate();
  }
  /*-------------------------------------------------------------------------*/
  closeOverlay(){
    if(!this.overlay){return ;}
    debug_log("Close overlay");
    this.optionSprite.activate();
    this.optionSprite.Xmark.hide();

    this.overlay.hide(); this.overlay.deactivate();
    this.children.forEach(function(sp){
      if(sp !== this.overlay && sp.lastActiveState){
        sp.activate();
      }
    }.bind(this))
    Graphics.removeSprite(Graphics.dimSprite);
    this.overlay.setZ(this.overlay.oriZ);
    this.overlay = null;
    if(this.overlayFallback){
      EventManager.setTimeout(()=>{
        this.overlayFallback();
        this.overlayFallback = null;
      }, 2);
    }
  }
  /*-------------------------------------------------------------------------*/
} // Scene_Base
/**-------------------------------------------------------------------------
 * > The scene that shows the load process
 *
 * @class Scene_Load
 * @extends Scene_Base
 * @property {number} loading_timer - timer record of loading phase
 */
class Scene_Load extends Scene_Base{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Load
   * @property {boolean} allLoaded - Graphics and Audio are both loaded
   */
  constructor(){
    super()
    this.allLoaded = false;
    this.loading_timer = 0;
  }
  /**-------------------------------------------------------------------------
   * > Start processing
   */
  start(){
    super.start();
    this.processLoadingPhase();
    let bitset = DataManager.getSetting('hideWarning');
    if(validNumericCount(null, bitset) != 1){bitset = 0;}
    let newSetting = 0;

    if(isMobile){
      if(!(bitset & 1)){
        let b = window.confirm(Vocab["MobileWarning"] + '\n' + Vocab["DontShowWarning"])
        newSetting |= (b + 0)
      }else{newSetting |= 1;}
    }

    if(!isChrome && !isFirefox && !isSafari){
      if(!(bitset & 2)){
        let b = window.confirm(Vocab["BrowserWarning"]+ '\n' + Vocab["DontShowWarning"])
        newSetting |= ((b + 0) << 1);
      }else{newSetting |= (1 << 1);}
    }

    if(isFirefox){
      if(!(bitset & 4)){
        let b = window.confirm(Vocab["FirefoxWarning"]+ '\n' + Vocab["DontShowWarning"])
        newSetting |= ((b+0) << 2);
      }else{newSetting |= (1 << 2);}
    }

    DataManager.changeSetting('hideWarning', newSetting);
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean}
   */
  isReady(){
    return Graphics._loaderReady;
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createLoadingImage();
    this.createLoadingText();
    this.createProgressBar();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateLoading();
    this.updateButtonCooldown();
    this.updateProgressBar();
  }
  /*-------------------------------------------------------------------------*/
  createProgressBar(){
    let dw = Graphics.width * 0.3;
    let dh = 24;
    let dx = Graphics.appCenterWidth(dw), dy = this.load_text.y + 36;
    this.bar = new Sprite_ProgressBar(dx, dy, dw, dh);
    this.bar.setMaxProgress(Graphics.getLoadingProgress[1] + Sound.getLoadingProgress[1]);
  }
  /*-------------------------------------------------------------------------*/
  createLoadingImage(){
    this.loading_sprite = Graphics.addSprite(Graphics.LoadImage);
    let sx = Graphics.appCenterWidth(this.loading_sprite.width);;
    let sy = Graphics.appCenterHeight(this.loading_sprite.height);
    this.loading_sprite.setPOS(sx, sy);
    this.loading_sprite.anchor.set(0.5);
  }
  /*-------------------------------------------------------------------------*/
  createLoadingText(){
    this.load_text = Graphics.addText(Vocab.LoadText);
    let lt = this.load_text, ls = this.loading_sprite;
    let offset = Graphics._spacing;
    lt.x = Graphics.appCenterWidth(lt.width);
    lt.y = Graphics.appCenterHeight(lt.height) + ls.height + offset;
  }
  /*-------------------------------------------------------------------------*/
  reportLoaderProgress(loader, resources){
    Graphics._loadProgress += 1;
    let message = 'Graphics Loaded : ' + loader.progress + '%';
    if(resources){message += ', name : ' + resources.name + ', url : ' + resources.url;}
    debug_log(message);
  }
  /*-------------------------------------------------------------------------*/
  updateButtonCooldown(){
    for(let i=0;i<0xff;++i){
      if((this._buttonCooldown[i] || 0) > 0){
        this._buttonCooldown[i] -= 1;
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  updateLoading(){
    this.updateImage();
    this.updateText();
    if(this.allLoaded){
      if(this.loading_timer < 60)this.loading_timer += 1;
      if(this.loading_timer == 60){this.processLoadingComplete();}
    }
  }
  /*-------------------------------------------------------------------------*/
  updateImage(){
    let sprite = SceneManager.scene.loading_sprite;
    if(sprite.scale_flag){
      sprite.scale.x *= 0.98;
      sprite.scale.y *= 0.98;
      if(sprite.scale.x <= 0.5)sprite.scale_flag = false;
    }
    else{
      sprite.scale.x *= 1.02;
      sprite.scale.y *= 1.02;
      if(sprite.scale.x >= 1.5)sprite.scale_flag = true;
    }
  }
  /*-------------------------------------------------------------------------*/
  updateText(){
    let gr = Graphics.isReady(), sr = Sound.isReady();
    let sprite = this.load_text;
    let txt = Vocab.LoadText;
    if(gr && !sr){
      txt = Vocab.LoadTextAudio;
    }
    else if(!gr && sr){
      txt = Vocab.LoadTextGraphics;
    }
    else if(gr && sr){
      txt = Vocab.LoadTextComplete;
      this.allLoaded = true;
    }
    if(sprite.text == txt){return ;}
    sprite.text = txt;
    sprite.x = Graphics.appCenterWidth(sprite.width) - Graphics._spacing * 2;
  }
  /*-------------------------------------------------------------------------*/
  updateProgressBar(){
    this.bar.setProgress(Graphics.getLoadingProgress[0] + Sound.getLoadingProgress[0]);
  }
  /*-------------------------------------------------------------------------*/
  processLoadingPhase(){
    debug_log("Init loading phase");
    Graphics.renderSprite(this.loading_sprite);
    Graphics.renderSprite(this.load_text);
    Graphics.renderSprite(this.bar);
    Graphics.preloadAllAssets(this.reportLoaderProgress, null);
  }
  /*-------------------------------------------------------------------------*/
  processLoadingComplete(){
    debug_log("Loading Complete called");
    this.loading_timer = 0xff;
    GameStarted = true;
    Sound.playSaveLoad();
    if(TestMode){
      SceneManager.goto(Scene_Test);
    }
    else if(QuickStart){
      SceneManager.goto(Scene_Title);
    }
    else{
      SceneManager.goto(Scene_Intro);
    }
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > The intro scene that display the splash image
 * @class Scene_Intro
 * @extends Scene_Base
 */
class Scene_Intro extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(...args){
    super(...args)
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createNTOUSplash();
    this.createPIXISplash();
    this.createHowlerSplash();
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = new PIXI.Graphics();
    this.backgroundImage.beginFill(0);
    this.backgroundImage.drawRect(0, 0, Graphics.width, Graphics.height);
    this.backgroundImage.endFill();
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    this.timer        = 0;
    this.fadeDuration = 30;
    this.NTOUmoment   = 150;
    this.ENDmoment    = 500;
    this.drawLibrarySplash();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.timer += 1;
    this.updateSplashStage();
    this.updateSkip();
    if(this.requestFilterUpdate){
      this.ntouSplash.filters[0].time += 1;
    }
  }
  /*-------------------------------------------------------------------------*/
  updateSplashStage(){
    if(this.timer == this.NTOUmoment){
      this.startFadeOut();
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration){
      this.startFadeIn();
      this.processNTOUSplash();
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration + 40){
      Sound.playSE(Sound.Wave);
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration + 60){
      this.startSplashEffect();
    }
    else if(this.timer == this.ENDmoment){
      this.startFadeOut();
      Sound.fadeOutAll();
      SceneManager.goto(Scene_Title);
    }
  }
  /*-------------------------------------------------------------------------*/
  updateSkip(){
    if(!Input.isTriggered(Input.keymap.kMOUSE1)){return ;}
    this.heatupButton(Input.keymap.kMOUSE1);
    if(this.timer < this.NTOUmoment){
      this.timer = this.NTOUmoment - 1;
    }
    else if(this.timer < this.NTOUmoment + this.fadeDuration){
      this.timer = this.NTOUmoment + this.fadeDuration - 1;
    }
    else if(this.timer < this.ENDmoment){
      this.timer = this.ENDmoment - 1;
    }
  }
  /*-------------------------------------------------------------------------*/
  createPIXISplash(){
    this.pixiSplash = Graphics.addSprite(Graphics.pixiSplash);
    this.pixiSplash.setPOS(Graphics.appCenterWidth(this.pixiSplash.width));
  }
  /*-------------------------------------------------------------------------*/
  createHowlerSplash(){
    this.howlerSplash = Graphics.addSprite(Graphics.howlerSplash);
    this.howlerSplash.setPOS(Graphics.appCenterWidth(this.howlerSplash.width));
  }
  /*-------------------------------------------------------------------------*/
  createNTOUSplash(){
    this.ntouSplash = Graphics.addSprite(Graphics.ntouSplash);
    let dx = Graphics.appCenterWidth(this.ntouSplash.width);
    let dy = Graphics.appCenterHeight(this.ntouSplash.height);
    this.ntouSplash.setPOS(dx, dy);
  }
  /*-------------------------------------------------------------------------*/
  drawLibrarySplash(){
    let totalW  = this.pixiSplash.height + this.howlerSplash.height;
    let padding = Graphics.height - totalW;
    this.pixiSplash.setPOS(null, padding / 3);
    this.howlerSplash.setPOS(null, padding);
    Graphics.renderSprite(this.pixiSplash);
    Graphics.renderSprite(this.howlerSplash);
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    super.terminate();
    Graphics.createGlobalWindows();
    Graphics.createGlobalSprites();
  }
  /*-------------------------------------------------------------------------*/
  processNTOUSplash(){
    this.ntouSplash.filters = []
    Graphics.removeSprite(this.pixiSplash, this.howlerSplash);
    Graphics.renderSprite(this.ntouSplash);
  }
  /*-------------------------------------------------------------------------*/
  startSplashEffect(){
    let wave = new PIXI.filters.ShockwaveFilter([0.5, 0.5],{
      speed: 5,
      brightness: 8
    });
    this.ntouSplash.filters = [wave];
    this.requestFilterUpdate = true;
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > The title scene
 * @class Scene_Title
 * @extends Scene_Base
 */
class Scene_Title extends Scene_Base{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Title
   */
  constructor(){
    super()
    this.particles = [];
    this.particleNumber = 16;
  }
  /**-------------------------------------------------------------------------
   * > Start processing
   */
  start(){
    super.start();
    Sound.fadeInBGM(Sound.Title, 500);
    Graphics.addWindow(this.menu);
    this.menu.activate();
    this.particles.forEach(function(sp){sp.render();})
    this.fadeDuration = 60;
    if(!Sound.isStageReady()){Sound.loadStageAudio();}
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createMenu();
    this.createparticles();
    this.createGameModeWindow();
    this.createGameOptionWindow();
    this.createHelpWindow();
    this.createBackButton();
    this.createDimBack();
    this.assignHandlers();
  }
  /*-------------------------------------------------------------------------*/
  assignHandlers(){
    this.gameModeWindow.setHandler(this.gameModeWindow.kTraditional, this.onGameTraditional);
    this.gameModeWindow.setHandler(this.gameModeWindow.kBattlepuno, this.onGameBattlePuno);
    this.gameModeWindow.setHandler(this.gameModeWindow.kDeathMatch, this.onGameDeathMatch);
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateparticles();
  }
  /*-------------------------------------------------------------------------*/
  updateparticles(){
    for(let i=0;i<this.particleNumber;++i){
      let sp = this.particles[i];
      sp.y -= sp.speedFactor;
      if(!(i&1)){sp.rotation += sp.rotationDelta * Graphics.speedFactor;}
      if(sp.opacity < 0.6){sp.setOpacity(sp.opacity + 0.05 * Graphics.speedFactor);}
      if(sp.y < -50){this.setParticlePosition(i);}
    }
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = Graphics.addSprite(Graphics.Title);
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  createMenu(){
    let ww = 200, wh = 200;
    let wx = Graphics.width - ww - Graphics.padding / 2;
    let wy = Graphics.height / 2;
    this.menu = new Window_Menu(wx, wy, ww, wh);
  }
  /*-------------------------------------------------------------------------*/
  createDimBack(){
    this.dimBack = new Sprite(0, 0, Graphics.width, Graphics.height);
    this.dimBack.fillRect(0, 0, Graphics.width, Graphics.height);
    this.dimBack.setOpacity(0.7).setZ(0x0a).hide();
  }
  /*-------------------------------------------------------------------------*/
  createparticles(){
    let p = Graphics.Particle, p2 = Graphics.Particle2;
    for(let i=0;i<this.particleNumber;++i){
      let pn = !(i&1) ? p2: p;
      let sp = Graphics.addSprite(pn);
      sp.setZ(0.1);
      this.particles.push(sp);
      this.setParticlePosition(i, true);
    }
  }
  /*-------------------------------------------------------------------------*/
  setParticlePosition(index, randomDist = false){
    let sp = this.particles[index];
    let ux = (Graphics.width - Graphics.padding) / this.particleNumber;
    let dx = ux * index, dy = Graphics.height - Graphics.padding * 2;
    dx = randInt(dx, dx + ux);
    dy = randInt(randomDist ? Graphics.padding : dy, Graphics.height);
    sp.speedFactor = randInt(10,50) / 10.0
    sp.filters = [new PIXI.filters.AdjustmentFilter({red: 1, green: 1, blue: 1})]
    sp.anchor.set(0.5);
    sp.setPOS(dx, dy).setOpacity(0);
    if(!(index & 1)){
      sp.rotationDelta = randInt(20,100) / 2000.0
    }
  }
  /*-------------------------------------------------------------------------*/
  createGameModeWindow(){
    this.gameModeWindow = new Window_GameModeSelect(0, 0, 300, 400);
    let wx = (Graphics.width - this.gameModeWindow.width) / 5;
    this.gameModeWindow.setPOS(wx, 150).setZ(0x10).hide();
  }
  /*-------------------------------------------------------------------------*/
  createGameOptionWindow(){
    this.gameOptionWindow = new Window_GameOption(0, 0, 520, 400);
    let wx = (Graphics.width - this.gameOptionWindow.width) * 7 / 10;
    this.gameOptionWindow.setPOS(wx,150).setZ(0x10).hide();
  }
  /*-------------------------------------------------------------------------*/
  createHelpWindow(){
    let wx = this.gameModeWindow.x, wy = this.gameModeWindow.y;
    let ww = this.gameOptionWindow.width + this.gameOptionWindow.x - wx;
    let wh = 80;
    wy -= wh;
    this.helpWindow = new Window_Help(wx, wy, ww, wh);
    this.helpWindow.setZ(0x10).hide();
    this.gameModeWindow.helpWindow = this.helpWindow;
    this.gameOptionWindow.helpWindow = this.helpWindow;
  }
  /*-------------------------------------------------------------------------*/
  createBackButton(){
    this.backButton = new Window_Back(0, 0, this.onActionBack.bind(this));
    let wx = Graphics.width - this.backButton.width - Graphics.padding;
    let wy = Graphics.padding;
    this.backButton.setPOS(wx, wy).setZ(0x10).hide();
  }
  /*-------------------------------------------------------------------------*/
  onGameStart(){
    this.helpWindow.show().activate().render();
    this.gameModeWindow.show().activate().render();
    this.gameOptionWindow.show().activate().render();
    this.backButton.show().activate().render();
    this.dimBack.show().render();
  }
  /*-------------------------------------------------------------------------*/
  onActionBack(){
    Sound.playCancel();
    this.helpWindow.hide().deactivate();
    this.gameModeWindow.hide().deactivate();
    this.gameOptionWindow.hide().deactivate();
    this.backButton.hide().deactivate();
    this.dimBack.hide().remove();
  }
  /*-------------------------------------------------------------------------*/
  onGameTraditional(){
    Sound.playOK();
    GameManager.changeGameMode(0);
    SceneManager.goto(Scene_Game);
  }
  /*-------------------------------------------------------------------------*/
  onGameBattlePuno(){
    Sound.playOK();
    GameManager.changeGameMode(1);
    SceneManager.goto(Scene_Game);
  }
  /*-------------------------------------------------------------------------*/
  onGameDeathMatch(){
    Sound.playOK2();
    GameManager.changeGameMode(2);
    SceneManager.goto(Scene_Game);
  }
  /*-------------------------------------------------------------------------*/
}
/**-------------------------------------------------------------------------
 * Test scene
 */
class Scene_Test extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(){
    super();
    GameManager.changeGameMode(1);
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    SceneManager.goto(Scene_Game);
  }
}
/**-------------------------------------------------------------------------
 * The game over scene that display the results
 */
class Scene_GameOver extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(){
    super();
    this.fadeDuration = 60;
  }
  /*-------------------------------------------------------------------------*/
  prepare(g){
    this.game = g;
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = Graphics.addSprite(Graphics.GameOver);
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createScoreBoard();
    this.createLeaveButton();
  }
  /*-------------------------------------------------------------------------*/
  createScoreBoard(){
    this.resultWindow = new Window_Scoreboard();
    this.resultWindow.setOpacity(0.1).setZ(0x10).hide();
    this.drawRank();
  }
  /*-------------------------------------------------------------------------*/
  createLeaveButton(){
    this.backButton = new Window_Back(0, 0, this.onActionBack.bind(this));
    let wx = Graphics.width - this.backButton.width - Graphics.padding;
    let wy = Graphics.padding;
    this.backButton.setPOS(wx, wy).setZ(0x10).deactivate().hide();
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    EventManager.setTimeout(()=>{
      this.showResultWindow();
    }, 20 + this.fadeDuration);
    EventManager.setTimeout(()=>{
      this.showLeaveButton();
    }, 90 + this.fadeDuration);
    this.resultWindow.render();
    this.backButton.render();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    if(this.resultWindow.visible && this.resultWindow.opacity < 1){
      this.resultWindow.setOpacity(this.resultWindow.opacity + 0.015);
    }
  }
  /*-------------------------------------------------------------------------*/
  drawRank(){
    const ar = this.resultWindow.drawRank();
    if(ar[0] == this.game.players[0]){
      this.playVictory();
    }
    else{
      this.playDefeat();
    }
  }
  /*-------------------------------------------------------------------------*/
  playVictory(){
    Sound.playBGM(Sound.getVictoryTheme(this.game.gameMode));
  }
  /*-------------------------------------------------------------------------*/
  playDefeat(){
    Sound.fadeInBGM(Sound.Defeat, 3000);
  }
  /*-------------------------------------------------------------------------*/
  showResultWindow(){
    this.resultWindow.show().setOpacity(0.1);
  }
  /*-------------------------------------------------------------------------*/
  showLeaveButton(){
    this.backButton.activate().show();
  }
  /*-------------------------------------------------------------------------*/
  onActionBack(){
    Sound.playOK();
    SceneManager.goto(Scene_Title);
  }
  /*-------------------------------------------------------------------------*/
}
