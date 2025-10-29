import { defineStore } from 'pinia'

export const useSleepStore = defineStore('sleep', {
  state: () => ({
    napTimerMin: 20,
    napStartTs: null,
    alarms: [],
    reminder: { enabled: false, hour: 22, minute: 0, label: '睡前提醒', ringtone: '蝶梦引', repeat: 'daily', volume: 0.7, vibrate: true },
    napReminder: { enabled: false, hour: 13, minute: 0, label: '小憩提醒', ringtone: '清晨', repeat: 'workdays', volume: 0.7, vibrate: false },
    ritualReminder: { enabled: false, hour: 21, minute: 0, label: '睡前仪式提醒', ringtone: '冥想', repeat: 'daily', volume: 0.5, vibrate: true }
  }),
  actions: {
    startNap(minutes){ this.napTimerMin = minutes; this.napStartTs = Date.now() },
    stopNap(){ this.napStartTs = null },

    addAlarm(alarmInput){
      const id = `al_${Date.now()}`
      const alarm = { id, ringtone: '多普勒', enabled: true, label: '新闹钟', hour: 7, minute: 30, repeat: 'daily', volume: 0.8, vibrate: true, ...alarmInput }
      this.alarms.push(alarm)
      this.persist()
      return alarm
    },
    updateAlarm(id, updates){ 
      const alarm = this.alarms.find(x=>x.id===id); 
      if(alarm){ 
        Object.assign(alarm, updates); 
        this.persist() 
      }
    },
    toggleAlarm(id){ const a=this.alarms.find(x=>x.id===id); if(a){ const prev = a.enabled; a.enabled=!a.enabled; this.persist(); // if user turned alarm off and it's a wake alarm, open feedback prompt
      try{ if(prev && !a.enabled && /起床|起床闹钟|起床/.test(a.label || '')){ uni.navigateTo({ url:'/pages/feedback/ModalPrompt' }) } }catch(e){} } },
    removeAlarm(id){ this.alarms = this.alarms.filter(x=>x.id!==id); this.persist() },
    setAlarmTime(id, { hour, minute }){ const a=this.alarms.find(x=>x.id===id); if(a){ a.hour=hour; a.minute=minute; this.persist() } },
    setAlarmRingtone(id, name){ const a=this.alarms.find(x=>x.id===id); if(a){ a.ringtone=name; this.persist() } },
    setAlarmRepeat(id, repeat){ const a=this.alarms.find(x=>x.id===id); if(a){ a.repeat=repeat; this.persist() } },
    setAlarmVolume(id, v){ const a=this.alarms.find(x=>x.id===id); if(a){ a.volume=Math.max(0, Math.min(1, v)); this.persist() } },
    setAlarmVibrate(id, flag){ const a=this.alarms.find(x=>x.id===id); if(a){ a.vibrate=!!flag; this.persist() } },

    setReminder(r){ this.reminder = { ...this.reminder, ...r }; this.persist() },
    setReminderRepeat(repeat){ this.reminder = { ...this.reminder, repeat }; this.persist() },
    setReminderVolume(v){ this.reminder = { ...this.reminder, volume: Math.max(0, Math.min(1, v)) }; this.persist() },
    setReminderVibrate(flag){ this.reminder = { ...this.reminder, vibrate: !!flag }; this.persist() },
    setNapReminder(r){ this.napReminder = { ...this.napReminder, ...r }; this.persist() },
    setRitualReminder(r){ this.ritualReminder = { ...this.ritualReminder, ...r }; this.persist() },

    persist(){
      try{
        uni.setStorageSync('sleepStore', {
          alarms: this.alarms,
          reminder: this.reminder,
          napReminder: this.napReminder,
          ritualReminder: this.ritualReminder,
          napTimerMin: this.napTimerMin,
          napStartTs: this.napStartTs,
        })
      }catch(e){ /* ignore */ }
    },
    load(){
      try{
        const s = uni.getStorageSync('sleepStore')
        if(s && typeof s === 'object'){
          this.alarms = Array.isArray(s.alarms) ? s.alarms : []
          this.reminder = s.reminder || this.reminder
          this.napReminder = s.napReminder || this.napReminder
          this.ritualReminder = s.ritualReminder || this.ritualReminder
          this.napTimerMin = s.napTimerMin ?? this.napTimerMin
          this.napStartTs = s.napStartTs ?? this.napStartTs
        }
      }catch(e){ /* ignore */ }
    }
  }
})
