<template>
  <view class="global-bg" :style="bgStyle">
    <slot />
  </view>
</template>
<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'
const { bgStyle } = useGlobalTheme()
</script>
<style scoped>
.global-bg{ min-height:100vh; display:block }
</style>
