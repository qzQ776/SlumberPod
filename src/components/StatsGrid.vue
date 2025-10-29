<template>
  <view class="grid">
    <view class="cell">
      <text class="num">{{ stats.totalSleepHours }}</text>
      <text class="label">累计睡眠时长(h)</text>
    </view>
    <view class="cell">
      <text class="num">{{ stats.favoriteCategory }}</text>
      <text class="label">偏好类别</text>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ stats: { type:Object, required:true } })
</script>
<style scoped>
.grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; padding:0 16px }
.cell{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.num{ font-size:16px; font-weight:700; color: var(--card-fg) }
.label{ font-size:12px; color: var(--muted) }
</style>
