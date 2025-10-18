/**
 * Vue 3 Analytics Composable
 * 
 * This composable provides comprehensive analytics tracking for A/B testing and e-commerce.
 * It demonstrates advanced Vue 3 patterns and integration with external analytics services.
 * 
 * Key Features:
 * 1. **Event Tracking**: Page views, user interactions, conversions
 * 2. **A/B Test Context**: Automatic experiment context in all events
 * 3. **User Journey**: Session and funnel tracking
 * 4. **Performance Monitoring**: Core Web Vitals and custom metrics
 * 5. **Error Tracking**: Automatic error capture and reporting
 * 6. **Privacy Compliance**: Consent management and data anonymization
 * 
 * Integration Examples:
 * - Google Analytics 4
 * - Adobe Analytics
 * - Mixpanel
 * - Custom analytics backend
 */

import { ref, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { abTestingService } from '@/services/ab-testing'
import type { 
  AnalyticsEvent,
  Order
} from '@/types'

/**
 * Analytics provider interface
 * Allows swapping between different analytics services
 */
export interface AnalyticsProvider {
  initialize(config: Record<string, unknown>): Promise<void>
  track(event: AnalyticsEvent): Promise<void>
  identify(userId: string, properties?: Record<string, unknown>): Promise<void>
  page(properties?: Record<string, unknown>): Promise<void>
  setUserProperty(key: string, value: unknown): Promise<void>
}

/**
 * Configuration for the analytics composable
 */
export interface UseAnalyticsOptions {
  provider?: AnalyticsProvider
  autoTrackPageViews?: boolean
  autoTrackErrors?: boolean
  enableDebugMode?: boolean
  consentRequired?: boolean
  anonymizeIP?: boolean
  sessionTimeout?: number // in minutes
}

/**
 * Return interface for the analytics composable
 */
export interface UseAnalyticsReturn {
  // State
  isInitialized: Ref<boolean>
  hasConsent: Ref<boolean>
  sessionId: Ref<string>
  userId: Ref<string | null>
  
  // Methods
  track: (eventType: string, properties?: Record<string, unknown>) => Promise<void>
  trackPageView: (page?: string, properties?: Record<string, unknown>) => Promise<void>
  trackProductView: (productId: string, properties?: Record<string, unknown>) => Promise<void>
  trackAddToCart: (productId: string, quantity: number, properties?: Record<string, unknown>) => Promise<void>
  trackPurchase: (order: Order) => Promise<void>
  trackExperimentAssigned: (experimentId: string, variantId: string) => Promise<void>
  trackExperimentConverted: (experimentId: string, conversionValue?: number) => Promise<void>
  
  // User management
  identify: (userId: string, properties?: Record<string, unknown>) => Promise<void>
  setUserProperty: (key: string, value: unknown) => Promise<void>
  
  // Consent management
  grantConsent: () => void
  revokeConsent: () => void
  
  // Performance tracking
  trackPerformance: (metric: string, value: number, unit?: string) => Promise<void>
  trackError: (error: Error, context?: Record<string, unknown>) => Promise<void>
}

/**
 * Default console-based analytics provider for development
 */
class ConsoleAnalyticsProvider implements AnalyticsProvider {
  async initialize(config: Record<string, unknown>): Promise<void> {
    console.log('[Analytics] Initialized with config:', config)
  }

  async track(event: AnalyticsEvent): Promise<void> {
    console.log('[Analytics] Event tracked:', {
      type: event.eventType,
      properties: event.properties,
      userId: event.userId,
      timestamp: event.timestamp
    })
  }

  async identify(userId: string, properties?: Record<string, unknown>): Promise<void> {
    console.log('[Analytics] User identified:', { userId, properties })
  }

  async page(properties?: Record<string, unknown>): Promise<void> {
    console.log('[Analytics] Page view:', properties)
  }

  async setUserProperty(key: string, value: unknown): Promise<void> {
    console.log('[Analytics] User property set:', { key, value })
  }
}

/**
 * Local storage analytics provider
 * Stores events locally for offline analysis
 */
class LocalStorageAnalyticsProvider implements AnalyticsProvider {
  private storageKey = 'analytics_events'

  async initialize(): Promise<void> {
    // Ensure storage is available
    if (typeof localStorage === 'undefined') {
      throw new Error('LocalStorage not available')
    }
  }

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      const events = this.getStoredEvents()
      events.push(event)
      
      // Keep only last 1000 events to prevent storage overflow
      if (events.length > 1000) {
        events.splice(0, events.length - 1000)
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(events))
    } catch (error) {
      console.warn('[Analytics] Failed to store event:', error)
    }
  }

  async identify(userId: string, properties?: Record<string, unknown>): Promise<void> {
    await this.track({
      eventId: uuidv4(),
      eventType: 'user_identified',
      userId,
      sessionId: '',
      timestamp: new Date(),
      properties: properties || {}
    })
  }

  async page(properties?: Record<string, unknown>): Promise<void> {
    // Page tracking handled by main track method
    console.log('[Analytics] Page view:', properties)
  }

  async setUserProperty(key: string, value: unknown): Promise<void> {
    console.log('[Analytics] User property set:', { key, value })
  }

  private getStoredEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Utility method to export stored events
  getEvents(): AnalyticsEvent[] {
    return this.getStoredEvents()
  }

  clearEvents(): void {
    localStorage.removeItem(this.storageKey)
  }
}

/**
 * Main analytics composable
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    provider = new ConsoleAnalyticsProvider(),
    autoTrackPageViews = true,
    autoTrackErrors = true,
    enableDebugMode = false,
    consentRequired = false,
    anonymizeIP = true,
    sessionTimeout = 30
  } = options

  const route = useRoute()

  // ============================================================================
  // Reactive State
  // ============================================================================
  
  const isInitialized = ref(false)
  const hasConsent = ref(!consentRequired)
  const sessionId = ref(generateSessionId())
  const userId = ref<string | null>(null)
  const lastActivityTime = ref(Date.now())

  // ============================================================================
  // Session Management
  // ============================================================================
  
  /**
   * Generate a unique session ID
   */
  function generateSessionId(): string {
    return `session_${uuidv4()}_${Date.now()}`
  }

  /**
   * Check if current session is still valid
   */
  function isSessionValid(): boolean {
    const now = Date.now()
    const timeSinceActivity = now - lastActivityTime.value
    const sessionTimeoutMs = sessionTimeout * 60 * 1000
    
    return timeSinceActivity < sessionTimeoutMs
  }

  /**
   * Refresh session if needed
   */
  function refreshSession(): void {
    if (!isSessionValid()) {
      sessionId.value = generateSessionId()
      debug('New session started:', sessionId.value)
    }
    lastActivityTime.value = Date.now()
  }

  // ============================================================================
  // Core Tracking Methods
  // ============================================================================
  
  /**
   * Base track method that all other tracking methods use
   */
  const track = async (
    eventType: string, 
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!hasConsent.value) {
      debug('Tracking blocked: no consent')
      return
    }

    refreshSession()

    // Get current A/B test assignments for context
    const experimentAssignments = abTestingService.getActiveAssignments()

    const event: AnalyticsEvent = {
      eventId: uuidv4(),
      eventType,
      userId: userId.value || 'anonymous',
      sessionId: sessionId.value,
      timestamp: new Date(),
      properties: {
        ...properties,
        // Add current page context
        page: route.path,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        // Add A/B test context
        activeExperiments: experimentAssignments.map(a => ({
          experimentId: a.experimentId,
          variantId: a.variantId
        }))
      },
      experimentAssignments
    }

    try {
      await provider.track(event)
      debug('Event tracked:', event)
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error)
    }
  }

  /**
   * Track page view events
   */
  const trackPageView = async (
    page?: string, 
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    const pageViewEvent = {
      page: page || route.path,
      referrer: document.referrer,
      title: document.title,
      ...properties
    }

    await track('page_view', pageViewEvent)
  }

  /**
   * Track product view events
   */
  const trackProductView = async (
    productId: string,
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    await track('product_view', {
      productId,
      ...properties
    })
  }

  /**
   * Track add to cart events
   */
  const trackAddToCart = async (
    productId: string,
    quantity: number,
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    await track('add_to_cart', {
      productId,
      quantity,
      ...properties
    })
  }

  /**
   * Track purchase completion
   */
  const trackPurchase = async (order: Order): Promise<void> => {
    const purchaseEvent = {
      orderId: order.id,
      totalAmount: order.totalAmount,
      currency: order.currency,
      itemCount: order.items.length,
      paymentMethod: order.paymentMethod.type,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }))
    }

    await track('purchase', purchaseEvent)
  }

  /**
   * Track A/B experiment assignment
   */
  const trackExperimentAssigned = async (
    experimentId: string, 
    variantId: string
  ): Promise<void> => {
    await track('experiment_assigned', {
      experimentId,
      variantId
    })
  }

  /**
   * Track A/B experiment conversion
   */
  const trackExperimentConverted = async (
    experimentId: string,
    conversionValue?: number
  ): Promise<void> => {
    await track('experiment_converted', {
      experimentId,
      conversionValue
    })
  }

  // ============================================================================
  // User Management
  // ============================================================================
  
  /**
   * Identify a user for tracking
   */
  const identify = async (
    newUserId: string,
    properties: Record<string, unknown> = {}
  ): Promise<void> => {
    userId.value = newUserId
    
    try {
      await provider.identify(newUserId, properties)
      debug('User identified:', newUserId)
    } catch (error) {
      console.error('[Analytics] Failed to identify user:', error)
    }
  }

  /**
   * Set a user property
   */
  const setUserProperty = async (key: string, value: unknown): Promise<void> => {
    try {
      await provider.setUserProperty(key, value)
      debug('User property set:', { key, value })
    } catch (error) {
      console.error('[Analytics] Failed to set user property:', error)
    }
  }

  // ============================================================================
  // Consent Management
  // ============================================================================
  
  const grantConsent = (): void => {
    hasConsent.value = true
    debug('Analytics consent granted')
  }

  const revokeConsent = (): void => {
    hasConsent.value = false
    debug('Analytics consent revoked')
  }

  // ============================================================================
  // Performance and Error Tracking
  // ============================================================================
  
  /**
   * Track custom performance metrics
   */
  const trackPerformance = async (
    metric: string,
    value: number,
    unit: string = 'ms'
  ): Promise<void> => {
    await track('performance_metric', {
      metric,
      value,
      unit
    })
  }

  /**
   * Track JavaScript errors
   */
  const trackError = async (
    error: Error,
    context: Record<string, unknown> = {}
  ): Promise<void> => {
    await track('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      ...context
    })
  }

  // ============================================================================
  // Lifecycle and Watchers
  // ============================================================================
  
  /**
   * Initialize analytics on mount
   */
  onMounted(async () => {
    try {
      await provider.initialize({
        anonymizeIP,
        sessionTimeout,
        enableDebugMode
      })
      isInitialized.value = true
      debug('Analytics initialized')

      // Track initial page view
      if (autoTrackPageViews) {
        await nextTick() // Wait for route to be ready
        await trackPageView()
      }
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error)
    }
  })

  /**
   * Track page views automatically on route changes
   */
  if (autoTrackPageViews) {
    watch(() => route.path, async (newPath, oldPath) => {
      if (isInitialized.value && newPath !== oldPath) {
        await trackPageView()
      }
    })
  }

  /**
   * Set up global error tracking
   */
  if (autoTrackErrors) {
    onMounted(() => {
      const handleError = (event: ErrorEvent) => {
        trackError(new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      }

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        trackError(
          new Error(event.reason instanceof Error ? event.reason.message : String(event.reason)),
          { type: 'unhandled_promise_rejection' }
        )
      }

      window.addEventListener('error', handleError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)

      onUnmounted(() => {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      })
    })
  }

  // ============================================================================
  // Utilities
  // ============================================================================
  
  function debug(message: string, data?: unknown): void {
    if (enableDebugMode) {
      console.log(`[Analytics] ${message}`, data || '')
    }
  }

  // ============================================================================
  // Return Interface
  // ============================================================================
  
  return {
    // State
    isInitialized,
    hasConsent,
    sessionId,
    userId,
    
    // Core tracking
    track,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackExperimentAssigned,
    trackExperimentConverted,
    
    // User management
    identify,
    setUserProperty,
    
    // Consent
    grantConsent,
    revokeConsent,
    
    // Performance and errors
    trackPerformance,
    trackError
  }
}

/**
 * Specialized hook for e-commerce tracking
 */
export function useEcommerceAnalytics() {
  const analytics = useAnalytics()
  
  /**
   * Track complete purchase funnel
   */
  const trackPurchaseFunnel = async (step: string, properties?: Record<string, unknown>) => {
    await analytics.track(`funnel_${step}`, {
      funnelStep: step,
      ...properties
    })
  }

  /**
   * Track cart abandonment
   */
  const trackCartAbandonment = async (cartValue: number, itemCount: number) => {
    await analytics.track('cart_abandoned', {
      cartValue,
      itemCount,
      abandonmentStage: 'cart'
    })
  }

  /**
   * Track search events
   */
  const trackSearch = async (query: string, resultCount?: number) => {
    await analytics.track('search', {
      searchQuery: query,
      resultCount,
      searchLocation: 'main'
    })
  }

  return {
    ...analytics,
    trackPurchaseFunnel,
    trackCartAbandonment,
    trackSearch
  }
}

// Export providers for external use
export { ConsoleAnalyticsProvider, LocalStorageAnalyticsProvider }