<template>
  <view class="page">
    <view class="header">
      <button class="back" @click="goBack">‹</button>
      <text class="title">睡眠反馈</text>
    </view>

    <scroll-view class="form" scroll-y>
      <view class="row">
        <text>入睡时间</text>
        <input type="time" v-model="sleepStart" />
      </view>
      <view class="row">
        <text>起床时间</text>
        <input type="time" v-model="wakeTime" />
      </view>
      <view class="row">
        <text>睡眠评分</text>
        <input type="range" min="1" max="10" v-model="score" />
        <text>{{ score }}</text>
      </view>

      <view class="section">
        <text class="sec-title">睡眠问题</text>
        <view class="checkbox-row">
          <label><input type="checkbox" v-model="flags.dreams" /> 多梦</label>
          <label><input type="checkbox" v-model="flags.easyWake" /> 易醒</label>
          <label><input type="checkbox" v-model="flags.midWake" /> 中途醒来</label>
        </view>
      </view>

      <view class="section">
        <text class="sec-title">睡前活动</text>
        <view class="checkbox-row">
          <label><input type="checkbox" v-model="activities.coffee" /> 饮用咖啡/茶/功能饮料</label>
          <label><input type="checkbox" v-model="activities.exercise" /> 剧烈运动</label>
          <label><input type="checkbox" v-model="activities.devices" /> 使用电子设备超1小时</label>
          <label><input type="checkbox" v-model="activities.read" /> 阅读纸质书</label>
          <label><input type="checkbox" v-model="activities.otherAudio" /> 听白噪音以外音频</label>
        </view>
        <view class="row">
          <text>其他（50字）</text>
          <input type="text" v-model="otherText" maxlength="50" />
        </view>
      </view>

      <view class="section">
        <text class="sec-title">心理状态</text>
        <view class="radio-row">
          <label><input type="radio" value="none" v-model="mental" /> 无压力/焦虑</label>
          <label><input type="radio" value="mild" v-model="mental" /> 轻微压力</label>
          <label><input type="radio" value="moderate" v-model="mental" /> 中度压力</label>
          <label><input type="radio" value="severe" v-model="mental" /> 重度压力</label>
        </view>
      </view>

      <view class="section">
        <text class="sec-title">备注</text>
        <textarea v-model="notes" maxlength="300" placeholder="可选，最多300字" />
      </view>

      <view class="row">
        <label><input type="checkbox" v-model="share" /> 同步分享到社区</label>
      </view>

      <view class="submit-row">
        <button class="btn primary" @click="submit">提交</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { saveFeedback } from '@/store/feedback'

const sleepStart = ref('23:00')
const wakeTime = ref('07:00')
const score = ref(6)
const flags = ref({ dreams:false, easyWake:false, midWake:false })
const activities = ref({ coffee:false, exercise:false, devices:false, read:false, otherAudio:false })
const otherText = ref('')
const mental = ref('none')
const notes = ref('')
const share = ref(false)

function goBack(){ try{ uni.navigateBack() }catch(e){ location.hash='#/' } }

async function submit(){
  const payload = {
    sleepStart: sleepStart.value,
    wakeTime: wakeTime.value,
    score: score.value,
    flags: flags.value,
    activities: activities.value,
    otherText: otherText.value,
    mental: mental.value,
    notes: notes.value,
    shared: share.value,
    createdAt: Date.now()
  }
  await saveFeedback(payload)
  uni.showToast({ title:'提交成功' })
  // auto return to home
  try{ uni.reLaunch({ url:'/pages/home/index' }) }catch(e){ location.hash='#/pages/home/index' }
}
</script>

<style scoped>
.page{ min-height:100vh; padding:12px }
.header{ display:flex; align-items:center; gap:12px }
.back{ font-size:20px; background:transparent; border:none }
.title{ font-weight:700; font-size:18px }
.form{ margin-top:12px }
.row{ display:flex; align-items:center; justify-content:space-between; padding:12px 0 }
.sec-title{ font-weight:600; margin-bottom:8px }
.checkbox-row{ display:flex; flex-wrap:wrap; gap:10px }
.radio-row{ display:flex; flex-direction:column; gap:8px }
.submit-row{ padding:18px 0 }
.btn{ padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.06) }
.btn.primary{ background:#3aa57a; color:#fff }
</style>