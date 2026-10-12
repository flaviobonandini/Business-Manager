<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const visible = ref(false)

function getScrollTop() {
  const documentScroll =
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0

  const mainContent = document.querySelector('.main-content')

  const mainScroll = mainContent
    ? mainContent.scrollTop
    : 0

  return Math.max(documentScroll, mainScroll)
}

function checkScroll() {
  visible.value = getScrollTop() > 200
}

function scrollToTop() {
  // Scroll della pagina
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })

  // Se main-content ha uno scroll proprio
  const mainContent = document.querySelector('.main-content')

  if (mainContent) {
    mainContent.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
}

onMounted(() => {
  // true = intercetta anche lo scroll di elementi interni
  window.addEventListener(
    'scroll',
    checkScroll,
    true
  )

  checkScroll()
})

onUnmounted(() => {
  window.removeEventListener(
    'scroll',
    checkScroll,
    true
  )
})
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="scroll-top-button"
    title="Back to top"
    aria-label="Back to top"
    @click="scrollToTop"
  >
    ↑
  </button>
</template>

<style scoped>
.scroll-top-button {
  position: fixed;

  right: 25px;
  bottom: 25px;

  z-index: 99999;

  width: 46px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: #2563eb;
  color: white;

  font-size: 25px;
  font-weight: bold;

  cursor: pointer;

  box-shadow:
    0 4px 12px
    rgba(0, 0, 0, 0.25);
}

.scroll-top-button:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}
</style>