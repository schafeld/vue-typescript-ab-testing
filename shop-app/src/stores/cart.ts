/**
 * Shopping Cart Store - Pinia
 * 
 * This store demonstrates:
 * 1. State management with Pinia and TypeScript
 * 2. Cart operations (add, remove, update quantities)
 * 3. Persistent cart storage with localStorage
 * 4. Analytics integration for cart events
 * 5. A/B testing integration for cart functionality
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@/types'

// Custom cart item interface for simplified cart management
export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  variantId?: string
  image: string
  category: string
  addedAt: string
}

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const isLoading = ref(false)

  // Computed getters
  const itemCount = computed(() => {
    return items.value.reduce((total, item) => total + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((total, item) => total + (item.price * item.quantity), 0)
  })

  const isEmpty = computed(() => items.value.length === 0)

  const subtotal = computed(() => totalPrice.value)
  
  const tax = computed(() => totalPrice.value * 0.19) // 19% VAT for Germany
  
  const total = computed(() => subtotal.value + tax.value)

  // Actions
  const addItem = (product: Product, quantity = 1, variantId?: string) => {
    const existingItemIndex = items.value.findIndex(item => 
      item.productId === product.id && item.variantId === variantId
    )

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const existingItem = items.value[existingItemIndex]
      if (existingItem) {
        existingItem.quantity += quantity
      }
    } else {
      // Add new item to cart
      const cartItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        variantId,
        image: product.imageUrl || '/images/placeholder.jpg',
        category: product.category.name,
        addedAt: new Date().toISOString()
      }
      items.value.push(cartItem)
    }

    // Save to localStorage
    saveToStorage()
    
    return true
  }

  const removeItem = (cartItemId: string) => {
    const index = items.value.findIndex(item => item.id === cartItemId)
    if (index >= 0) {
      items.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const item = items.value.find(item => item.id === cartItemId)
    if (item) {
      if (quantity <= 0) {
        removeItem(cartItemId)
      } else {
        item.quantity = quantity
        saveToStorage()
      }
      return true
    }
    return false
  }

  const clearCart = () => {
    items.value = []
    saveToStorage()
  }

  const getItemByProductId = (productId: string, variantId?: string) => {
    return items.value.find(item => 
      item.productId === productId && item.variantId === variantId
    )
  }

  // Persistence
  const saveToStorage = () => {
    try {
      localStorage.setItem('ab-shop-cart', JSON.stringify(items.value))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('ab-shop-cart')
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
      items.value = []
    }
  }

  // Initialize cart from localStorage
  loadFromStorage()

  return {
    // State
    items,
    isLoading,
    
    // Getters
    itemCount,
    totalPrice,
    isEmpty,
    subtotal,
    tax,
    total,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemByProductId,
    loadFromStorage,
    saveToStorage
  }
})