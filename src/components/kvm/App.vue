<template>
  <div id="app">
      <button id="show-modal" @click="showModal = true">Show Modal</button>
      <modal id="modal" v-if="showModal">
        <h3 id="title" slot="header">{{title}}</h3>

        <div id="bodyDiv" slot="body">
          <canvas id="kvmCanvas" ref="kvmCanvas"></canvas>
        </div>
        
        <div id="footerDiv" slot="footer">
          <el-dropdown id="hotkeyBtn" @command="handleCommand">
            <el-button type="primary">
              HotKey<i class="el-icon-caret-bottom el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item divided v-for="item in items" :command="item">{{item}}</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <el-button id="closeBtn" slot="footer"  type="primary" @click="showModal = false">close</button>
        </div>
      </modal>
    </div>
</template>

<script>
import modal from './modal.vue'
import RFB from './core/rfb.js'


export default {
  name: 'app',
  components: { modal},
  data() {
    return { 
      desktopName: "",
      showModal: false,
      isShowFlag: false,
      dWidth: 0,
      dHeight: 0,
      items: ['Win+D', "Win+L", "Alt+Tab", "Ctrl+Alt+Del"],
    }
  },
  props: {
    targetName: {
      type: String,
      default: 'Unknow',
      required: false
    }
  },
  computed: {
    title: function() {
        return 'KVM-'+this.targetName
      }
  },
  methods: {
    handleCommand(command){
      console.log('click on item ' + command);
      //this.$refs.kvmCanvas.id = "kvmCanvasMax";
      //@dblclick="KVMCanvasHover" 
      
    },
    KVMNotification(rfb, msg, level, options) {
      console.log("Notification:"+msg+level);
    },
    KVMUpdateState(rfb, state, oldstate) {
      switch (state) {
      case 'connecting':
          console.log("Connecting");
          break;
      case 'connected':
          if (rfb && rfb.get_encrypt()) {
              console.log("Connected (encrypted) to " + this.desktopName);
          } else {
              console.log("Connected (unencrypted) to " + this.desktopName);
          }
          break;
      case 'disconnecting':
          console.log("Disconnecting");
          break;
      case 'disconnected':
          console.log("Disconnected");
          break;
      default:
          console.log(state);
          break;
      }
    },
    KVMDisconnected(rfb, reason) {
      if (typeof(reason) !== 'undefined') {
        console.log("Disconnected:"+reason);
      }
    },
    KVMUIresize(rfb) {
        //rfb.requestDesktopSize(300, 150);
        let tmpW = this.$refs.kvmCanvas.parentNode.clientWidth;
        console.log(tmpW);
        rfb.get_display().autoscale(this.dWidth, this.dHeight, true);
    },
    KVMFBUComplete(rfb, fbu) {
      //this.KVMUIresize(rfb);
      console.log("FBUComplete");
    },
    KVMFBUReceive(rfb, fbu) {
      //this.KVMUIresize(rfb);
      console.log("FBUReceive");
      //rfb.set_onFBUComplete(function() { });
    },
    KVMFBResize(rfb, width, height) {
      this.KVMUIresize(rfb);
      console.log("FBResize:"+width+height);
      
    },
    KVMUpdateDesktopName(rfb, name) {
      this.desktopName = name;
    },
    KVMConnect(){
      var rfb;
      try {
      rfb = new RFB({
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
        console.log('Unable to create RFB client -- ' + error);
        return; 
      }

      //let display = rfb.get_display();
      //display.set_target(this.$refs.kvmCanvas);
      //display.autoscale(this.$refs.kvmCanvas.width, this.$refs.kvmCanvas.height, true);
      rfb.connect("172.21.84.66", 6081, "111", "websockify");
    },
    KVMPrompt(msg){
      if(this.$refs.kvmCanvas){
        let kvmCanvas = this.$refs.kvmCanvas;
        let ctx = kvmCanvas.getContext("2d");
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillStyle= "#5bc0de";
        ctx.fillText(msg, kvmCanvas.width/2, kvmCanvas.height/2);

        this.KVMConnect();
      }
    }/*,
    KVMCanvasHover(){
      let kvmCanvas = this.$refs.kvmCanvas;
      if(kvmCanvas.id == "kvmCanvas") kvmCanvas.id = "kvmCanvasMax";
      else kvmCanvas.id = "kvmCanvas";
    }*/
  },
  watch:{
    showModal:function(val, oldVal){
      if(val){
        this.isShowFlag = val; 
      }
    }
  },
  updated: function(){
    if(this.isShowFlag){
      let msg = "KVM Server startup...";
      this.dHeight = this.$refs.kvmCanvas.clientHeight;
      this.dWidth = this.$refs.kvmCanvas.clientWidth;
      this.KVMPrompt(msg);
      this.isShowFlag = false;
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "../../style/colors.scss";
  @import "../../style/mixin.scss";

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

  #app{
    #modal{
      #title{
        margin: 0;
        @include SplitLineAfter();
      }

      #bodyDiv{
        #kvmCanvas{
          width:100%;
          //width:300px;
          //height:150px;
          vertical-align: middle;
          background: $bg-black;
        }

        #kvmCanvasMax{
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: $bg-black;
          z-index: 9998;
        }

        @include clearfix();
      }

      #footerDiv{
        #hotkeyBtn{
          float: left;
          margin: 0 .5em;
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
