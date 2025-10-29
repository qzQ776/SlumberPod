<template>
  <swiper class="banner" circular autoplay interval="4000">
    <swiper-item v-for="b in banners" :key="b.id">
      <image class="img" :src="b.image" mode="aspectFill" />
    </swiper-item>
  </swiper>
</template>
<script setup>
const banners = [
  { id: 'b1', image: 'https://picsum.photos/seed/b1/1200/500' },
  { id: 'b2', image: 'https://picsum.photos/seed/b2/1200/500' },
  { id: 'b3', image: 'https://picsum.photos/seed/b3/1200/500' },
]
</script>
<style scoped>
.banner { height: 160px; }
.img { width:100%; height:100%; border-radius: 12px; }
</style>
