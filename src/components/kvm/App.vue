<template>
  <div id="app">
      <button id="show-modal" @click="showModal = true">Show Modal</button>
      <modal id="modal" v-if="showModal">
        <h3 id="title" slot="header">{{title}}</h3>

        <div id="bodyDiv" slot="body">
          <canvas id="kvmCanvas" @dblclick="KVMCanvasHover" ref="kvmCanvas"></canvas>
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
import "./core/input/*.js"
import "./core/*.js"


export default {
  name: 'app',
  components: { modal},
  data() {
    return { 
      showModal: false,
      isShowFlag: false,
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
      this.$refs.kvmCanvas.id = "kvmCanvasMax";
    },
    KVMPrompt(msg){
      if(this.$refs.kvmCanvas){
        let kvmCanvas = this.$refs.kvmCanvas;
        let ctx = kvmCanvas.getContext("2d");
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillStyle= "#5bc0de";
        ctx.fillText(msg, kvmCanvas.width/2, kvmCanvas.height/2);

        var rfb;
        try {
                rfb = new RFB({'target':       document.getElementById('noVNC_canvas'),
                               'encrypt':      WebUtil.getConfigVar('encrypt',
                                        (window.location.protocol === "https:")),
                               'repeaterID':   WebUtil.getConfigVar('repeaterID', ''),
                               'true_color':   WebUtil.getConfigVar('true_color', true),
                               'local_cursor': WebUtil.getConfigVar('cursor', true),
                               'shared':       WebUtil.getConfigVar('shared', true),
                               'view_only':    WebUtil.getConfigVar('view_only', false),
                               'onNotification':  notification,
                               'onUpdateState':  updateState,
                               'onDisconnected': disconnected,
                               'onXvpInit':    xvpInit,
                               'onPasswordRequired':  passwordRequired,
                               'onFBUComplete': FBUComplete,
                               'onDesktopName': updateDesktopName});
            } catch (exc) {
                status('Unable to create RFB client -- ' + exc, 'error');
                return; // don't continue trying to connect
            }

            rfb.connect(host, port, password, path);
      }
    },
    KVMCanvasHover(){
      let kvmCanvas = this.$refs.kvmCanvas;
      if(kvmCanvas.id == "kvmCanvas") kvmCanvas.id = "kvmCanvasMax";
      else kvmCanvas.id = "kvmCanvas";
    }
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
          width: 100%;
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
