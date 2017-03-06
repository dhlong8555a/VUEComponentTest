<template>
  <transition name="modal">
    <div class="modal-mask">

      <div class="kvm-header">
        <h3 id="kvm-title">{{title}}</h3>
      </div>

      <div class="kvm-body" ref="bodyDiv">

        <div id="kvm-canvas-container" ref="canvasDiv">
          <canvas id="kvm-canvas" ref="kvmCanvas"></canvas>
        </div>

        <div id="kvm-control">
          <el-dropdown id="kvm-ctrl-hotkey" v-if="kvmConnected" @command="handleCommand">
            <el-button type="primary">
              HotKey<i class="el-icon-caret-bottom el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item divided v-for="item in items" :command="item">{{item}}</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <el-tooltip v-if="kvmConnected" id="kvm-ctrl-fullscreen-tt" class="item" effect="dark" :content="scaleTt" placement="top">
            <el-button id="kvm-ctrl-fullscreen" type="primary" v-if="scaleBtnShow" @click="kvmScale">
              <i class="fa fa-expand" ref="fullScreenI" aria-hidden="true"></i>
            </el-button>
          </el-tooltip>
          <el-button id="kvm-ctrl-close" type="primary" @click="kvmClose">close</button>
        </div>

      </div>
  </transition>
</template>

<script>
  import RFB from './core/rfb.js'

  export default {
    name: 'kvm',
    data() {
      return {
        desktopName: "",
        items: ['Win+D', "Win+L", "Alt+Tab", "Ctrl+Alt+Del"],
        rbf: null,
        kvmConnectTimeout: null,
        kvmConnected: false,
        scaleTt: 'Expend',
        cvsCtWidth: 0,
        cvsCtHeight: 0,
        scaleBtnShow: false,
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
      }
    },
    methods: {
      handleCommand(command) {
        console.log('click on item ' + command);
        if (this.rfb) {
          switch (command) {
            case 'Ctrl+Alt+Del': {
              this.rfb.sendCtrlAltDel();
              break;
            }
            case 'Win+D': {
              this.rfb.sendWinD();
              break;
            }
            case 'Win+L': {
              this.rfb.sendWinL();
              break;
            }
            case 'Alt+Tab': {
              this.rfb.sendAltTab();
              break;
            }
          }
        }
      },
      KVMNotification(rfb, msg, level, options) {
        console.log("Notification:" + msg + level);
      },
      KVMUpdateState(rfb, state, oldstate) {
        switch (state) {
          case 'connecting':
            this.KVMPrompt("Connecting");
            console.log("Connecting");
            break;
          case 'connected':
            if (rfb && rfb.get_encrypt()) {
              console.log("Connected (encrypted) to " + this.desktopName);
            } else {
              console.log("Connected (unencrypted) to " + this.desktopName);
            }
            this.kvmConnected = true;
            break;
          case 'disconnecting':
            console.log("Disconnecting");
            this.KVMPrompt("Disconnecting");
            break;
          case 'disconnected':
            console.log("Disconnected");
            this.KVMPrompt("Disconnected");
            this.kvmConnected = false;
            break;
          default:
            console.log(state);
            break;
        }
      },
      KVMDisconnected(rfb, reason) {
        this.kvmConnected = false;
        let msg = "Disconnected";
        if (typeof (reason) !== 'undefined') {
          msg = msg + ":" + reason;
          console.log("Disconnected:" + reason);
        }
        this.KVMPrompt(msg);
      },
      KVMFBUComplete(rfb, fbu) {
        console.log("FBUComplete");
        this.rfb.get_display().autoscale(this.cvsCtWidth, this.cvsCtHeight, true);
        rfb.set_onFBUComplete(function () { });
      },
      KVMFBResize(rfb, width, height) {
        console.log("FBResize:" + width + height);
      },
      KVMUpdateDesktopName(rfb, name) {
        this.desktopName = name;
      },
      KVMConnect() {
        try {
          this.rfb = new RFB({
            'target': this.$refs.kvmCanvas,
            'encrypt': false,
            'repeaterID': '',
            'true_color': true,
            'local_cursor': true,
            'shared': true,
            'view_only': false,
            'onNotification': this.KVMNotification,
            'onUpdateState': this.KVMUpdateState,
            'onDisconnected': this.KVMDisconnected,
            'onFBUComplete': this.KVMFBUComplete,
            'onFBResize': this.KVMFBResize,
            'onDesktopName': this.KVMUpdateDesktopName
          });
        } catch (error) {
          this.rfb = null;
          console.log('Unable to create RFB client -- ' + error);
          return;
        }
        if (this.repeatID) this.rfb.set_repeaterID(this.repeatID);
        this.rfb.connect(this.host, this.port, this.pwd, "websockify");
      },
      KVMStartup() {
        this.KVMConnect();
      },
      KVMPrompt(msg) {
        if (this.$refs.kvmCanvas) {
          let kvmCanvas = this.$refs.kvmCanvas;
          kvmCanvas.width = this.cvsCtWidth;
          kvmCanvas.height = this.cvsCtHeight;
          let ctx = kvmCanvas.getContext("2d");
          ctx.clearRect(0, 0, kvmCanvas.width, kvmCanvas.height);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#5bc0de";
          ctx.fillText(msg, kvmCanvas.width / 2, kvmCanvas.height / 2);
        }
      },
      KVMUIresize() {
        this.cvsCtWidth = this.$refs.canvasDiv.clientWidth;
        this.cvsCtHeight = this.$refs.canvasDiv.clientHeight;
        if (this.rfb) {
          console.log("width:" + this.cvsCtWidth + ",height:" + this.cvsCtHeight);
          this.rfb.get_display().autoscale(this.cvsCtWidth, this.cvsCtHeight, true);
        };
      },
      kvmScale() {
        if (this.$refs.fullScreenI.className.startsWith('fa fa-expand')) {
          this.$refs.fullScreenI.className = "fa fa-compress";
          this.scaleTt = "Compress";
        } else {
          this.$refs.fullScreenI.className = "fa fa-expand";
          this.scaleTt = "Expend";
        }
        let bodyDiv = this.$refs.bodyDiv;
        this.toggleFullscreen(bodyDiv);
        /*let bodyDiv = this.$refs.bodyDiv;
        if(bodyDiv.className.indexOf("bodyDivMax")>=0){
          bodyDiv.className = "";
          this.$refs.fullScreenI.className = "fa fa-expand";
          this.scaleTt = "Expend";
          this.rfb.get_display().autoscale(this.cvsCtWidth, this.cvsCtHeight, true);
        }else{
          bodyDiv.className ="bodyDivMax";
          this.$refs.fullScreenI.className = "fa fa-compress";
          this.scaleTt = "Compress";
          this.KVMUIresize();
        }*/
      },
      kvmClose() {
        window.removeEventListener('resize', this.KVMUIresize);
        if (this.rfb) this.rfb.disconnect();
        this.$emit("kvmClose");
      },
      initFullscreen() {
        if (!this.isSafari &&
          (document.documentElement.requestFullscreen ||
            document.documentElement.mozRequestFullScreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.body.msRequestFullscreen)) {
          this.scaleBtnShow = true;
          //this.addFullscreenHandlers();
        }
      },
      /*addFullscreenHandlers() {
          window.addEventListener('fullscreenchange', UI.updateFullscreenButton);
          window.addEventListener('mozfullscreenchange', UI.updateFullscreenButton);
          window.addEventListener('webkitfullscreenchange', UI.updateFullscreenButton);
          window.addEventListener('msfullscreenchange', UI.updateFullscreenButton);
      },*/
      toggleFullscreen(element) {
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
          if (element.requestFullscreen) {
            element.requestFullscreen();
          } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
          } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
          } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
          }
        }
        //UI.enableDisableViewClip();
        //UI.updateFullscreenButton();
      },
    },
    mounted: function () {
      this.initFullscreen();
      this.cvsCtWidth = this.$refs.canvasDiv.clientWidth;
      this.cvsCtHeight = this.$refs.canvasDiv.clientHeight;
      window.addEventListener('resize', this.KVMUIresize);
      let msg = "KVM Server startup...";
      this.KVMPrompt(msg);
    },
    watch: {
      pwd: function (val, oldVal) {
        if (this.kvmConnectTimeout) clearTimeout(this.kvmConnectTimeout);
        this.kvmConnectTimeout = setTimeout(this.KVMStartup, 5000);
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
    z-index: 2000;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    min-width: 600px;
    min-height: 400px;
    background-color: rgba(0, 0, 0, .5);
    display: table;
    transition: opacity .3s ease;
    .kvm-header {
      height: 5%;
      text-align: center;
      background-color: $bg-white;
      #kvm-title {
        margin: 0;
        @include SplitLineAfter();
      }
    }
    .kvm-body {
      height: 95%;
      #kvm-canvas-container {
        height: 90%;
        text-align: center;
        #kvm-canvas {
          width: 100%;
          background: $bg-black;
          margin: auto;
        }
      }
      #kvm-control {
        height: 10%;
        margin: 0;
        background-color: $bg-white;
        #kvm-ctrl-hotkey {
          float: left;
          margin: 0 .5em;
        }
        #kvm-ctrl-fullscreen-tt {
          float: left;
          margin: 0;
          content: "Expend";
        }
        #kvm-ctrl-close {
          float: right;
          margin: 0 .5em;
        }
        @include SplitLineBefore();
        @include clearfix();
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