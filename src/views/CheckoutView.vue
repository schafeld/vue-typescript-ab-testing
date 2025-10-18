<!--
  Checkout View Component
  
  This view demonstrates:
  1. Multi-step checkout process with A/B testing
  2. Form validation and user input handling
  3. Payment method selection with analytics tracking
  4. Order completion and conversion tracking
  5. Integration with cart store and analytics
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
 * A/B Testing for checkout flow
 */
const { variant: checkoutFlowVariant, trackConversion } = useABTest('checkout-flow-test', {
  onVariantAssigned: (variant) => {
    analytics.track('experiment_assignment', {
      experimentId: 'checkout-flow-test',
      variantId: variant.id,
      page: 'checkout'
    })
  }
})

/**
 * A/B Testing for payment options
 */
const { variant: paymentOptionsVariant } = useABTest('payment-options-test')

/**
 * Form state
 */
const currentStep = ref(1)
const isProcessing = ref(false)

// Customer information
const customerInfo = ref({
  email: '',
  firstName: '',
  lastName: '',
  phone: ''
})

// Shipping address
const shippingAddress = ref({
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Germany'
})

// Payment information
const paymentInfo = ref({
  method: 'credit-card',
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  cardName: ''
})

/**
 * Validation rules
 */
const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const requiredRule = [(v: string) => !!v || 'This field is required']

/**
 * Computed properties
 */
const isMultiStep = computed(() => {
  return checkoutFlowVariant.value?.config?.multiStep !== false
})

interface PaymentMethod {
  value: string
  title: string
  icon: string
}

const availablePaymentMethods = computed<PaymentMethod[]>(() => {
  if (!paymentOptionsVariant.value) {
    return [
      { value: 'credit-card', title: 'Credit Card', icon: 'mdi-credit-card' },
      { value: 'paypal', title: 'PayPal', icon: 'mdi-paypal' },
      { value: 'bank-transfer', title: 'Bank Transfer', icon: 'mdi-bank' }
    ]
  }
  
  const config = paymentOptionsVariant.value.config
  return (config?.methods as PaymentMethod[]) || [
    { value: 'credit-card', title: 'Credit Card', icon: 'mdi-credit-card' },
    { value: 'paypal', title: 'PayPal', icon: 'mdi-paypal' }
  ]
})

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 1:
      return customerInfo.value.email && customerInfo.value.firstName && customerInfo.value.lastName
    case 2:
      return shippingAddress.value.street && shippingAddress.value.city && shippingAddress.value.zipCode
    case 3:
      return paymentInfo.value.method
    default:
      return false
  }
})

/**
 * Methods
 */
const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < 3) {
    currentStep.value++
    
    analytics.track('checkout_step_completed', {
      step: currentStep.value - 1,
      cartTotal: cartStore.total
    })
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const completeOrder = async () => {
  if (!canProceedToNextStep.value) return
  
  isProcessing.value = true
  
  try {
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Track conversion for checkout flow A/B test
    trackConversion(cartStore.total, 'order_completed')
    
    // Track analytics event
    analytics.track('order_completed', {
      orderId: `order_${Date.now()}`,
      cartTotal: cartStore.total,
      itemCount: cartStore.itemCount,
      paymentMethod: paymentInfo.value.method,
      items: cartStore.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    })
    
    // Clear cart
    cartStore.clearCart()
    
    // Redirect to thank you page
    router.push('/thank-you')
    
  } catch (error) {
    console.error('Order processing failed:', error)
    analytics.track('order_failed', {
      error: String(error),
      cartTotal: cartStore.total
    })
  } finally {
    isProcessing.value = false
  }
}

const goToCart = () => {
  router.push('/cart')
}

/**
 * Lifecycle
 */
onMounted(() => {
  // Redirect to cart if empty
  if (cartStore.isEmpty) {
    router.push('/cart')
    return
  }
  
  analytics.track('page_view', {
    page: 'checkout',
    cartTotal: cartStore.total,
    itemCount: cartStore.itemCount
  })
})
</script>

<template>
  <div class="checkout-page">
    <v-container class="py-8">
      <!-- Page Header -->
      <div class="d-flex align-center mb-6">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          @click="goToCart"
          class="mr-4"
        />
        <div>
          <h1 class="text-h4 mb-2">Checkout</h1>
          <p class="text-body-1 text-medium-emphasis">
            Complete your order of {{ cartStore.itemCount }} items
          </p>
        </div>
      </div>

      <v-row>
        <!-- Checkout Form -->
        <v-col cols="12" lg="8">
          <v-card elevation="1">
            <!-- Progress Steps (Multi-step only) -->
            <div v-if="isMultiStep" class="px-6 pt-6">
              <v-stepper
                v-model="currentStep"
                :items="[
                  { title: 'Contact Info', value: 1 },
                  { title: 'Shipping', value: 2 },
                  { title: 'Payment', value: 3 }
                ]"
                hide-actions
                flat
              />
            </div>

            <v-card-text class="pa-6">
              <!-- Step 1: Customer Information -->
              <div v-if="currentStep === 1" class="checkout-step">
                <h2 class="text-h5 mb-4">Contact Information</h2>
                
                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="customerInfo.email"
                      label="Email Address"
                      type="email"
                      :rules="emailRules"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="customerInfo.firstName"
                      label="First Name"
                      :rules="requiredRule"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="customerInfo.lastName"
                      label="Last Name"
                      :rules="requiredRule"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="customerInfo.phone"
                      label="Phone Number (Optional)"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- Step 2: Shipping Address -->
              <div v-if="currentStep === 2" class="checkout-step">
                <h2 class="text-h5 mb-4">Shipping Address</h2>
                
                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="shippingAddress.street"
                      label="Street Address"
                      :rules="requiredRule"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="shippingAddress.city"
                      label="City"
                      :rules="requiredRule"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model="shippingAddress.state"
                      label="State/Region"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model="shippingAddress.zipCode"
                      label="ZIP/Postal Code"
                      :rules="requiredRule"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-select
                      v-model="shippingAddress.country"
                      :items="['Germany', 'Austria', 'Switzerland', 'Netherlands']"
                      label="Country"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- Step 3: Payment Information -->
              <div v-if="currentStep === 3" class="checkout-step">
                <h2 class="text-h5 mb-4">Payment Method</h2>
                
                <v-radio-group v-model="paymentInfo.method" class="mb-4">
                  <v-radio
                    v-for="method in availablePaymentMethods"
                    :key="method.value"
                    :value="method.value"
                    :label="method.title"
                  >
                    <template #label>
                      <div class="d-flex align-center">
                        <v-icon :icon="method.icon" class="mr-2" />
                        {{ method.title }}
                      </div>
                    </template>
                  </v-radio>
                </v-radio-group>

                <!-- Credit Card Form -->
                <div v-if="paymentInfo.method === 'credit-card'">
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="paymentInfo.cardNumber"
                        label="Card Number"
                        placeholder="1234 5678 9012 3456"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="paymentInfo.expiryDate"
                        label="Expiry Date"
                        placeholder="MM/YY"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="paymentInfo.cvv"
                        label="CVV"
                        placeholder="123"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="paymentInfo.cardName"
                        label="Name on Card"
                        variant="outlined"
                      />
                    </v-col>
                  </v-row>
                </div>

                <!-- PayPal Notice -->
                <div v-else-if="paymentInfo.method === 'paypal'">
                  <v-alert type="info" class="mb-4">
                    You will be redirected to PayPal to complete your payment.
                  </v-alert>
                </div>

                <!-- Bank Transfer Notice -->
                <div v-else-if="paymentInfo.method === 'bank-transfer'">
                  <v-alert type="info" class="mb-4">
                    Bank transfer details will be provided after order confirmation.
                  </v-alert>
                </div>
              </div>
            </v-card-text>

            <!-- Step Actions -->
            <v-card-actions class="pa-6">
              <v-btn
                v-if="currentStep > 1"
                variant="outlined"
                @click="prevStep"
              >
                <v-icon start>mdi-arrow-left</v-icon>
                Previous
              </v-btn>
              
              <v-spacer />
              
              <v-btn
                v-if="currentStep < 3"
                color="primary"
                :disabled="!canProceedToNextStep"
                @click="nextStep"
              >
                Next
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
              
              <v-btn
                v-else
                color="primary"
                :loading="isProcessing"
                :disabled="!canProceedToNextStep"
                @click="completeOrder"
              >
                <v-icon start>mdi-check</v-icon>
                Complete Order
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Order Summary -->
        <v-col cols="12" lg="4">
          <v-card elevation="2" class="order-summary">
            <v-card-title>Order Summary</v-card-title>
            <v-divider />
            
            <!-- Cart Items -->
            <v-card-text>
              <div class="cart-items mb-4">
                <div
                  v-for="item in cartStore.items"
                  :key="item.id"
                  class="d-flex align-center mb-3"
                >
                  <v-img
                    :src="item.image"
                    :alt="item.name"
                    width="50"
                    height="50"
                    cover
                    class="rounded mr-3"
                  />
                  <div class="flex-grow-1">
                    <p class="text-body-2 font-weight-medium">{{ item.name }}</p>
                    <p class="text-caption">Qty: {{ item.quantity }}</p>
                  </div>
                  <span class="text-body-2 font-weight-medium">
                    €{{ (item.price * item.quantity).toFixed(2) }}
                  </span>
                </div>
              </div>

              <v-divider class="mb-4" />

              <!-- Price Breakdown -->
              <div class="summary-row mb-2">
                <span>Subtotal</span>
                <span>€{{ cartStore.subtotal.toFixed(2) }}</span>
              </div>
              <div class="summary-row mb-2">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div class="summary-row mb-2">
                <span>Tax (19% VAT)</span>
                <span>€{{ cartStore.tax.toFixed(2) }}</span>
              </div>
              
              <v-divider class="my-3" />
              
              <div class="summary-row total-row">
                <span class="text-h6 font-weight-bold">Total</span>
                <span class="text-h6 font-weight-bold">€{{ cartStore.total.toFixed(2) }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.checkout-page {
  min-height: 100vh;
  background-color: #fafafa;
}

.checkout-step {
  min-height: 400px;
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

.cart-items {
  max-height: 300px;
  overflow-y: auto;
}

@media (max-width: 960px) {
  .order-summary {
    position: static;
    margin-bottom: 24px;
  }
}
</style>