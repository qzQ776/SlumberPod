import { defineStore } from 'pinia'

export const useCommentsStore = defineStore('comments', {
  state: () => ({ items: [] }),
  actions: {
    load(){ try { const arr = uni.getStorageSync('userComments'); if(Array.isArray(arr)) this.items = arr } catch(e){} },
    save(){ try { uni.setStorageSync('userComments', this.items) } catch(e){} },
    add(text){ if(!text) return; const item = { id: `c_${Date.now()}`, text, ts: Date.now() }; this.items.unshift(item); this.save() },
    remove(id){ this.items = this.items.filter(x=>x.id!==id); this.save() },
    clear(){ this.items = []; uni.removeStorageSync('userComments') }
  }
})
