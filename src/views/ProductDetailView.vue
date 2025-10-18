<!--
  Product Detail View Component
  
  This view demonstrates:
  1. Product detail page with A/B testing
  2. Add to cart functionality with tracking
  3. Related products recommendations
  4. Image gallery and product information
  5. Reviews and ratings display
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'
import { useCartStore } from '@/stores/cart'

/**
 * Component state
 */
const route = useRoute()
const router = useRouter()
const analytics = useAnalytics()
const cartStore = useCartStore()

const product = ref<any>(null)
const isLoading = ref(true)
const selectedVariant = ref('')
const quantity = ref(1)

/**
 * A/B Testing for product detail layout
 */
const { variant: layoutVariant, trackConversion } = useABTest('product-detail-layout-test')

/**
 * Sample product data
 */
const sampleProduct = {
  id: 'prod_1',
  name: 'Premium Wireless Headphones',
  description: 'High-quality noise-cancelling wireless headphones with 30-hour battery life and premium materials for the ultimate audio experience.',
  price: 299.99,
  currency: 'EUR',
  category: 'Electronics',
  inStock: true,
  rating: 4.5,
  reviews: 156,
  images: [
    '/images/headphones-1.jpg',
    '/images/headphones-2.jpg',
    '/images/headphones-3.jpg'
  ],
  features: [
    '30-hour battery life',
    'Active noise cancellation',
    'Quick charge (5min = 3hrs)',
    'Premium materials',
    'Wireless connectivity',
    'Built-in microphone'
  ],
  variants: [
    { id: 'black', name: 'Black', price: 299.99, inStock: true },
    { id: 'white', name: 'White', price: 299.99, inStock: true },
    { id: 'silver', name: 'Silver', price: 319.99, inStock: false }
  ],
  specifications: {
    'Battery Life': '30 hours',
    'Charging Time': '2 hours',
    'Weight': '250g',
    'Connectivity': 'Bluetooth 5.0',
    'Driver Size': '40mm',
    'Frequency Response': '20Hz - 20kHz'
  }
}

/**
 * Computed properties
 */
const selectedVariantData = computed(() => {
  if (!selectedVariant.value || !product.value) return null
  return product.value.variants.find((v: any) => v.id === selectedVariant.value)
})

const currentPrice = computed(() => {
  return selectedVariantData.value?.price || product.value?.price || 0
})

const isInStock = computed(() => {
  return selectedVariantData.value?.inStock ?? product.value?.inStock ?? false
})

/**
 * Methods
 */
const loadProduct = async () => {
  isLoading.value = true
  
  try {
    const productId = route.params.id as string
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    product.value = { ...sampleProduct, id: productId }
    
    // Set default variant
    if (product.value.variants && product.value.variants.length > 0) {
      selectedVariant.value = product.value.variants[0].id
    }
    
    // Track page view
    await analytics.track('product_view', {
      productId: product.value.id,
      productName: product.value.name,
      category: product.value.category,
      price: product.value.price
    })
  } catch (error) {
    console.error('Error loading product:', error)
    router.push('/products')
  } finally {
    isLoading.value = false
  }
}

const addToCart = () => {
  if (!product.value) return
  
  // Convert to Product interface format for cart store
  const productForCart = {
    id: product.value.id,
    name: product.value.name,
    price: currentPrice.value,
    imageUrl: product.value.images[0] || '',
    category: { id: product.value.category, name: product.value.category, slug: '', description: '' },
    description: product.value.description,
    currency: 'EUR',
    inStock: isInStock.value,
    stockQuantity: 10,
    rating: product.value.rating,
    reviewCount: product.value.reviews,
    tags: [],
    createdAt: new Date()
  }
  
  // Add to cart
  cartStore.addItem(productForCart, quantity.value, selectedVariant.value)
  
  // Track conversion for A/B test
  trackConversion(currentPrice.value * quantity.value, 'add_to_cart')
  
  // Track analytics event
  analytics.track('add_to_cart', {
    productId: product.value.id,
    productName: product.value.name,
    variant: selectedVariant.value,
    quantity: quantity.value,
    value: currentPrice.value * quantity.value
  })
}

const goBack = () => {
  router.back()
}

/**
 * Lifecycle
 */
onMounted(() => {
  loadProduct()
})
</script>

<template>
  <div class="product-detail-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="min-height: 400px;">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>

    <!-- Product Detail -->
    <v-container v-else-if="product" class="py-8">
      <!-- Breadcrumb -->
      <v-breadcrumbs>
        <v-breadcrumbs-item to="/" title="Home" />
        <v-breadcrumbs-item to="/products" title="Products" />
        <v-breadcrumbs-item :title="product.name" disabled />
      </v-breadcrumbs>

      <v-row>
        <!-- Product Images -->
        <v-col cols="12" md="6">
          <v-card elevation="0">
            <v-img
              :src="product.images[0]"
              :alt="product.name"
              height="400"
              cover
              class="mb-4"
            />
            
            <!-- Thumbnail Images -->
            <v-row>
              <v-col
                v-for="(image, index) in product.images"
                :key="index"
                cols="4"
              >
                <v-img
                  :src="image"
                  :alt="`${product.name} ${index + 1}`"
                  height="100"
                  cover
                  class="cursor-pointer"
                />
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <!-- Product Information -->
        <v-col cols="12" md="6">
          <div class="product-info">
            <!-- Product Title and Rating -->
            <h1 class="text-h4 mb-2">{{ product.name }}</h1>
            
            <div class="d-flex align-center mb-4">
              <v-rating
                :model-value="product.rating"
                readonly
                density="compact"
                color="amber"
              />
              <span class="text-body-2 ml-2">({{ product.reviews }} reviews)</span>
            </div>

            <!-- Price -->
            <div class="mb-4">
              <span class="text-h4 font-weight-bold text-primary">
                €{{ currentPrice.toFixed(2) }}
              </span>
              <v-chip
                v-if="isInStock"
                color="success"
                size="small"
                class="ml-4"
              >
                In Stock
              </v-chip>
              <v-chip
                v-else
                color="error"
                size="small"
                class="ml-4"
              >
                Out of Stock
              </v-chip>
            </div>

            <!-- Description -->
            <p class="text-body-1 mb-4">
              {{ product.description }}
            </p>

            <!-- Variants -->
            <div v-if="product.variants && product.variants.length > 1" class="mb-4">
              <h3 class="text-h6 mb-2">Choose Variant:</h3>
              <v-chip-group
                v-model="selectedVariant"
                mandatory
                color="primary"
              >
                <v-chip
                  v-for="variant in product.variants"
                  :key="variant.id"
                  :value="variant.id"
                  :disabled="!variant.inStock"
                  filter
                  variant="outlined"
                >
                  {{ variant.name }}
                  <span v-if="variant.price !== product.price" class="ml-2">
                    (€{{ variant.price.toFixed(2) }})
                  </span>
                </v-chip>
              </v-chip-group>
            </div>

            <!-- Quantity -->
            <div class="mb-6">
              <h3 class="text-h6 mb-2">Quantity:</h3>
              <v-text-field
                v-model.number="quantity"
                type="number"
                min="1"
                max="10"
                variant="outlined"
                density="compact"
                style="max-width: 120px;"
              />
            </div>

            <!-- Add to Cart -->
            <div class="mb-6">
              <v-btn
                color="primary"
                size="large"
                :disabled="!isInStock"
                @click="addToCart"
                block
              >
                <v-icon start>mdi-cart-plus</v-icon>
                Add to Cart - €{{ (currentPrice * quantity).toFixed(2) }}
              </v-btn>
            </div>

            <!-- Features -->
            <div class="mb-6">
              <h3 class="text-h6 mb-2">Key Features:</h3>
              <v-list density="compact">
                <v-list-item
                  v-for="feature in product.features"
                  :key="feature"
                  :title="feature"
                >
                  <template #prepend>
                    <v-icon color="success">mdi-check</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <!-- Specifications -->
            <div>
              <h3 class="text-h6 mb-2">Specifications:</h3>
              <v-table density="compact">
                <tbody>
                  <tr
                    v-for="(value, key) in product.specifications"
                    :key="key"
                  >
                    <td class="font-weight-medium">{{ key }}</td>
                    <td>{{ value }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Action Buttons -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-btn
            variant="outlined"
            @click="goBack"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            Back to Products
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Product Not Found -->
    <v-container v-else class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
      <h2 class="text-h5 mt-4 mb-2">Product not found</h2>
      <p class="text-body-1 text-medium-emphasis mb-4">
        The product you're looking for doesn't exist or has been removed.
      </p>
      <v-btn color="primary" to="/products">
        Browse Products
      </v-btn>
    </v-container>
  </div>
</template>

<style scoped>
.product-detail-page {
  min-height: 100vh;
}

.cursor-pointer {
  cursor: pointer;
}

.product-info {
  padding: 0 16px;
}

@media (max-width: 960px) {
  .product-info {
    padding: 16px 0 0 0;
  }
}
</style>