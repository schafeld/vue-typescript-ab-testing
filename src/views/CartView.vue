<!--
  Shopping Cart View Component
  
  This view demonstrates:
  1. Shopping cart management with Pinia store
  2. A/B testing for cart layout and checkout CTA
  3. Analytics tracking for cart events
  4. Responsive cart design with Vuetify
  5. Cart persistence and state management
-->

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useABTest } from '@/composables/useABTest'
import { useAnalytics } from '@/composables/useAnalytics'

/**
 * Component dependencies
 */
const router = useRouter()
const cartStore = useCartStore()
const analytics = useAnalytics()

/**
 * A/B Testing for cart layout
 */
const { variant: cartLayoutVariant, trackConversion } = useABTest('cart-layout-test', {
  onVariantAssigned: (variant) => {
    analytics.track('experiment_assignment', {
      experimentId: 'cart-layout-test',
      variantId: variant.id,
      page: 'cart'
    })
  }
})

/**
 * A/B Testing for checkout CTA
 */
const { variant: checkoutCtaVariant } = useABTest('checkout-cta-test')

/**
 * Computed properties
 */
const cartLayoutClass = computed(() => {
  if (!cartLayoutVariant.value) return 'layout-default'
  return `layout-${cartLayoutVariant.value.config.layout || 'default'}`
})

const checkoutButtonText = computed(() => {
  if (!checkoutCtaVariant.value) return 'Proceed to Checkout'
  return checkoutCtaVariant.value.config.buttonText || 'Proceed to Checkout'
})

const checkoutButtonColor = computed(() => {
  if (!checkoutCtaVariant.value) return 'primary'
  return checkoutCtaVariant.value.config?.buttonColor || 'primary'
})

/**
 * Methods
 */
const updateQuantity = (itemId: string, quantity: number) => {
  cartStore.updateQuantity(itemId, quantity)
  
  analytics.track('cart_quantity_updated', {
    itemId,
    quantity,
    cartTotal: cartStore.total
  })
}

const removeItem = (itemId: string) => {
  const item = cartStore.items.find(i => i.id === itemId)
  cartStore.removeItem(itemId)
  
  analytics.track('cart_item_removed', {
    itemId,
    productId: item?.productId,
    cartTotal: cartStore.total
  })
}

const proceedToCheckout = () => {
  // Track conversion for checkout CTA A/B test
  trackConversion(cartStore.total, 'checkout_initiated')
  
  analytics.track('checkout_initiated', {
    cartTotal: cartStore.total,
    itemCount: cartStore.itemCount,
    items: cartStore.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }))
  })
  
  router.push('/checkout')
}

const continueShopping = () => {
  analytics.track('continue_shopping_clicked', {
    cartTotal: cartStore.total,
    itemCount: cartStore.itemCount
  })
  
  router.push('/products')
}

/**
 * Lifecycle
 */
onMounted(() => {
  analytics.track('page_view', {
    page: 'cart',
    cartTotal: cartStore.total,
    itemCount: cartStore.itemCount
  })
})
</script>

<template>
  <div class="cart-page">
    <v-container class="py-8">
      <!-- Page Header -->
      <div class="d-flex align-center mb-6">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          @click="router.back()"
          class="mr-4"
        />
        <div>
          <h1 class="text-h4 mb-2">Shopping Cart</h1>
          <p class="text-body-1 text-medium-emphasis">
            {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }} in your cart
          </p>
        </div>
      </div>

      <!-- Cart Content -->
      <div :class="['cart-content', cartLayoutClass]">
        <!-- Empty Cart -->
        <div v-if="cartStore.isEmpty" class="empty-cart text-center py-12">
          <v-icon size="96" color="grey-lighten-2" class="mb-4">
            mdi-cart-outline
          </v-icon>
          <h2 class="text-h5 mb-4">Your cart is empty</h2>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Start shopping to add items to your cart
          </p>
          <v-btn
            color="primary"
            size="large"
            @click="continueShopping"
          >
            <v-icon start>mdi-store</v-icon>
            Start Shopping
          </v-btn>
        </div>

        <!-- Cart Items -->
        <div v-else>
          <v-row>
            <!-- Cart Items List -->
            <v-col cols="12" lg="8">
              <v-card elevation="1" class="mb-6">
                <v-card-title>Cart Items</v-card-title>
                <v-divider />
                
                <div class="cart-items">
                  <div
                    v-for="item in cartStore.items"
                    :key="item.id"
                    class="cart-item"
                  >
                    <v-card-text class="py-4">
                      <v-row align="center">
                        <!-- Product Image -->
                        <v-col cols="3" sm="2">
                          <v-img
                            :src="item.image"
                            :alt="item.name"
                            aspect-ratio="1"
                            class="rounded"
                            cover
                          />
                        </v-col>

                        <!-- Product Info -->
                        <v-col cols="5" sm="4">
                          <h3 class="text-subtitle-1 font-weight-medium mb-1">
                            {{ item.name }}
                          </h3>
                          <p class="text-body-2 text-medium-emphasis mb-1">
                            {{ item.category }}
                          </p>
                          <p v-if="item.variantId" class="text-caption">
                            Variant: {{ item.variantId }}
                          </p>
                        </v-col>

                        <!-- Quantity Controls -->
                        <v-col cols="2" sm="3">
                          <div class="d-flex align-center">
                            <v-btn
                              icon="mdi-minus"
                              size="small"
                              variant="outlined"
                              @click="updateQuantity(item.id, item.quantity - 1)"
                              :disabled="item.quantity <= 1"
                            />
                            <span class="mx-3 text-body-1 font-weight-medium">
                              {{ item.quantity }}
                            </span>
                            <v-btn
                              icon="mdi-plus"
                              size="small"
                              variant="outlined"
                              @click="updateQuantity(item.id, item.quantity + 1)"
                            />
                          </div>
                        </v-col>

                        <!-- Price and Remove -->
                        <v-col cols="2" sm="3" class="text-right">
                          <div class="price-section">
                            <p class="text-h6 font-weight-bold mb-2">
                              €{{ (item.price * item.quantity).toFixed(2) }}
                            </p>
                            <p v-if="item.quantity > 1" class="text-caption text-medium-emphasis">
                              €{{ item.price.toFixed(2) }} each
                            </p>
                            <v-btn
                              icon="mdi-delete"
                              size="small"
                              variant="text"
                              color="error"
                              @click="removeItem(item.id)"
                              class="mt-2"
                            />
                          </div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                    <v-divider />
                  </div>
                </div>
              </v-card>

              <!-- Continue Shopping -->
              <v-btn
                variant="outlined"
                @click="continueShopping"
              >
                <v-icon start>mdi-arrow-left</v-icon>
                Continue Shopping
              </v-btn>
            </v-col>

            <!-- Order Summary -->
            <v-col cols="12" lg="4">
              <v-card elevation="2" class="order-summary">
                <v-card-title>Order Summary</v-card-title>
                <v-divider />
                
                <v-card-text>
                  <div class="summary-row">
                    <span>Subtotal ({{ cartStore.itemCount }} items)</span>
                    <span>€{{ cartStore.subtotal.toFixed(2) }}</span>
                  </div>
                  
                  <div class="summary-row">
                    <span>Tax (19% VAT)</span>
                    <span>€{{ cartStore.tax.toFixed(2) }}</span>
                  </div>
                  
                  <v-divider class="my-4" />
                  
                  <div class="summary-row total-row">
                    <span class="text-h6 font-weight-bold">Total</span>
                    <span class="text-h6 font-weight-bold">€{{ cartStore.total.toFixed(2) }}</span>
                  </div>
                </v-card-text>

                <v-card-actions>
                  <v-btn
                    :color="checkoutButtonColor"
                    variant="elevated"
                    size="large"
                    block
                    @click="proceedToCheckout"
                  >
                    <v-icon start>mdi-credit-card</v-icon>
                    {{ checkoutButtonText }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.cart-page {
  min-height: 100vh;
  background-color: #fafafa;
}

.cart-items {
  max-height: 600px;
  overflow-y: auto;
}

.cart-item:last-child .v-divider {
  display: none;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.total-row {
  margin-bottom: 0;
}

.order-summary {
  position: sticky;
  top: 24px;
}

.layout-compact .cart-item {
  padding: 8px 0;
}

.layout-detailed .price-section {
  text-align: center;
}

@media (max-width: 960px) {
  .order-summary {
    position: static;
    margin-top: 24px;
  }
}
</style>