<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="section">
      <text class="title">我的评论</text>
      <view class="composer">
        <textarea class="input" v-model="text" placeholder="写点什么..." />
        <view class="row"><button class="btn" @click="submit">发布</button></view>
      </view>
      <view class="list" v-if="items.length">
        <view class="item" v-for="it in items" :key="it.id">
          <text class="content">{{ it.text }}</text>
          <text class="time">{{ format(it.ts) }}</text>
          <view class="row"><button class="btn danger" @click="remove(it.id)">删除</button></view>
        </view>
      </view>
      <view class="empty" v-else>暂无评论</view>
    </view>
  </scroll-view>
</template>
<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useCommentsStore } from '@/stores/comments'
const { bgStyle } = useGlobalTheme()
const store = useCommentsStore(); store.load()
const items = computed(()=> store.items)
const text = ref('')
function submit(){ if(!text.value.trim()){ uni.showToast({ title:'内容不能为空', icon:'none' }); return } store.add(text.value.trim()); text.value='' }
function remove(id){ store.remove(id) }
function format(ts){ const d=new Date(ts); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` }
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.title{ font-size:18px; font-weight:600; color: var(--fg); margin-bottom:8px }
.composer{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow); margin-bottom:12px }
.input{ width:100%; min-height:80px; background: var(--input-bg); color: var(--fg); border-radius:8px; padding:8px 10px }
.row{ display:flex; justify-content:flex-end; margin-top:8px }
.list{ }
.item{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow); margin-bottom:10px }
.content{ display:block }
.time{ display:block; margin-top:6px; font-size:12px; color: var(--muted) }
.btn{ padding:6px 10px; border-radius:8px; background: var(--input-bg); color: var(--fg) }
.danger{ background:#ffeded; color:#c62828 }
.empty{ text-align:center; color: var(--muted); padding:32px 0 }
</style>
