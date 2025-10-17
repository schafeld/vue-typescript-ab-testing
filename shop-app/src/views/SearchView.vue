<!--
  Search View Component - Simple search results page
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'

const route = useRoute()
const analytics = useAnalytics()

const searchQuery = ref('')
const isLoading = ref(false)

// Sample search results
const allProducts = [
  { id: 'prod_1', name: 'Premium Wireless Headphones', price: 299.99, category: 'Electronics' },
  { id: 'prod_2', name: 'Smart Fitness Watch', price: 199.99, category: 'Wearables' },
  { id: 'prod_3', name: 'Organic Coffee Blend', price: 24.99, category: 'Food & Beverages' },
  { id: 'prod_4', name: 'Eco-Friendly Water Bottle', price: 34.99, category: 'Lifestyle' }
]

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  
  const query = searchQuery.value.toLowerCase()
  return allProducts.filter(product =>
    product.name.toLowerCase().includes(query) ||
    product.category.toLowerCase().includes(query)
  )
})

const performSearch = () => {
  if (!searchQuery.value) return
  
  analytics.track('search_performed', {
    query: searchQuery.value,
    resultsCount: searchResults.value.length
  })
}

onMounted(() => {
  // Get search query from URL
  searchQuery.value = (route.query.q as string) || ''
  
  if (searchQuery.value) {
    performSearch()
  }
  
  analytics.track('page_view', { page: 'search', query: searchQuery.value })
})
</script>

<template>
  <div class="search-page">
    <v-container class="py-8">
      <h1 class="text-h3 mb-6">Search Results</h1>
      
      <v-text-field
        v-model="searchQuery"
        label="Search products..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @keyup.enter="performSearch"
        class="mb-6"
      />
      
      <div v-if="searchQuery && searchResults.length === 0" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-magnify</v-icon>
        <h3 class="text-h6 mt-4 mb-2">No results found</h3>
        <p class="text-body-2 text-medium-emphasis">
          Try searching with different keywords
        </p>
      </div>
      
      <v-row v-else>
        <v-col
          v-for="product in searchResults"
          :key="product.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card class="product-card">
            <v-card-text>
              <h3 class="text-h6 mb-2">{{ product.name }}</h3>
              <p class="text-body-2 text-medium-emphasis mb-2">
                {{ product.category }}
              </p>
              <p class="text-h6 font-weight-bold">
                €{{ product.price.toFixed(2) }}
              </p>
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="outlined" block>
                View Product
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
}
</style>