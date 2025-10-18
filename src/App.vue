<!--
  Main Application Component
  
  This is the root component that demonstrates:
  1. Vuetify 3 Material Design integration
  2. A/B testing setup and initialization
  3. Analytics service integration
  4. Responsive navigation and layout
  5. Vue 3 Composition API patterns
  
  The app structure follows modern e-commerce patterns with:
  - Navigation bar with cart indicator
  - Main content area with routing
  - Footer with links and information
-->

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'
import { abTestingService } from '@/services/ab-testing'
import { useAnalytics } from '@/composables/useAnalytics'
import { useABTest } from '@/composables/useABTest'
import NavigationBar from '@/components/common/NavigationBar.vue'
import FooterSection from '@/components/common/FooterSection.vue'

// Initialize analytics with localStorage provider for demonstration
import { LocalStorageAnalyticsProvider } from '@/composables/useAnalytics'

/**
 * Initialize core services and A/B testing
 * This demonstrates proper service initialization patterns in Vue 3
 */
const isInitialized = ref(false)
const theme = useTheme()

// Set up analytics with local storage for demonstration
const analytics = useAnalytics({
  provider: new LocalStorageAnalyticsProvider(),
  autoTrackPageViews: true,
  autoTrackErrors: true,
  enableDebugMode: true
})

// A/B test for the main theme (light vs dark)
const { variant: themeVariant } = useABTest('app-theme-test', {
  debug: true,
  onVariantAssigned: (variant) => {
    // Apply theme based on A/B test variant
    if (variant.config.theme === 'dark') {
      theme.global.name.value = 'dark'
    } else {
      theme.global.name.value = 'light'
    }
  }
})

// Development environment check for debugging info
const isDevelopment = computed(() => import.meta.env.DEV)

/**
 * Initialize the application
 * Sets up A/B testing experiments and user context
 */
const initializeApp = async () => {
  try {
    // Define our A/B testing experiments
    const experiments = [
      {
        id: 'app-theme-test',
        name: 'App Theme Test',
        description: 'Test light vs dark theme preference',
        isActive: true,
        startDate: new Date('2025-01-01'),
        trafficAllocation: 50, // 50% of users included
        variants: [
          {
            id: 'light-theme',
            experimentId: 'app-theme-test',
            name: 'Light Theme',
            description: 'Standard light theme',
            weight: 50,
            isControl: true,
            config: { theme: 'light' }
          },
          {
            id: 'dark-theme', 
            experimentId: 'app-theme-test',
            name: 'Dark Theme',
            description: 'Dark theme variant',
            weight: 50,
            isControl: false,
            config: { theme: 'dark' }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'button-color-test',
        name: 'CTA Button Color Test',
        description: 'Test button color impact on conversions',
        isActive: true,
        startDate: new Date('2025-01-01'),
        trafficAllocation: 100,
        variants: [
          {
            id: 'blue-button',
            experimentId: 'button-color-test',
            name: 'Blue Button',
            description: 'Standard blue CTA buttons',
            weight: 33,
            isControl: true,
            config: { 
              primaryColor: '#1976d2',
              hoverColor: '#1565c0',
              textColor: 'white'
            }
          },
          {
            id: 'green-button',
            experimentId: 'button-color-test', 
            name: 'Green Button',
            description: 'Green CTA buttons for higher conversion',
            weight: 33,
            isControl: false,
            config: {
              primaryColor: '#4caf50',
              hoverColor: '#45a049', 
              textColor: 'white'
            }
          },
          {
            id: 'red-button',
            experimentId: 'button-color-test',
            name: 'Red Button', 
            description: 'Red CTA buttons for urgency',
            weight: 34,
            isControl: false,
            config: {
              primaryColor: '#f44336',
              hoverColor: '#d32f2f',
              textColor: 'white'
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    // Initialize A/B testing service with experiments
    await abTestingService.initialize(experiments)

    // Set a demo user for consistent assignment
    await abTestingService.setUser({
      id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
      preferredLanguage: 'en',
      deviceType: 'desktop',
      country: 'DE',
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled
      },
      preferences: {
        currency: 'EUR',
        notifications: true,
        marketingEmails: false,
        favoriteCategories: []
      }
    })

    // Identify user in analytics
    await analytics.identify('demo-user', {
      userType: 'demo',
      registrationDate: new Date().toISOString()
    })

    isInitialized.value = true
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

// Initialize on mount
onMounted(() => {
  initializeApp()
})
</script>

<template>
  <v-app>
    <!-- Loading state while initializing A/B tests -->
    <v-overlay 
      v-if="!isInitialized"
      model-value
      contained
      class="align-center justify-center"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        />
        <div class="mt-4">
          <h3>Initializing A/B Testing...</h3>
          <p class="text-body-2 mt-2">
            Setting up experiments and user context
          </p>
        </div>
      </div>
    </v-overlay>

    <!-- Main app layout -->
    <template v-else>
      <!-- Navigation Bar -->
      <NavigationBar />

      <!-- Main Content Area -->
      <v-main>
        <v-container fluid>
          <!-- Router view for page content -->
          <RouterView />
        </v-container>
      </v-main>

      <!-- Footer -->
      <FooterSection />
    </template>

    <!-- Debugging info in development -->
    <v-snackbar
      v-if="themeVariant && isDevelopment"
      model-value
      timeout="3000"
      color="info"
      location="bottom right"
    >
      <v-icon start>mdi-flask</v-icon>
      A/B Test Active: {{ themeVariant.name }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>

main.v-main {
  width: max-content;
}

header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  main.v-main {
    min-width: 980px;
  }
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
