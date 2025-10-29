// uni-app 入口文件
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'
import { createClient } from '@supabase/supabase-js'
import { applySession } from './store/auth'

// add debug to ensure main.js executed
console.log('main.js loaded')

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // initialize supabase client and attach to globalProperties for easy access
  try{
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    app.config.globalProperties.$supabase = supabase

    // try to restore session on app start
    supabase.auth.getSession().then(({ data }) => {
      const session = data && data.session
      if(session){
        applySession({ user: session.user, access_token: session.access_token })
        try{ import('./stores/user.js').then(m=>{ const store = m.useUserStore(); store.applyAuth(session.user) }).catch(()=>{}) }catch(e){}
      }
      // subscribe to auth changes to keep local storage updated
      supabase.auth.onAuthStateChange((event, sess)=>{
        if(sess && sess.access_token){ applySession({ user: sess.user, access_token: sess.access_token }); import('./stores/user.js').then(m=>{ m.useUserStore().applyAuth(sess.user) }).catch(()=>{}) }
        if(event === 'SIGNED_OUT'){ applySession(null); import('./stores/user.js').then(m=>{ m.useUserStore().applyAuth(null) }).catch(()=>{}) }
      })
    }).catch(e=>{ console.warn('supabase session restore failed', e) })

  }catch(e){ console.warn('supabase init failed', e) }

  return {
    app
  }
}
