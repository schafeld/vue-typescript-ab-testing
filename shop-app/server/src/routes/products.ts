/**
 * Products API Routes
 * 
 * Handles product catalog for the e-commerce demo
 * Provides sample products with A/B testing integration
 */

import { Router, Request, Response } from 'express'

export const productsRoutes = Router()

// Sample product data for demonstration
const sampleProducts = [
  {
    id: 'prod_1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality noise-cancelling wireless headphones with 30-hour battery life.',
    price: 299.99,
    currency: 'EUR',
    category: 'Electronics',
    inStock: true,
    rating: 4.5,
    reviews: 156,
    images: [
      '/images/headphones-1.jpg',
      '/images/headphones-2.jpg'
    ],
    tags: ['wireless', 'noise-cancelling', 'premium'],
    features: [
      '30-hour battery life',
      'Active noise cancellation',
      'Quick charge (5min = 3hrs)',
      'Premium materials'
    ],
    variants: [
      { id: 'black', name: 'Black', price: 299.99, inStock: true },
      { id: 'white', name: 'White', price: 299.99, inStock: true },
      { id: 'silver', name: 'Silver', price: 319.99, inStock: false }
    ]
  },
  {
    id: 'prod_2',
    name: 'Smart Fitness Watch',
    description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
    price: 199.99,
    currency: 'EUR',
    category: 'Wearables',
    inStock: true,
    rating: 4.2,
    reviews: 89,
    images: [
      '/images/watch-1.jpg',
      '/images/watch-2.jpg'
    ],
    tags: ['fitness', 'smartwatch', 'gps'],
    features: [
      'Heart rate monitoring',
      'Built-in GPS',
      'Sleep tracking',
      '7-day battery life',
      'Water resistant'
    ],
    variants: [
      { id: 'black-sport', name: 'Black Sport Band', price: 199.99, inStock: true },
      { id: 'blue-sport', name: 'Blue Sport Band', price: 199.99, inStock: true },
      { id: 'leather', name: 'Leather Band', price: 229.99, inStock: true }
    ]
  },
  {
    id: 'prod_3',
    name: 'Organic Coffee Blend',
    description: 'Premium organic coffee beans with rich, full-bodied flavor.',
    price: 24.99,
    currency: 'EUR',
    category: 'Food & Beverages',
    inStock: true,
    rating: 4.8,
    reviews: 234,
    images: [
      '/images/coffee-1.jpg',
      '/images/coffee-2.jpg'
    ],
    tags: ['organic', 'coffee', 'premium', 'fair-trade'],
    features: [
      '100% organic beans',
      'Fair trade certified',
      'Medium roast',
      '500g package',
      'Resealable bag'
    ],
    variants: [
      { id: 'whole-bean', name: 'Whole Bean', price: 24.99, inStock: true },
      { id: 'ground', name: 'Ground', price: 24.99, inStock: true }
    ]
  },
  {
    id: 'prod_4',
    name: 'Eco-Friendly Water Bottle',
    description: 'Sustainable stainless steel water bottle with temperature retention.',
    price: 34.99,
    currency: 'EUR',
    category: 'Lifestyle',
    inStock: true,
    rating: 4.3,
    reviews: 67,
    images: [
      '/images/bottle-1.jpg',
      '/images/bottle-2.jpg'
    ],
    tags: ['eco-friendly', 'sustainable', 'insulated'],
    features: [
      'Double-wall insulation',
      '24h cold / 12h hot',
      'BPA-free materials',
      '500ml capacity',
      'Leak-proof design'
    ],
    variants: [
      { id: 'steel', name: 'Stainless Steel', price: 34.99, inStock: true },
      { id: 'forest-green', name: 'Forest Green', price: 34.99, inStock: true },
      { id: 'ocean-blue', name: 'Ocean Blue', price: 34.99, inStock: false }
    ]
  },
  {
    id: 'prod_5',
    name: 'Wireless Charging Pad',
    description: 'Fast wireless charging pad compatible with all Qi-enabled devices.',
    price: 49.99,
    currency: 'EUR',
    category: 'Electronics',
    inStock: true,
    rating: 4.1,
    reviews: 123,
    images: [
      '/images/charger-1.jpg',
      '/images/charger-2.jpg'
    ],
    tags: ['wireless', 'charging', 'fast-charge'],
    features: [
      '15W fast charging',
      'Universal Qi compatibility',
      'LED charging indicator',
      'Non-slip surface',
      'Overheat protection'
    ],
    variants: [
      { id: 'black', name: 'Black', price: 49.99, inStock: true },
      { id: 'white', name: 'White', price: 49.99, inStock: true }
    ]
  }
]

/**
 * GET /api/products
 * Get all products with optional filtering and pagination
 */
productsRoutes.get('/', (req: Request, res: Response) => {
  try {
    const {
      category,
      inStock,
      minPrice,
      maxPrice,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page = '1',
      limit = '20'
    } = req.query

    let filteredProducts = [...sampleProducts]

    // Apply filters
    if (category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === (category as string).toLowerCase()
      )
    }

    if (inStock === 'true') {
      filteredProducts = filteredProducts.filter(p => p.inStock)
    }

    if (minPrice) {
      filteredProducts = filteredProducts.filter(p => 
        p.price >= parseFloat(minPrice as string)
      )
    }

    if (maxPrice) {
      filteredProducts = filteredProducts.filter(p => 
        p.price <= parseFloat(maxPrice as string)
      )
    }

    if (search) {
      const searchTerm = (search as string).toLowerCase()
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a]
      let bValue: any = b[sortBy as keyof typeof b]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1
      }
      return aValue > bValue ? 1 : -1
    })

    // Apply pagination
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(filteredProducts.length / limitNum),
        totalItems: filteredProducts.length,
        itemsPerPage: limitNum,
        hasNext: endIndex < filteredProducts.length,
        hasPrev: pageNum > 1
      },
      filters: {
        category,
        inStock,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    })
  }
})

/**
 * GET /api/products/:id
 * Get a specific product by ID
 */
productsRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const product = sampleProducts.find(p => p.id === id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }

    res.json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    })
  }
})

/**
 * GET /api/products/categories
 * Get all available product categories
 */
productsRoutes.get('/meta/categories', (req: Request, res: Response) => {
  try {
    const categories = [...new Set(sampleProducts.map(p => p.category))]
    
    const categoryStats = categories.map(category => ({
      name: category,
      count: sampleProducts.filter(p => p.category === category).length,
      averagePrice: Math.round(
        sampleProducts
          .filter(p => p.category === category)
          .reduce((sum, p) => sum + p.price, 0) / 
        sampleProducts.filter(p => p.category === category).length * 100
      ) / 100
    }))

    res.json({
      success: true,
      data: categoryStats
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    })
  }
})

/**
 * GET /api/products/search/suggestions
 * Get search suggestions based on query
 */
productsRoutes.get('/search/suggestions', (req: Request, res: Response) => {
  try {
    const { q, limit = '5' } = req.query
    
    if (!q || (q as string).length < 2) {
      return res.json({
        success: true,
        data: []
      })
    }

    const query = (q as string).toLowerCase()
    const limitNum = parseInt(limit as string)

    // Get suggestions from product names and tags
    const suggestions = new Set<string>()

    sampleProducts.forEach(product => {
      // Add matching product names
      if (product.name.toLowerCase().includes(query)) {
        suggestions.add(product.name)
      }

      // Add matching tags
      product.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          suggestions.add(tag)
        }
      })
    })

    const limitedSuggestions = Array.from(suggestions).slice(0, limitNum)

    res.json({
      success: true,
      data: limitedSuggestions
    })
  } catch (error) {
    console.error('Error fetching search suggestions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search suggestions'
    })
  }
})

/**
 * GET /api/products/:id/related
 * Get related products based on category and tags
 */
productsRoutes.get('/:id/related', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { limit = '4' } = req.query
    
    const product = sampleProducts.find(p => p.id === id)
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }

    const limitNum = parseInt(limit as string)

    // Find related products by category and tags
    const relatedProducts = sampleProducts
      .filter(p => p.id !== id) // Exclude the current product
      .map(p => {
        let score = 0
        
        // Same category gets higher score
        if (p.category === product.category) {
          score += 10
        }
        
        // Shared tags increase score
        const sharedTags = p.tags.filter(tag => product.tags.includes(tag))
        score += sharedTags.length * 3
        
        // Similar price range
        const priceDiff = Math.abs(p.price - product.price)
        if (priceDiff < product.price * 0.3) {
          score += 2
        }
        
        return { ...p, relevanceScore: score }
      })
      .filter(p => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limitNum)
      .map(({ relevanceScore, ...p }) => p) // Remove the score from final result

    res.json({
      success: true,
      data: relatedProducts
    })
  } catch (error) {
    console.error('Error fetching related products:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related products'
    })
  }
})