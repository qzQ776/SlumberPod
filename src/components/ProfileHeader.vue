<template>
  <view class="header">
    <image class="avatar" :src="displayAvatar" />
    <view class="meta">
      <text class="name">{{ displayName }}</text>
      <text class="vip" v-if="isVip">VIP</text>
    </view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({ avatar:String, nickname:String, vip:Boolean })
const userStore = useUserStore()

const displayAvatar = computed(() => props.avatar || userStore.avatar || 'https://picsum.photos/seed/avatar/200')
const displayName = computed(() => props.nickname || userStore.nickname || '睡眠爱好者')
const isVip = computed(() => props.vip ?? userStore.vip)
</script>
<style scoped>
.header{ display:flex; align-items:center; gap:12px; padding:16px }
.avatar{ width:60px; height:60px; border-radius:50% }
.name{ font-size:18px; font-weight:600; color: var(--fg) }
.vip{ font-size:12px; color:#fff; background:#ff6b6b; padding:2px 6px; border-radius:6px; margin-top:4px }
</style>
