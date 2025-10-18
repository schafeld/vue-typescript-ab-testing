<!--
  Product Showcase Component
  
  This component demonstrates:
  1. Featured products display
  2. A/B testing for product layouts
  3. Add to cart functionality
  4. Responsive product grids
-->

<template>
  <section class="product-showcase">
    <v-container class="py-12">
      <div class="text-center mb-8">
        <h2 class="text-h3 font-weight-bold mb-4">
          Featured Products
        </h2>
        <p class="text-h6 text-medium-emphasis">
          Discover our most popular items
        </p>
      </div>

      <!-- A/B Test: Grid vs Carousel Layout -->
      <div v-if="variant?.id === 'grid-layout'">
        <v-row>
          <v-col
            v-for="product in featuredProducts"
            :key="product.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card class="product-card" hover>
              <v-img
                :src="product.imageUrl"
                :alt="product.name"
                height="200"
                cover
              />
              <v-card-title>{{ product.name }}</v-card-title>
              <v-card-text>
                <div class="text-h6 font-weight-bold">
                  ${{ product.price }}
                </div>
                <div class="text-body-2 mt-2">
                  {{ product.description }}
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  variant="flat"
                  block
                  @click="handleAddToCart(product)"
                >
                  Add to Cart
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Carousel Layout -->
      <div v-else>
        <v-carousel
          cycle
          height="400"
          show-arrows="hover"
        >
          <v-carousel-item
            v-for="product in featuredProducts"
            :key="product.id"
          >
            <v-card class="fill-height">
              <v-row no-gutters class="fill-height">
                <v-col cols="12" md="6">
                  <v-img
                    :src="product.imageUrl"
                    :alt="product.name"
                    class="fill-height"
                    cover
                  />
                </v-col>
                <v-col cols="12" md="6" class="d-flex align-center">
                  <v-card-text class="text-center">
                    <h3 class="text-h4 font-weight-bold mb-4">
                      {{ product.name }}
                    </h3>
                    <p class="text-body-1 mb-4">
                      {{ product.description }}
                    </p>
                    <div class="text-h5 font-weight-bold mb-6">
                      ${{ product.price }}
                    </div>
                    <v-btn
                      color="primary"
                      size="large"
                      @click="handleAddToCart(product)"
                    >
                      Add to Cart
                    </v-btn>
                  </v-card-text>
                </v-col>
              </v-row>
            </v-card>
          </v-carousel-item>
        </v-carousel>
      </div>

      <!-- CTA Section -->
      <div class="text-center mt-12">
        <v-btn
          color="primary"
          size="large"
          variant="outlined"
          rounded="lg"
          @click="viewAllProducts"
        >
          View All Products
        </v-btn>
      </div>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'
import { useCartStore } from '@/stores/cart'

/**
 * Component setup
 */
const router = useRouter()
const analytics = useAnalytics()
const cartStore = useCartStore()

// A/B test for product showcase layout
const { variant } = useABTest('product-showcase-layout', {
  debug: true
})

/**
 * Product data
 */
const featuredProducts = ref([
  {
    id: 1,
    name: 'Premium Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 299.99,
    imageUrl: 'https://picsum.photos/400/300?random=10',
    category: 'Electronics'
  },
  {
    id: 2,
    name: 'Smart Watch',
    description: 'Feature-rich smartwatch with health tracking',
    price: 199.99,
    imageUrl: 'https://picsum.photos/400/300?random=11',
    category: 'Electronics'
  },
  {
    id: 3,
    name: 'Laptop Stand',
    description: 'Ergonomic adjustable laptop stand for better posture',
    price: 79.99,
    imageUrl: 'https://picsum.photos/400/300?random=12',
    category: 'Accessories'
  },
  {
    id: 4,
    name: 'Wireless Charger',
    description: 'Fast wireless charging pad compatible with all devices',
    price: 49.99,
    imageUrl: 'https://picsum.photos/400/300?random=13',
    category: 'Accessories'
  }
])

/**
 * Event handlers
 */
const handleAddToCart = (product: any) => {
  // Add to cart
  cartStore.addItem({
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    imageUrl: product.imageUrl,
    variant: 'default'
  })

  // Track analytics
  analytics.track('add_to_cart_homepage', {
    product_id: product.id,
    product_name: product.name,
    price: product.price,
    layout_variant: variant.value?.id || 'unknown'
  })
}

const viewAllProducts = () => {
  // Track analytics
  analytics.track('view_all_products_clicked', {
    source: 'product_showcase',
    layout_variant: variant.value?.id || 'unknown'
  })

  router.push('/products')
}

/**
 * Lifecycle hooks
 */
onMounted(() => {
  // Track component view
  analytics.track('product_showcase_viewed', {
    layout_variant: variant.value?.id || 'unknown'
  })
})
</script>

<style scoped>
.product-showcase {
  background: linear-gradient(135deg, rgba(var(--v-theme-surface), 0.8) 0%, rgba(var(--v-theme-background), 1) 100%);
}

.product-card {
  transition: transform 0.2s ease-in-out;
}

.product-card:hover {
  transform: translateY(-4px);
}

.v-carousel {
  border-radius: 12px;
  overflow: hidden;
}
</style>