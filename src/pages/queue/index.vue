<template>
  <scroll-view class="page" scroll-y>
    <view class="header">
      <text class="title">播放队列</text>
      <button class="btn danger" @click="clearQueue">清空</button>
    </view>
    <view class="list">
      <view class="item" v-for="t in store.playlist" :key="t.id">
        <image class="cover" :src="t.cover" mode="aspectFill" />
        <view class="meta">
          <text class="name">{{ t.name }}</text>
          <text class="author">{{ t.author }}</text>
        </view>
        <view class="actions">
          <button class="btn" @click="playTrack(t)">播放</button>
          <button class="btn" @click="remove(t.id)">移除</button>
        </view>
      </view>
      <view v-if="store.playlist.length===0" class="empty">队列为空，去首页添加吧</view>
    </view>
  </scroll-view>
</template>
<script setup>
import { usePlayerStore } from '@/stores/player'
const store = usePlayerStore()
function playTrack(t){ store.play(t); uni.navigateTo({ url:`/pages/player/index?id=${t.id}` }) }
function remove(id){ store.playlist = store.playlist.filter(x=>x.id!==id) }
function clearQueue(){ store.playlist = [] }
function moveUp(id){
  const i = store.playlist.findIndex(x=>x.id===id)
  if (i>0){
    const arr=[...store.playlist]
    const [item]=arr.splice(i,1)
    arr.splice(i-1,0,item)
    store.playlist = arr
  }
}
function moveDown(id){
  const i = store.playlist.findIndex(x=>x.id===id)
  if (i>=0 && i<store.playlist.length-1){
    const arr=[...store.playlist]
    const [item]=arr.splice(i,1)
    arr.splice(i+1,0,item)
    store.playlist = arr
  }
}
</script>
<style scoped>
.page{ min-height:100vh }
.header{ display:flex; justify-content:space-between; align-items:center; padding:12px 16px }
.title{ font-size:18px; font-weight:600 }
.list{ padding: 0 16px }
.item{ display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #eee }
.cover{ width:60px; height:60px; border-radius:8px }
.meta{ flex:1 }
.name{ font-size:16px; color:#111 }
.author{ font-size:12px; color:#666 }
.actions{ display:flex; gap:8px }
.btn{ padding:6px 10px; border-radius:6px; background:#f2f3f5 }
.danger{ background:#ffeded; color:#c62828 }
.empty{ text-align:center; color:#999; padding:32px 0 }
</style>
