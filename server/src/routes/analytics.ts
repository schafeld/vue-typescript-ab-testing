/**
 * Analytics API Routes
 * 
 * Handles analytics event collection, storage, and reporting
 * Routes for tracking user interactions and experiment data
 */

import { Router, Request, Response } from 'express'
import { DatabaseManager, AnalyticsEvent } from '../database/manager.js'

export const analyticsRoutes = Router()

// Type definitions for analytics endpoints
interface TrackEventRequest extends Request {
  body: {
    eventType: string
    userId: string
    sessionId?: string
    properties?: Record<string, any>
    experimentAssignments?: Array<{
      experimentId: string
      variantId: string
    }>
  }
}

interface BatchEventRequest extends Request {
  body: {
    events: Array<{
      eventType: string
      userId: string
      sessionId?: string
      properties?: Record<string, any>
      experimentAssignments?: Array<{
        experimentId: string
        variantId: string
      }>
    }>
  }
}

/**
 * POST /api/analytics/track
 * Track a single analytics event
 */
analyticsRoutes.post('/track', (req: TrackEventRequest, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { eventType, userId, sessionId, properties = {}, experimentAssignments = [] } = req.body

    // Basic validation
    if (!eventType || !userId) {
      return res.status(400).json({
        success: false,
        error: 'eventType and userId are required'
      })
    }

    const event: Omit<AnalyticsEvent, 'id' | 'created_at'> = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type: eventType,
      user_id: userId,
      session_id: sessionId || `sess_${Date.now()}`,
      timestamp: new Date().toISOString(),
      properties: JSON.stringify(properties),
      experiment_assignments: experimentAssignments.length > 0 ? JSON.stringify(experimentAssignments) : undefined
    }

    db.insertEvent(event)

    res.json({
      success: true,
      eventId: event.event_id,
      message: 'Event tracked successfully'
    })
  } catch (error) {
    console.error('Error tracking event:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    })
  }
})

/**
 * POST /api/analytics/batch
 * Track multiple analytics events in batch
 */
analyticsRoutes.post('/batch', (req: BatchEventRequest, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { events } = req.body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events array is required and cannot be empty'
      })
    }

    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 events per batch'
      })
    }

    const processedEvents: string[] = []

    for (const eventData of events) {
      if (!eventData.eventType || !eventData.userId) {
        continue // Skip invalid events
      }

      const event: Omit<AnalyticsEvent, 'id' | 'created_at'> = {
        event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: eventData.eventType,
        user_id: eventData.userId,
        session_id: eventData.sessionId || `sess_${Date.now()}`,
        timestamp: new Date().toISOString(),
        properties: JSON.stringify(eventData.properties || {}),
        experiment_assignments: eventData.experimentAssignments?.length ? 
          JSON.stringify(eventData.experimentAssignments) : undefined
      }

      db.insertEvent(event)
      processedEvents.push(event.event_id)
    }

    res.json({
      success: true,
      processedCount: processedEvents.length,
      eventIds: processedEvents,
      message: `${processedEvents.length} events tracked successfully`
    })
  } catch (error) {
    console.error('Error tracking batch events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to track batch events'
    })
  }
})

/**
 * GET /api/analytics/events
 * Retrieve analytics events with filtering
 */
analyticsRoutes.get('/events', (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { 
      userId, 
      eventType, 
      startDate, 
      endDate, 
      limit = '100' 
    } = req.query

    let events: AnalyticsEvent[] = []

    if (userId) {
      events = db.getEventsByUser(userId as string, parseInt(limit as string))
    } else if (eventType) {
      events = db.getEventsByType(eventType as string, parseInt(limit as string))
    } else if (startDate && endDate) {
      events = db.getEventsInRange(startDate as string, endDate as string)
    } else {
      // Get recent events if no specific filter
      const stmt = db.getAllEventsStatement()
      events = stmt.all(parseInt(limit as string)) as AnalyticsEvent[]
    }

    // Transform events for response
    const transformedEvents = events.map(event => ({
      ...event,
      properties: JSON.parse(event.properties),
      experimentAssignments: event.experiment_assignments ? 
        JSON.parse(event.experiment_assignments) : []
    }))

    res.json({
      success: true,
      data: transformedEvents,
      count: transformedEvents.length,
      filters: {
        userId,
        eventType,
        startDate,
        endDate,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    })
  }
})

/**
 * GET /api/analytics/stats
 * Get analytics statistics and summaries
 */
analyticsRoutes.get('/stats', (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { period = '7d' } = req.query

    // Calculate date range based on period
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    const events = db.getEventsInRange(
      startDate.toISOString(),
      now.toISOString()
    )

    // Calculate statistics
    const totalEvents = events.length
    const uniqueUsers = new Set(events.map(e => e.user_id)).size
    const uniqueSessions = new Set(events.map(e => e.session_id)).size

    // Event type breakdown
    const eventTypeStats = events.reduce((acc: Record<string, number>, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})

    // Daily breakdown
    const dailyStats = events.reduce((acc: Record<string, number>, event) => {
      const date = event.timestamp.split('T')[0] // Get date part
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        summary: {
          totalEvents,
          uniqueUsers,
          uniqueSessions,
          averageEventsPerUser: uniqueUsers > 0 ? Math.round(totalEvents / uniqueUsers) : 0,
          averageEventsPerSession: uniqueSessions > 0 ? Math.round(totalEvents / uniqueSessions) : 0
        },
        eventTypes: eventTypeStats,
        dailyBreakdown: dailyStats
      }
    })
  } catch (error) {
    console.error('Error fetching analytics stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics stats'
    })
  }
})

/**
 * GET /api/analytics/funnel/:experimentId
 * Get conversion funnel data for an experiment
 */
analyticsRoutes.get('/funnel/:experimentId', (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { experimentId } = req.params

    const funnelData = db.getFunnelData(experimentId)

    res.json({
      success: true,
      data: {
        experimentId,
        funnelSteps: funnelData
      }
    })
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel data'
    })
  }
})

/**
 * DELETE /api/analytics/events
 * Delete old analytics events (data retention)
 */
analyticsRoutes.delete('/events', (req: Request, res: Response) => {
  try {
    const db: DatabaseManager = req.app.locals.db
    const { olderThan } = req.query

    if (!olderThan) {
      return res.status(400).json({
        success: false,
        error: 'olderThan parameter is required (ISO date string)'
      })
    }

    // This would require implementing a delete method in DatabaseManager
    // For now, just return a placeholder response
    res.json({
      success: true,
      message: 'Event cleanup feature not yet implemented',
      note: 'This would delete events older than the specified date'
    })
  } catch (error) {
    console.error('Error cleaning up events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup events'
    })
  }
})