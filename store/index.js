import { createStore } from 'vuex';

export default createStore({
  state: {
    user: null,
    audioList: [],
    sleepRecords: []
  },
  mutations: {
    // 修改用户信息
    setUser(state, user) {
      state.user = user;
    },
    // 1. 全量替换音频列表
    setAudioList(state, list) {
      state.audioList = list; // 接收新数组，直接替换原列表
    },
    // 2. 新增单个音频到列表
    addAudio(state, audioItem) {
      state.audioList.push(audioItem); // 向数组尾部添加新音频对象
    },
    // 3. 全量替换睡眠记录
    setSleepRecords(state, records) {
      state.sleepRecords = records;
    },
    // 4. 新增单条睡眠记录
    addSleepRecord(state, recordItem) {
      state.sleepRecords.push(recordItem);
    }
  }
});