import Vue from 'vue'
import TestHelperComp from './components/kvm/App.vue'
import {Dropdown, Button, DropdownMenu, DropdownItem} from 'element-ui'

Vue.use(Dropdown)
Vue.use(Button)
Vue.use(DropdownMenu)
Vue.use(DropdownItem)

new Vue({
  el: '#app',
  render: x=> x(TestHelperComp)
})
