<template>
  <view v-if="visible" class="overlay" @click="close">
    <view class="panel" @click.stop>
      <text class="title">选择时间</text>
      <view class="row">
        <input class="num" type="number" v-model.number="hour" min="0" max="23" />
        <text>:</text>
        <input class="num" type="number" v-model.number="minute" min="0" max="59" />
      </view>
      <view class="row">
        <button class="btn" @click="confirm">确定</button>
        <button class="btn" @click="close">取消</button>
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ visible:Boolean, initHour:Number, initMinute:Number })
const emit = defineEmits(['close','confirm'])
const hour = ref(props.initHour || 0)
const minute = ref(props.initMinute || 0)
watch(()=>props.visible, v=>{ if(v){ hour.value=props.initHour||0; minute.value=props.initMinute||0 } })
function close(){ emit('close') }
function confirm(){ emit('confirm', { hour:hour.value, minute:minute.value }) }
</script>
<style scoped>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000 }
.panel{ width:280px; background:#191c24; color:#e7e9ee; border-radius:12px; padding:12px; box-shadow:0 6px 16px rgba(0,0,0,.35) }
.title{ font-size:16px; font-weight:600 }
.row{ display:flex; align-items:center; gap:8px; margin-top:10px }
.num{ width:80px; background:#232733; border-radius:8px; padding:8px 10px; color:#e7e9ee }
.btn{ padding:6px 10px; border-radius:8px; background:#2a303f; color:#e7e9ee }
</style>
