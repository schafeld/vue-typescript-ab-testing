<!--
  Hero Section Component
  
  This component demonstrates:
  1. A/B testing for hero layout variants
  2. Dynamic content based on test assignments
  3. Conversion tracking for hero CTAs
  4. Responsive design patterns
-->

<template>
  <section class="hero-section">
    <!-- Hero variant A: Centered layout -->
    <v-container v-if="variant?.id === 'centered-hero'" class="text-center py-16">
      <v-row justify="center">
        <v-col cols="12" md="8">
          <h1 class="text-h2 text-md-h1 font-weight-bold mb-6">
            Welcome to Our Amazing Shop
          </h1>
          <p class="text-h6 text-md-h5 text-medium-emphasis mb-8">
            Discover premium products with cutting-edge A/B testing technology.
            Experience personalized shopping like never before.
          </p>
          <v-btn
            color="primary"
            size="x-large"
            rounded="lg"
            class="px-8"
            @click="handleCTAClick"
          >
            <v-icon start>mdi-shopping</v-icon>
            Shop Now
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Hero variant B: Left-aligned layout -->
    <v-container v-else class="py-16">
      <v-row align="center">
        <v-col cols="12" md="6">
          <h1 class="text-h2 text-md-h1 font-weight-bold mb-6">
            Premium Products for Modern Life
          </h1>
          <p class="text-h6 text-medium-emphasis mb-6">
            Discover our curated collection of high-quality items designed
            to enhance your lifestyle.
          </p>
          <div class="d-flex flex-column flex-sm-row ga-4">
            <v-btn
              color="primary"
              size="large"
              rounded="lg"
              @click="handleCTAClick"
            >
              <v-icon start>mdi-shopping</v-icon>
              Explore Products
            </v-btn>
            <v-btn
              variant="outlined"
              color="primary"
              size="large"
              rounded="lg"
              @click="handleLearnMoreClick"
            >
              Learn More
            </v-btn>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <v-img
            src="https://picsum.photos/600/400?random=1"
            alt="Hero Image"
            class="rounded-lg"
            cover
          />
        </v-col>
      </v-row>
    </v-container>

    <!-- Background decoration -->
    <div class="hero-background">
      <v-sheet
        color="primary"
        class="hero-shape"
        rounded="xl"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'

/**
 * Component setup
 */
const router = useRouter()
const analytics = useAnalytics()

// A/B test for hero layout
const { variant } = useABTest('hero-layout-test', {
  debug: true
})

/**
 * Event handlers with analytics tracking
 */
const handleCTAClick = () => {
  // Track conversion event
  analytics.track('hero_cta_clicked', {
    variant: variant.value?.id || 'unknown',
    button_text: variant.value?.id === 'centered-hero' ? 'Shop Now' : 'Explore Products',
    position: 'hero_section'
  })

  // Navigate to products
  router.push('/products')
}

const handleLearnMoreClick = () => {
  // Track engagement event
  analytics.track('hero_learn_more_clicked', {
    variant: variant.value?.id || 'unknown',
    position: 'hero_section'
  })

  // Navigate to about page
  router.push('/about')
}
</script>

<style scoped>
.hero-section {
  position: relative;
  min-height: 60vh;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 40%;
  height: 140%;
  opacity: 0.05;
  z-index: 0;
  pointer-events: none;
}

.hero-shape {
  width: 100%;
  height: 100%;
  transform: rotate(15deg);
}

.v-container {
  position: relative;
  z-index: 1;
}
</style>