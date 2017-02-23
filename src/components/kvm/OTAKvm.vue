<template>
    <kvm :host="host" :port="port" :pwd="pwd" :titleSuffix="targetName" @KVMClose="OTAKvmClose"></kvm>
</template>

<script>
import kvm from './kvm.vue'

export default {
    name: 'otakvm',
    components: {kvm},
    data(){
        return{
            host:"192.168.1.6",
            port:6081,
            pwd:"111",
            targetName:"OTAClient1",
        }
    },
    methods:{
        OTAKvmClose(){
            this.$emit("OTAKvmClose");
        }
    }
}
</script>

<style lang="scss" scoped>
</style>