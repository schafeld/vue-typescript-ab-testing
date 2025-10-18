<!--
  Categories View Component - Simple category browsing page
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'

const router = useRouter()
const analytics = useAnalytics()

const categories = ref([
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Headphones, chargers, and tech accessories',
    image: '/images/category-electronics.jpg',
    productCount: 25
  },
  {
    id: 'wearables',
    name: 'Wearables',
    description: 'Smart watches, fitness trackers, and accessories',
    image: '/images/category-wearables.jpg',
    productCount: 12
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    description: 'Organic coffee, snacks, and gourmet items',
    image: '/images/category-food.jpg',
    productCount: 8
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Water bottles, bags, and everyday essentials',
    image: '/images/category-lifestyle.jpg',
    productCount: 15
  }
])

const viewCategory = (category: any) => {
  analytics.track('category_clicked', {
    categoryId: category.id,
    categoryName: category.name
  })
  
  router.push(`/products?category=${category.id}`)
}

onMounted(() => {
  analytics.track('page_view', { page: 'categories' })
})
</script>

<template>
  <div class="categories-page">
    <v-container class="py-8">
      <h1 class="text-h3 mb-6">Product Categories</h1>
      
      <v-row>
        <v-col
          v-for="category in categories"
          :key="category.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            class="category-card"
            height="300"
            hover
            @click="viewCategory(category)"
          >
            <v-img
              :src="category.image"
              height="200"
              cover
            />
            <v-card-text>
              <h3 class="text-h6 mb-2">{{ category.name }}</h3>
              <p class="text-body-2 text-medium-emphasis mb-2">
                {{ category.description }}
              </p>
              <p class="text-caption">
                {{ category.productCount }} products
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.category-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.category-card:hover {
  transform: translateY(-4px);
}
</style>