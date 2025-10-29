import { defineStore } from 'pinia'

export const useHistoryStore = defineStore('history', {
  state: () => ({ items: [] }),
  actions: {
    add(track){
      if (!track) return
      const id = track.id
      const existsIdx = this.items.findIndex(x=>x.id===id)
      const entry = { ...track, ts: Date.now() }
      if (existsIdx >= 0) {
        this.items.splice(existsIdx, 1)
      }
      this.items.unshift(entry)
      this.items = this.items.slice(0, 50)
      try { uni.setStorageSync('historyItems', this.items) } catch(e) {}
    },
    load(){
      try {
        const arr = uni.getStorageSync('historyItems')
        if (Array.isArray(arr)) this.items = arr
      } catch(e) {}
    },
    clear(){ this.items = []; uni.removeStorageSync('historyItems') }
  }
})
