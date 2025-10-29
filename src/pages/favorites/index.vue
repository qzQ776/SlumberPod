<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="section">
      <text class="title">我喜欢的</text>
      <view class="list" v-if="items.length">
        <view class="item" v-for="it in items" :key="it.id">
          <image class="cover" :src="it.cover || it.image || 'https://picsum.photos/seed/fav/200'" mode="aspectFill" />
          <view class="meta">
            <text class="name">{{ it.name || it.title || '未命名' }}</text>
            <text class="author">{{ it.author || it.category || '' }}</text>
          </view>
          <view class="actions">
            <button class="btn" @click="play(it)">播放</button>
            <button class="btn danger" @click="remove(it.id)">移除</button>
          </view>
        </view>
      </view>
      <view class="empty" v-else>暂无收藏</view>
    </view>
  </scroll-view>
</template>
<script setup>
import { computed } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useFavoritesStore } from '@/stores/favorites'
import { usePlayerStore } from '@/stores/player'
const { bgStyle } = useGlobalTheme()
const fav = useFavoritesStore(); fav.load()
const store = usePlayerStore()
const items = computed(()=> fav.items)
function play(t){ store.play(t); try{ uni.navigateTo({ url:`/pages/player/index?id=${t.id}` }) }catch(e){ location.hash = `#/pages/player/index?id=${t.id}` } }
function remove(id){ fav.remove(id) }
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.title{ font-size:18px; font-weight:600; color: var(--fg); margin-bottom:8px }
.list{ padding: 0 0 }
.item{ display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border) }
.cover{ width:60px; height:60px; border-radius:8px }
.meta{ flex:1; display:flex; flex-direction:column }
.name{ font-size:16px; color: var(--fg) }
.author{ font-size:12px; color: var(--muted) }
.actions{ display:flex; gap:8px }
.btn{ padding:6px 10px; border-radius:6px; background: var(--input-bg); color: var(--fg) }
.danger{ background:#ffeded; color:#c62828 }
.empty{ text-align:center; color: var(--muted); padding:32px 0 }
</style>
