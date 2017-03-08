import Vue from 'vue'
import TestHelperComp from './components/kvm/App.vue'
import {Dropdown, Button, DropdownMenu, DropdownItem, Tooltip} from 'element-ui'

Vue.use(Dropdown)
Vue.use(Button)
Vue.use(DropdownMenu)
Vue.use(DropdownItem)
Vue.use(Tooltip)

new Vue({
  el: '#app',
  /*components:{
    TestHelperComp
  },
  template: '<TestHelperComp></TestHelperComp>',*/
  render: h=> h(TestHelperComp)
})
