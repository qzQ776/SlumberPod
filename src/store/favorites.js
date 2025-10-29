import { defineStore } from 'pinia'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({ items: [] }),
  actions: {
    load(){
      try { const arr = uni.getStorageSync('favoriteItems'); if(Array.isArray(arr)) this.items = arr } catch(e){}
    },
    save(){ try { uni.setStorageSync('favoriteItems', this.items) } catch(e){} },
    add(item){ if(!item) return; const exists = this.items.some(x=>x.id===item.id); if(!exists){ this.items.unshift({ ...item, ts: Date.now() }); this.save() } },
    remove(id){ this.items = this.items.filter(x=>x.id!==id); this.save() },
    clear(){ this.items = []; uni.removeStorageSync('favoriteItems') },
    toggle(item){ if(!item) return; const exists = this.items.some(x=>x.id===item.id); if(exists) this.remove(item.id); else this.add(item) }
  }
})
