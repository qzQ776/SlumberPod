import { ref } from 'vue'

const STORAGE_KEY = 'sleep_feedback_tasks'
const FEEDBACK_KEY = 'sleep_feedback_records'

export const scheduleFeedbackReminder = (timestamp) => {
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  const id = 'fb_' + Date.now()
  arr.push({ id, fireAt: timestamp, attempts:0, enabled:true })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  // register local notification (platform-specific), here we try uni.requestPermission or local message
  try{ if (typeof uni !== 'undefined' && uni.requestPermission) uni.requestPermission() }catch(e){}
}

export const saveFeedback = async (payload) => {
  const arr = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]')
  arr.push(payload)
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(arr))
  return true
}

export const getScheduled = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
export const getFeedbacks = () => JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]')

// function to be called on app start to re-schedule local notifications
export const restoreScheduled = () => {
  const tasks = getScheduled()
  // no-op for now
}
