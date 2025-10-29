<template>
  <view class="card" @click="onClick" @longpress="onLongPress">
    <image class="cover" :src="item.cover" mode="aspectFill" />
    <view class="meta">
      <text class="name">{{ item.name }}</text>
      <text class="author">{{ item.author }}</text>
    </view>
  </view>
</template>
<script setup>
import { usePlayerStore } from '@/stores/player'
const props = defineProps({ item: { type: Object, required: true } })
const store = usePlayerStore()
function onClick() {
  store.setPlaylist([])
  store.play(props.item)
  try{ uni.navigateTo({ url: `/pages/player/index?id=${props.item.id}` }) }catch(e){ if(typeof location!=='undefined') location.hash = `#/pages/player/index?id=${props.item.id}` }
}
function onLongPress(){
  store.addToQueue(props.item)
  uni.showToast({ title: '已加入队列', icon: 'none' })
}
</script>
<style scoped>
.card { width:48%; margin-bottom: 12px; }
.cover { width:100%; height:120px; border-radius: 10px; }
.meta { margin-top:6px }
.name { font-size: 14px; color: var(--fg) }
.author { font-size: 12px; color: var(--muted) }
</style>
