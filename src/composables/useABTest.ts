/**
 * Vue 3 A/B Testing Composable
 * 
 * This composable demonstrates several advanced Vue 3 Composition API patterns:
 * 
 * 1. **Reactive State Management**: Using ref and reactive for component state
 * 2. **Computed Properties**: Derived state with automatic dependency tracking
 * 3. **Async Operations**: Proper handling of asynchronous A/B test assignment
 * 4. **Error Handling**: Comprehensive error states and recovery
 * 5. **Lifecycle Management**: Cleanup and proper resource management
 * 6. **Type Safety**: Full TypeScript integration with proper generics
 * 7. **Dependency Injection**: Service injection pattern for testability
 * 8. **Event Tracking**: Integration with analytics for experiment monitoring
 * 
 * Usage Example:
 * ```typescript
 * // In a Vue component
 * const { variant, isLoading, error, trackConversion } = useABTest('button-color-test')
 * 
 * // Conditional rendering based on variant
 * const buttonColor = computed(() => {
 *   return variant.value?.config.color || 'blue'
 * })
 * 
 * // Track conversions
 * const handlePurchase = async (orderValue: number) => {
 *   await trackConversion(orderValue)
 * }
 * ```
 */

import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import { abTestingService, type ABTestingService } from '@/services/ab-testing'
import type { Variant, User, AnalyticsEvent } from '@/types'

/**
 * Configuration options for the A/B testing composable
 */
export interface UseABTestOptions {
  /**
   * Custom A/B testing service instance (useful for testing)
   */
  service?: ABTestingService
  
  /**
   * Whether to automatically track variant assignment events
   */
  autoTrack?: boolean
  
  /**
   * Custom user context for experiment targeting
   */
  user?: User
  
  /**
   * Callback for when variant is assigned
   */
  onVariantAssigned?: (variant: Variant) => void
  
  /**
   * Callback for tracking events
   */
  onTrackEvent?: (event: AnalyticsEvent) => void
  
  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Return type for the A/B testing composable
 * This interface demonstrates proper TypeScript typing for composables
 */
export interface UseABTestReturn {
  /** Current assigned variant (null if not assigned or loading) */
  variant: Ref<Variant | null>
  
  /** Loading state for variant assignment */
  isLoading: Ref<boolean>
  
  /** Error state if variant assignment fails */
  error: Ref<string | null>
  
  /** Whether user is assigned to this experiment */
  isAssigned: ComputedRef<boolean>
  
  /** Whether this is the control variant */
  isControl: ComputedRef<boolean>
  
  /** Variant configuration (typed as unknown for flexibility) */
  config: ComputedRef<Record<string, unknown>>
  
  /** Track conversion event for this experiment */
  trackConversion: (value?: number, type?: string) => Promise<void>
  
  /** Force refresh variant assignment */
  refreshVariant: () => Promise<void>
  
  /** Check if specific variant is active */
  isVariant: (variantId: string) => ComputedRef<boolean>
}

/**
 * Main A/B testing composable
 * 
 * This composable encapsulates all A/B testing logic in a reusable, type-safe way.
 * It follows Vue 3 best practices for composables and demonstrates proper
 * error handling, loading states, and cleanup.
 * 
 * @param experimentId - Unique identifier for the experiment
 * @param options - Configuration options for the composable
 * @returns Object with reactive state and methods for A/B testing
 */
export function useABTest(
  experimentId: string, 
  options: UseABTestOptions = {}
): UseABTestReturn {
  // Destructure options with defaults
  const {
    service = abTestingService,
    autoTrack = true,
    user,
    onVariantAssigned,
    onTrackEvent,
    debug = false
  } = options

  // ============================================================================
  // Reactive State
  // ============================================================================
  
  /**
   * Current variant assignment
   * Uses ref() for primitive-like reactivity - variant can be null or Variant object
   */
  const variant = ref<Variant | null>(null)
  
  /**
   * Loading state for async variant assignment
   * Important for UX - prevents flash of wrong content
   */
  const isLoading = ref<boolean>(true)
  
  /**
   * Error state for failed variant assignments
   * Allows graceful degradation when A/B testing fails
   */
  const error = ref<string | null>(null)

  // ============================================================================
  // Computed Properties
  // ============================================================================
  
  /**
   * Whether user is assigned to any variant in this experiment
   * Computed property automatically updates when variant changes
   */
  const isAssigned = computed(() => variant.value !== null)
  
  /**
   * Whether current variant is the control variant
   * Useful for conditional logic in components
   */
  const isControl = computed(() => variant.value?.isControl || false)
  
  /**
   * Variant configuration object
   * Provides easy access to variant-specific configuration
   */
  const config = computed(() => variant.value?.config || {})

  // ============================================================================
  // Methods
  // ============================================================================
  
  /**
   * Load variant assignment for the current user
   * Demonstrates proper async/await error handling in composables
   */
  const loadVariant = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null
      
      // Set user context if provided
      if (user) {
        await service.setUser(user)
      }
      
      // Get variant assignment
      const assignedVariant = await service.getVariant(experimentId)
      
      // Update reactive state
      variant.value = assignedVariant
      
      // Call assignment callback
      if (assignedVariant && onVariantAssigned) {
        onVariantAssigned(assignedVariant)
      }
      
      // Debug logging
      if (debug) {
        console.log(`[useABTest] Variant assigned for ${experimentId}:`, assignedVariant)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      
      if (debug) {
        console.error(`[useABTest] Error loading variant for ${experimentId}:`, err)
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Track conversion event for this experiment
   * Integrates with analytics service for experiment measurement
   * 
   * @param value - Optional monetary value of the conversion
   * @param type - Type of conversion (e.g., 'purchase', 'signup', 'click')
   */
  const trackConversion = async (value?: number, type: string = 'default'): Promise<void> => {
    if (!variant.value) {
      if (debug) {
        console.warn(`[useABTest] Cannot track conversion for ${experimentId}: no variant assigned`)
      }
      return
    }

    try {
      await service.trackConversion(experimentId, value, type)
      
      if (debug) {
        console.log(`[useABTest] Conversion tracked for ${experimentId}:`, { value, type })
      }
    } catch (err) {
      if (debug) {
        console.error(`[useABTest] Error tracking conversion for ${experimentId}:`, err)
      }
    }
  }

  /**
   * Force refresh of variant assignment
   * Useful for development/testing or when user context changes
   */
  const refreshVariant = async (): Promise<void> => {
    await loadVariant()
  }

  /**
   * Factory function to check if a specific variant is active
   * Returns a computed property for reactive variant checking
   * 
   * @param variantId - ID of the variant to check
   * @returns Computed boolean indicating if variant is active
   */
  const isVariant = (variantId: string): ComputedRef<boolean> => {
    return computed(() => variant.value?.id === variantId)
  }

  // ============================================================================
  // Lifecycle and Watchers
  // ============================================================================
  
  /**
   * Initialize variant assignment when composable is used
   * onMounted ensures DOM is ready if needed for variant application
   */
  onMounted(async () => {
    await loadVariant()
  })

  /**
   * Watch for changes in experiment service initialization
   * Ensures variant is loaded when service becomes ready
   */
  const stopServiceWatch = watch(
    () => service.isInitialized,
    async (isInitialized) => {
      if (isInitialized && isLoading.value) {
        await loadVariant()
      }
    },
    { immediate: true }
  )

  /**
   * Cleanup watchers when component is unmounted
   * Prevents memory leaks in long-running applications
   */
  onUnmounted(() => {
    stopServiceWatch()
  })

  // ============================================================================
  // Return Interface
  // ============================================================================
  
  return {
    // Reactive state
    variant,
    isLoading,
    error,
    
    // Computed properties
    isAssigned,
    isControl,
    config,
    
    // Methods
    trackConversion,
    refreshVariant,
    isVariant,
  }
}

/**
 * Simplified A/B test hook for basic use cases
 * 
 * This is an example of providing multiple API surfaces for different use cases.
 * Sometimes you want a simple boolean check, other times you need full control.
 * 
 * @param experimentId - Experiment identifier
 * @param variantId - Specific variant to check for
 * @returns Boolean indicating if the specific variant is active
 */
export function useABTestVariant(
  experimentId: string, 
  variantId: string
): ComputedRef<boolean> {
  const { isVariant } = useABTest(experimentId)
  return isVariant(variantId)
}

/**
 * A/B test hook with configuration object support
 * 
 * This pattern allows for more flexible variant configuration where
 * you can specify expected configuration structure with TypeScript.
 * 
 * @param experimentId - Experiment identifier  
 * @param defaultConfig - Default configuration if no variant assigned
 * @returns Configuration object with type safety
 */
export function useABTestConfig<T extends Record<string, unknown>>(
  experimentId: string,
  defaultConfig: T
): ComputedRef<T> {
  const { config, isAssigned } = useABTest(experimentId)
  
  return computed(() => {
    if (!isAssigned.value) {
      return defaultConfig
    }
    
    // Merge default config with variant config for safety
    return { ...defaultConfig, ...config.value } as T
  })
}

/**
 * Multi-variant A/B test hook
 * 
 * For experiments with more than 2 variants, this hook provides
 * an easy way to get the current variant name.
 * 
 * @param experimentId - Experiment identifier
 * @returns Current variant name or 'control' if not assigned
 */
export function useABTestVariantName(experimentId: string): ComputedRef<string> {
  const { variant, isControl } = useABTest(experimentId)
  
  return computed(() => {
    if (!variant.value) return 'control'
    if (isControl.value) return 'control'
    return variant.value.name
  })
}

/**
 * A/B test hook with automatic conversion tracking
 * 
 * This hook automatically tracks conversion when a specific condition is met,
 * useful for simple conversion goals like button clicks or form submissions.
 * 
 * @param experimentId - Experiment identifier
 * @param conversionTrigger - Ref that triggers conversion when true
 * @param conversionValue - Optional monetary value for the conversion
 */
export function useABTestWithAutoConversion(
  experimentId: string,
  conversionTrigger: Ref<boolean>,
  conversionValue?: number
): UseABTestReturn {
  const abTest = useABTest(experimentId)
  
  // Watch for conversion trigger and automatically track
  watch(conversionTrigger, async (shouldConvert) => {
    if (shouldConvert) {
      await abTest.trackConversion(conversionValue)
    }
  })
  
  return abTest
}

/**
 * Example usage patterns for documentation and testing
 */
export const exampleUsagePatterns = {
  // Basic variant check
  basicUsage: () => {
    const { variant, isLoading } = useABTest('button-color-test')
    return { variant, isLoading }
  },
  
  // Configuration-based usage
  configUsage: () => {
    interface ButtonConfig {
      color: string
      text: string
      size: 'small' | 'medium' | 'large'
    }
    
    const config = useABTestConfig('button-config-test', {
      color: 'blue',
      text: 'Buy Now',
      size: 'medium' as const
    })
    
    return config
  },
  
  // Variant-specific usage
  variantUsage: () => {
    const isRedButton = useABTestVariant('button-color-test', 'red-variant')
    return isRedButton
  },
  
  // Auto-conversion tracking
  autoConversionUsage: () => {
    const purchaseCompleted = ref(false)
    const abTest = useABTestWithAutoConversion(
      'checkout-flow-test',
      purchaseCompleted,
      99.99
    )
    
    // When purchase is completed, conversion is automatically tracked
    const completePurchase = () => {
      purchaseCompleted.value = true
    }
    
    return { abTest, completePurchase }
  }
}