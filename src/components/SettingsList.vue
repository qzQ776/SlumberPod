<template>
  <view class="list">
    <view class="item" v-for="s in settings" :key="s.key" :data-key="s.key" @click="$emit('select', s.key)" @tap="$emit('select', s.key)" role="button">
      <text class="label">{{ s.label }}</text>
      <text class="arrow">›</text>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ settings: { type:Array, required:true } })
</script>
<style scoped>
.list{ padding: 0 16px }
.item{ display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border) }
.label{ color: var(--fg) }
.badge{ font-size:12px; color:#fff; background: var(--accent); padding:2px 6px; border-radius:8px; margin-left:8px }
.arrow{ color: var(--muted) }
</style>
