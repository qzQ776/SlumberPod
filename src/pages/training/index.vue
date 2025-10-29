<template>
  <scroll-view class="page" scroll-y>
    <view class="section">
      <text class="title">训练计划</text>
      <TrainingPlanCard v-for="p in plans" :key="p.id" :plan="p" @start="startPlan" />
    </view>
    <view class="section">
      <text class="title">今日训练</text>
      <TrainingSessionItem v-for="s in today" :key="s.id" :item="s" @complete="completeSession" />
    </view>
  </scroll-view>
</template>
<script setup>
import TrainingPlanCard from '@/components/TrainingPlanCard.vue'
import TrainingSessionItem from '@/components/TrainingSessionItem.vue'
const plans = [
  { id:'pl1', title:'基础睡眠卫生', level:'入门', desc:'建立固定作息，减少睡前干扰。', completed:3, total:7 },
  { id:'pl2', title:'渐进式放松', level:'进阶', desc:'通过深呼吸与肌肉放松提高入睡质量。', completed:1, total:10 },
]
const today = [
  { id:'s1', name:'深呼吸 5 分钟', time:'20:30' },
  { id:'s2', name:'白噪音 10 分钟', time:'21:00' },
]
function startPlan(id){ uni.showToast({ title:`开始计划 ${id}`, icon:'none' }) }
function completeSession(id){ uni.showToast({ title:`完成训练 ${id}`, icon:'none' }) }
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding:12px 16px }
.title{ font-size:16px; font-weight:600; margin-bottom:8px }
</style>
