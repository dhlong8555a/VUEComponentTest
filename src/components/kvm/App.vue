<template>
  <div id="app">
      <button id="show-modal" @click="showModal = true">Show Modal</button>
      <otakvm v-if="showModal" @OTAKvmClose="showModal = false"></otakvm>
    </div>
</template>

<script>
import otakvm from './OTAKvm.vue'

export default {
  name: 'app',
  components: {otakvm},
  data() {
    return { 
      showModal: false,
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
