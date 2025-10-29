<template>
  <view class="page" :style="bgStyle">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">AI解梦助手</text>
      <text class="subtitle">告诉我你的梦境，我来帮你分析</text>
    </view>

    <!-- 聊天消息区域 -->
    <scroll-view class="chat-container" scroll-y>
      <view v-for="(message, index) in messages" :key="index" class="message" :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }">
        <view class="avatar">
          <text v-if="message.role === 'user'" class="avatar-text">👤</text>
          <text v-else class="avatar-text">🤖</text>
        </view>
        <view class="content">
          <text class="text">{{ message.content }}</text>
          <text v-if="message.timestamp" class="timestamp">{{ message.timestamp }}</text>
        </view>
      </view>
      <view v-if="isLoading" class="message ai-message">
        <view class="avatar">
          <text class="avatar-text">🤖</text>
        </view>
        <view class="content">
          <view class="typing-indicator">
            <text class="dot"></text>
            <text class="dot"></text>
            <text class="dot"></text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-container">
      <view class="input-wrapper">
        <input 
          v-model="inputText" 
          class="input" 
          placeholder="请输入你的梦境描述..." 
          :disabled="isLoading"
          @confirm="sendMessage"
          style="border: 2px solid #007aff; background: white; color: #333;"
        />
        <button class="send-btn" :disabled="!inputText.trim() || isLoading" @click="sendMessage">
          <text class="send-icon">发送</text>
        </button>
      </view>
      <text class="input-hint">输入梦境描述后点击发送按钮或按回车键</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)

// 初始化欢迎消息
onMounted(() => {
  messages.value.push({
    role: 'assistant',
    content: '你好！我是AI解梦助手。请告诉我你最近的梦境，我会帮你分析和解读。',
    timestamp: getCurrentTime()
  })
})

// 获取当前时间
function getCurrentTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 发送消息
async function sendMessage() {
  if (!inputText.value.trim() || isLoading.value) return

  const userMessage = inputText.value.trim()
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: userMessage,
    timestamp: getCurrentTime()
  })

  // 清空输入框
  inputText.value = ''
  
  // 显示加载状态
  isLoading.value = true

  try {
    // 模拟AI回复（实际项目中可以接入真实的AI API）
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const aiResponse = generateDreamAnalysis(userMessage)
    
    // 添加AI回复
    messages.value.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: getCurrentTime()
    })

    // 滚动到底部
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-container')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }, 100)

  } catch (error) {
    console.error('发送消息失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我暂时无法处理你的请求，请稍后再试。',
      timestamp: getCurrentTime()
    })
  } finally {
    isLoading.value = false
  }
}

// 生成梦境分析（模拟AI回复）
function generateDreamAnalysis(dreamDescription) {
  const responses = [
    `根据你的描述"${dreamDescription}"，这个梦境可能反映了你最近的压力和焦虑情绪。建议你多关注自己的心理健康，适当放松。`,
    `"${dreamDescription}"这个梦境很有意思，它可能暗示着你对某些事情的期待或担忧。试着回想一下最近的生活经历，看看是否有相关联系。`,
    `从心理学角度看，"${dreamDescription}"这样的梦境通常与潜意识中的情感有关。建议你记录下更多的梦境细节，以便更深入的分析。`,
    `你的梦境"${dreamDescription}"让我想到了一些常见的梦境象征。这可能是你内心对变化的适应过程的表现。`,
    `"${dreamDescription}"这个梦境很有启发性。它可能反映了你当前的生活状态或人际关系。建议你多关注自己的感受和需求。`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 80px; }

/* 页面标题 */
.header {
  padding: 20px 16px 16px;
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--fg);
  display: block;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: var(--muted);
  display: block;
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  padding: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

/* 消息样式 */
.message {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.user-message {
  flex-direction: row-reverse;
}

.ai-message {
  flex-direction: row;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px;
  flex-shrink: 0;
}

.user-message .avatar {
  background: var(--uni-color-primary);
}

.ai-message .avatar {
  background: #10b981;
}

.avatar-text {
  font-size: 16px;
}

.content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
}

.user-message .content {
  background: var(--uni-color-primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-message .content {
  background: var(--input-bg);
  color: var(--fg);
  border-bottom-left-radius: 4px;
}

.text {
  font-size: 14px;
  line-height: 1.4;
}

.timestamp {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
  display: block;
}

.ai-message .timestamp {
  color: var(--muted);
}

/* 输入区域 */
.input-container {
  position: fixed;
  bottom: 50px; /* 为底部导航栏留出空间 */
  left: 0;
  right: 0;
  background: #f8f9fa;
  padding: 16px;
  border-top: 2px solid #e9ecef;
  z-index: 1000;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.input {
  flex: 1;
  background: white;
  border: 2px solid #007aff;
  border-radius: 25px;
  padding: 14px 20px;
  font-size: 16px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

.input:focus {
  outline: none;
  border-color: #0056b3;
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.3);
}

.send-btn {
  min-width: 60px;
  height: 48px;
  border-radius: 24px;
  background: #007aff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.send-btn:disabled {
  background: #ccc;
  opacity: 0.6;
}

.send-btn:not(:disabled):hover {
  background: #0056b3;
}

.send-icon {
  font-size: 14px;
}

.input-hint {
  font-size: 12px;
  color: #666;
  text-align: center;
  display: block;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>