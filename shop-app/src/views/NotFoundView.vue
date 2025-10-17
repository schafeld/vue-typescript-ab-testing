<!--
  404 Not Found View Component
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'
import { onMounted } from 'vue'

const router = useRouter()
const analytics = useAnalytics()

const goHome = () => {
  analytics.track('404_home_clicked')
  router.push('/')
}

const goToProducts = () => {
  analytics.track('404_products_clicked')
  router.push('/products')
}

onMounted(() => {
  analytics.track('page_view', { 
    page: '404',
    path: router.currentRoute.value.path
  })
})
</script>

<template>
  <div class="not-found-page">
    <v-container class="text-center py-16">
      <v-icon size="120" color="grey-lighten-2" class="mb-6">
        mdi-emoticon-sad-outline
      </v-icon>
      
      <h1 class="text-h2 font-weight-bold mb-4">404</h1>
      <h2 class="text-h4 mb-4">Page Not Found</h2>
      
      <p class="text-body-1 text-medium-emphasis mb-8 mx-auto" style="max-width: 400px;">
        The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
      </p>
      
      <div class="d-flex flex-column flex-sm-row gap-4 justify-center">
        <v-btn
          color="primary"
          size="large"
          @click="goHome"
        >
          <v-icon start>mdi-home</v-icon>
          Go Home
        </v-btn>
        
        <v-btn
          variant="outlined"
          size="large"
          @click="goToProducts"
        >
          <v-icon start>mdi-store</v-icon>
          Browse Products
        </v-btn>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
}
</style>