import { ref, computed, onMounted } from 'vue'

export function useTimeTheme() {
  const hour = ref(getHour())
  const theme = computed(()=> getThemeByHour(hour.value))
  const bgStyle = computed(()=> ({
    backgroundImage: gradients[theme.value],
    backgroundColor: baseColors[theme.value],
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%'
  }))

  const updateFromHash = () => {
    const h = readHourFromHash()
    if(typeof h === 'number') hour.value = h
  }

  onMounted(()=>{
    const h = readHourFromHash()
    if(typeof h === 'number') hour.value = h
    const id = setInterval(()=>{ hour.value = getHour() }, 60*1000)
    if(typeof window !== 'undefined') {
      window.addEventListener('hashchange', updateFromHash)
    }
  })

  return { hour, theme, bgStyle }
}

export function getHour(){
  const fromHash = readHourFromHash()
  if(typeof fromHash === 'number') return clampHour(fromHash)
  return new Date().getHours()
}

function clampHour(h){ return Math.max(0, Math.min(23, h)) }

function readHourFromHash(){
  if(typeof window === 'undefined' || !window.location || !window.location.hash) return undefined
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if(qIndex === -1) return undefined
  const query = hash.substring(qIndex+1)
  const usp = new URLSearchParams(query)
  const raw = usp.get('hour')
  if(raw == null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export function getThemeByHour(h){
  if(h>=5 && h<10) return 'dawn'
  if(h>=10 && h<17) return 'day'
  if(h>=17 && h<20) return 'dusk'
  return 'night'
}

export const gradients = {
  night: 'radial-gradient(120% 80% at 50% 20%, #151824 0%, #0c0f16 60%, #0a0c12 100%)',
  dusk:  'radial-gradient(120% 80% at 50% 20%, #1f2430 0%, #161a24 60%, #12141c 100%)',
  day:   'radial-gradient(120% 80% at 50% 20%, #eef1f6 0%, #dfe6f2 60%, #d7e0ee 100%)',
  dawn:  'radial-gradient(120% 80% at 50% 20%, #273043 0%, #1f2737 60%, #1a2130 100%)',
}

export const baseColors = {
  night: '#0c0f16',
  dusk: '#171b26',
  day: '#e6ecf8',
  dawn: '#202838',
}

export const textColors = {
  night: '#e7e9ee',
  dusk: '#e7e9ee',
  day: '#0f172a',
  dawn: '#e7e9ee',
}
