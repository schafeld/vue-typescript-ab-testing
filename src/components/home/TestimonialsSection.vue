<!--
  Testimonials Section Component
  
  Displays customer testimonials and reviews
-->

<template>
  <section class="testimonials-section">
    <v-container class="py-16">
      <div class="text-center mb-12">
        <h2 class="text-h3 font-weight-bold mb-4">
          What Our Customers Say
        </h2>
        <p class="text-h6 text-medium-emphasis">
          Real feedback from satisfied customers
        </p>
      </div>

      <v-row>
        <v-col
          v-for="testimonial in testimonials"
          :key="testimonial.id"
          cols="12"
          md="4"
        >
          <v-card class="pa-6 h-100" elevation="2">
            <div class="d-flex align-center mb-4">
              <v-avatar size="50" class="mr-3">
                <v-img :src="testimonial.avatar" :alt="testimonial.name" />
              </v-avatar>
              <div>
                <h4 class="font-weight-medium">{{ testimonial.name }}</h4>
                <div class="text-caption text-medium-emphasis">
                  {{ testimonial.title }}
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <v-rating
                :model-value="testimonial.rating"
                readonly
                size="small"
                color="warning"
              />
            </div>
            
            <blockquote class="text-body-1">
              "{{ testimonial.quote }}"
            </blockquote>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const testimonials = ref([
  {
    id: 1,
    name: 'Sarah Johnson',
    title: 'Verified Customer',
    rating: 5,
    quote: 'Amazing products and fast delivery! I\'ve been a customer for over a year and never been disappointed.',
    avatar: 'https://picsum.photos/100/100?random=20'
  },
  {
    id: 2,
    name: 'Mike Chen',
    title: 'Tech Enthusiast',
    rating: 5,
    quote: 'The quality of their electronics is outstanding. Great customer service too!',
    avatar: 'https://picsum.photos/100/100?random=21'
  },
  {
    id: 3,
    name: 'Emma Williams',
    title: 'Business Owner',
    rating: 4,
    quote: 'Professional service and reliable products. I recommend them to all my colleagues.',
    avatar: 'https://picsum.photos/100/100?random=22'
  }
])
</script>

<style scoped>
.testimonials-section {
  background: linear-gradient(135deg, rgb(var(--v-theme-background)) 0%, rgb(var(--v-theme-surface)) 100%);
}

blockquote {
  font-style: italic;
  position: relative;
}

blockquote::before {
  content: '"';
  font-size: 4rem;
  color: rgb(var(--v-theme-primary));
  position: absolute;
  left: -20px;
  top: -10px;
  opacity: 0.3;
}
</style>