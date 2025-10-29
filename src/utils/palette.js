// Simple palette extraction for H5 using canvas
export async function extractPaletteFromImage(url){
  return new Promise((resolve)=>{
    try{
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = ()=>{
        const w = 64, h = 64
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const data = ctx.getImageData(0,0,w,h).data
        let r=0,g=0,b=0,count=0
        for(let i=0;i<data.length;i+=4){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++ }
        r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count)
        const luminance = (0.2126*r + 0.7152*g + 0.0722*b)
        const isLight = luminance > 170
        const toHex = (x)=>('#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join(''))
        const hex = toHex()
        const darken = (factor)=>{
          const dr = Math.max(0, Math.round(r*(1-factor)))
          const dg = Math.max(0, Math.round(g*(1-factor)))
          const db = Math.max(0, Math.round(b*(1-factor)))
          return '#'+[dr,dg,db].map(n=>n.toString(16).padStart(2,'0')).join('')
        }
        const lighten = (factor)=>{
          const lr = Math.min(255, Math.round(r+(255-r)*factor))
          const lg = Math.min(255, Math.round(g+(255-g)*factor))
          const lb = Math.min(255, Math.round(b+(255-b)*factor))
          return '#'+[lr,lg,lb].map(n=>n.toString(16).padStart(2,'0')).join('')
        }
        const base = isLight ? darken(0.4) : hex
        const high = isLight ? hex : lighten(0.35)
        const gradient = `radial-gradient(120% 80% at 50% 20%, ${high} 0%, ${base} 60%, ${darken(0.2)} 100%)`
        const text = isLight ? '#0f172a' : '#e7e9ee'
        const accent = isLight ? darken(0.25) : lighten(0.45)
        const shadow = isLight ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.35)'
        resolve({ hex, isLight, gradient, text, baseColor: base, accent, shadow })
      }
      img.onerror = ()=> resolve({ hex:'#222222', isLight:false, gradient:'linear-gradient(#222,#111)', text:'#e7e9ee', baseColor:'#111111' })
      img.src = url
    }catch(e){ resolve({ hex:'#222222', isLight:false, gradient:'linear-gradient(#222,#111)', text:'#e7e9ee', baseColor:'#111111' }) }
  })
}
