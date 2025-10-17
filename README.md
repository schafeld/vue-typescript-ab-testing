# Vue 3 A/B Testing E-commerce Application

A comprehensive demonstration project showcasing advanced Vue 3 development with TypeScript, focusing on A/B testing implementation for e-commerce applications. This project is designed for senior frontend developer interview preparation and demonstrates modern development practices.

## 🎯 Project Overview

This application demonstrates:
- **Vue 3 Composition API** patterns and best practices
- **A/B Testing Framework** with deterministic user bucketing
- **TypeScript Integration** with advanced type patterns
- **E-commerce Functionality** with conversion tracking
- **Analytics System** with comprehensive event tracking
- **Node.js Backend** for data collection and experiment management
- **Python Analytics** for statistical analysis and reporting

## 🏗️ Architecture

### Frontend Stack
- **Vue 3.5+** with Composition API
- **TypeScript 5.0+** for type safety
- **Vite 6.0+** for build tooling
- **Vuetify 3** for Material Design UI
- **Vue Router 4** for navigation
- **Pinia** for state management
- **Vue I18n** for internationalization

### Backend & Analytics
- **Node.js + Express** API server
- **SQLite** database for analytics storage
- **Python** for statistical analysis
- **Better SQLite3** for high-performance database operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vue-typescript-ab-testing
   ```

2. **Install frontend dependencies**
   ```bash
   cd shop-app
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Set up Python analytics environment**
   ```bash
   cd ../analytics
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

### Development

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   cd shop-app
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/api/health

## 📊 A/B Testing Features

### Implemented Experiments

1. **Homepage Hero Layout Test**
   - Variants: Centered vs Left-aligned layout
   - Metrics: Click-through rate, conversion rate
   - Traffic allocation: 50/50 split

2. **Button Color Test**
   - Variants: Blue, Green, Red CTA buttons
   - Metrics: Click rate, conversion impact
   - Traffic allocation: 33/33/34 split

3. **Product Showcase Layout**
   - Variants: Grid vs Carousel display
   - Metrics: Product engagement, add-to-cart rate

### Key A/B Testing Concepts Demonstrated

- **Deterministic User Bucketing**: Consistent variant assignment
- **Statistical Significance Testing**: Proper hypothesis testing
- **Conversion Tracking**: Goal measurement and attribution
- **Traffic Allocation**: Percentage-based experiment inclusion
- **Experiment Targeting**: User segmentation rules

## 🛍️ E-commerce Features

### Shopping Flow
1. **Product Catalog** - Browse products with filtering
2. **Product Details** - Individual product pages with A/B tested layouts
3. **Shopping Cart** - Add/remove items with persistent state
4. **Checkout Process** - Multi-step checkout with conversion tracking
5. **Order Confirmation** - Purchase completion and analytics

### Analytics Events Tracked
- Page views and navigation
- Product interactions
- Cart operations
- Purchase completions
- A/B experiment assignments and conversions

## 🔧 Technical Highlights

### Vue 3 Patterns Demonstrated

#### Custom Composables
```typescript
// A/B Testing Integration
const { variant, isLoading, trackConversion } = useABTest('button-color-test')

// Analytics Integration  
const analytics = useAnalytics()
await analytics.track('product_view', { productId: '123' })

// Shopping Cart Management
const { cart, addItem, removeItem } = useShoppingCart()
```

#### Advanced TypeScript Usage
```typescript
// Generic API responses
interface ApiResponse<T> {
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

// Discriminated unions for state
type LoadingState<T> = 
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string }
```

#### Reactive State Management
```typescript
// Pinia store with TypeScript
export const useExperimentsStore = defineStore('experiments', () => {
  const experiments = ref<Experiment[]>([])
  const activeExperiments = computed(() => 
    experiments.value.filter(e => e.isActive)
  )
  
  return { experiments, activeExperiments, loadExperiments }
})
```

### A/B Testing Implementation

#### Hash-based Assignment Algorithm
```typescript
class HashAssignmentAlgorithm implements AssignmentAlgorithm {
  assignVariant(user: User, experiment: Experiment): Variant | null {
    // Deterministic traffic allocation
    const trafficHash = this.hash(user.id + experiment.id + 'traffic')
    const trafficBucket = trafficHash % 100
    
    if (trafficBucket >= experiment.trafficAllocation) {
      return null // User not included
    }
    
    // Consistent variant assignment
    const variantHash = this.hash(user.id + experiment.id + 'variant')
    // ... variant selection logic
  }
}
```

#### Experiment Configuration
```typescript
const experiment: Experiment = {
  id: 'homepage-hero-test',
  name: 'Homepage Hero Layout Test',
  isActive: true,
  trafficAllocation: 50, // 50% of users
  variants: [
    {
      id: 'control',
      name: 'Original Layout', 
      weight: 50,
      isControl: true,
      config: { layout: 'centered' }
    },
    {
      id: 'variant-a',
      name: 'Left Aligned',
      weight: 50, 
      isControl: false,
      config: { layout: 'left' }
    }
  ]
}
```

## 📈 Analytics & Reporting

### Python Analysis Tools

Run statistical analysis on experiment results:

```bash
# Basic experiment analysis
python analyze_experiments.py --experiment homepage-hero-test

# Generate comprehensive report
python analyze_experiments.py --experiment homepage-hero-test --report

# Create visualizations
python analyze_experiments.py --experiment homepage-hero-test --visualize

# Funnel analysis
python analyze_experiments.py --experiment checkout-flow-test --funnel
```

### Key Metrics Tracked
- **Conversion Rate**: Primary success metric
- **Statistical Significance**: P-values and confidence intervals  
- **Effect Size**: Practical significance measurement
- **Sample Size**: Power analysis and recommendations
- **Revenue Impact**: Business metrics and ROI

## 🧪 Testing Strategy

### Unit Testing
```typescript
// Composable testing
describe('useABTest', () => {
  it('should assign consistent variants', () => {
    const { variant } = useABTest('test-experiment')
    expect(variant.value).toBeDefined()
  })
})
```

### Component Testing
```typescript  
// Vue component testing
describe('ProductCard', () => {
  it('renders A/B tested button variant', () => {
    const wrapper = mount(ProductCard, { props: { product } })
    expect(wrapper.find('.cta-button')).toExist()
  })
})
```

### E2E Testing
```typescript
// A/B testing validation
test('experiment assignment consistency', async ({ page }) => {
  await page.goto('/')
  const variant = await page.getAttribute('[data-experiment]', 'data-variant')
  expect(['control', 'variant-a']).toContain(variant)
})
```

## 📚 Learning Objectives

This project demonstrates mastery of:

### Technical Skills
- **Vue 3 Ecosystem**: Composition API, TypeScript, tooling
- **State Management**: Reactive patterns, Pinia integration
- **Testing**: Unit, integration, E2E strategies
- **Performance**: Optimization and monitoring
- **Build Tools**: Vite configuration and optimization

### A/B Testing Expertise
- **Experiment Design**: Statistical rigor and methodology
- **Implementation**: Technical architecture and patterns  
- **Analysis**: Statistical testing and interpretation
- **Business Impact**: Metrics definition and measurement

### Software Architecture
- **Clean Code**: SOLID principles and patterns
- **Type Safety**: Advanced TypeScript usage
- **API Design**: RESTful services and data modeling
- **Documentation**: Comprehensive technical documentation

## 📖 Project Structure

```
vue-typescript-ab-testing/
├── shop-app/                 # Vue 3 frontend application
│   ├── src/
│   │   ├── components/      # Vue components
│   │   ├── composables/     # Composition API hooks
│   │   ├── services/        # Business logic services  
│   │   ├── stores/          # Pinia state management
│   │   ├── types/           # TypeScript definitions
│   │   ├── utils/           # Helper utilities
│   │   └── views/           # Route components
│   ├── server/              # Node.js backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── database/    # Database management
│   │   │   └── models/      # Data models
│   └── package.json
├── analytics/               # Python analytics tools
│   ├── analyze_experiments.py
│   └── requirements.txt
├── DOCUMENTS/              # Project documentation
├── PLANNING.md             # Development planning
├── TECHNICAL_DOCUMENTATION.md
└── README.md
```

## 🔬 Interview Preparation

This project is specifically designed for technical interviews and covers:

### Common Interview Topics
- Vue 3 Composition API patterns and best practices
- TypeScript advanced features and integration
- A/B testing implementation and statistical analysis
- State management with reactive patterns
- Performance optimization techniques
- Testing strategies and quality assurance

### Code Review Scenarios
- Component architecture and reusability
- Type safety and error handling
- A/B testing integration patterns
- Analytics implementation and data flow
- Code organization and maintainability

### Technical Discussion Points
- A/B testing statistical concepts
- Frontend performance optimization
- Vue.js ecosystem and tooling
- Modern JavaScript/TypeScript features
- Software architecture decisions

## 📄 Documentation

- **[Technical Documentation](TECHNICAL_DOCUMENTATION.md)** - Comprehensive technical guide
- **[Planning Documentation](PLANNING.md)** - Development planning and architecture
- **[API Documentation](server/API.md)** - Backend API reference
- **[Component Documentation](shop-app/COMPONENTS.md)** - Vue component guide

## 🤝 Contributing

This is an interview preparation project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Implement improvements with tests
4. Submit a pull request with clear description

## 📝 License

This project is for educational and interview preparation purposes. See LICENSE file for details.

## 🙋‍♂️ Support

For questions about this project or A/B testing implementation:
- Review the documentation files
- Check the code comments for detailed explanations
- Explore the example implementations in each module

---

**Built with ❤️ for senior frontend developer interview preparation**

*Demonstrating Vue 3, TypeScript, A/B Testing, and modern web development practices*
