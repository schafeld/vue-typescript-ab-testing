/**
 * Main Application Entry Point
 * 
 * This file demonstrates proper Vue 3 application setup with:
 * 1. Vuetify Material Design integration
 * 2. Vue Router for SPA navigation
 * 3. Pinia for state management
 * 4. Vue I18n for internationalization
 * 5. Global error handling
 * 6. Performance monitoring setup
 */

import './assets/main.css'
import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Vuetify styles
import 'vuetify/styles'

// Application components
import App from './App.vue'
import router from './router'

/**
 * Vuetify Configuration
 * 
 * Configures Material Design theme, icons, and component defaults
 * Supports both light and dark themes for A/B testing
 */
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976d2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          surface: '#FFFFFF',
          background: '#F5F5F5'
        }
      },
      dark: {
        colors: {
          primary: '#2196F3',
          secondary: '#616161',
          accent: '#FF4081',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          surface: '#121212',
          background: '#000000'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  defaults: {
    // Global component defaults
    VBtn: {
      variant: 'flat',
      color: 'primary'
    },
    VCard: {
      elevation: 2
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable'
    }
  }
})

/**
 * Create Vue application instance
 */
const app = createApp(App)

// Install plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

/**
 * Global error handling for production monitoring
 */
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // In production, send to error tracking service
  // Example: Sentry, LogRocket, etc.
}

/**
 * Global properties for development
 */
if (import.meta.env.DEV) {
  app.config.globalProperties.$dev = true
}

/**
 * Mount application
 */
app.mount('#app')
