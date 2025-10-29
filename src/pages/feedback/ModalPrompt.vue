<template>
  <view class="overlay" v-if="visible">
    <view class="backdrop" @click="dismiss" />
    <view class="card">
      <text class="title">睡眠反馈</text>
      <text class="subtitle">感谢你使用闹钟，愿意提交睡眠反馈吗？</text>
      <view class="actions">
        <button class="btn primary" @click="goNow">立即反馈</button>
        <button class="btn" @click="askLater">稍后反馈</button>
      </view>
      <view class="footer">
        <checkbox v-model="noMore">不再提示</checkbox>
      </view>
    </view>

    <!-- later picker sheet -->
    <view class="sheet" v-if="showPicker">
      <text class="sheet-title">选择提醒时间</text>
      <view class="quick">
        <button class="q" @click="setQuick(60)">1 小时后</button>
        <button class="q" @click="setQuick(120)">2 小时后</button>
      </view>
      <view class="picker-row">
        <input type="number" v-model="pickHour" min="0" max="23" />
        <text>小时</text>
        <input type="number" v-model="pickMinute" min="0" max="59" />
        <text>分钟</text>
      </view>
      <view class="sheet-actions">
        <button class="btn" @click="cancelPicker">取消</button>
        <button class="btn primary" @click="confirmPicker">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { scheduleFeedbackReminder } from '@/store/feedback'

// when opened as a page via navigateTo we always show the prompt
const emit = defineEmits(['close'])

const visible = ref(true)
const showPicker = ref(false)
const noMore = ref(false)
const pickHour = ref('')
const pickMinute = ref('')

function dismiss(){
  // if opened as a modal component emit close, else navigateBack
  try{ emit('close') }catch(e){}
  try{ uni.navigateBack() }catch(e){}
}
function goNow(){ uni.navigateTo({ url:'/pages/feedback/Form' }) }
function askLater(){ showPicker.value = true }
function cancelPicker(){ showPicker.value = false }

function setQuick(mins){
  const now = Date.now()
  const fireAt = now + mins * 60 * 1000
  scheduleFeedbackReminder(fireAt)
  emit('close')
}

function confirmPicker(){
  let h = parseInt(pickHour.value || 0)
  let m = parseInt(pickMinute.value || 0)
  if(isNaN(h) || isNaN(m)) return uni.showToast({ title:'请输入有效时间', icon:'none' })
  const now = new Date()
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  let fireAt = fire.getTime()
  if(fireAt <= Date.now()){
    uni.showToast({ title:'请选择今天之后的时间', icon:'none' }); return
  }
  scheduleFeedbackReminder(fireAt)
  emit('close')
}
</script>

<style scoped>
.overlay{ position:fixed; inset:0; z-index:2000 }
.backdrop{ position:absolute; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(6px) }
.card{ position:absolute; left:8%; right:8%; top:18%; background:#fff; border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:12px }
.title{ font-size:18px; font-weight:700 }
.subtitle{ color:#666 }
.actions{ display:flex; gap:12px }
.btn{ flex:1; padding:12px; border-radius:10px; background:rgba(0,0,0,0.06); border:none }
.btn.primary{ background:#3aa57a; color:#fff }
.footer{ display:flex; justify-content:flex-end }
.sheet{ position:absolute; left:6%; right:6%; bottom:8%; background:#fff; padding:16px; border-radius:12px }
.sheet-title{ font-weight:600; margin-bottom:8px }
.quick{ display:flex; gap:8px; margin-bottom:8px }
.q{ padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.06) }
.picker-row{ display:flex; align-items:center; gap:8px }
.sheet-actions{ display:flex; justify-content:space-between; margin-top:12px }
</style>