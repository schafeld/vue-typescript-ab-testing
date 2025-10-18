<!--
  Thank You / Order Confirmation View Component
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'

const router = useRouter()
const analytics = useAnalytics()

const orderId = ref(`ORD-${Date.now()}`)

const continueShopping = () => {
  analytics.track('thank_you_continue_shopping')
  router.push('/products')
}

const goHome = () => {
  analytics.track('thank_you_home_clicked')
  router.push('/')
}

onMounted(() => {
  analytics.track('page_view', { 
    page: 'thank-you',
    orderId: orderId.value
  })
})
</script>

<template>
  <div class="thank-you-page">
    <v-container class="text-center py-16">
      <v-icon size="120" color="success" class="mb-6">
        mdi-check-circle
      </v-icon>
      
      <h1 class="text-h3 font-weight-bold mb-4">Thank You!</h1>
      <h2 class="text-h5 mb-6">Your order has been confirmed</h2>

      <h2 class="text-h5 mb-6">NOTICE: This shop is just a technical demo. No real orders are processed. None of your data is stored.</h2>
      
      <v-card class="mx-auto mb-8" max-width="400" elevation="2">
        <v-card-text>
          <p class="text-body-1 mb-4">
            <strong>Order Number:</strong><br>
            {{ orderId }}
          </p>
          
          <p class="text-body-2 text-medium-emphasis">
            You will receive a confirmation email shortly with your order details and tracking information.
          </p>
        </v-card-text>
      </v-card>
      
      <div class="d-flex flex-column flex-sm-row gap-4 justify-center">
        <v-btn
          color="primary"
          size="large"
          @click="continueShopping"
        >
          <v-icon start>mdi-store</v-icon>
          Continue Shopping
        </v-btn>
        
        <v-btn
          variant="outlined"
          size="large"
          @click="goHome"
        >
          <v-icon start>mdi-home</v-icon>
          Go Home
        </v-btn>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.thank-you-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background-color: #fafafa;
}
</style>