<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">闹钟</text>
      <text class="header-desc">设置和管理您的闹钟</text>
    </view>

    <!-- 闹钟列表 -->
    <scroll-view class="alarms-content" scroll-y>
      <view class="section">
        <text class="section-title">我的闹钟</text>
        <view class="alarms-list">
          <view 
            v-for="alarm in sleep.alarms" 
            :key="alarm.id"
            class="alarm-item"
            :class="{ active: alarm.enabled }"
          >
            <view class="alarm-main">
              <view class="alarm-info" @click="openTimePicker(alarm)">
                <text class="alarm-time">{{ formatTime(alarm.hour, alarm.minute) }}</text>
                <text class="alarm-label">{{ alarm.label || '闹钟' }}</text>
                <text class="alarm-repeat">{{ formatRepeat(alarm.repeat) }}</text>
              </view>
              <switch 
                :checked="alarm.enabled" 
                @change="() => toggleAlarm(alarm.id)"
                class="alarm-switch"
              />
            </view>
            
            <!-- 闹钟设置详情 -->
            <view class="alarm-settings" v-if="alarm.enabled">
              <!-- 备注 -->
              <view class="setting-row">
                <text class="setting-label">备注</text>
                <input 
                  v-model="alarm.label" 
                  class="remark-input" 
                  placeholder="添加备注..."
                  @blur="updateAlarm(alarm)"
                />
              </view>
              
              <!-- 再睡一会 -->
              <view class="setting-row">
                <text class="setting-label">再睡一会</text>
                <view class="snooze-options">
                  <view 
                    v-for="option in snoozeOptions" 
                    :key="option.value"
                    class="snooze-option"
                    :class="{ active: alarm.snooze === option.value }"
                    @click="setSnooze(alarm, option.value)"
                  >
                    <text class="snooze-text">{{ option.label }}</text>
                  </view>
                </view>
              </view>
              
              <!-- 铃声选择 -->
              <view class="setting-row">
                <text class="setting-label">铃声</text>
                <view class="ringtone-picker" @click="showRingtonePicker(alarm)">
                  <text class="ringtone-value">{{ alarm.ringtone || '默认铃声' }}</text>
                  <text class="picker-arrow">›</text>
                </view>
              </view>
              
              <!-- 振动设置 -->
              <view class="setting-row">
                <text class="setting-label">振动</text>
                <view class="vibration-toggle" @click="toggleVibration(alarm)">
                  <text class="vibration-text">{{ alarm.vibrate ? '开启' : '关闭' }}</text>
                  <view class="toggle-switch" :class="{ on: alarm.vibrate }">
                    <view class="toggle-thumb"></view>
                  </view>
                </view>
              </view>
              
              <!-- 音量调节 -->
              <view class="setting-row">
                <text class="setting-label">音量</text>
                <view class="volume-control">
                  <text class="volume-icon">🔊</text>
                  <input 
                    type="range" 
                    :value="alarm.volume * 100" 
                    @input="(e) => setAlarmVolume(alarm.id, e.target.value / 100)"
                    min="0" 
                    max="100" 
                    class="volume-slider"
                  />
                  <text class="volume-value">{{ Math.round(alarm.volume * 100) }}%</text>
                </view>
              </view>
              
              <!-- 删除按钮 -->
              <view class="delete-row">
                <view class="delete-btn" @click="deleteAlarm(alarm)">
                  <text class="delete-icon">🗑️</text>
                  <text class="delete-text">删除闹钟</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 空状态 -->
        <view class="empty-state" v-if="sleep.alarms.length === 0">
          <text class="empty-icon">⏰</text>
          <text class="empty-title">暂无闹钟</text>
          <text class="empty-desc">点击下方按钮添加第一个闹钟</text>
        </view>
      </view>
    </scroll-view>

    <!-- 时间选择器模态框 -->
    <view class="modal" v-if="showTimePicker">
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">设置时间</text>
          <view class="modal-actions">
            <text class="modal-cancel" @click="cancelTimePicker">取消</text>
            <text class="modal-confirm" @click="confirmTimePicker">确定</text>
          </view>
        </view>
        
        <view class="time-picker">
          <picker-view 
            :value="timeValue" 
            @change="onTimeChange" 
            class="picker-view"
            indicator-style="height: 50px; background: transparent;"
          >
            <picker-view-column>
              <view v-for="hour in hours" :key="hour" class="picker-item">
                <text>{{ String(hour).padStart(2, '0') }}</text>
              </view>
            </picker-view-column>
            <picker-view-column>
              <view v-for="minute in minutes" :key="minute" class="picker-item">
                <text>{{ String(minute).padStart(2, '0') }}</text>
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </view>

    <!-- 铃声选择器模态框 -->
    <view class="modal" v-if="showRingtoneModal">
      <view class="modal-content ringtone-modal">
        <view class="modal-header">
          <text class="modal-title">选择铃声</text>
          <text class="modal-close" @click="closeRingtoneModal">×</text>
        </view>
        
        <scroll-view class="ringtone-list" scroll-y>
          <view 
            v-for="ringtone in ringtones" 
            :key="ringtone.id"
            class="ringtone-item"
            :class="{ active: selectedRingtone === ringtone.id }"
            @click="selectRingtone(ringtone)"
          >
            <text class="ringtone-icon">🎵</text>
            <view class="ringtone-info">
              <text class="ringtone-name">{{ ringtone.name }}</text>
              <text class="ringtone-desc">{{ ringtone.desc }}</text>
            </view>
            <text class="ringtone-check" v-if="selectedRingtone === ringtone.id">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部添加按钮 -->
    <view class="fab" @click="addAlarm">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useSleepStore } from '@/stores/sleep'

const sleep = useSleepStore()
const { bgStyle } = useGlobalTheme()

// 本地状态
const showTimePicker = ref(false)
const showRingtoneModal = ref(false)
const editingAlarm = ref(null)
const selectedRingtone = ref('')

// 时间选择器数据
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)
const timeValue = ref([0, 0])

// 再睡一会选项
const snoozeOptions = ref([
  { label: '关闭', value: 0 },
  { label: '5分钟', value: 5 },
  { label: '10分钟', value: 10 },
  { label: '15分钟', value: 15 }
])

// 铃声列表
const ringtones = ref([
  { id: 'default', name: '默认铃声', desc: '系统默认铃声' },
  { id: 'doppler', name: '多普勒', desc: '柔和的环境音' },
  { id: 'dream', name: '蝶梦引', desc: '轻柔的梦境音' },
  { id: 'rain', name: '雨声', desc: '自然的雨滴声' },
  { id: 'ocean', name: '海浪', desc: '舒缓的海浪声' },
  { id: 'birds', name: '鸟鸣', desc: '清晨的鸟叫声' }
])

onMounted(() => {
  sleep.load()
  // 如果没有闹钟，添加一个示例闹钟
  if (sleep.alarms.length === 0) {
    const now = new Date()
    sleep.addAlarm({
      hour: now.getHours(),
      minute: now.getMinutes(),
      label: '起床闹钟',
      enabled: true,
      ringtone: 'doppler',
      repeat: 'daily',
      volume: 0.8,
      vibrate: true,
      snooze: 5
    })
  }
})

// 格式化时间
function formatTime(hour, minute) {
  const h = String(hour).padStart(2, '0')
  const m = String(minute).padStart(2, '0')
  return `${h}:${m}`
}

// 格式化重复设置
function formatRepeat(repeat) {
  const repeatMap = {
    'daily': '每天',
    'weekdays': '工作日',
    'weekends': '周末',
    'once': '仅一次'
  }
  return repeatMap[repeat] || '每天'
}

// 闹钟操作
function toggleAlarm(alarmId) {
  sleep.toggleAlarm(alarmId)
}

function addAlarm() {
  const now = new Date()
  sleep.addAlarm({
    hour: now.getHours(),
    minute: now.getMinutes(),
    label: '新闹钟',
    enabled: true,
    ringtone: 'doppler',
    repeat: 'daily',
    volume: 0.8,
    vibrate: true,
    snooze: 5
  })
  uni.showToast({
    title: '已添加新闹钟',
    icon: 'success'
  })
}

function updateAlarm(alarm) {
  // 备注更新后自动保存
  sleep.updateAlarm(alarm.id, alarm)
}

// 再睡一会设置
function setSnooze(alarm, minutes) {
  alarm.snooze = minutes
  sleep.updateAlarm(alarm.id, alarm)
}

// 振动设置
function toggleVibration(alarm) {
  alarm.vibrate = !alarm.vibrate
  sleep.updateAlarm(alarm.id, alarm)
}

// 音量设置
function setAlarmVolume(alarmId, volume) {
  sleep.setAlarmVolume(alarmId, volume)
}

// 时间选择器
function openTimePicker(alarm) {
  editingAlarm.value = alarm
  timeValue.value = [alarm.hour, alarm.minute]
  showTimePicker.value = true
}

function onTimeChange(e) {
  timeValue.value = e.detail.value
}

function cancelTimePicker() {
  showTimePicker.value = false
  editingAlarm.value = null
}

function confirmTimePicker() {
  if (editingAlarm.value) {
    editingAlarm.value.hour = timeValue.value[0]
    editingAlarm.value.minute = timeValue.value[1]
    sleep.updateAlarm(editingAlarm.value.id, editingAlarm.value)
  }
  showTimePicker.value = false
  editingAlarm.value = null
}

// 铃声选择器
function showRingtonePicker(alarm) {
  editingAlarm.value = alarm
  selectedRingtone.value = alarm.ringtone || 'default'
  showRingtoneModal.value = true
}

function selectRingtone(ringtone) {
  selectedRingtone.value = ringtone.id
  if (editingAlarm.value) {
    editingAlarm.value.ringtone = ringtone.id
    sleep.updateAlarm(editingAlarm.value.id, editingAlarm.value)
  }
  // 延迟关闭以显示选中效果
  setTimeout(() => {
    showRingtoneModal.value = false
    editingAlarm.value = null
  }, 300)
}

function closeRingtoneModal() {
  showRingtoneModal.value = false
  editingAlarm.value = null
}

// 删除闹钟
function deleteAlarm(alarm) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除闹钟"${alarm.label}"吗？`,
    success: (res) => {
      if (res.confirm) {
        sleep.removeAlarm(alarm.id)
        uni.showToast({
          title: '闹钟已删除',
          icon: 'success'
        })
      }
    }
  })
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg, #f8f9fa);
}

.header {
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.header-desc {
  display: block;
  font-size: 14px;
  opacity: 0.9;
}

.alarms-content {
  height: calc(100vh - 120px);
  padding: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
  margin-bottom: 16px;
}

.alarms-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alarm-item {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.alarm-item.active {
  border-left: 4px solid var(--uni-color-primary, #007aff);
}

.alarm-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.alarm-info {
  flex: 1;
}

.alarm-time {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--fg, #333);
  margin-bottom: 4px;
}

.alarm-label {
  display: block;
  font-size: 14px;
  color: var(--muted, #666);
  margin-bottom: 2px;
}

.alarm-repeat {
  display: block;
  font-size: 12px;
  color: var(--muted, #999);
}

.alarm-switch {
  transform: scale(1.2);
}

.alarm-settings {
  border-top: 1px solid var(--border, #f0f0f0);
  padding-top: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.setting-label {
  font-size: 14px;
  color: var(--muted, #666);
  min-width: 80px;
}

.remark-input {
  flex: 1;
  background: var(--input-bg, #f8f9fa);
  border: 1px solid var(--border, #f0f0f0);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
}

.remark-input:focus {
  border-color: var(--uni-color-primary, #007aff);
}

.snooze-options {
  display: flex;
  gap: 8px;
  flex: 1;
}

.snooze-option {
  padding: 6px 12px;
  background: var(--input-bg, #f8f9fa);
  border: 1px solid var(--border, #f0f0f0);
  border-radius: 16px;
  font-size: 12px;
  color: var(--muted, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.snooze-option.active {
  background: var(--uni-color-primary, #007aff);
  border-color: var(--uni-color-primary, #007aff);
  color: white;
}

.snooze-option:active {
  transform: scale(0.95);
}

.ringtone-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.ringtone-picker:active {
  transform: scale(0.98);
}

.ringtone-value {
  font-size: 14px;
  color: var(--fg, #333);
}

.picker-arrow {
  font-size: 16px;
  color: var(--muted, #999);
}

.vibration-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.vibration-toggle:active {
  transform: scale(0.98);
}

.vibration-text {
  font-size: 14px;
  color: var(--fg, #333);
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: var(--border, #f0f0f0);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s;
}

.toggle-switch.on {
  background: var(--uni-color-primary, #007aff);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch.on .toggle-thumb {
  left: 22px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.volume-icon {
  font-size: 16px;
  color: var(--muted, #666);
}

.volume-slider {
  flex: 1;
  height: 4px;
  background: var(--border, #f0f0f0);
  border-radius: 2px;
  outline: none;
}

.volume-value {
  font-size: 12px;
  color: var(--muted, #666);
  min-width: 40px;
  text-align: right;
}

.delete-row {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ff3b30;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:active {
  transform: scale(0.95);
}

.delete-icon {
  font-size: 14px;
}

.delete-text {
  font-size: 14px;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  margin-top: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
  margin-bottom: 8px;
}

.empty-desc {
  display: block;
  font-size: 14px;
  color: var(--muted, #666);
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg, white);
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 30px var(--shadow, rgba(0, 0, 0, 0.15));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border, #f0f0f0);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
}

.modal-actions {
  display: flex;
  gap: 20px;
}

.modal-cancel, .modal-confirm {
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.modal-cancel {
  color: var(--muted, #666);
}

.modal-confirm {
  color: var(--uni-color-primary, #007aff);
}

.modal-close {
  font-size: 24px;
  color: var(--muted, #666);
  cursor: pointer;
}

.time-picker {
  height: 200px;
}

.picker-view {
  height: 100%;
}

.picker-item {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s;
}

.picker-item text {
  color: var(--muted, #666666);
  font-weight: 500;
  transition: all 0.3s;
}

/* 选中项样式 */
.picker-view-column .picker-item {
  position: relative;
  z-index: 1;
}

.picker-view-column .picker-item text {
  transition: all 0.3s ease;
}

/* 选中项样式 - 透明背景上的高亮效果 */
.picker-view-column .picker-item:nth-child(2) text {
  font-size: 34px;
  font-weight: 900;
  color: #000000;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8), 0 0 50px rgba(0, 0, 0, 0.6);
  filter: brightness(1.2) contrast(1.8);
  letter-spacing: 1.5px;
  position: relative;
  z-index: 10;
  background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 50%, #ffeb3b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ringtone-modal {
  max-height: 70vh;
}

.ringtone-list {
  max-height: 400px;
}

.ringtone-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #f0f0f0);
  cursor: pointer;
  transition: all 0.2s;
}

.ringtone-item:last-child {
  border-bottom: none;
}

.ringtone-item.active {
  background: var(--input-bg, #f8f9fa);
}

.ringtone-icon {
  font-size: 20px;
  margin-right: 12px;
}

.ringtone-info {
  flex: 1;
}

.ringtone-name {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: var(--fg, #333);
  margin-bottom: 2px;
}

.ringtone-desc {
  display: block;
  font-size: 12px;
  color: var(--muted, #666);
}

.ringtone-check {
  font-size: 18px;
  color: var(--uni-color-primary, #007aff);
  font-weight: bold;
}

.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  background: var(--uni-color-primary, #007aff);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s;
}

.fab:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.4);
}

.fab-icon {
  font-size: 24px;
  font-weight: 600;
}
</style>
