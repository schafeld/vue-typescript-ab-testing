/**
 * Vue Router Configuration
 * 
 * This router setup demonstrates:
 * 1. Lazy-loaded route components for performance
 * 2. Route-level A/B testing integration
 * 3. Analytics integration for page tracking
 * 4. Meta fields for SEO and testing
 * 5. Route guards for authentication and analytics
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * Route definitions with lazy loading and A/B testing metadata
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      title: 'Home - AB Shop',
      description: 'Welcome to AB Shop - Your destination for A/B tested shopping experience',
      experiments: ['homepage-layout-test', 'hero-cta-test']
    }
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('../views/ProductsView.vue'),
    meta: {
      title: 'Products - AB Shop',
      description: 'Browse our complete product catalog',
      experiments: ['product-grid-test', 'filter-layout-test']
    }
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: () => import('../views/ProductDetailView.vue'),
    meta: {
      title: 'Product Details - AB Shop',
      experiments: ['product-detail-layout-test', 'add-to-cart-test']
    }
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: {
      title: 'Categories - AB Shop',
      description: 'Shop by category'
    }
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('../views/CartView.vue'),
    meta: {
      title: 'Shopping Cart - AB Shop',
      experiments: ['cart-layout-test', 'checkout-cta-test']
    }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('../views/CheckoutView.vue'),
    meta: {
      title: 'Checkout - AB Shop',
      experiments: ['checkout-flow-test', 'payment-options-test'],
      requiresAuth: false // For demo purposes, no auth required
    }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/SearchView.vue'),
    meta: {
      title: 'Search Results - AB Shop'
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: {
      title: 'About Us - AB Shop',
      description: 'Learn about our A/B testing approach to e-commerce'
    }
  },
  {
    path: '/thank-you',
    name: 'thank-you',
    component: () => import('../views/ThankYouView.vue'),
    meta: {
      title: 'Thank You - AB Shop',
      description: 'Order confirmation and thank you page'
    }
  },
  // Error pages
  {
    path: '/404',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: {
      title: 'Page Not Found - AB Shop'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

/**
 * Create router instance
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Scroll behavior for better UX
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    } else {
      return { top: 0 }
    }
  }
})

/**
 * Global route guards for analytics and A/B testing
 */

// Before each route - set up experiments and track navigation
router.beforeEach(async (to, from, next) => {
  // Set document title
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  
  // Set meta description for SEO
  if (to.meta.description) {
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', to.meta.description as string)
    }
  }
  
  // Initialize route-specific A/B experiments
  if (to.meta.experiments) {
    // This would trigger experiment assignment for route-specific tests
    console.log('Route experiments:', to.meta.experiments)
  }
  
  next()
})

// After each route - track page views
router.afterEach((to, from) => {
  // Track route changes for analytics
  if (typeof window !== 'undefined') {
    // Use setTimeout to ensure the page is fully loaded
    setTimeout(() => {
      // This would integrate with your analytics service
      console.log('Page view tracked:', {
        to: to.path,
        from: from.path,
        title: to.meta.title
      })
    }, 100)
  }
})

export default router
