<template>
  <view class="page">
    <view class="card">
      <text class="title">注册</text>
      <view class="field">
        <text>昵称</text>
        <input v-model="name" placeholder="显示名称" />
      </view>
      <view class="field">
        <text>手机号 / 邮箱</text>
        <input v-model="identifier" placeholder="手机号或邮箱" />
      </view>
      <view class="field">
        <text>密码</text>
        <input type="password" v-model="password" placeholder="不少于6位" />
      </view>
      <view class="actions">
        <button class="btn primary" @click="submit">注册并登录</button>
        <button class="btn link" @click="goLogin">已有账号，去登录</button>
      </view>
      <view class="hint">
        <text class="small">提示：当前为本地演示，注册后将自动登录并保存用户信息到本地。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { saveAuthLocal } from '@/store/auth'

const name = ref('')
const identifier = ref('')
const password = ref('')
const loading = ref(false)

function validate(){
  if(!name.value.trim()) return '请输入昵称'
  if(!identifier.value.trim()) return '请输入手机号或邮箱'
  if(!password.value || password.value.length < 6) return '密码不少于6位'
  return null
}

async function submit(){
  const err = validate()
  if(err) return uni.showToast({ title: err, icon: 'none' })
  loading.value = true
  try{
    const api = await import('@/api/auth')
    await api.register({ name: name.value, identifier: identifier.value, password: password.value })
    uni.showToast({ title: '注册成功，请检查邮箱验证（如已启用）', icon: 'success' })
    // 使用uni-app的路由跳转
    uni.reLaunch({ url: '/pages/home/index' })
  }catch(e){
    uni.showToast({ title: e.message || '注册失败', icon: 'none' })
  }finally{ loading.value = false }
}

function goLogin(){ 
  // 使用uni-app的路由跳转
  uni.navigateTo({ url:'/pages/auth/Login' })
}
</script>

<style scoped>
.page{ padding:20px }
.card{ background:var(--card-bg,#fff); padding:18px; border-radius:12px }
.title{ font-size:20px; font-weight:700; margin-bottom:12px }
.field{ margin-bottom:12px }
input{ width:100%; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.08) }
.actions{ display:flex; gap:8px }
.btn{ flex:1; padding:10px; border-radius:8px }
.btn.primary{ background:#3aa57a; color:#fff; border:none }
.btn.link{ background:transparent; color:#3aa57a; border:1px solid rgba(58,165,122,0.15) }
.small{ font-size:12px; color:#888 }
.hint{ margin-top:10px }
</style>