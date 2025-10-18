<!--
  Navigation Bar Component
  
  This component demonstrates:
  1. Vuetify navigation patterns with responsive design
  2. A/B testing integration for navigation elements
  3. Shopping cart integration with item count
  4. Language switching with Vue I18n
  5. User authentication state management
  
  A/B Testing Features:
  - Navigation layout (top vs sidebar)
  - CTA button colors and styles
  - Menu item organization and labeling
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'
import { useCartStore } from '@/stores/cart'
// import { useI18n } from 'vue-i18n' // Will set up later

/**
 * Component state and reactive properties
 */
const router = useRouter()
const route = useRoute()
const { mdAndUp } = useDisplay()
const analytics = useAnalytics()
const cartStore = useCartStore()

// Mobile drawer state
const drawer = ref(false)

// Search functionality
const searchQuery = ref('')
const isSearching = ref(false)

/**
 * A/B Testing Integration
 * 
 * Test different navigation styles and layouts
 */
const { variant: navVariant, config: navConfig } = useABTest('nav-layout-test')
const { variant: buttonVariant, config: buttonConfig } = useABTest('button-color-test')

/**
 * Computed properties
 */

// Navigation items configuration
const navigationItems = computed(() => [
  {
    title: 'Home',
    icon: 'mdi-home',
    to: '/',
    exact: true
  },
  {
    title: 'Products',
    icon: 'mdi-shopping',
    to: '/products'
  },
  {
    title: 'Categories',
    icon: 'mdi-view-grid',
    to: '/categories'
  },
  {
    title: 'About',
    icon: 'mdi-information',
    to: '/about'
  }
])

// Dynamic button styling based on A/B test
const ctaButtonStyle = computed(() => ({
  backgroundColor: buttonConfig.value.primaryColor || '#1976d2',
  color: buttonConfig.value.textColor || 'white'
}))

// Cart item count from store
const cartItemCount = computed(() => cartStore.itemCount)

// Check if current route is active
const isRouteActive = (path: string, exact = false): boolean => {
  if (exact) {
    return route.path === path
  }
  return route.path.startsWith(path)
}

/**
 * Event handlers
 */

// Handle search submission
const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  
  try {
    // Track search event
    await analytics.track('search', {
      query: searchQuery.value,
      location: 'navigation'
    })
    
    // Navigate to search results
    await router.push({
      path: '/search',
      query: { q: searchQuery.value }
    })
  } finally {
    isSearching.value = false
  }
}

// Handle navigation click
const handleNavClick = async (item: typeof navigationItems.value[0]) => {
  // Track navigation event
  await analytics.track('navigation_click', {
    destination: item.to,
    source: 'main_nav',
    label: item.title
  })
  
  // Close mobile drawer
  drawer.value = false
}

// Handle cart click
const handleCartClick = async () => {
  await analytics.track('cart_click', {
    source: 'navigation',
    itemCount: cartItemCount.value
  })
  
  await router.push('/cart')
}

// Handle CTA click (could be "Sign Up" or "Shop Now" based on A/B test)
const handleCtaClick = async () => {
  const ctaAction = navConfig.value.ctaAction || 'shop_now'
  
  await analytics.track('cta_click', {
    action: ctaAction,
    source: 'navigation',
    variant: buttonVariant.value?.name || 'control'
  })
  
  if (ctaAction === 'shop_now') {
    await router.push('/products')
  } else if (ctaAction === 'sign_up') {
    await router.push('/signup')
  }
}
</script>

<template>
  <v-app-bar 
    color="surface" 
    elevation="2"
    :height="mobile ? 56 : 64"
  >
    <!-- Mobile menu button -->
    <v-app-bar-nav-icon
      v-if="mobile"
      @click="drawer = !drawer"
    />

    <!-- Logo and brand -->
    <v-app-bar-title class="d-flex align-center">
      <v-icon 
        icon="mdi-shopping" 
        size="32" 
        color="primary" 
        class="mr-2"
      />
      <span class="font-weight-bold">
        AB Shop
      </span>
    </v-app-bar-title>

    <!-- Desktop navigation items -->
    <template v-if="!mobile">
      <v-btn
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        variant="text"
        :color="isRouteActive(item.to, item.exact) ? 'primary' : 'default'"
        class="mx-1"
        @click="handleNavClick(item)"
      >
        <v-icon :icon="item.icon" start />
        {{ item.title }}
      </v-btn>
    </template>

    <v-spacer />

    <!-- Search bar -->
    <v-text-field
      v-model="searchQuery"
      density="compact"
      variant="outlined"
      placeholder="Search products..."
      prepend-inner-icon="mdi-magnify"
      :loading="isSearching"
      :max-width="mobile ? 200 : 300"
      hide-details
      clearable
      @keyup.enter="handleSearch"
      @click:prepend-inner="handleSearch"
      class="mr-4"
    />

    <!-- Language switcher -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn
          icon="mdi-translate"
          variant="text"
          v-bind="props"
        />
      </template>
      <v-list density="compact">
        <v-list-item
          prepend-icon="mdi-flag"
          title="English"
          value="en"
        />
        <v-list-item
          prepend-icon="mdi-flag-variant"
          title="Deutsch"
          value="de"
        />
      </v-list>
    </v-menu>

    <!-- Shopping cart -->
    <v-btn
      icon
      variant="text"
      class="mr-2"
      @click="handleCartClick"
    >
      <v-badge
        :content="cartItemCount"
        :model-value="cartItemCount > 0"
        color="error"
      >
        <v-icon icon="mdi-shopping-cart" />
      </v-badge>
    </v-btn>

    <!-- CTA Button (A/B tested) -->
    <v-btn
      :style="ctaButtonStyle"
      variant="flat"
      size="default"
      class="text-none font-weight-bold"
      @click="handleCtaClick"
    >
      <v-icon icon="mdi-lightning-bolt" start />
      {{ navConfig.ctaText || 'Shop Now' }}
    </v-btn>
  </v-app-bar>

  <!-- Mobile Navigation Drawer -->
  <v-navigation-drawer
    v-model="drawer"
    temporary
    location="left"
    width="280"
  >
    <!-- Drawer header -->
    <v-list-item
      title="AB Shop"
      subtitle="A/B Testing Demo"
      prepend-icon="mdi-shopping"
    />

    <v-divider />

    <!-- Mobile navigation items -->
    <v-list nav>
      <v-list-item
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :active="isRouteActive(item.to, item.exact)"
        @click="handleNavClick(item)"
      />
    </v-list>

    <v-divider class="my-4" />

    <!-- User actions in mobile drawer -->
    <v-list>
      <v-list-item
        prepend-icon="mdi-shopping-cart"
        title="Shopping Cart"
        :subtitle="`${cartItemCount} items`"
        @click="handleCartClick"
      />
      
      <v-list-item
        prepend-icon="mdi-account"
        title="My Account"
        @click="router.push('/account')"
      />
      
      <v-list-item
        prepend-icon="mdi-cog"
        title="Settings"
        @click="router.push('/settings')"
      />
    </v-list>

    <template #append>
      <!-- Mobile CTA button -->
      <div class="pa-4">
        <v-btn
          :style="ctaButtonStyle"
          variant="flat"
          size="large"
          block
          class="text-none font-weight-bold"
          @click="handleCtaClick"
        >
          <v-icon icon="mdi-lightning-bolt" start />
          {{ navConfig.ctaText || 'Shop Now' }}
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.v-app-bar-title {
  font-size: 1.25rem;
}

/* Smooth hover effects for navigation items */
.v-btn {
  transition: all 0.2s ease-in-out;
}

.v-btn:hover {
  transform: translateY(-1px);
}

/* Custom search field styling */
.v-text-field {
  transition: all 0.3s ease;
}

.v-text-field:focus-within {
  transform: scale(1.02);
}

/* Badge animation */
.v-badge :deep(.v-badge__badge) {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .v-text-field {
    max-width: 150px !important;
  }
}
</style>