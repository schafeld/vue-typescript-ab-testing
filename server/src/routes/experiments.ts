/**
 * Experiments API Routes
 * 
 * Handles A/B testing experiment configuration and management
 * Routes for creating, reading, updating, and deleting experiments
 */

import { Router, Request, Response } from 'express'
import { DatabaseManager, ExperimentRecord, AnalyticsEvent } from '../database/manager.js'

export const experimentRoutes = Router()

// Type definitions for experiment endpoints
interface ExperimentRequest extends Request {
  body: {
    name?: string
    description?: string
    isActive?: boolean
    trafficAllocation?: number
    variants?: Array<{
      id: string
      name: string
      weight: number
      isControl?: boolean
      config?: Record<string, any>
    }>
  }
}

/**
 * GET /api/experiments
 * Retrieve all experiments with optional filtering
 */
experimentRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { active, limit = 50 } = req.query

    let experiments
    if (active === 'true') {
      experiments = db.getActiveExperiments()
    } else {
      experiments = db.getAllExperiments()
    }

    // Apply limit if specified
    if (typeof limit === 'string') {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        experiments = experiments.slice(0, limitNum)
      }
    }

    res.json({
      success: true,
      data: experiments,
      count: experiments.length
    })
  } catch (error) {
    console.error('Error fetching experiments:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiments'
    })
  }
})

/**
 * GET /api/experiments/:id
 * Retrieve a specific experiment by ID
 */
experimentRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { id } = req.params

    const experiment = await db.getExperiment(id)
    
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      })
    }

    res.json({
      success: true,
      data: experiment
    })
  } catch (error) {
    console.error('Error fetching experiment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiment'
    })
  }
})

/**
 * POST /api/experiments
 * Create a new experiment
 */
experimentRoutes.post('/', async (req: ExperimentRequest, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { name, description, isActive = false, trafficAllocation = 100, variants = [] } = req.body

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      })
    }

    if (trafficAllocation < 0 || trafficAllocation > 100) {
      return res.status(400).json({
        success: false,
        error: 'Traffic allocation must be between 0 and 100'
      })
    }

    // Validate variant weights sum to 100
    const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 0), 0)
    if (variants.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Variant weights must sum to 100'
      })
    }

    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const experiment = {
      experiment_id: experimentId,
      name,
      description,
      is_active: isActive,
      start_date: new Date().toISOString(),
      traffic_allocation: trafficAllocation,
      variants: JSON.stringify(variants.map(v => ({
        ...v,
        id: v.id || `var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        experimentId
      })))
    }

    db.createExperiment(experiment)

    res.status(201).json({
      success: true,
      data: experiment
    })
  } catch (error) {
    console.error('Error creating experiment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create experiment'
    })
  }
})

/**
 * PUT /api/experiments/:id
 * Update an existing experiment
 */
experimentRoutes.put('/:id', async (req: ExperimentRequest, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { id } = req.params
    const updates = req.body

    const existingExperiment = await db.getExperiment(id)
    if (!existingExperiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      })
    }

    // Validate updates
    if (updates.trafficAllocation !== undefined && 
        (updates.trafficAllocation < 0 || updates.trafficAllocation > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Traffic allocation must be between 0 and 100'
      })
    }

    // Transform updates to match database schema
    const transformedUpdates: Partial<ExperimentRecord> = {}
    if (updates.name !== undefined) transformedUpdates.name = updates.name
    if (updates.description !== undefined) transformedUpdates.description = updates.description
    if (updates.isActive !== undefined) transformedUpdates.is_active = updates.isActive
    if (updates.trafficAllocation !== undefined) transformedUpdates.traffic_allocation = updates.trafficAllocation
    if (updates.variants !== undefined) transformedUpdates.variants = JSON.stringify(updates.variants)

    db.updateExperiment(id, transformedUpdates)

    // Get the updated experiment to return
    const updatedExperiment = db.getExperiment(id)

    res.json({
      success: true,
      data: updatedExperiment
    })
  } catch (error) {
    console.error('Error updating experiment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update experiment'
    })
  }
})

/**
 * DELETE /api/experiments/:id
 * Delete an experiment (soft delete by setting isActive to false)
 */
experimentRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { id } = req.params

    const experiment = await db.getExperiment(id)
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      })
    }

    // Soft delete by deactivating
    db.updateExperiment(id, { 
      is_active: false
    })

    res.json({
      success: true,
      message: 'Experiment deactivated successfully'
    })
  } catch (error) {
    console.error('Error deleting experiment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete experiment'
    })
  }
})

/**
 * GET /api/experiments/:id/results
 * Get experiment results and statistics
 */
experimentRoutes.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { id } = req.params
    const { startDate, endDate } = req.query

    const experiment = await db.getExperiment(id)
    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      })
    }

    // Get analytics events for this experiment
    const events = db.getAnalyticsEventsByExperiment(
      id,
      startDate as string,
      endDate as string
    )

    // Parse variants from JSON string
    const variants = JSON.parse(experiment.variants)

    // Calculate basic statistics
    const variantStats = variants.map((variant: any) => {
      const variantEvents = events.filter(e => {
        try {
          const props = JSON.parse(e.properties)
          return props.experimentId === id && props.variantId === variant.id
        } catch {
          return false
        }
      })

      const assignments = variantEvents.filter(e => e.event_type === 'experiment_assignment')
      const conversions = variantEvents.filter(e => e.event_type === 'experiment_conversion')

      return {
        variantId: variant.id,
        variantName: variant.name,
        assignments: assignments.length,
        conversions: conversions.length,
        conversionRate: assignments.length > 0 ? conversions.length / assignments.length : 0
      }
    })

    res.json({
      success: true,
      data: {
        experiment,
        results: variantStats,
        totalEvents: events.length,
        dateRange: {
          start: startDate || experiment.start_date,
          end: endDate || new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Error fetching experiment results:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiment results'
    })
  }
})