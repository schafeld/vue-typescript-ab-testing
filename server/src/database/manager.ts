/**
 * Database Manager for A/B Testing Analytics
 * 
 * This module demonstrates:
 * 1. SQLite database setup and management
 * 2. Schema design for analytics and A/B testing data
 * 3. TypeScript integration with better-sqlite3
 * 4. Database migration patterns
 * 5. Prepared statements for performance and security
 */

import Database from 'better-sqlite3'
import path from 'path'
import { mkdirSync } from 'fs'

export interface AnalyticsEvent {
  id?: number
  event_id: string
  event_type: string
  user_id: string
  session_id: string
  timestamp: string
  properties: string // JSON string
  experiment_assignments?: string // JSON string
  created_at?: string
}

export interface ExperimentRecord {
  id?: number
  experiment_id: string
  name: string
  description: string
  is_active: boolean
  traffic_allocation: number
  variants: string // JSON string
  targeting_rules?: string // JSON string
  start_date: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface UserAssignmentRecord {
  id?: number
  user_id: string
  experiment_id: string
  variant_id: string
  assigned_at: string
  is_sticky: boolean
  created_at?: string
}

/**
 * Database Manager Class
 */
export class DatabaseManager {
  private db: Database.Database
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath)
    mkdirSync(dbDir, { recursive: true })
    
    // Initialize database connection
    this.db = new Database(dbPath)
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')
    
    console.log(`📊 Database initialized: ${dbPath}`)
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    try {
      // Create analytics events table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          properties TEXT NOT NULL, -- JSON
          experiment_assignments TEXT, -- JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create experiments table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS experiments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          experiment_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
          traffic_allocation INTEGER DEFAULT 100,
          variants TEXT NOT NULL, -- JSON
          targeting_rules TEXT, -- JSON
          start_date TEXT NOT NULL,
          end_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create user assignments table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          experiment_id TEXT NOT NULL,
          variant_id TEXT NOT NULL,
          assigned_at TEXT NOT NULL,
          is_sticky BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, experiment_id)
        )
      `)

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_events_user_id ON analytics_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON analytics_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_assignments_user ON user_assignments(user_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON user_assignments(experiment_id);
        CREATE INDEX IF NOT EXISTS idx_experiments_active ON experiments(is_active);
      `)

      console.log('✅ Database schema initialized')

      // Insert sample data if tables are empty
      await this.seedSampleData()

    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Analytics Events Methods
   */

  // Insert new analytics event
  insertEvent(event: Omit<AnalyticsEvent, 'id' | 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO analytics_events (
        event_id, event_type, user_id, session_id, 
        timestamp, properties, experiment_assignments
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      event.event_id,
      event.event_type,
      event.user_id,
      event.session_id,
      event.timestamp,
      event.properties,
      event.experiment_assignments || null
    )
  }

  // Get events by user
  getEventsByUser(userId: string, limit = 100): AnalyticsEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_events 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
    
    return stmt.all(userId, limit) as AnalyticsEvent[]
  }

  // Get events by type
  getEventsByType(eventType: string, limit = 100): AnalyticsEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_events 
      WHERE event_type = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
    
    return stmt.all(eventType, limit) as AnalyticsEvent[]
  }

  // Get events in date range
  getEventsInRange(startDate: string, endDate: string): AnalyticsEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_events 
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `)
    
    return stmt.all(startDate, endDate) as AnalyticsEvent[]
  }

  /**
   * Experiments Methods
   */

  // Insert or update experiment
  upsertExperiment(experiment: Omit<ExperimentRecord, 'id' | 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO experiments (
        experiment_id, name, description, is_active, traffic_allocation,
        variants, targeting_rules, start_date, end_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)
    
    stmt.run(
      experiment.experiment_id,
      experiment.name,
      experiment.description,
      experiment.is_active,
      experiment.traffic_allocation,
      experiment.variants,
      experiment.targeting_rules || null,
      experiment.start_date,
      experiment.end_date || null
    )
  }

  // Get all active experiments
  getActiveExperiments(): ExperimentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM experiments 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `)
    
    return stmt.all() as ExperimentRecord[]
  }

  // Get experiment by ID
  getExperiment(experimentId: string): ExperimentRecord | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM experiments WHERE experiment_id = ?
    `)
    
    return stmt.get(experimentId) as ExperimentRecord | undefined
  }

  // Get all experiments
  getAllExperiments(): ExperimentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM experiments ORDER BY created_at DESC
    `)
    
    return stmt.all() as ExperimentRecord[]
  }

  // Create new experiment
  createExperiment(experiment: Omit<ExperimentRecord, 'id' | 'created_at' | 'updated_at'>): void {
    this.upsertExperiment(experiment)
  }

  // Update experiment
  updateExperiment(experimentId: string, updates: Partial<ExperimentRecord>): void {
    const existing = this.getExperiment(experimentId)
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`)
    }
    
    const updated = {
      ...existing,
      ...updates,
      experiment_id: experimentId, // Preserve ID
      updated_at: new Date().toISOString()
    }
    
    this.upsertExperiment(updated)
  }

  // Get analytics events by experiment
  getAnalyticsEventsByExperiment(experimentId: string, startDate?: string, endDate?: string): AnalyticsEvent[] {
    let query = `
      SELECT * FROM analytics_events 
      WHERE JSON_EXTRACT(experiment_assignments, '$[0].experimentId') = ?
    `
    const params: any[] = [experimentId]
    
    if (startDate && endDate) {
      query += ' AND timestamp BETWEEN ? AND ?'
      params.push(startDate, endDate)
    }
    
    query += ' ORDER BY timestamp ASC'
    
    const stmt = this.db.prepare(query)
    return stmt.all(...params) as AnalyticsEvent[]
  }

  // Get all events statement for pagination
  getAllEventsStatement() {
    return this.db.prepare(`
      SELECT * FROM analytics_events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
  }

  /**
   * User Assignments Methods
   */

  // Insert user assignment
  insertAssignment(assignment: Omit<UserAssignmentRecord, 'id' | 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_assignments (
        user_id, experiment_id, variant_id, assigned_at, is_sticky
      ) VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      assignment.user_id,
      assignment.experiment_id,
      assignment.variant_id,
      assignment.assigned_at,
      assignment.is_sticky
    )
  }

  // Get user assignments
  getUserAssignments(userId: string): UserAssignmentRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_assignments WHERE user_id = ?
    `)
    
    return stmt.all(userId) as UserAssignmentRecord[]
  }

  // Get assignment for specific experiment
  getUserAssignment(userId: string, experimentId: string): UserAssignmentRecord | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM user_assignments 
      WHERE user_id = ? AND experiment_id = ?
    `)
    
    return stmt.get(userId, experimentId) as UserAssignmentRecord | undefined
  }

  /**
   * Analytics Query Methods
   */

  // Get conversion funnel data
  getFunnelData(experimentId: string): { step: string; count: number }[] {
    const stmt = this.db.prepare(`
      SELECT 
        event_type as step,
        COUNT(*) as count
      FROM analytics_events 
      WHERE JSON_EXTRACT(experiment_assignments, '$[0].experimentId') = ?
      GROUP BY event_type
      ORDER BY count DESC
    `)
    
    return stmt.all(experimentId) as { step: string; count: number }[]
  }

  // Get experiment performance summary
  getExperimentSummary(experimentId: string) {
    const stmt = this.db.prepare(`
      SELECT 
        ua.variant_id,
        COUNT(DISTINCT ua.user_id) as total_users,
        COUNT(CASE WHEN ae.event_type = 'purchase' THEN 1 END) as conversions,
        ROUND(
          CAST(COUNT(CASE WHEN ae.event_type = 'purchase' THEN 1 END) AS FLOAT) / 
          COUNT(DISTINCT ua.user_id) * 100, 2
        ) as conversion_rate
      FROM user_assignments ua
      LEFT JOIN analytics_events ae ON ua.user_id = ae.user_id
      WHERE ua.experiment_id = ?
      GROUP BY ua.variant_id
    `)
    
    return stmt.all(experimentId)
  }

  /**
   * Seed sample data for demonstration
   */
  private async seedSampleData(): Promise<void> {
    const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM analytics_events').get() as { count: number }
    
    if (eventCount.count === 0) {
      console.log('🌱 Seeding sample data...')
      
      // Sample experiment
      this.upsertExperiment({
        experiment_id: 'homepage-hero-test',
        name: 'Homepage Hero Layout Test',
        description: 'Test different hero section layouts for conversion optimization',
        is_active: true,
        traffic_allocation: 100,
        variants: JSON.stringify([
          { id: 'control', name: 'Original Layout', weight: 50, isControl: true, config: { layout: 'centered' } },
          { id: 'variant-a', name: 'Left Aligned', weight: 50, isControl: false, config: { layout: 'left' } }
        ]),
        start_date: new Date().toISOString()
      })
      
      console.log('✅ Sample data seeded')
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.db.close()
    console.log('📊 Database connection closed')
  }
}