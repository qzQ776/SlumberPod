<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="section">
      <text class="title">账号资料</text>
      <view class="profile-card">
        <image class="avatar" :src="avatar" mode="cover" />
        <view class="info">
          <text class="nickname">{{ nickname }}</text>
          <text class="uid">ID: {{ userId }}</text>
        </view>
      </view>
      <view class="form">
        <view class="field">
          <text class="label">昵称</text>
          <input class="input" v-model="name" placeholder="输入昵称" />
          <button class="primary" @click="save">保存昵称</button>
        </view>
        <view class="field">
          <text class="label">头像 URL</text>
          <input class="input" v-model="avatarUrl" placeholder="输入图片链接" />
          <button class="primary" @click="updateAvatar">更新头像</button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>
<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
const { bgStyle } = useGlobalTheme()
const user = useUserStore()
const { avatar, nickname, userId } = storeToRefs(user)
const name = ref(nickname.value)
const avatarUrl = ref(avatar.value)
function save(){ user.updateNickname(name.value.trim()||''); uni.showToast({ title:'已保存昵称', icon:'none' }) }
function updateAvatar(){ user.updateAvatar(avatarUrl.value.trim()||''); uni.showToast({ title:'已更新头像', icon:'none' }) }
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.title{ font-size:18px; font-weight:600; color: var(--fg); margin-bottom:12px }
.profile-card{ display:flex; align-items:center; gap:12px; background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow) }
.avatar{ width:64px; height:64px; border-radius:50% }
.info{ display:flex; flex-direction:column }
.nickname{ font-size:16px; font-weight:700 }
.uid{ font-size:12px; color: var(--muted) }
.form{ margin-top:12px; display:flex; flex-direction:column; gap:12px }
.field{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow); display:flex; flex-direction:column; gap:8px }
.label{ font-size:12px; color: var(--muted) }
.input{ width:100%; background: var(--input-bg); color: var(--fg); border-radius:8px; padding:10px 12px }
.primary{ align-self:flex-end; padding:8px 12px; border-radius:8px; background: var(--accent); color:#111 }
</style>
