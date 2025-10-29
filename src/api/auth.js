// Switch to backend-auth proxy endpoints
import { saveAuthLocal, clearAuthLocal, applySession } from '@/store/auth'

const BASE = 'http://localhost:3003' // backend server URL

export async function register({ name, identifier, password }){
  const res = await fetch(BASE + '/api/auth/register', {
    method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, identifier, password })
  })
  const j = await res.json()
  if(!res.ok) throw new Error(j.error || 'register failed')
  // save backend token
  if(j.token) applySession({ user: j.user, access_token: j.token })
  return j
}

export async function login({ identifier, password }){
  const res = await fetch(BASE + '/api/auth/login', {
    method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ identifier, password })
  })
  const j = await res.json()
  if(!res.ok) throw new Error(j.error || 'login failed')
  if(j.token) applySession({ user: j.user, access_token: j.token })
  return j
}

export async function getMe(){
  const raw = localStorage.getItem('app_auth_user')
  if(!raw) return null
  const auth = JSON.parse(raw)
  const res = await fetch(BASE + '/api/auth/me', { 
    headers: { Authorization: `Bearer ${auth.token}` } 
  })
  if(!res.ok) return null
  const j = await res.json()
  return j.user
}

export function logout(){
  try{ fetch(BASE + '/api/auth/logout') }catch(e){}
  clearAuthLocal()
}
