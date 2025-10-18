<!--
  Footer Section Component
  
  This component demonstrates:
  1. Responsive footer layout with Vuetify
  2. A/B testing for footer content and layout
  3. Social media integration
  4. Newsletter signup with conversion tracking
  5. Company information and legal links
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'
import { useABTest } from '@/composables/useABTest'

/**
 * Component state
 */
const analytics = useAnalytics()
const newsletterEmail = ref('')
const isSubmittingNewsletter = ref(false)

/**
 * A/B Testing Integration
 * Test different footer layouts and messaging
 */
const { config: footerConfig } = useABTest('footer-layout-test')

/**
 * Footer content configuration
 */
const footerSections = [
  {
    title: 'Shop',
    items: [
      { label: 'All Products', href: '/products' },
      { label: 'New Arrivals', href: '/products/new' },
      { label: 'Best Sellers', href: '/products/bestsellers' },
      { label: 'Sale', href: '/products/sale' }
    ]
  },
  {
    title: 'Customer Service',
    items: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Returns', href: '/returns' }
    ]
  },
  {
    title: 'Company',
    items: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' }
    ]
  }
]

const socialLinks = [
  { icon: 'mdi-facebook', href: '#', label: 'Facebook' },
  { icon: 'mdi-twitter', href: '#', label: 'Twitter' },
  { icon: 'mdi-instagram', href: '#', label: 'Instagram' },
  { icon: 'mdi-linkedin', href: '#', label: 'LinkedIn' }
]

/**
 * Event handlers
 */

// Handle newsletter signup
const handleNewsletterSignup = async () => {
  if (!newsletterEmail.value || isSubmittingNewsletter.value) return
  
  isSubmittingNewsletter.value = true
  
  try {
    // Track newsletter signup conversion
    await analytics.track('newsletter_signup', {
      email: newsletterEmail.value,
      source: 'footer'
    })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Clear form
    newsletterEmail.value = ''
    
    // Show success message (in a real app, you'd handle this with a notification system)
    console.log('Newsletter signup successful!')
    
  } catch (error) {
    console.error('Newsletter signup failed:', error)
  } finally {
    isSubmittingNewsletter.value = false
  }
}

// Handle social media clicks
const handleSocialClick = async (platform: string) => {
  await analytics.track('social_click', {
    platform,
    source: 'footer'
  })
}

// Handle footer link clicks
const handleFooterLinkClick = async (section: string, label: string) => {
  await analytics.track('footer_link_click', {
    section,
    label,
    source: 'footer'
  })
}
</script>

<template>
  <v-footer
    class="bg-grey-darken-4 text-white"
    padless
  >
    <v-container>
      <v-row>
        <!-- Newsletter Signup Section -->
        <v-col cols="12" md="4" class="mb-6">
          <h3 class="text-h6 mb-4">
            {{ footerConfig.newsletterTitle || 'Stay Updated' }}
          </h3>
          <p class="text-body-2 mb-4">
            {{ footerConfig.newsletterText || 'Get the latest updates on new products and exclusive offers.' }}
          </p>
          
          <v-form @submit.prevent="handleNewsletterSignup">
            <v-text-field
              v-model="newsletterEmail"
              type="email"
              placeholder="Enter your email"
              variant="outlined"
              density="compact"
              hide-details
              :loading="isSubmittingNewsletter"
              class="mb-3"
            />
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              :loading="isSubmittingNewsletter"
              :disabled="!newsletterEmail"
              block
              class="text-none"
            >
              <v-icon icon="mdi-email-outline" start />
              Subscribe
            </v-btn>
          </v-form>
        </v-col>

        <!-- Footer Navigation Links -->
        <v-col cols="12" md="6">
          <v-row>
            <v-col
              v-for="section in footerSections"
              :key="section.title"
              cols="12"
              sm="4"
            >
              <h4 class="text-subtitle-1 mb-3 font-weight-bold">
                {{ section.title }}
              </h4>
              <v-list
                density="compact"
                class="bg-transparent"
              >
                <v-list-item
                  v-for="item in section.items"
                  :key="item.label"
                  :href="item.href"
                  class="px-0 text-grey-lighten-1"
                  @click="handleFooterLinkClick(section.title, item.label)"
                >
                  {{ item.label }}
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-col>

        <!-- Contact and Social -->
        <v-col cols="12" md="2">
          <h4 class="text-subtitle-1 mb-3 font-weight-bold">
            Connect
          </h4>
          
          <!-- Contact Info -->
          <div class="mb-4">
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-phone" size="small" class="mr-2" />
              <span class="text-body-2">+49 123 456 789</span>
            </div>
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-email" size="small" class="mr-2" />
              <span class="text-body-2">info@abshop.com</span>
            </div>
          </div>

          <!-- Social Media Links -->
          <div class="d-flex gap-2">
            <v-btn
              v-for="social in socialLinks"
              :key="social.label"
              :icon="social.icon"
              variant="text"
              size="small"
              :href="social.href"
              color="grey-lighten-1"
              @click="handleSocialClick(social.label.toLowerCase())"
            />
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-6" color="grey-darken-2" />

      <!-- Bottom Footer -->
      <v-row align="center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center">
            <v-icon icon="mdi-shopping" class="mr-2" color="primary" />
            <span class="font-weight-bold mr-4">AB Shop</span>
            <span class="text-grey-lighten-1 text-body-2">
              © 2025 AB Shop. All rights reserved. Made with AI by <a href="https://www.schafeld.com" target="_blank">Oliver Schafeld</a>. 
              <a href="https://github.com/schafeld/vue-typescript-ab-testing" target="_blank" class="text-grey-lighten-1 text-decoration-none ml-2">
                <v-icon icon="mdi-github" size="small" />
              </a>
            </span>
          </div>
        </v-col>
        
        <v-col cols="12" md="6" class="text-md-right">
          <!-- Legal Links -->
          <div class="d-flex flex-wrap justify-md-end gap-4">
            <a 
              href="/privacy" 
              class="text-grey-lighten-1 text-decoration-none text-body-2"
              @click="handleFooterLinkClick('Legal', 'Privacy Policy')"
            >
              Privacy Policy
            </a>
            <a 
              href="/terms" 
              class="text-grey-lighten-1 text-decoration-none text-body-2"
              @click="handleFooterLinkClick('Legal', 'Terms of Service')"
            >
              Terms of Service
            </a>
            <a 
              href="/cookies" 
              class="text-grey-lighten-1 text-decoration-none text-body-2"
              @click="handleFooterLinkClick('Legal', 'Cookie Policy')"
            >
              Cookies
            </a>
          </div>
        </v-col>
      </v-row>

      <!-- A/B Testing Attribution (for demo purposes) -->
      <v-row v-if="footerConfig.showTestingInfo" class="mt-4">
        <v-col cols="12">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="text-center"
          >
            <v-icon icon="mdi-flask" start />
            This footer is part of an A/B testing experiment
          </v-alert>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<style scoped>
.v-list-item {
  min-height: 32px;
}

.v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

/* Newsletter form styling */
.v-text-field :deep(.v-field__outline) {
  color: rgba(255, 255, 255, 0.3);
}

.v-text-field :deep(.v-field__input) {
  color: white;
}

.v-text-field :deep(.v-field__input)::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

/* Social media buttons hover effect */
.social-buttons .v-btn {
  transition: all 0.3s ease;
}

.social-buttons .v-btn:hover {
  transform: scale(1.1);
  background-color: rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .text-md-right {
    text-align: left !important;
  }
  
  .justify-md-end {
    justify-content: flex-start !important;
  }
}
</style>