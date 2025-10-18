<!--
  Features Section Component
  
  Highlights key features and benefits of the platform
-->

<template>
  <section class="features-section">
    <v-container class="py-16">
      <div class="text-center mb-12">
        <h2 class="text-h3 font-weight-bold mb-4">
          Why Choose Us?
        </h2>
        <p class="text-h6 text-medium-emphasis">
          Experience the difference with our premium service
        </p>
      </div>

      <v-row>
        <v-col
          v-for="feature in features"
          :key="feature.id"
          cols="12"
          md="4"
        >
          <div class="text-center">
            <v-avatar size="80" color="primary" class="mb-4">
              <v-icon size="40" color="white">{{ feature.icon }}</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold mb-3">
              {{ feature.title }}
            </h3>
            <p class="text-body-1">
              {{ feature.description }}
            </p>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const features = ref([
  {
    id: 1,
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly with our express shipping options.',
    icon: 'mdi-truck-fast'
  },
  {
    id: 2,
    title: 'Quality Products',
    description: 'We curate only the highest quality products from trusted brands.',
    icon: 'mdi-star'
  },
  {
    id: 3,
    title: '24/7 Support',
    description: 'Our customer service team is available around the clock to help you.',
    icon: 'mdi-headset'
  }
])
</script>

<style scoped>
.features-section {
  background-color: rgb(var(--v-theme-surface));
}
</style>