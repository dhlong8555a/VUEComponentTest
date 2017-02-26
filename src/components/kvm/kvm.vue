<template>
    <modal id="modal">
      <h3 id="title" slot="header">{{title}}</h3>

      <div id="bodyDiv" slot="body" ref="bodyDiv">
        <div id="canvasDiv" ref="canvasDiv">
          <canvas id="kvmCanvas" ref="kvmCanvas"></canvas>
        </div>
        <div id="controlDiv">
          <el-dropdown id="hotkeyBtn" v-if="kvmConnected" @command="handleCommand">
            <el-button type="primary">
              HotKey<i class="el-icon-caret-bottom el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item divided v-for="item in items" :command="item">{{item}}</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <el-tooltip slot="footer" v-if="kvmConnected" id="fullscreenTt" class="item" effect="dark" :content="scaleTt" placement="top">
            <el-button id="fullscreenBtn"  type="primary"  @click="KVMCanvasExpand" >
              <i class="fa fa-expand"  ref="fullScreenI" aria-hidden="true"></i>
            </el-button>
          </el-tooltip>
          <el-button id="closeBtn" slot="footer" type="primary" @click="KVMClose">close</button>
        </div>
      </div>
      
      <div id="footerDiv" slot="footer"></div>
    </modal>
</template>

<script>
import modal from './modal.vue'
import RFB from './core/rfb.js'

export default {
  name: 'kvm',
  components: { modal},
  data() {
    return { 
      desktopName: "",
      items: ['Win+D', "Win+L", "Alt+Tab", "Ctrl+Alt+Del"],
      kvmConnectTimer: null,
      rbf:null,
      kvmConnected:false,
      scaleTt:'Expend',
      ctOldWidth: 0,
      ctOldHeight: 0,
      ctNewWidth: 0,
      ctNewHeight: 0,
    }
  },
  props: {
    titleSuffix: {
      type: String,
      required: false
    },
    host:{
        type: String,
        required: true,
    },
    port:{
        type: Number,
        required: true,
    },
    pwd:{
        type: String,
        required: true,
    },
    repeatID:{
        type: String,
        required: false,
    }
  },
  computed: {
    title: function() {
      let title = "KVM";
      if(this.titleSuffix) title = title +'-'+this.titleSuffix;
      return title;
    }
  },
  methods: {
    handleCommand(command){
      console.log('click on item ' + command);  
      if(this.rfb){
        switch(command){
          case 'Ctrl+Alt+Del':{
            this.rfb.sendCtrlAltDel();
            break;
          }
          case 'Win+D':{
            this.rfb.sendWinD();
            break;
          }
          case 'Win+L':{
            this.rfb.sendWinL();
            break;
          }
          case 'Alt+Tab':{
            this.rfb.sendAltTab();
            break;
          }
        }
      } 
    },
    KVMNotification(rfb, msg, level, options) {
      console.log("Notification:"+msg+level);
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
          this.kvmConnected=true;
          break;
      case 'disconnecting':
          console.log("Disconnecting");
          this.KVMPrompt("Disconnecting");
          break;
      case 'disconnected':
          console.log("Disconnected");
          this.kvmConnected=false;
          break;
      default:
          console.log(state);
          break;
      }
    },
    KVMDisconnected(rfb, reason) {
      let msg = "Disconnecting";
      if (typeof(reason) !== 'undefined') {
        msg = msg + ":" +reason;
        console.log("Disconnected:"+reason);
      }
      this.KVMPrompt(msg);
    },
    KVMUIresize(rfb) {
        let tmpW = this.$refs.kvmCanvas.parentNode.clientWidth;
        console.log(tmpW);
        if(this.ctNewWidth != this.ctOldWidth || this.ctNewHeight != this.ctOldHeight){
          rfb.get_display().autoscale(this.ctNewWidth, this.ctNewHeight, true);
          this.ctOldWidth = this.ctNewWidth;
          this.ctOldHeight = this.ctNewHeight;
        }
    },
    KVMFBUComplete(rfb, fbu) {
      console.log("FBUComplete");
    },
    KVMFBUReceive(rfb, fbu) {
      this.KVMUIresize(rfb);
      console.log("FBUReceive");
    },
    KVMFBResize(rfb, width, height) {
      console.log("FBResize:"+width+height);
      
    },
    KVMUpdateDesktopName(rfb, name) {
      this.desktopName = name;
    },
    KVMConnect(){
      try {
        this.rfb = new RFB({
          'target': this.$refs.kvmCanvas,
          'encrypt': false,
          'repeaterID': '',
          'true_color': true,
          'local_cursor': true,
          'shared':true,
          'view_only': false,
          'onNotification':  this.KVMNotification,
          'onUpdateState':  this.KVMUpdateState,
          'onDisconnected': this.KVMDisconnected,
          'onFBUReceive': this.KVMFBUReceive,
          'onFBUComplete': this.KVMFBUComplete,
          'onFBResize': this.KVMFBResize,
          'onDesktopName': this.KVMUpdateDesktopName
        });
      } catch (error) {
        this.rfb = null;
        console.log('Unable to create RFB client -- ' + error);
        return; 
      }
      if(this.repeatID)this.rfb.set_repeaterID(this.repeatID);
      this.rfb.connect(this.host, this.port, this.pwd, "websockify");
    },
    KVMStartup(){
      let msg = "KVM Server startup...";
      //this.ctNewHeight = this.$refs.kvmCanvas.clientHeight;
      //this.ctNewWidth = this.$refs.kvmCanvas.clientWidth;
      this.ctNewWidth = this.$refs.canvasDiv.clientWidth;
      this.ctNewHeight = this.$refs.canvasDiv.clientHeight;
      this.KVMPrompt(msg);
      if(this.kvmConnectTimer) clearTimeout(this.kvmConnectTimer);
      this.kvmConnectTimer = setTimeout(this.KVMConnect, 3000);
    },
    KVMPrompt(msg){
      if(this.$refs.kvmCanvas){
        let kvmCanvas = this.$refs.kvmCanvas;
        let ctx = kvmCanvas.getContext("2d");
        ctx.clearRect(0, 0, kvmCanvas.width, kvmCanvas.height);
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillStyle= "#5bc0de";
        ctx.fillText(msg, kvmCanvas.width/2, kvmCanvas.height/2);
      }
    },
    ESCFun(key){
      if(key.keyCode == 27){
        this.KVMCanvasCompress();
      }
    },
    KVMCanvasExpand(){
      let bodyDiv = this.$refs.bodyDiv;
      if(bodyDiv.className.indexOf("bodyDivMax")>=0){
        bodyDiv.className = "";
        this.$refs.fullScreenI.className = "fa fa-expand";
        this.scaleTt = "Expend";
      }else{
        bodyDiv.className ="bodyDivMax";
        this.$refs.fullScreenI.className = "fa fa-compress";
        this.scaleTt = "Compress";
      }  
      this.ctNewWidth = this.$refs.canvasDiv.clientWidth;
      this.ctNewHeight = this.$refs.canvasDiv.clientHeight;
    },
    KVMCanvasCompress(){
      let bodyDiv = this.$refs.bodyDiv;
      if(bodyDiv.id != "bodyDiv"){
        bodyDiv.id = "bodyDiv";
      }
      /*let kvmCanvas = this.$refs.kvmCanvas;
      if(kvmCanvas.id != "kvmCanvas"){
        kvmCanvas.id = "kvmCanvas";
        window.removeEventListener('keyup', this.ESCFun);
      }*/
    },
    KVMClose(){
      if(this.rfb) this.rfb.disconnect();
      this.$emit("KVMClose");
    }
  },
  mounted: function(){
    window.addEventListener('keyup', this.ESCFun);
    this.KVMStartup();
  }
}
</script>

<style lang="scss" scoped>
  @import "../../style/colors.scss";
  @import "../../style/mixin.scss";
  @import "../../../node_modules/font-awesome/css/font-awesome.css";

  @mixin SplitLineBefore(){
    &:before{
      display: block;
      content: "";
      background-color: $fg-light-gray;
      width: 100%;
      height: .1em;
      margin: 0 auto .4em;
    }
  }
  @mixin SplitLineAfter(){
    &:after{
      display: block;
      content: "";
      background-color: $fg-light-gray;
      width: 100%;
      height: .1em;
      margin: .4em auto 0;
    }
  }

  #modal{
    #title{
      margin: 0;
      @include SplitLineAfter();
    }

    .bodyDivMax{
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      #canvasDiv{
        height:90%;
      }
      #controlDiv{
        height:10%;
      }
    }

    #bodyDiv{
      text-align: center;

      #canvasDiv {
        #kvmCanvas{
          width:100%;
          vertical-align: middle;
          background: $bg-black;
          margin: auto;
        }
      }

      #controlDiv{
        margin: 1em 0 0;
        #hotkeyBtn{
          float: left;
          margin: 0 .5em;
        }
        #fullscreenTt{
          float: left;
          margin: 0;
          content: "Expend";
        }
        #testEsc{
          float: left;
        }
        #closeBtn{
          float: right;
          margin: 0 .5em;
        }

        @include SplitLineBefore();
        @include clearfix();
      }
    }
  }
</style>
