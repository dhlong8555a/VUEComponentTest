<template>
  <transition name="modal">
    <div class="modal-mask" ref="kvmFloor">
      <!-- kvm Control Bar -->
      <div id="kvm_control_bar_anchor" class="kvm_vcenter" ref="kvmCtrlBarAnchor">
        <div id="kvm_control_bar" ref="kvmCtrlBar">
          <div id="kvm_control_bar_handle" title="Hide/Show the control bar" ref="kvmCtrlBarHandle">
            <div></div>
          </div>

          <div class="kvm_scroll">
            <!-- Extra manual keys -->
            <div id="kvm_extra_keys" v-show="kvmConnected">
              <img alt="Extra keys" src='./images/toggleextrakeys.svg' id="kvm_toggle_extra_keys_button" class="kvm_button" title="Show Extra Keys"
                @click="toggleExtraKeys" ref="kvmExtraKeysBtn" />
              <div class="kvm_vcenter">
                <div id="kvm_modifiers" class="kvm_extra_panel" ref="extraKeysPanel">
                  <img alt="Ctrl" src='./images/ctrl.svg' id="kvm_toggle_ctrl_button" class="kvm_button" title="Toggle Ctrl" @click="toggleCtrl" ref="ctrlBtn"
                  />
                  <img alt="Alt" src='./images/alt.svg' id="kvm_toggle_alt_button" class="kvm_button" title="Toggle Alt" @click="toggleAlt" ref="altBtn" />
                  <img alt="Tab" src='./images/tab.svg' id="kvm_send_tab_button" class="kvm_button" title="Send Tab" @click="sendTab"/>
                  <img alt="Esc" src='./images/esc.svg' id="kvm_send_esc_button" class="kvm_button" title="Send Escape" @click="sendEsc" />
                  <img alt="Ctrl+Alt+Del" src='./images/ctrlaltdel.svg' id="kvm_send_ctrl_alt_del_button" class="kvm_button" title="Send Ctrl-Alt-Del"
                    @click="sendCtrlAltDel"/>
                </div>
              </div>
            </div>

            <!-- Toggle fullscreen -->
            <img alt="Fullscreen" src='./images/fullscreen.svg' id="kvm_fullscreen_button" class="kvm_button" title="Fullscreen" v-show="fullscreenShow"
              @click="toggleFullscreen" ref="fullscreenBtn" />
            <!-- Close Controls -->
            <img alt="Close" src='./images/close.svg' id="kvm_close_button" class="kvm_button" title="Close" @click="close"/>
          </div>
        </div>
      </div>
      <!-- End of kvm_control_bar -->

      <div id="kvm_title" ref="kvmTitle">{{title}}</div>

      <!-- Transition Screens -->
      <div id="kvm_transition" v-show="promptShow" ref="kvmPrompt">
        <div id="kvm_transition_text" ref="kvmPromptText"></div>
      </div>

      <div id="kvm_container" v-show="kvmConnected">
        <div id="kvm_screen" ref="kvmScreen">
          <canvas id="kvm_canvas" width="0" height="0" ref="kvmCanvas">
            Canvas not supported.
          </canvas>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
  import RFB from './core/rfb.js';
  import Util from './core/util';
  import KeyTable from "./core/input/keysym";

  export default {
    name: 'kvm',
    data() {
      return {
        desktopName: "",
        items: ['Win+D', "Win+L", "Alt+Tab", "Ctrl+Alt+Del"],
        rfb: null,
        kvmConnectTimeout: null,
        kvmConnected: false,
        idleControlbarTimeout: null,
        closeControlbarTimeout: null,
        titleHoverTimeout:null,
        controlbarGrabbed: false,
        controlbarDrag: false,
        promptShow: false,
        fullscreenShow: false,
        tilteShowed:false,
      }
    },
    props: {
      titleSuffix: {
        type: String,
        required: false
      },
      host: {
        type: String,
        required: true,
      },
      port: {
        type: Number,
        required: true,
      },
      pwd: {
        type: String,
        required: true,
      },
      repeatID: {
        type: String,
        required: false,
      }
    },
    computed: {
      title() {
        let title = "KVM";
        if (this.titleSuffix) title = title + '-' + this.titleSuffix;
        return title;
      },
      isSafari() {
        return (navigator.userAgent.indexOf('Safari') !== -1 &&
          navigator.userAgent.indexOf('Chrome') === -1);
      },
    },
    methods: {
      kvmNotification(rfb, msg, level, options) {
        console.log("Notification:" + msg + level);
      },
      KVMUpdateState(rfb, state, oldstate) {
        switch (state) {
          case 'connecting':
            this.kvmPrompt("Connecting");
            console.log("Connecting");
            break;
          case 'connected':
            this.kvmPrompt();
            if (rfb && rfb.get_encrypt()) {
              console.log("Connected (encrypted) to " + this.desktopName);
            } else {
              console.log("Connected (unencrypted) to " + this.desktopName);
            }
            this.kvmConnected = true;
            break;
          case 'disconnecting':
            console.log("Disconnecting");
            this.kvmPrompt("Disconnecting");
            break;
          case 'disconnected':
            console.log("Disconnected");
            this.kvmPrompt();
            this.kvmConnected = false;
            this.$emit("kvmClose");
            break;
          default:
            console.log(state);
            break;
        }
        this.delayCloseControlBar();
      },
      kvmDisconnected(rfb, reason) {
        this.kvmConnected = false;
        let msg = "Disconnected";
        if (typeof (reason) !== 'undefined') {
          msg = msg + ":" + reason;
          console.log("Disconnected:" + reason);
        }
        this.kvmPrompt();
        this.$emit("kvmClose");
      },
      kvmFBResize(rfb, width, height) {
        this.fixScrollbars();
        console.log("FBResize:" + width + height);
      },
      KVMUpdateDesktopName(rfb, name) {
        this.desktopName = name;
      },
      kvmPrompt(msg = "") {
        if (msg === "") this.promptShow = false;
        else {
          this.$refs.kvmPromptText.textContent = msg;
          this.promptShow = true;
        }
      },
      initFullscreen() {
        if (!this.isSafari &&
          (document.documentElement.requestFullscreen ||
            document.documentElement.mozRequestFullScreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.body.msRequestFullscreen)) {
          this.fullscreenShow = true;
          this.addFullscreenHandlers();
        }
      },
      updateFullscreenButton() {
        if (document.fullscreenElement || // alternative standard method
          document.mozFullScreenElement || // currently working methods
          document.webkitFullscreenElement ||
          document.msFullscreenElement) {
          this.$refs.fullscreenBtn.classList.add("kvm_selected");
        } else {
          this.$refs.fullscreenBtn.classList.remove("kvm_selected");
        }
      },
      addFullscreenHandlers() {
        window.addEventListener('fullscreenchange', this.updateFullscreenButton);
        window.addEventListener('mozfullscreenchange', this.updateFullscreenButton);
        window.addEventListener('webkitfullscreenchange', this.updateFullscreenButton);
        window.addEventListener('msfullscreenchange', this.updateFullscreenButton);
      },
      fixScrollbars() {
        // This is a hack because Chrome screws up the calculation
        // for when scrollbars are needed. So to fix it we temporarily
        // toggle them off and on.
        var screen = this.$refs.kvmScreen;
        screen.style.overflow = 'hidden';
        // Force Chrome to recalculate the layout by asking for
        // an element's dimensions
        screen.getBoundingClientRect();
        screen.style.overflow = null;
      },
      screenSize() {
        let screen = this.$refs.kvmScreen;
        return { w: screen.offsetWidth, h: screen.offsetHeight };
      },
      applyResizeMode() {
        if (!this.rfb) return;
        let screen = this.screenSize();
        let display = this.rfb.get_display();
        if (screen && this.kvmConnected && display) {
          display.set_scale(1);
          display.autoscale(screen.w, screen.h, false);
          this.fixScrollbars();
        }
      },
      addResizeHandlers() {
        window.addEventListener('resize', this.applyResizeMode);
      },
      idleControlbar() {
        let ctrlBarAnchor = this.$refs.kvmCtrlBarAnchor;
        ctrlBarAnchor.classList.add("kvm_idle");
      },
      activateControlbar(event) {
        clearTimeout(this.idleControlbarTimeout);
        let ctrlBarAnchor = this.$refs.kvmCtrlBarAnchor;
        ctrlBarAnchor.classList.remove("kvm_idle");
        this.idleControlbarTimeout = window.setTimeout(this.idleControlbar, 2000);
      },
      keepControlbar() {
        clearTimeout(this.closeControlbarTimeout);
      },
      openControlbar() {
        this.$refs.kvmCtrlBar.classList.add("kvm_open");
      },
      closeExtraKeys() {
        this.$refs.extraKeysPanel.classList.remove("kvm_open");
        this.$refs.kvmExtraKeysBtn.classList.remove("kvm_selected");
      },
      delayCloseControlBar(){
        this.closeControlbarTimeout = setTimeout(this.closeControlbar, 2000);
      },
      closeControlbar() {
        this.closeExtraKeys();
        let ctrlBar = this.$refs.kvmCtrlBar;
        ctrlBar.classList.remove("kvm_open");
      },
      toggleControlbar() {
        let ctrlBar = this.$refs.kvmCtrlBar;
        if (ctrlBar.classList.contains("kvm_open")) {
          this.closeControlbar();
        } else {
          this.openControlbar();
        }
      },
      controlbarHandleMouseUp(e) {
        if ((e.type == "mouseup") && (e.button != 0)) return;

        if (this.controlbarGrabbed && !this.controlbarDrag) {
          this.toggleControlbar();
          e.preventDefault();
          e.stopPropagation();
          this.keepControlbar();
          this.activateControlbar();
        }
        this.controlbarGrabbed = false;
      },
      controlbarHandleMouseDown(e) {
        if ((e.type == "mousedown") && (e.button != 0)) return;

        var ptr = Util.getPointerEvent(e);

        var handle = this.$refs.kvmCtrlBarHandle;
        var bounds = handle.getBoundingClientRect();

        Util.setCapture(handle);
        this.controlbarGrabbed = true;
        this.controlbarDrag = false;

        e.preventDefault();
        e.stopPropagation();
        this.keepControlbar();
        this.activateControlbar();
      },
      
      addControlbarhandlers() {
        let ctrlBar = this.$refs.kvmCtrlBar;
        ctrlBar.addEventListener('mousemove', this.activateControlbar);
        ctrlBar.addEventListener('mouseup', this.activateControlbar);
        ctrlBar.addEventListener('mousedown', this.activateControlbar);
        ctrlBar.addEventListener('mousedown', this.keepControlbar);

        let ctrlBarHandle = this.$refs.kvmCtrlBarHandle;
        ctrlBarHandle.addEventListener('mousedown', this.controlbarHandleMouseDown);
        ctrlBarHandle.addEventListener('mouseup', this.controlbarHandleMouseUp);
      },
      openExtraKeys() {
        this.closeExtraKeys();
        this.openControlbar();
        this.$refs.extraKeysPanel.classList.add("kvm_open");
        this.$refs.kvmExtraKeysBtn.classList.add("kvm_selected");
      },
      toggleExtraKeys() {
        if (this.$refs.extraKeysPanel.classList.contains("kvm_open")) {
          this.closeExtraKeys();
        } else {
          this.openExtraKeys();
        }
      },

      sendEsc() {
        this.rfb.sendKey(KeyTable.XK_Escape);
      },
      sendTab() {
        this.rfb.sendKey(KeyTable.XK_Tab);
      },
      toggleCtrl() {
        var btn = this.$refs.ctrlBtn;
        if (btn.classList.contains("kvm_selected")) {
          this.rfb.sendKey(KeyTable.XK_Control_L, false);
          btn.classList.remove("kvm_selected");
        } else {
          this.rfb.sendKey(KeyTable.XK_Control_L, true);
          btn.classList.add("kvm_selected");
        }
      },
      toggleAlt() {
        var btn = this.$refs.altBtn;
        if (btn.classList.contains("kvm_selected")) {
          this.rfb.sendKey(KeyTable.XK_Alt_L, false);
          btn.classList.remove("kvm_selected");
        } else {
          this.rfb.sendKey(KeyTable.XK_Alt_L, true);
          btn.classList.add("kvm_selected");
        }
      },
      sendCtrlAltDel() {
        this.rfb.sendCtrlAltDel();
      },
      toggleFullscreen() {
        if (document.fullscreenElement ||
          document.mozFullScreenElement ||
          document.webkitFullscreenElement ||
          document.msFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        } else {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
          } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
          }
        }
        this.updateFullscreenButton();
      },
      initialResize(rfb, fbu) {
        this.applyResizeMode();
        // After doing this once, we remove the callback.
        this.rfb.set_onFBUComplete(function () { });
      },
      disconnect() {
        this.closeExtraKeys();
        this.rfb.disconnect();
        // Restore the callback used for initial resize
        this.rfb.set_onFBUComplete(this.initialResize);
      },
      connect() {
        try {
          this.rfb = new RFB({
            'target': this.$refs.kvmCanvas,
            'encrypt': false,
            'repeaterID': '',
            'true_color': true,
            'local_cursor': true,
            'shared': true,
            'view_only': false,
            'onNotification': this.kvmNotification,
            'onUpdateState': this.KVMUpdateState,
            'onDisconnected': this.kvmDisconnected,
            'onFBUComplete': this.initialResize,
            'onFBResize': this.kvmFBResize,
            'onDesktopName': this.KVMUpdateDesktopName
          });
        } catch (error) {
          this.rfb = null;
          console.log('Unable to create RFB client -- ' + error);
          //UI.showStatus(msg, 'error');
          return;
        }
        this.closeExtraKeys();
        if (this.repeatID) this.rfb.set_repeaterID(this.repeatID);
        this.rfb.connect(this.host, this.port, this.pwd, "websockify");
      },
      clearTimeouts(){
        clearTimeout(this.kvmConnectTimeout);
        clearTimeout(this.idleControlbarTimeout);
        clearTimeout(this.closeControlbarTimeout);
      },
      close() {
        this.clearTimeouts();
        this.closeControlbar();
        if (this.kvmConnected) {
          this.disconnect();
        } else {
          this.$emit("kvmClose");
        }
      },
      titleHover(e){
        //let x = e.clientX;
        let y = e.clientY;
        //console.log("position:"+e.clientX+";"+e.clientY);
        let kvmTitle = this.$refs.kvmTitle;
        if(kvmTitle){
          if(y<=30 && !this.titleShowed){
            kvmTitle.classList.add('kvm_open');
            this.titleShowed = true;
          } else if(y>30 && this.titleShowed){
            clearTimeout(this.titleHoverTimeout);
            this.titleHoverTimeout = setTimeout(()=>{
              kvmTitle.classList.remove('kvm_open');
              this.titleShowed = false;
            },3000);
          }
        }
      },
      addTitleHandlers(){
        let kvmFloor = this.$refs.kvmFloor;
        if(kvmFloor){
          kvmFloor.addEventListener('mousemove', this.titleHover);
        }
      }
    },
    mounted: function () {
      this.initFullscreen();
      this.addResizeHandlers();
      this.addTitleHandlers();
      this.openControlbar();
      this.delayCloseControlBar();
      this.addControlbarhandlers();
      let msg = "KVM Server startup...";
      this.kvmPrompt(msg);
    },
    watch: {
      pwd: function (val, oldVal) {
        clearTimeout(this.kvmConnectTimeout);
        this.kvmConnectTimeout = setTimeout(this.connect, 5000);
      }
    }
  }

</script>

<style lang="scss" scoped>
  /*
  * Z index layers
  * 0: Mask
  * 10: Screen
  * 20: Transition
  * 30: Control bar
  */
  .modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .5);
    transition: opacity .3s ease;
    .kvm_center {
    /*
    * This is a workaround because webkit misrenders transforms and
    * uses non-integer coordinates, resulting in blurry content.
    * Ideally we'd use "top: 50%; transform: translateY(-50%);" on
    * the objects instead.
    */
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .kvm_center > * {
      pointer-events: auto;
    }
    .kvm_vcenter {
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      pointer-events: none;
    }
    .kvm_vcenter > * {
      pointer-events: auto;
    }
    /* ----------------------------------------
    * Control Bar
    * ----------------------------------------
    */
    #kvm_control_bar_anchor {
      /* The anchor is needed to get z-stacking to work */
      position: fixed;
      z-index: 30;
      transition: 0.5s ease-in-out;
      /* Edge misrenders animations wihthout this */
      transform: translateX(0);
    }
    #kvm_control_bar_anchor.kvm_idle {
      opacity: 0.8;
    }
    #kvm_control_bar {
      position: relative;
      left: -100%;
      transition: 0.5s ease-in-out;
      background-color: rgb(110, 132, 163);
      border-radius: 0 10px 10px 0;
    }
    #kvm_control_bar.kvm_open {
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5);
      left: 0;
    }
    #kvm_control_bar::before {
      /* This extra element is to get a proper shadow */
      content: "";
      position: absolute;
      z-index: -1;
      height: 100%;
      width: 30px;
      left: -30px;
      transition: box-shadow 0.5s ease-in-out;
    }
    #kvm_control_bar.kvm_open::before {
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5);
    }
    #kvm_control_bar_handle {
      position: absolute;
      left: -15px;
      top: 0;
      transform: translateY(35px);
      width: calc(100% + 30px);
      height: 50px;
      z-index: -1;
      cursor: pointer;
      border-radius: 5px;
      background-color: rgb(83, 99, 122);
      background-image: url("./images/handle_bg.svg");
      background-repeat: no-repeat;
      background-position: right;
      box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.5);
    }
    #kvm_control_bar_handle:after {
      content: "";
      transition: transform 0.5s ease-in-out;
      background: url("./images/handle.svg");
      position: absolute;
      top: 22px;
      /* (50px-6px)/2 */
      right: 5px;
      width: 5px;
      height: 6px;
    }
    #kvm_control_bar.kvm_open #kvm_control_bar_handle:after {
      transform: translateX(1px) rotate(180deg);
    }
    #kvm_control_bar_handle div {
      position: absolute;
      right: -35px;
      top: 0;
      width: 50px;
      height: 50px;
    }
    #kvm_control_bar .kvm_scroll {
      max-height: 100vh;
      /* Chrome is buggy with 100% */
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0 10px 0 5px;
    }
    /* General button style */
    .kvm_button {
      display: block;
      padding: 4px 4px;
      margin: 10px 0;
      cursor: pointer;
      vertical-align: middle;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
    }
    .kvm_button.kvm_selected {
      border-color: rgba(0, 0, 0, 0.8);
      background: rgba(0, 0, 0, 0.5);
    }
    .kvm_button:disabled {
      opacity: 0.4;
    }
    .kvm_button:focus {
      outline: none;
    }
    .kvm_button:active {
      padding-top: 5px;
      padding-bottom: 3px;
    }
    .kvm_button.kvm_selected:hover {
      border-color: rgba(0, 0, 0, 0.4);
      background: rgba(0, 0, 0, 0.2);
    }
    .kvm_button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    /* Panels */
    #kvm_modifiers {
      background-color: rgb(92, 92, 92);
      border: none;
      padding: 0 10px;
    }
    .kvm_extra_panel {
      transform: translateX(25px);
      transition: 0.5s ease-in-out;
      max-height: 100vh;
      /* Chrome is buggy with 100% */
      overflow-x: hidden;
      overflow-y: auto;
      visibility: hidden;
      opacity: 0;
      padding: 15px;
      background: #fff;
      border-radius: 10px;
      color: #000;
      border: 2px solid #E0E0E0;
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5);
    }
    .kvm_extra_panel.kvm_open {
      visibility: visible;
      opacity: 1;
      transform: translateX(75px);
    }
    /*Title*/
    #kvm_title{
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 100;
      transform: translateY(-100%);

      cursor: pointer;

      transition: 0.5s ease-in-out;

      visibility: hidden;
      opacity: 0;

      padding: 5px;

      display: flex;
      flex-direction: row;
      justify-content: center;
      align-content: center;

      line-height: 25px;
      word-wrap: break-word;
      color: #fff;

      border-bottom: 1px solid rgba(0, 0, 0, 0.9);
    }
    #kvm_title.kvm_open {
      transform: translateY(0);
      visibility: visible;
      opacity: 1;
    }

    #kvm_title::before {
      content: "";
      display: inline-block;
      width: 25px;
      height: 25px;
      margin-right: 5px;
    }
    /* Transition screen*/
    #kvm_transition {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      color: white;
      background: rgba(0, 0, 0, 0.5);
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      #kvm_transition_text {
        font-size: 1.5em;
      }
    }
    /* Main container */
    #kvm_container {
      width: 100%;
      height: 100%;
      z-index: 10;
      background-color: #313131;
      border-bottom-right-radius: 800px 600px;
      /* HTML5 Canvas */
      #kvm_screen {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgb(40, 40, 40);
        #kvm_canvas {
          margin: auto;
          /* IE miscalculates width without this :( */
          flex-shrink: 0;
        }
      }
    }
  }
  
  .modal-enter {
    opacity: 0;
  }
  
  .modal-leave-to {
    opacity: 0;
  }
  
  .modal-enter .modal-container,
  .modal-leave-to .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }
</style>