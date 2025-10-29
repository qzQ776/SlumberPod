<template>
  <view class="session">
    <view class="meta">
      <text class="name">{{ item.name }}</text>
      <text class="time">{{ item.time }}</text>
    </view>
    <view class="actions">
      <button class="btn" @click="$emit('complete', item.id)">完成</button>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ item: { type: Object, required: true } })
</script>
<style scoped>
.session{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-radius:10px; margin-bottom:10px; box-shadow:0 1px 4px rgba(0,0,0,.06) }
.meta{ display:flex; flex-direction:column }
.name{ font-size:14px; color:#111 }
.time{ font-size:12px; color:#666 }
.actions{ display:flex; gap:8px }
.btn{ padding:6px 10px; border-radius:8px; background:#f2f3f5 }
</style>
