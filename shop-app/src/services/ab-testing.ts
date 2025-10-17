/**
 * A/B Testing Service
 * 
 * This service provides the core functionality for A/B testing in Vue 3 applications.
 * It demonstrates several advanced TypeScript and Vue patterns:
 * 
 * 1. Singleton Pattern: Ensures consistent experiment state across the app
 * 2. Observer Pattern: Reactive experiment assignments using Vue's reactivity
 * 3. Strategy Pattern: Pluggable assignment algorithms
 * 4. Dependency Injection: Configurable storage and analytics providers
 * 
 * Key A/B Testing Concepts Implemented:
 * - Deterministic user bucketing (same user always gets same variant)
 * - Traffic allocation and variant weight distribution
 * - Experiment targeting rules
 * - Sticky assignments (persist across sessions)
 * - Conversion tracking and analytics integration
 */

import { reactive } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { 
  Experiment, 
  Variant, 
  UserAssignment, 
  User,
  TargetingRule,
  AnalyticsEvent 
} from '@/types'

/**
 * Configuration for the A/B testing service
 */
export interface ABTestingConfig {
  userId?: string
  sessionId?: string
  storageProvider?: StorageProvider
  analyticsProvider?: AnalyticsProvider
  assignmentAlgorithm?: AssignmentAlgorithm
  enableDebugMode?: boolean
}

/**
 * Storage interface for persisting experiment assignments
 * Can be implemented with localStorage, sessionStorage, cookies, or external storage
 */
export interface StorageProvider {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/**
 * Analytics interface for tracking experiment events
 */
export interface AnalyticsProvider {
  track(event: AnalyticsEvent): Promise<void>
}

/**
 * Assignment algorithm interface for custom bucketing strategies
 */
export interface AssignmentAlgorithm {
  assignVariant(user: User, experiment: Experiment): Variant | null
}

/**
 * Default localStorage-based storage provider
 * Demonstrates async/await patterns even with synchronous localStorage
 */
class LocalStorageProvider implements StorageProvider {
  private prefix = 'abtest_'

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.prefix + key)
    } catch (error) {
      console.warn('LocalStorage access failed:', error)
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, value)
    } catch (error) {
      console.warn('LocalStorage write failed:', error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.warn('LocalStorage removal failed:', error)
    }
  }
}

/**
 * Hash-based deterministic assignment algorithm
 * Ensures users always get the same variant for consistency
 */
class HashAssignmentAlgorithm implements AssignmentAlgorithm {
  /**
   * Simple hash function for consistent user bucketing
   * In production, consider using a more robust hash like MurmurHash
   */
  private hash(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  assignVariant(user: User, experiment: Experiment): Variant | null {
    // Check if user should be included in this experiment
    const trafficHash = this.hash(user.id + experiment.id + 'traffic')
    const trafficBucket = trafficHash % 100
    
    if (trafficBucket >= experiment.trafficAllocation) {
      return null // User not included in experiment
    }

    // Check targeting rules
    if (experiment.targetingRules && !this.evaluateTargetingRules(user, experiment.targetingRules)) {
      return null
    }

    // Assign variant based on weights
    const variantHash = this.hash(user.id + experiment.id + 'variant')
    const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0)
    const bucket = variantHash % totalWeight

    let cumulativeWeight = 0
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight
      if (bucket < cumulativeWeight) {
        return variant
      }
    }

    // Fallback to control variant
    return experiment.variants.find(v => v.isControl) || experiment.variants[0] || null
  }

  private evaluateTargetingRules(user: User, rules: TargetingRule[]): boolean {
    return rules.every(rule => this.evaluateRule(user, rule))
  }

  private evaluateRule(user: User, rule: TargetingRule): boolean {
    const userValue = this.getUserProperty(user, rule.property)
    
    switch (rule.operator) {
      case 'equals':
        return userValue === rule.value
      case 'not_equals':
        return userValue !== rule.value
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(userValue as string)
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(userValue as string)
      case 'contains':
        return typeof userValue === 'string' && 
               typeof rule.value === 'string' && 
               userValue.includes(rule.value)
      default:
        return false
    }
  }

  private getUserProperty(user: User, property: string): unknown {
    // Type-safe property access with dot notation support
    const keys = property.split('.')
    let value: unknown = user
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }
    
    return value
  }
}

/**
 * Main A/B Testing Service
 * Implements reactive experiment management using Vue 3's Composition API patterns
 */
export class ABTestingService {
  private static instance: ABTestingService
  
  // Reactive state using Vue's reactivity system
  private state = reactive({
    experiments: new Map<string, Experiment>(),
    assignments: new Map<string, UserAssignment>(),
    currentUser: null as User | null,
    isInitialized: false,
  })

  private config: ABTestingConfig
  private storageProvider: StorageProvider
  private analyticsProvider?: AnalyticsProvider
  private assignmentAlgorithm: AssignmentAlgorithm
  private sessionId: string
  private debugMode: boolean

  constructor(config: ABTestingConfig = {}) {
    this.config = config
    this.storageProvider = config.storageProvider || new LocalStorageProvider()
    this.analyticsProvider = config.analyticsProvider
    this.assignmentAlgorithm = config.assignmentAlgorithm || new HashAssignmentAlgorithm()
    this.sessionId = config.sessionId || uuidv4()
    this.debugMode = config.enableDebugMode || false
    
    this.log('ABTestingService initialized', { config })
  }

  /**
   * Singleton pattern implementation
   * Ensures consistent state across the application
   */
  static getInstance(config?: ABTestingConfig): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService(config)
    }
    return ABTestingService.instance
  }

  /**
   * Initialize the service with experiments configuration
   * Loads persisted assignments from storage
   */
  async initialize(experiments: Experiment[]): Promise<void> {
    this.log('Initializing experiments', { count: experiments.length })
    
    // Load experiments into reactive state
    for (const experiment of experiments) {
      this.state.experiments.set(experiment.id, experiment)
    }

    // Load persisted assignments
    await this.loadPersistedAssignments()
    
    this.state.isInitialized = true
    this.log('Initialization complete')
  }

  /**
   * Set the current user for experiment targeting and assignment
   */
  async setUser(user: User): Promise<void> {
    this.state.currentUser = user
    this.log('User set', { userId: user.id })

    // Re-evaluate assignments for the new user
    await this.evaluateAllAssignments()
  }

  /**
   * Get the variant for a specific experiment
   * Returns null if user is not assigned to the experiment
   */
  async getVariant(experimentId: string): Promise<Variant | null> {
    const experiment = this.state.experiments.get(experimentId)
    if (!experiment) {
      this.log('Experiment not found', { experimentId })
      return null
    }

    if (!experiment.isActive) {
      this.log('Experiment inactive', { experimentId })
      return null
    }

    if (!this.state.currentUser) {
      this.log('No user set for experiment assignment', { experimentId })
      return null
    }

    // Check for existing assignment
    const existingAssignment = this.state.assignments.get(
      this.getAssignmentKey(this.state.currentUser.id, experimentId)
    )

    if (existingAssignment) {
      const variant = experiment.variants.find(v => v.id === existingAssignment.variantId)
      this.log('Found existing assignment', { experimentId, variantId: existingAssignment.variantId })
      return variant || null
    }

    // Create new assignment
    const variant = this.assignmentAlgorithm.assignVariant(this.state.currentUser, experiment)
    
    if (variant) {
      const assignment: UserAssignment = {
        userId: this.state.currentUser.id,
        experimentId,
        variantId: variant.id,
        assignedAt: new Date(),
        sticky: true,
      }

      // Store assignment in memory and persistence
      const assignmentKey = this.getAssignmentKey(this.state.currentUser.id, experimentId)
      this.state.assignments.set(assignmentKey, assignment)
      await this.persistAssignment(assignment)

      // Track assignment event
      await this.trackAssignmentEvent(experiment, variant)
      
      this.log('New assignment created', { experimentId, variantId: variant.id })
    }

    return variant
  }

  /**
   * Track a conversion event for A/B testing analysis
   */
  async trackConversion(
    experimentId: string, 
    conversionValue?: number,
    conversionType: string = 'default'
  ): Promise<void> {
    if (!this.state.currentUser) {
      this.log('Cannot track conversion without user')
      return
    }

    const assignment = this.state.assignments.get(
      this.getAssignmentKey(this.state.currentUser.id, experimentId)
    )

    if (!assignment) {
      this.log('Cannot track conversion without assignment', { experimentId })
      return
    }

    const experiment = this.state.experiments.get(experimentId)
    if (!experiment) return

    const variant = experiment.variants.find(v => v.id === assignment.variantId)
    if (!variant) return

    // Track conversion event
    if (this.analyticsProvider) {
      const event: AnalyticsEvent = {
        eventId: uuidv4(),
        eventType: 'experiment_converted',
        userId: this.state.currentUser.id,
        sessionId: this.sessionId,
        timestamp: new Date(),
        properties: {
          experimentId,
          variantId: assignment.variantId,
          conversionValue,
          conversionType,
        },
        experimentAssignments: [assignment],
      }

      await this.analyticsProvider.track(event)
    }

    this.log('Conversion tracked', { 
      experimentId, 
      variantId: assignment.variantId, 
      conversionValue,
      conversionType 
    })
  }

  /**
   * Get all active assignments for the current user
   * Useful for debugging and analytics context
   */
  getActiveAssignments(): UserAssignment[] {
    if (!this.state.currentUser) return []

    return Array.from(this.state.assignments.values())
      .filter(assignment => assignment.userId === this.state.currentUser!.id)
  }

  /**
   * Check if a specific experiment variant is active
   * Useful for conditional rendering in components
   */
  async isVariantActive(experimentId: string, variantId: string): Promise<boolean> {
    const variant = await this.getVariant(experimentId)
    return variant?.id === variantId
  }

  /**
   * Private helper methods
   */

  private async loadPersistedAssignments(): Promise<void> {
    if (!this.state.currentUser) return

    try {
      const assignmentsKey = `assignments_${this.state.currentUser.id}`
      const assignmentsJson = await this.storageProvider.get(assignmentsKey)
      
      if (assignmentsJson) {
        const assignments: UserAssignment[] = JSON.parse(assignmentsJson)
        
        for (const assignment of assignments) {
          // Convert date strings back to Date objects
          assignment.assignedAt = new Date(assignment.assignedAt)
          
          const key = this.getAssignmentKey(assignment.userId, assignment.experimentId)
          this.state.assignments.set(key, assignment)
        }
        
        this.log('Loaded persisted assignments', { count: assignments.length })
      }
    } catch (error) {
      this.log('Failed to load persisted assignments', { error })
    }
  }

  private async persistAssignment(assignment: UserAssignment): Promise<void> {
    try {
      const assignmentsKey = `assignments_${assignment.userId}`
      const userAssignments = Array.from(this.state.assignments.values())
        .filter(a => a.userId === assignment.userId)
      
      await this.storageProvider.set(assignmentsKey, JSON.stringify(userAssignments))
    } catch (error) {
      this.log('Failed to persist assignment', { error })
    }
  }

  private async evaluateAllAssignments(): Promise<void> {
    if (!this.state.currentUser) return

    // Clear existing assignments for re-evaluation
    const userAssignments = Array.from(this.state.assignments.entries())
      .filter(([, assignment]) => assignment.userId === this.state.currentUser!.id)
    
    for (const [key] of userAssignments) {
      this.state.assignments.delete(key)
    }

    // Re-evaluate all active experiments
    for (const experiment of this.state.experiments.values()) {
      if (experiment.isActive) {
        await this.getVariant(experiment.id)
      }
    }
  }

  private async trackAssignmentEvent(experiment: Experiment, variant: Variant): Promise<void> {
    if (!this.analyticsProvider || !this.state.currentUser) return

    const event: AnalyticsEvent = {
      eventId: uuidv4(),
      eventType: 'experiment_assigned',
      userId: this.state.currentUser.id,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties: {
        experimentId: experiment.id,
        variantId: variant.id,
        experimentName: experiment.name,
        variantName: variant.name,
        isControl: variant.isControl,
      },
    }

    await this.analyticsProvider.track(event)
  }

  private getAssignmentKey(userId: string, experimentId: string): string {
    return `${userId}_${experimentId}`
  }

  private log(message: string, data?: unknown): void {
    if (this.debugMode) {
      console.log(`[ABTesting] ${message}`, data || '')
    }
  }

  /**
   * Computed properties for reactive UI updates
   */
  get experimentsCount(): number {
    return this.state.experiments.size
  }

  get assignmentsCount(): number {
    return this.state.assignments.size
  }

  get isInitialized(): boolean {
    return this.state.isInitialized
  }
}

// Export singleton instance for easy access
export const abTestingService = ABTestingService.getInstance()

// Export factory function for creating new instances (useful for testing)
export const createABTestingService = (config?: ABTestingConfig) => 
  new ABTestingService(config)