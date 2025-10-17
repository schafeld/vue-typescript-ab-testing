<!--
  Home Page Component
  
  This component demonstrates:
  1. A/B testing for hero sections and CTAs
  2. Product showcases with conversion tracking
  3. Responsive design with Vuetify
  4. Analytics integration for user interactions
  5. Performance-optimized image loading
  
  A/B Tests Implemented:
  - Hero section layout (centered vs left-aligned)
  - CTA button text and colors
  - Product grid vs carousel layout
  - Newsletter signup placement and copy
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'
import HeroSection from '@/components/home/HeroSection.vue'
import ProductShowcase from '@/components/home/ProductShowcase.vue'
import FeaturesSection from '@/components/home/FeaturesSection.vue'
import TestimonialsSection from '@/components/home/TestimonialsSection.vue'

/**
 * Component setup and dependencies
 */
const router = useRouter()
const analytics = useAnalytics()

/**
 * A/B Testing Setup
 * 
 * Multiple experiments running on the homepage to optimize conversion
 */

// Hero section layout test
const { 
  variant: heroVariant, 
  config: heroConfig, 
  trackConversion: trackHeroConversion 
} = useABTest('homepage-hero-test', {
  onVariantAssigned: (variant) => {
    console.log('Hero variant assigned:', variant.name)
  }
})

// Product showcase layout test  
const { 
  variant: showcaseVariant, 
  config: showcaseConfig 
} = useABTest('homepage-showcase-test')

// Newsletter signup test
const { 
  variant: newsletterVariant, 
  config: newsletterConfig 
} = useABTest('homepage-newsletter-test')

/**
 * Component state
 */
const isLoading = ref(true)
const featuredProducts = ref([
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    originalPrice: 399.99,
    currency: 'EUR',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    rating: 4.8,
    reviewCount: 1247,
    category: 'Electronics',
    inStock: true,
    stockQuantity: 15,
    tags: ['bestseller', 'sale']
  },
  {
    id: '2', 
    name: 'Ergonomic Office Chair',
    price: 449.99,
    currency: 'EUR',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    rating: 4.6,
    reviewCount: 892,
    category: 'Furniture',
    inStock: true,
    stockQuantity: 8,
    tags: ['new']
  },
  {
    id: '3',
    name: 'Smart Fitness Watch',
    price: 199.99,
    currency: 'EUR', 
    imageUrl: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400',
    rating: 4.7,
    reviewCount: 2156,
    category: 'Electronics',
    inStock: true,
    stockQuantity: 23,
    tags: ['trending']
  }
])

/**
 * Computed properties
 */

// Dynamic hero configuration based on A/B test
const heroSettings = computed(() => ({
  layout: heroConfig.value.layout || 'centered',
  backgroundImage: heroConfig.value.backgroundImage || 'gradient',
  ctaText: heroConfig.value.ctaText || 'Shop Now',
  ctaColor: heroConfig.value.ctaColor || 'primary',
  headline: heroConfig.value.headline || 'Discover Amazing Products',
  subheadline: heroConfig.value.subheadline || 'Find everything you need with our A/B tested shopping experience'
}))

// Showcase layout configuration
const showcaseSettings = computed(() => ({
  layout: showcaseConfig.value.layout || 'grid',
  itemsPerRow: showcaseConfig.value.itemsPerRow || 3,
  showPricing: showcaseConfig.value.showPricing !== false,
  showRatings: showcaseConfig.value.showRatings !== false
}))

/**
 * Event handlers
 */

// Handle hero CTA click
const handleHeroCTA = async () => {
  // Track conversion for hero A/B test
  await trackHeroConversion(0, 'hero_cta_click')
  
  // Track analytics event
  await analytics.track('hero_cta_click', {
    variant: heroVariant.value?.name || 'control',
    ctaText: heroSettings.value.ctaText
  })
  
  // Navigate to products page
  await router.push('/products')
}

// Handle product click
const handleProductClick = async (productId: string, productName: string) => {
  await analytics.track('product_click_homepage', {
    productId,
    productName,
    section: 'featured_products',
    showcaseVariant: showcaseVariant.value?.name || 'control'
  })
  
  await router.push(`/products/${productId}`)
}

// Handle newsletter signup
const handleNewsletterSignup = async (email: string) => {
  await analytics.track('newsletter_signup_homepage', {
    email,
    variant: newsletterVariant.value?.name || 'control',
    placement: newsletterConfig.value.placement || 'bottom'
  })
}

/**
 * Lifecycle hooks
 */
onMounted(async () => {
  // Track page view
  await analytics.trackPageView('/', {
    heroVariant: heroVariant.value?.name,
    showcaseVariant: showcaseVariant.value?.name,
    newsletterVariant: newsletterVariant.value?.name
  })
  
  // Simulate loading time
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})
</script>

<template>
  <div class="home-page">
    <!-- Loading State -->
    <v-overlay 
      v-if="isLoading" 
      model-value 
      contained 
      class="align-center justify-center"
    >
      <v-progress-circular indeterminate size="64" />
    </v-overlay>

    <!-- Main Content -->
    <template v-else>
      <!-- Hero Section -->
      <HeroSection
        :settings="heroSettings"
        @cta-click="handleHeroCTA"
      />

      <!-- Featured Products Showcase -->
      <v-container class="py-12">
        <ProductShowcase
          :products="featuredProducts"
          :settings="showcaseSettings"
          title="Featured Products"
          subtitle="Handpicked items just for you"
          @product-click="handleProductClick"
        />
      </v-container>

      <!-- Features Section -->
      <FeaturesSection />

      <!-- Social Proof / Testimonials -->
      <TestimonialsSection />

      <!-- Newsletter Signup (A/B tested placement) -->
      <v-container 
        v-if="newsletterConfig.placement === 'middle'"
        class="py-8"
      >
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card class="text-center pa-8" elevation="4">
              <h2 class="text-h4 mb-4">
                {{ newsletterConfig.title || 'Stay in the Loop' }}
              </h2>
              <p class="text-body-1 mb-6">
                {{ newsletterConfig.subtitle || 'Get exclusive offers and product updates' }}
              </p>
              
              <v-form @submit.prevent="handleNewsletterSignup">
                <v-row align="center" no-gutters>
                  <v-col>
                    <v-text-field
                      placeholder="Enter your email"
                      type="email"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="auto" class="ml-2">
                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      :text="newsletterConfig.ctaText || 'Subscribe'"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- Call-to-Action Section -->
      <v-container class="py-16">
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="text-h3 mb-6 font-weight-bold">
              Ready to Start Shopping?
            </h2>
            <p class="text-h6 mb-8 text-medium-emphasis">
              Explore our full catalog of amazing products
            </p>
            <v-btn
              :color="heroSettings.ctaColor"
              size="x-large"
              class="text-h6 px-8 py-4 text-none"
              @click="handleHeroCTA"
            >
              <v-icon icon="mdi-shopping" start />
              Browse All Products
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- A/B Testing Debug Panel (Development Only) -->
    <v-card
      v-if="$dev && (heroVariant || showcaseVariant || newsletterVariant)"
      class="debug-panel position-fixed"
      style="bottom: 20px; right: 20px; z-index: 1000; max-width: 300px;"
      elevation="8"
    >
      <v-card-title class="text-body-2 py-2">
        <v-icon icon="mdi-flask" start size="small" />
        A/B Tests Active
      </v-card-title>
      <v-card-text class="py-2">
        <div v-if="heroVariant" class="mb-1">
          <strong>Hero:</strong> {{ heroVariant.name }}
        </div>
        <div v-if="showcaseVariant" class="mb-1">
          <strong>Showcase:</strong> {{ showcaseVariant.name }}
        </div>
        <div v-if="newsletterVariant">
          <strong>Newsletter:</strong> {{ newsletterVariant.name }}
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
}

.debug-panel {
  font-size: 0.875rem;
}

/* Smooth transitions for A/B test variants */
.v-container {
  transition: all 0.3s ease-in-out;
}

/* Hero section animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.home-page > * {
  animation: fadeInUp 0.6s ease-out;
}

.home-page > *:nth-child(2) {
  animation-delay: 0.1s;
}

.home-page > *:nth-child(3) {
  animation-delay: 0.2s;
}

.home-page > *:nth-child(4) {
  animation-delay: 0.3s;
}
</style>
