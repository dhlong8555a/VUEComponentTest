<template>
    <kvm :host="host" :port="port" :pwd="pwd" :titleSuffix="titleSuffix" @kvmClose="OTAKvmClose"></kvm>
</template>

<script>
import kvm from './kvm.vue';
import kvmRest from './js/kvm_rest.js';
import logonRest from './js/logon_rest.js';
import auth from '../../js/auth.js'; 

export default {
    name: 'otakvm',
    components: {kvm},
    data(){
        return{
            host:"172.21.84.66",
            port:6081,
            pwd:"111",
            mode: "1",
        }
    },
    props:{
        agentId:{
            default:"",
            type:String,
            request: true
        },
        targetName:{
            default:"",
            type:String,
            request: false
        }
    },
    computed:{
       titleSuffix: function(){
           return this.targetName || this.agentId;
       } 
    },
    methods:{
        OTAKvmClose(){
            this.$emit("OTAKvmClose");
        },
        login(){
            let p = new Promise(function(resolve, reject){
                let name = "admin";
                let passwd = "admin";
                logonRest.login(name, passwd).then(
                    ua => {
                        auth.rememberMe(ua);
                        auth.markAsLogined(ua);
                        resolve("logon success");
                    }
                ).catch(
                    msg => {
                        console.log(msg);
                        reject("logon faild");
                    }
                );
            })
            return p;
        },
        OTAKvmTrigger(){
            this.login().then(data=>{
                    console.log(data);
                    kvmRest.getKVMParams({agentId:this.agentId, mode:this.mode}).then(
                        response=>{
                            console.log(response);
                            this.host = response.result.IP;
                            this.pwd = response.result.password;
                        }
                    ).catch(
                        error=>console.log(error)
                    )
                }
            ).catch(
                error=>console.log(error)
            );
        }
    },
    mounted: function(){
        this.OTAKvmTrigger();
    }
}
</script>

<style lang="scss" scoped>
</style>