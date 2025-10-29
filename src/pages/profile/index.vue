<template>
  <scroll-view class="page" scroll-y :style="pageStyle">
    <!-- 头像背景主题头图 -->
    <view class="hero">
      <image class="hero-bg" :src="user.avatar" mode="aspectFill" />
      <view class="hero-overlay"></view>
      <view class="hero-content">
        <ProfileHeader :avatar="user.avatar" :nickname="user.nickname" />
      </view>
    </view>

    <view class="auth-actions" style="padding:12px 16px;">
      <view v-if="!authUser">
        <button class="btn primary" @click="openLogin">登录</button>
        <button class="btn" @click="openRegister">注册</button>
      </view>
      <view v-else>
        <text>已登录：{{ authUser.name || authUser.id }}</text>
        <button class="btn" @click="logout">登出</button>
      </view>
    </view>

    <StatsGrid :stats="user.stats" />

    <view class="section">
      <SettingsList :settings="settings" @select="onSetting" />
    </view>
  </scroll-view>
</template>
<script setup>
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import ProfileHeader from '@/components/ProfileHeader.vue'
import StatsGrid from '@/components/StatsGrid.vue'
import SettingsList from '@/components/SettingsList.vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { getAuthLocal } from '@/store/auth'
import { ref } from 'vue'
const { bgStyle } = useGlobalTheme()

const userStore = useUserStore()
const { avatar, nickname, stats } = storeToRefs(userStore)
const user = { avatar: avatar.value, nickname: nickname.value, stats: stats.value }

const pageStyle = bgStyle

// auth state
const authUser = ref(getAuthLocal())
function openLogin(){ try{ uni.navigateTo({ url:'/pages/auth/Login' }) }catch(e){ location.hash='#/pages/auth/Login' } }
function openRegister(){ try{ uni.navigateTo({ url:'/pages/auth/Register' }) }catch(e){ location.hash='#/pages/auth/Register' } }
async function logout(){ try{ const api = await import('@/api/auth'); api.logout(); authUser.value = null; const { useUserStore } = await import('@/stores/user'); useUserStore().applyAuth(null); uni.showToast({ title:'已登出' }) }catch(e){ uni.showToast({ title:'登出失败', icon:'none' }) } }


const settings = [
  { key:'favorites', label:'我喜欢的' },
  { key:'history', label:'播放历史' },
  { key:'comments', label:'我的评论' },
  { key:'creations', label:'我的创作' },
  { key:'feed', label:'社区动态' },
  { key:'account', label:'账号资料' },
  { key:'help', label:'帮助与客服' },
  { key:'about', label:'关于 SlumberPod' },
]
function go(url){
  // HBuilderX Web 预览下优先用 hash 切路由，保证可见效果
  if(typeof location !== 'undefined') {
    location.hash = `#/${url}`
  }
  // 同时尝试官方导航，兼容非 H5 环境
  try { uni.navigateTo({ url }) }
  catch(e){
    try { uni.navigateTo({ url: url.startsWith('/')? url.replace('/','') : `/${url}` }) }
    catch(err){}
  }
}
function onSetting(key){
  console.log('[profile] onSetting:', key)
  if(key==='favorites') go('pages/favorites/index')
  else if(key==='history') go('pages/history/index')
  else if(key==='comments') go('pages/comments/index')
  else if(key==='creations') go('pages/creations/index')
  else if(key==='feed') { try { uni.switchTab({ url:'/pages/community/index' }) } catch(e) { go('pages/community/index') } }
  else if(key==='account') go('pages/account/index')
  else if(key==='help') go('pages/help/index')
  else if(key==='about') go('pages/about/index')
  else if(key==='queue') go('pages/queue/index')
  else if(key==='nickname') uni.showToast({ title:'请在后续版本中支持修改昵称', icon:'none' })
}
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.hero{ position:relative; height:160px; overflow:hidden; border-bottom-left-radius:24px; border-bottom-right-radius:24px }
.hero-bg{ position:absolute; inset:0; width:100%; height:100%; filter: blur(16px) brightness(0.9); transform: scale(1.1) }
.hero-overlay{ position:absolute; inset:0; background: linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.35)) }
.hero-content{ position:relative }
</style>
