<template>
  <transition name="modal">
    <div class="modal-mask">
      <!-- noVNC Control Bar -->
      <div id="noVNC_control_bar_anchor" class="noVNC_vcenter" ref="kvmCtrlBarAnchor">
        <div id="noVNC_control_bar" ref="kvmCtrlBar">
          <div id="noVNC_control_bar_handle" title="Hide/Show the control bar" ref="kvmCtrlBarHandle">
            <div></div>
          </div>

          <div class="noVNC_scroll">
            <!-- Extra manual keys -->
            <div id="noVNC_extra_keys" v-show="kvmConnected">
              <img alt="Extra keys" src='./images/toggleextrakeys.svg' id="noVNC_toggle_extra_keys_button" class="noVNC_button" title="Show Extra Keys"
                ref="kvmExtraKeysBtn" />
              <div class="noVNC_vcenter">
                <div id="noVNC_modifiers" class="noVNC_panel" ref="extraKeysPanel">
                  <img alt="Ctrl" src='./images/ctrl.svg' id="noVNC_toggle_ctrl_button" class="noVNC_button" title="Toggle Ctrl" ref="ctrlBtn"
                  />
                  <img alt="Alt" src='./images/alt.svg' id="noVNC_toggle_alt_button" class="noVNC_button" title="Toggle Alt" ref="altBtn" />
                  <img alt="Tab" src='./images/tab.svg' id="noVNC_send_tab_button" class="noVNC_button" title="Send Tab" ref="tabBtn" />
                  <img alt="Esc" src='./images/esc.svg' id="noVNC_send_esc_button" class="noVNC_button" title="Send Escape" ref="escBtn" />
                  <img alt="Ctrl+Alt+Del" src='./images/ctrlaltdel.svg' id="noVNC_send_ctrl_alt_del_button" class="noVNC_button" title="Send Ctrl-Alt-Del"
                    ref="cadBtn" />
                </div>
              </div>
            </div>

            <!-- Toggle fullscreen -->
            <img alt="Fullscreen" src='./images/fullscreen.svg' id="noVNC_fullscreen_button" class="noVNC_button" title="Fullscreen"
              ref="fullscreenBtn" />
            <!-- Close Controls -->
            <img alt="Close" src='./images/close.svg' id="noVNC_close_button" class="noVNC_button" title="Close" ref="closeBtn" />
          </div>
        </div>
      </div>
      <!-- End of noVNC_control_bar -->

      <!-- Transition Screens -->
      <div id="noVNC_transition" v-show="promptShow" ref="kvmPrompt">
        <div id="noVNC_transition_text" ref="kvmPromptText"></div>
      </div>

      <div id="noVNC_container" v-show="kvmConnected">
        <div id="noVNC_screen" ref="kvmScreen">
          <canvas id="noVNC_canvas" width="0" height="0" ref="kvmCanvas">
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
        controlbarGrabbed: false,
        controlbarDrag: false,
        controlbarMouseDownClientY: 0,
        controlbarMouseDownOffsetY: 0,
        promptShow:false,
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
      kvmPrompt(msg="") {
        if(msg==="") this.promptShow = false;
        else{
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
          this.$refs.fullscreenBtn.classList.remove("noVNC_hidden");
          this.addFullscreenHandlers();
        }
      },
      updateFullscreenButton() {
        if (document.fullscreenElement || // alternative standard method
          document.mozFullScreenElement || // currently working methods
          document.webkitFullscreenElement ||
          document.msFullscreenElement) {
          this.$refs.fullscreenBtn.classList.add("noVNC_selected");
        } else {
          this.$refs.fullscreenBtn.classList.remove("noVNC_selected");
        }
      },
      addFullscreenHandlers() {
        this.$refs.fullscreenBtn.addEventListener('click', this.toggleFullscreen);
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
        ctrlBarAnchor.classList.add("noVNC_idle");
      },
      activateControlbar(event) {
        clearTimeout(this.idleControlbarTimeout);
        let ctrlBarAnchor = this.$refs.kvmCtrlBarAnchor;
        ctrlBarAnchor.classList.remove("noVNC_idle");
        this.idleControlbarTimeout = window.setTimeout(this.idleControlbar, 2000);
      },
      keepControlbar() {
        clearTimeout(this.closeControlbarTimeout);
      },
      openControlbar() {
        this.$refs.kvmCtrlBar.classList.add("noVNC_open");
      },
      closeExtraKeys() {
        this.$refs.extraKeysPanel.classList.remove("noVNC_open");
        this.$refs.kvmExtraKeysBtn.classList.remove("noVNC_selected");
      },
      closeControlbar() {
        this.closeExtraKeys();
        let ctrlBar = this.$refs.kvmCtrlBar;
        ctrlBar.classList.remove("noVNC_open");
      },
      toggleControlbar() {
        let ctrlBar = this.$refs.kvmCtrlBar;
        if (ctrlBar.classList.contains("noVNC_open")) {
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

        var handle = this.$refs.kvmCtrlBarHandle;//document.getElementById("noVNC_control_bar_handle");
        var bounds = handle.getBoundingClientRect();

        Util.setCapture(handle);
        this.controlbarGrabbed = true;
        this.controlbarDrag = false;

        this.controlbarMouseDownClientY = ptr.clientY;
        this.controlbarMouseDownOffsetY = ptr.clientY - bounds.top;
        e.preventDefault();
        e.stopPropagation();
        this.keepControlbar();
        this.activateControlbar();
      },
      // Move the handle but don't allow any position outside the bounds
      moveControlbarHandle(viewportRelativeY) {
        var handle = this.$refs.kvmCtrlBarHandle; //document.getElementById("noVNC_control_bar_handle");
        var handleHeight = handle.getBoundingClientRect().height;
        var controlbarBounds = this.$refs.kvmCtrlBar.getBoundingClientRect();; //document.getElementById("noVNC_control_bar")

        var margin = 10;

        // These heights need to be non-zero for the below logic to work
        if (handleHeight === 0 || controlbarBounds.height === 0) {
          return;
        }

        var newY = viewportRelativeY;

        // Check if the coordinates are outside the control bar
        if (newY < controlbarBounds.top + margin) {
          // Force coordinates to be below the top of the control bar
          newY = controlbarBounds.top + margin;

        } else if (newY > controlbarBounds.top +
          controlbarBounds.height - handleHeight - margin) {
          // Force coordinates to be above the bottom of the control bar
          newY = controlbarBounds.top +
            controlbarBounds.height - handleHeight - margin;
        }

        // Corner case: control bar too small for stable position
        if (controlbarBounds.height < (handleHeight + margin * 2)) {
          newY = controlbarBounds.top +
            (controlbarBounds.height - handleHeight) / 2;
        }

        // The transform needs coordinates that are relative to the parent
        var parentRelativeY = newY - controlbarBounds.top;
        handle.style.transform = "translateY(" + parentRelativeY + "px)";
      },
      updateControlbarHandle() {
        var handle = this.$refs.kvmCtrlBarHandle;//document.getElementById("noVNC_control_bar_handle");
        var handleBounds = handle.getBoundingClientRect();
        this.moveControlbarHandle(handleBounds.top);
      },
      addControlbarhandlers() {
        let ctrlBar = this.$refs.kvmCtrlBar;
        ctrlBar.addEventListener('mousemove', this.activateControlbar);
        ctrlBar.addEventListener('mouseup', this.activateControlbar);
        ctrlBar.addEventListener('mousedown', this.activateControlbar);
        ctrlBar.addEventListener('keypress', this.activateControlbar);

        ctrlBar.addEventListener('mousedown', this.keepControlbar);
        ctrlBar.addEventListener('keypress', this.keepControlbar);

        let ctrlBarHandle = this.$refs.kvmCtrlBarHandle;
        ctrlBarHandle.addEventListener('mousedown', this.controlbarHandleMouseDown);
        ctrlBarHandle.addEventListener('mouseup', this.controlbarHandleMouseUp);

        window.addEventListener('resize', this.updateControlbarHandle);
      },
      openExtraKeys() {
        this.closeExtraKeys();
        this.openControlbar();
        this.$refs.extraKeysPanel.classList.add("noVNC_open");
        this.$refs.kvmExtraKeysBtn.classList.add("noVNC_selected");
      },
      toggleExtraKeys() {
        if (this.$refs.extraKeysPanel.classList.contains("noVNC_open")) {
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
        if (btn.classList.contains("noVNC_selected")) {
          this.rfb.sendKey(KeyTable.XK_Control_L, false);
          btn.classList.remove("noVNC_selected");
        } else {
          this.rfb.sendKey(KeyTable.XK_Control_L, true);
          btn.classList.add("noVNC_selected");
        }
      },
      toggleAlt() {
        var btn = this.$refs.altBtn;
        if (btn.classList.contains("noVNC_selected")) {
          this.rfb.sendKey(KeyTable.XK_Alt_L, false);
          btn.classList.remove("noVNC_selected");
        } else {
          this.rfb.sendKey(KeyTable.XK_Alt_L, true);
          btn.classList.add("noVNC_selected");
        }
      },
      sendCtrlAltDel() {
        this.rfb.sendCtrlAltDel();
      },
      addExtraKeysHandlers() {
        this.$refs.kvmExtraKeysBtn.addEventListener('click', this.toggleExtraKeys);
        this.$refs.ctrlBtn.addEventListener('click', this.toggleCtrl);
        this.$refs.altBtn.addEventListener('click', this.toggleAlt);
        this.$refs.tabBtn.addEventListener('click', this.sendTab);
        this.$refs.escBtn.addEventListener('click', this.sendEsc);
        this.$refs.cadBtn.addEventListener('click', this.sendCtrlAltDel);
      },
      addConnectionControlHandlers() {
        this.$refs.closeBtn.addEventListener('click', this.close);
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
      close() {
        if (this.kvmConnected) {
          this.disconnect();
        } else {
          this.$emit("kvmClose");
        }
      }
    },
    mounted: function () {
      this.initFullscreen();
      this.addResizeHandlers();
      this.openControlbar();
      this.addControlbarhandlers();
      this.addExtraKeysHandlers();
      this.addConnectionControlHandlers();
      let msg = "KVM Server startup...";
      this.kvmPrompt(msg);
    },
    watch: {
      pwd: function (val, oldVal) {
        if (this.kvmConnectTimeout) clearTimeout(this.kvmConnectTimeout);
        this.kvmConnectTimeout = setTimeout(this.connect, 5000);
      }
    }
  }

</script>

<style lang="scss" scoped>
  @import "../../style/colors.scss";
  @import "../../style/mixin.scss";
  @import "../../../node_modules/font-awesome/css/font-awesome.css";
  @mixin SplitLineBefore() {
    &:before {
      display: block;
      content: "";
      background-color: $bg-primary;
      width: 100%;
      height: .1em;
      margin: 0 auto .4em;
    }
  }
  
  @mixin SplitLineAfter() {
    &:after {
      display: block;
      content: "";
      background-color: $bg-primary;
      width: 100%;
      height: .1em;
      margin: .4em auto 0;
    }
  }
  
  .modal-mask {
    position: fixed;
    //z-index: 2000;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .5);
    transition: opacity .3s ease;
    .noVNC_center {
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
    .noVNC_center > * {
      pointer-events: auto;
    }
    .noVNC_vcenter {
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      height: 100%;
      pointer-events: none;
    }
    .noVNC_vcenter > * {
      pointer-events: auto;
    }
    /* ----------------------------------------
    * Control Bar
    * ----------------------------------------
    */
    #noVNC_control_bar_anchor {
      /* The anchor is needed to get z-stacking to work */
      position: fixed;
      z-index: 10;
      transition: 0.5s ease-in-out;
      /* Edge misrenders animations wihthout this */
      transform: translateX(0);
    }
    //:root.noVNC_connected #noVNC_control_bar_anchor.noVNC_idle {
    #noVNC_control_bar_anchor.noVNC_idle {
      opacity: 0.8;
    }
    #noVNC_control_bar_anchor.noVNC_right {
      left: auto;
      right: 0;
    }
    #noVNC_control_bar {
      position: relative;
      left: -100%;
      transition: 0.5s ease-in-out;
      background-color: rgb(110, 132, 163);
      border-radius: 0 10px 10px 0;
    }
    #noVNC_control_bar.noVNC_open {
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5);
      left: 0;
    }
    #noVNC_control_bar::before {
      /* This extra element is to get a proper shadow */
      content: "";
      position: absolute;
      z-index: -1;
      height: 100%;
      width: 30px;
      left: -30px;
      transition: box-shadow 0.5s ease-in-out;
    }
    #noVNC_control_bar.noVNC_open::before {
      box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.5);
    }
    .noVNC_right #noVNC_control_bar {
      left: 100%;
      border-radius: 10px 0 0 10px;
    }
    .noVNC_right #noVNC_control_bar.noVNC_open {
      left: 0;
    }
    .noVNC_right #noVNC_control_bar::before {
      visibility: hidden;
    }
    #noVNC_control_bar_handle {
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
    #noVNC_control_bar_handle:after {
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
    #noVNC_control_bar.noVNC_open #noVNC_control_bar_handle:after {
      transform: translateX(1px) rotate(180deg);
    }
    //:root:not(.noVNC_connected) #noVNC_control_bar_handle {
    /*#noVNC_control_bar_handle {
      display: none;
    }*/
    .noVNC_right #noVNC_control_bar_handle {
      background-position: left;
    }
    .noVNC_right #noVNC_control_bar_handle:after {
      left: 5px;
      right: 0;
      transform: translateX(1px) rotate(180deg);
    }
    .noVNC_right #noVNC_control_bar.noVNC_open #noVNC_control_bar_handle:after {
      transform: none;
    }
    #noVNC_control_bar_handle div {
      position: absolute;
      right: -35px;
      top: 0;
      width: 50px;
      height: 50px;
    }
    //:root:not(.noVNC_touch) #noVNC_control_bar_handle div {
    /*#noVNC_control_bar_handle div {
      display: none;
    }*/
    .noVNC_right #noVNC_control_bar_handle div {
      left: -35px;
      right: auto;
    }
    #noVNC_control_bar .noVNC_scroll {
      max-height: 100vh;
      /* Chrome is buggy with 100% */
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0 10px 0 5px;
    }
    .noVNC_right #noVNC_control_bar .noVNC_scroll {
      padding: 0 5px 0 10px;
    }
    /* General button style */
    .noVNC_button {
      display: block;
      padding: 4px 4px;
      margin: 10px 0;
      cursor: pointer;
      vertical-align: middle;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
    }
    .noVNC_button.noVNC_selected {
      border-color: rgba(0, 0, 0, 0.8);
      background: rgba(0, 0, 0, 0.5);
    }
    .noVNC_button:disabled {
      opacity: 0.4;
    }
    .noVNC_button:focus {
      outline: none;
    }
    .noVNC_button:active {
      padding-top: 5px;
      padding-bottom: 3px;
    }
    //:root:not(.noVNC_touch) .noVNC_button.noVNC_selected:hover {
    .noVNC_button.noVNC_selected:hover {
      border-color: rgba(0, 0, 0, 0.4);
      background: rgba(0, 0, 0, 0.2);
    }
    //:root:not(.noVNC_touch) .noVNC_button:hover {
    .noVNC_button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .noVNC_button.noVNC_hidden {
      display: none;
    }
    /* Panels */
    .noVNC_panel {
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
    .noVNC_panel.noVNC_open {
      visibility: visible;
      opacity: 1;
      transform: translateX(75px);
    }
    .noVNC_right .noVNC_vcenter {
      left: auto;
      right: 0;
    }
    .noVNC_right .noVNC_panel {
      transform: translateX(-25px);
    }
    .noVNC_right .noVNC_panel.noVNC_open {
      transform: translateX(-75px);
    }
    .noVNC_panel hr {
      border: none;
      border-top: 1px solid rgb(192, 192, 192);
    }
    .noVNC_panel label {
      display: block;
      white-space: nowrap;
    }
    .noVNC_panel .noVNC_heading {
      background-color: rgb(110, 132, 163);
      border-radius: 5px;
      padding: 5px;
      /* Compensate for padding in image */
      padding-right: 8px;
      color: white;
      font-size: 20px;
      margin-bottom: 10px;
      white-space: nowrap;
    }
    .noVNC_panel .noVNC_heading img {
      vertical-align: bottom;
    }
    .noVNC_submit {
      float: right;
    }
    /* Control bar content */
    #noVNC_control_bar .noVNC_logo {
      font-size: 13px;
    }
    /*:root:not(.noVNC_connected) #noVNC_view_drag_button {
      display: none;
    }*/
    /* Extra manual keys */
    //:root:not(.noVNC_connected) #noVNC_extra_keys {
    /*#noVNC_extra_keys {
      display: none;
    }*/
    #noVNC_modifiers {
      background-color: rgb(92, 92, 92);
      border: none;
      padding: 0 10px;
    }

    /* Transition screen */
    #noVNC_transition {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      color: white;
      background: rgba(0, 0, 0, 0.5);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    #noVNC_transition_text {
      font-size: 1.5em;
    }

    /* Main container */
    #noVNC_container {
      width: 100%;
      height: 100%;
      background-color: #313131;
      border-bottom-right-radius: 800px 600px;
    }
    /* HTML5 Canvas */
    #noVNC_screen {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgb(40, 40, 40);
    }
    //:root:not(.noVNC_connected) #noVNC_screen {
    /*#noVNC_screen {
      display: none;
    }*/
    #noVNC_canvas {
      margin: auto;
      /* IE miscalculates width without this :( */
      flex-shrink: 0;
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