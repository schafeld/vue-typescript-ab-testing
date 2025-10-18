/**
 * Express.js Server for A/B Testing Analytics
 * 
 * This Node.js server demonstrates:
 * 1. RESTful API design for experiment configuration
 * 2. Analytics data collection and storage
 * 3. SQLite database integration for event logging
 * 4. CORS configuration for frontend integration
 * 5. TypeScript usage in Node.js environment
 * 6. Error handling and logging patterns
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { DatabaseManager } from './database/manager.js'
import { experimentRoutes } from './routes/experiments.js'
import { analyticsRoutes } from './routes/analytics.js'
import { productsRoutes } from './routes/products.js'

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Application configuration
 */
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbPath: path.join(__dirname, '../data/analytics.db')
}

/**
 * Initialize Express application
 */
const app = express()

// Middleware setup
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

/**
 * Initialize database
 */
const db = new DatabaseManager(config.dbPath)

// Make database available to routes
app.locals.db = db

/**
 * API Routes
 */

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Experiment management routes
app.use('/api/experiments', experimentRoutes)

// Analytics and tracking routes  
app.use('/api/analytics', analyticsRoutes)

// Products API routes (for demo data)
app.use('/api/products', productsRoutes)

/**
 * Error handling middleware
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        details: err.message,
        stack: err.stack 
      })
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  })
})

/**
 * Server startup
 */
async function startServer() {
  try {
    // Initialize database tables
    await db.initialize()
    
    // Start HTTP server
    app.listen(config.port, config.host, () => {
      console.log(`
🚀 Server running at http://${config.host}:${config.port}
📊 Analytics database: ${config.dbPath}
🌐 CORS origin: ${config.corsOrigin}
📝 API documentation: http://${config.host}:${config.port}/api/health
      `)
    })
    
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\nShutting down server...')
  await db.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\\nShutting down server...')  
  await db.close()
  process.exit(0)
})

// Start the server
startServer()