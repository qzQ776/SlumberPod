<template>
  <view class="plan">
    <view class="row">
      <text class="title">{{ plan.title }}</text>
      <text class="tag">{{ plan.level }}</text>
    </view>
    <text class="desc">{{ plan.desc }}</text>
    <view class="row">
      <text class="progress">进度：{{ plan.completed }}/{{ plan.total }} 次</text>
      <button class="btn" @click="$emit('start', plan.id)">开始</button>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ plan: { type: Object, required: true } })
</script>
<style scoped>
.plan{ background:#fff; border-radius:12px; padding:12px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.row{ display:flex; justify-content:space-between; align-items:center }
.title{ font-size:16px; font-weight:600 }
.tag{ font-size:12px; color:#666; background:#f2f3f5; padding:2px 6px; border-radius:6px }
.desc{ display:block; margin:8px 0; color:#333 }
.progress{ color:#666 }
.btn{ padding:6px 10px; border-radius:8px; background:#111; color:#fff }
</style>
