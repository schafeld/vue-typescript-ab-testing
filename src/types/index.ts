/**
 * Core TypeScript types for A/B Testing E-commerce Application
 * 
 * This file defines the foundational types used throughout the application.
 * Understanding these types is crucial for TypeScript proficiency in Vue 3 development.
 */

// ============================================================================
// A/B Testing Types
// ============================================================================

/**
 * Represents an individual A/B test experiment
 * Each experiment can have multiple variants (control + treatment variants)
 */
export interface Experiment {
  id: string
  name: string
  description: string
  isActive: boolean
  startDate: Date
  endDate?: Date
  trafficAllocation: number // Percentage of users included (0-100)
  variants: Variant[]
  targetingRules?: TargetingRule[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Individual variant within an experiment
 * Variants define different user experiences to test against each other
 */
export interface Variant {
  id: string
  experimentId: string
  name: string
  description: string
  weight: number // Traffic split percentage (0-100)
  isControl: boolean // Whether this is the baseline/control variant
  config: Record<string, unknown> // Flexible configuration for variant behavior
}

/**
 * Targeting rules for experiment assignment
 * Allows sophisticated user segmentation for experiments
 */
export interface TargetingRule {
  property: string // User property to evaluate (e.g., 'country', 'deviceType')
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains'
  value: string | string[]
}

/**
 * User's assignment to experiment variants
 * Persisted to ensure consistent experience across sessions
 */
export interface UserAssignment {
  userId: string
  experimentId: string
  variantId: string
  assignedAt: Date
  sticky: boolean // Whether assignment should persist across sessions
}

// ============================================================================
// E-commerce Domain Types
// ============================================================================

/**
 * Product in the online shop
 * Represents items that can be purchased
 */
export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string
  category: ProductCategory
  inStock: boolean
  stockQuantity: number
  rating: number
  reviewCount: number
  tags: string[]
  createdAt: Date
}

/**
 * Product categories for organization and filtering
 */
export interface ProductCategory {
  id: string
  name: string
  slug: string
  description: string
  parentCategoryId?: string
}

/**
 * Shopping cart item
 * Links products with quantities selected by user
 */
export interface CartItem {
  id: string
  productId: string
  product: Product
  quantity: number
  addedAt: Date
}

/**
 * Complete shopping cart
 */
export interface ShoppingCart {
  id: string
  userId: string
  items: CartItem[]
  totalAmount: number
  currency: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Order placed by user
 * Represents completed purchases for conversion tracking
 */
export interface Order {
  id: string
  userId: string
  items: CartItem[]
  totalAmount: number
  currency: string
  status: OrderStatus
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: PaymentMethod
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface PaymentMethod {
  type: 'credit_card' | 'paypal' | 'bank_transfer'
  lastFourDigits?: string
  expiryDate?: string
}

// ============================================================================
// User and Personalization Types
// ============================================================================

/**
 * User profile for personalization and targeting
 */
export interface User {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  country?: string
  preferredLanguage: string
  deviceType: DeviceType
  browserInfo: BrowserInfo
  registrationDate?: Date
  lastLoginDate?: Date
  preferences: UserPreferences
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet'

export interface BrowserInfo {
  userAgent: string
  language: string
  platform: string
  cookiesEnabled: boolean
}

export interface UserPreferences {
  currency: string
  notifications: boolean
  marketingEmails: boolean
  favoriteCategories: string[]
}

// ============================================================================
// Analytics and Tracking Types
// ============================================================================

/**
 * Base interface for all analytics events
 * Provides consistent structure for event tracking
 */
export interface AnalyticsEvent {
  eventId: string
  eventType: string
  userId: string
  sessionId: string
  timestamp: Date
  properties: Record<string, unknown>
  experimentAssignments?: UserAssignment[]
}

/**
 * Specific event types for e-commerce funnel tracking
 */
export interface PageViewEvent extends AnalyticsEvent {
  eventType: 'page_view'
  properties: {
    page: string
    referrer?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
}

export interface ProductViewEvent extends AnalyticsEvent {
  eventType: 'product_view'
  properties: {
    productId: string
    productName: string
    productPrice: number
    category: string
  }
}

export interface AddToCartEvent extends AnalyticsEvent {
  eventType: 'add_to_cart'
  properties: {
    productId: string
    productName: string
    quantity: number
    price: number
  }
}

export interface PurchaseEvent extends AnalyticsEvent {
  eventType: 'purchase'
  properties: {
    orderId: string
    totalAmount: number
    currency: string
    itemCount: number
    paymentMethod: string
  }
}

/**
 * Experiment-specific events for A/B testing analysis
 */
export interface ExperimentEvent extends AnalyticsEvent {
  eventType: 'experiment_assigned' | 'experiment_converted'
  properties: {
    experimentId: string
    variantId: string
    conversionValue?: number
  }
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 * Provides consistent error handling and typing for all API calls
 */
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ResponseMeta {
  timestamp: Date
  requestId: string
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

// ============================================================================
// Vue 3 Specific Types
// ============================================================================

/**
 * Vue 3 Composition API return types
 * These interfaces define what our composables should return
 */
export interface UseExperimentReturn {
  // Reactive state
  currentVariant: Ref<Variant | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  
  // Methods
  getVariant: (experimentId: string) => Promise<Variant | null>
  trackConversion: (conversionValue?: number) => Promise<void>
}

export interface UseShoppingCartReturn {
  // Reactive state
  cart: Ref<ShoppingCart>
  itemCount: ComputedRef<number>
  totalAmount: ComputedRef<number>
  isLoading: Ref<boolean>
  
  // Methods
  addItem: (product: Product, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
}

export interface UseAnalyticsReturn {
  // Methods
  track: (event: AnalyticsEvent) => Promise<void>
  trackPageView: (page: string) => Promise<void>
  trackPurchase: (order: Order) => Promise<void>
  setUserId: (userId: string) => void
}

// ============================================================================
// Import necessary Vue types for our interfaces
// ============================================================================

import type { Ref, ComputedRef } from 'vue'