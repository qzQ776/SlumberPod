<template>
  <view v-if="visible" class="overlay" @click="close">
    <view class="panel" @click.stop>
      <text class="title">重复规则</text>
      <view class="list">
        <view class="item" v-for="opt in options" :key="opt.value" @click="choose(opt.value)">{{ opt.label }}</view>
      </view>
      <view class="row"><button class="btn" @click="close">关闭</button></view>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ visible:Boolean, options:{ type:Array, default:()=>[
  { value:'daily', label:'每天' },
  { value:'workdays', label:'工作日(一~五)' },
  { value:'weekend', label:'周末(六~日)' },
  { value:'none', label:'不重复' },
] } })
const emit = defineEmits(['close','select'])
function close(){ emit('close') }
function choose(v){ emit('select', v); emit('close') }
</script>
<style scoped>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000 }
.panel{ width:300px; background:#191c24; color:#e7e9ee; border-radius:12px; padding:12px; box-shadow:0 6px 16px rgba(0,0,0,.35) }
.title{ font-size:16px; font-weight:600 }
.item{ padding:10px; border-radius:8px; background:#232733; margin-bottom:8px }
.row{ display:flex; justify-content:flex-end }
.btn{ padding:6px 10px; border-radius:8px; background:#2a303f; color:#e7e9ee }
</style>
