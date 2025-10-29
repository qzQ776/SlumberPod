import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null,
    nickname: '睡眠爱好者',
    avatar: 'https://picsum.photos/seed/avatar/200',
    vip: false,
    stats: {
      totalSleepHours: 128,
      totalSessions: 42,
      favoriteCategory: '自然',
    }
  }),
  actions: {
    toggleVip(){ this.vip = !this.vip },
    updateNickname(n){ this.nickname = n },
    updateAvatar(url){ this.avatar = url },
    applyAuth(user){
      if(!user) { this.userId = null; this.nickname = '睡眠爱好者'; this.avatar = 'https://picsum.photos/seed/avatar/200'; return }
      this.userId = user.id || user.user_id || user.uid || user.sub || null
      this.nickname = user.user_metadata?.name || user.name || user.email || this.nickname
      if(user.user_metadata?.avatar) this.avatar = user.user_metadata.avatar
    }
  }
})
