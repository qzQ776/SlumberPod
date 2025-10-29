// auth helper with Supabase support
export const AUTH_KEY = 'app_auth_user'

export function saveAuthLocal(user){
  try{ localStorage.setItem(AUTH_KEY, JSON.stringify(user)) }catch(e){}
}
export function getAuthLocal(){
  try{ return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') }catch(e){ return null }
}
export function clearAuthLocal(){
  try{ localStorage.removeItem(AUTH_KEY) }catch(e){}
}

// utilities to integrate with Supabase client elsewhere
export function applySession(session){
  try{
    if(!session){ localStorage.removeItem(AUTH_KEY); return }
    localStorage.setItem(AUTH_KEY, JSON.stringify({ id: session.user.id, token: session.access_token, name: session.user.user_metadata?.name || session.user.email }))
  }catch(e){}
}