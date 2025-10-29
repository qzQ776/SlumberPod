import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    override: null // { backgroundImage, backgroundColor, color, --vars... }
  }),
  actions: {
    setOverride(ov){ this.override = ov || null; this.persist() },
    updateOverride(part){ this.override = { ...(this.override||{}), ...(part||{}) }; this.persist() },
    clearOverride(){ this.override = null; this.persist() },
    load(){
      try{ const s = uni.getStorageSync('themeOverride'); if(s && typeof s==='object') this.override = s }catch(e){}
    },
    persist(){
      try{ if(this.override) uni.setStorageSync('themeOverride', this.override); else uni.removeStorageSync('themeOverride') }catch(e){}
    }
  }
})
