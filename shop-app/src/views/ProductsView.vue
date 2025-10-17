<!--
  Products View Component
  
  This view demonstrates:
  1. Product catalog with filtering and search
  2. A/B testing for product grid layouts
  3. Pagination and lazy loading
  4. Advanced filtering with analytics tracking
  5. Category-based navigation
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

const products = ref<any[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('all')
const sortBy = ref('name')
const sortOrder = ref('asc')
const currentPage = ref(1)
const itemsPerPage = ref(12)

/**
 * A/B Testing for product grid layout
 */
const { variant: gridVariant, trackConversion } = useABTest('product-grid-test', {
  onVariantAssigned: (variant) => {
    analytics.track('experiment_assignment', {
      experimentId: 'product-grid-test',
      variantId: variant.id,
      page: 'products'
    })
  }
})

/**
 * Sample product data for demonstration
 */
const sampleProducts = [
  {
    id: 'prod_1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    category: 'Electronics',
    image: '/images/headphones-1.jpg',
    rating: 4.5,
    inStock: true
  },
  {
    id: 'prod_2', 
    name: 'Smart Fitness Watch',
    price: 199.99,
    category: 'Wearables',
    image: '/images/watch-1.jpg',
    rating: 4.2,
    inStock: true
  },
  {
    id: 'prod_3',
    name: 'Organic Coffee Blend',
    price: 24.99,
    category: 'Food & Beverages',
    image: '/images/coffee-1.jpg',
    rating: 4.8,
    inStock: true
  },
  {
    id: 'prod_4',
    name: 'Eco-Friendly Water Bottle',
    price: 34.99,
    category: 'Lifestyle',
    image: '/images/bottle-1.jpg',
    rating: 4.3,
    inStock: true
  }
]

/**
 * Computed properties
 */
const filteredProducts = computed(() => {
  let filtered = sampleProducts

  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(p => p.category === selectedCategory.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    )
  }

  // Sort products
  filtered.sort((a, b) => {
    const aVal = a[sortBy.value as keyof typeof a] as any
    const bVal = b[sortBy.value as keyof typeof b] as any
    
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return bVal > aVal ? 1 : -1
  })

  return filtered
})

const categories = computed(() => {
  const cats = [...new Set(sampleProducts.map(p => p.category))]
  return cats
})

const gridClasses = computed(() => {
  if (!gridVariant.value) return 'grid-default'
  
  switch (gridVariant.value.config.layout) {
    case 'compact':
      return 'grid-compact'
    case 'detailed':
      return 'grid-detailed'
    default:
      return 'grid-default'
  }
})

/**
 * Methods
 */
const loadProducts = async () => {
  isLoading.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    products.value = sampleProducts
    
    // Track page view
    await analytics.track('page_view', {
      page: 'products',
      category: selectedCategory.value,
      search: searchQuery.value
    })
  } catch (error) {
    console.error('Error loading products:', error)
  } finally {
    isLoading.value = false
  }
}

const viewProduct = (product: any) => {
  // Track product click
  analytics.track('product_click', {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price
  })
  
  router.push(`/products/${product.id}`)
}

const addToCart = (product: typeof sampleProducts[0]) => {
  // Convert to Product interface format for cart store
  const productForCart = {
    id: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.image,
    category: { id: product.category, name: product.category, slug: '', description: '' },
    description: '',
    currency: 'EUR',
    inStock: product.inStock,
    stockQuantity: 10,
    rating: product.rating,
    reviewCount: 0,
    tags: [],
    createdAt: new Date()
  }
  
  // Add to cart
  cartStore.addItem(productForCart, 1)
  
  // Track conversion for A/B test
  trackConversion(product.price, 'add_to_cart')
  
  // Track analytics event
  analytics.track('add_to_cart', {
    productId: product.id,
    productName: product.name,
    price: product.price
  })
}

const onSearch = () => {
  analytics.track('product_search', {
    query: searchQuery.value,
    resultsCount: filteredProducts.value.length
  })
}

/**
 * Lifecycle
 */
onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="products-page">
    <!-- Page Header -->
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h3 mb-4">Products</h1>
          <p class="text-body-1 text-medium-emphasis">
            Discover our curated collection of premium products
          </p>
        </v-col>
      </v-row>
    </v-container>

    <!-- Filters and Search -->
    <v-container>
      <v-card class="mb-6" elevation="1">
        <v-card-text>
          <v-row align="center">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                label="Search products..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                @keyup.enter="onSearch"
                clearable
              />
            </v-col>
            
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedCategory"
                :items="[{title: 'All Categories', value: 'all'}, ...categories.map(cat => ({title: cat, value: cat}))]"
                label="Category"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12" md="2">
              <v-select
                v-model="sortBy"
                :items="[
                  {title: 'Name', value: 'name'},
                  {title: 'Price', value: 'price'},
                  {title: 'Rating', value: 'rating'}
                ]"
                label="Sort by"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12" md="2">
              <v-select
                v-model="sortOrder"
                :items="[
                  {title: 'Ascending', value: 'asc'},
                  {title: 'Descending', value: 'desc'}
                ]"
                label="Order"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12" md="1">
              <v-btn
                color="primary"
                @click="onSearch"
                icon="mdi-magnify"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Products Grid -->
    <v-container>
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <v-progress-circular indeterminate size="64" color="primary" />
        <p class="mt-4">Loading products...</p>
      </div>

      <!-- Products Grid -->
      <div v-else :class="['products-grid', gridClasses]">
        <v-row>
          <v-col
            v-for="product in filteredProducts"
            :key="product.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card 
              class="product-card"
              elevation="2"
              hover
              @click="viewProduct(product)"
            >
              <v-img
                :src="product.image"
                :alt="product.name"
                height="200"
                cover
                class="product-image"
              >
                <template v-if="!product.inStock" #placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-chip color="error" variant="elevated">
                      Out of Stock
                    </v-chip>
                  </div>
                </template>
              </v-img>
              
              <v-card-text>
                <h3 class="text-h6 mb-2">{{ product.name }}</h3>
                
                <div class="d-flex align-center mb-2">
                  <v-rating
                    :model-value="product.rating"
                    readonly
                    density="compact"
                    size="small"
                    color="amber"
                  />
                  <span class="text-caption ml-2">{{ product.rating }}</span>
                </div>
                
                <p class="text-body-2 text-medium-emphasis mb-3">
                  {{ product.category }}
                </p>
                
                <div class="d-flex align-center justify-space-between">
                  <span class="text-h6 font-weight-bold">
                    €{{ product.price.toFixed(2) }}
                  </span>
                  
                  <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    :disabled="!product.inStock"
                    @click.stop="addToCart(product)"
                  >
                    <v-icon start>mdi-cart-plus</v-icon>
                    Add to Cart
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- No Results -->
      <div v-if="!isLoading && filteredProducts.length === 0" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-package-variant</v-icon>
        <h3 class="text-h6 mt-4 mb-2">No products found</h3>
        <p class="text-body-2 text-medium-emphasis">
          Try adjusting your search or filters
        </p>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.products-page {
  min-height: 100vh;
}

.products-grid {
  transition: all 0.3s ease;
}

.grid-compact .product-card {
  height: 300px;
}

.grid-detailed .product-card {
  height: 400px;
}

.grid-default .product-card {
  height: 350px;
}

.product-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-image {
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}
</style>