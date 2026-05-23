# Kids Progress 🌟
（This project is still under development. Some features may not match the descriptions, and there are still bugs in some functions.）
A comprehensive learning platform designed to help children track their progress in writing and mathematics through AI-powered feedback and interactive tools.

## 📖 Overview

Kids Progress is an educational platform that combines modern web technologies with AI to create an engaging learning experience for children. The platform focuses on writing skills development with plans to expand into mathematics and other subjects.

### Key Features

- **📝 Interactive Writing Practice** - Students can write stories and receive AI-powered feedback
- **🤖 AI Teacher Assistant** - Real-time chat support for learning questions
- **📊 Progress Tracking** - Visual analytics showing improvement over time
- **🎨 Kid-Friendly Design** - Colorful, engaging interface designed for children
- **📱 Responsive Layout** - Works seamlessly on desktop, tablet, and mobile devices
- **🔄 Real-time Feedback** - Instant scoring and suggestions for improvement

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM v7
- **UI Components**: Custom component library with mobile-first design

### Backend (Python FastAPI)
- **Framework**: FastAPI with async support
- **AI Integration**: LangGraph workflows with OpenAI API
- **Database**: MongoDB for data storage
- **Vector Database**: Qdrant for semantic search
- **Architecture**: Supervisor-based workflow system

### Key Workflows
1. **Writing Workflow** - Analyzes student writing and provides feedback
2. **Analysis Workflow** - Handles system-related questions and learning analytics
3. **General Workflow** - Manages conversational interactions
4. **Math Workflow** - Placeholder for future math functionality

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- OpenAI API key
- MongoDB (local or cloud)
- Qdrant vector database

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kidsprogress
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required environment variables**
   ```env
   # Database Configuration
   MONGODB_URL=mongodb://localhost:27017
   QDRANT_URL=http://localhost:6333
   
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Frontend Configuration
   VITE_API_URL=http://localhost:8000
   
   # Environment
   ENVIRONMENT=development
   ```

### Development Setup

#### Option 1: Docker Compose (Recommended)
```bash
# Start all services including databases
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Manual Setup
```bash
# Start databases
docker-compose up mongodb qdrant -d

# Install and start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Install and start frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Production Deployment

```bash
# Build and deploy with production profile
docker-compose --profile production up -d
```

## 📁 Project Structure

```
kidsprogress/
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── chat/         # Chat-related components
│   │   │   └── writing/      # Writing-specific components
│   │   ├── pages/            # Main application pages
│   │   ├── store/            # Redux store and slices
│   │   ├── models/           # TypeScript type definitions
│   │   └── test/             # Test utilities and setup
│   ├── tests/                # Test files
│   │   └── e2e/             # Playwright E2E tests
│   └── public/              # Static assets
├── backend/                   # Python FastAPI backend
│   ├── workflows/            # LangGraph workflow definitions
│   ├── db/                   # Database models and client
│   ├── llm/                  # Language model integrations
│   ├── apis/                 # FastAPI route definitions
│   └── tests/               # Backend test suites
├── .github/                  # GitHub Actions CI/CD
├── docker-compose.yml        # Container orchestration
└── CI-CD-SETUP.md           # Deployment documentation
```

## 🧪 Testing

The project includes comprehensive testing at all levels:

### Frontend Testing
```bash
cd frontend

# Unit tests with Vitest
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests with Playwright
npm run test:e2e

# Linting and type checking
npm run lint
npx tsc --noEmit
```

### Backend Testing
```bash
cd backend

# All tests with coverage
pytest --cov=. --cov-report=html

# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration
```

### Test Coverage
- **Frontend**: 80%+ line coverage target
- **Backend**: 85%+ line coverage target
- **E2E**: Critical user journey coverage

## 🎨 Design System

### Color Palette
- **Primary**: Purple to Pink gradients (`from-purple-500 to-pink-500`)
- **Secondary**: Blue to Cyan gradients (`from-blue-500 to-cyan-500`)
- **Success**: Green to Emerald (`from-green-500 to-emerald-500`)
- **Background**: Light gradients for child-friendly appearance

### Layout Principles
- **Mobile-First**: Responsive design starting from 320px
- **Kid-Friendly**: Large buttons, clear typography, emoji integration
- **Accessibility**: Proper color contrast and semantic HTML
- **Performance**: Optimized images and lazy loading

### Breakpoints
- **Mobile**: < 640px (Single column, overlay navigation)
- **Tablet**: 640px - 1279px (2-column grids, overlay navigation)
- **Desktop**: 1280px+ (Fixed sidebar, 3+ column grids, chat panel)

## 📊 Features Overview

### Writing System
- **Story Creation**: Rich text editor for creative writing
- **AI Analysis**: Automated scoring across multiple criteria
- **Feedback Generation**: Personalized improvement suggestions
- **Progress Tracking**: Historical performance analytics
- **Story Collection**: Personal library of written works

### Chat Assistant
- **Real-time Support**: Instant responses to learning questions
- **Context Awareness**: Understands student's progress and needs
- **Minimizable Interface**: Collapsible chat for focused work
- **Mobile Optimized**: Touch-friendly on all devices

### Navigation & UI
- **Collapsible Sidebar**: Space-saving navigation with icon mode
- **Responsive Grids**: Adaptive layouts based on screen size
- **Visual Feedback**: Loading states and success animations
- **Intuitive Controls**: Age-appropriate interface design

## 🔧 Development

### Available Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
```

#### Backend
```bash
uvicorn main:app --reload     # Start development server
pytest                        # Run all tests
python -m pytest -v          # Verbose test output
```

### Code Quality
- **Linting**: ESLint for frontend, Ruff for backend
- **Type Checking**: TypeScript strict mode
- **Testing**: Vitest, Playwright, pytest
- **Pre-commit Hooks**: Automated code quality checks
- **CI/CD**: GitHub Actions for automated testing and deployment

## 🚀 Deployment

### Docker Deployment
The application is fully containerized with health checks:

```bash
# Development
docker-compose up -d

# Production with Nginx
docker-compose --profile production up -d
```

### Manual Deployment
1. **Build Frontend**
   ```bash
   cd frontend && npm run build
   ```

2. **Deploy Backend**
   ```bash
   cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Configure Reverse Proxy**
   - Use provided Nginx configuration
   - Set up SSL certificates
   - Configure domain routing

## 📚 API Documentation

When running the backend, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints
- `GET /api/writing` - Retrieve user's writing collection
- `GET /api/writing/{id}` - Get specific writing details
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/analytics/summary` - Get learning progress summary

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all CI checks pass
- Use descriptive commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the AI capabilities
- **React Team** for the excellent frontend framework
- **FastAPI** for the high-performance backend framework
- **Tailwind CSS** for the utility-first styling approach
- **LangGraph** for the workflow orchestration system

## 📞 Support

For support, questions, or feature requests:
- **Issues**: Create a GitHub issue
- **Documentation**: Check `CI-CD-SETUP.md` for deployment help
- **Community**: Join our discussions in GitHub Discussions

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Writing practice and feedback system
- ✅ AI chat assistant
- ✅ Progress tracking
- ✅ Responsive design
- ✅ Comprehensive testing

### Upcoming Features
- 🔄 Mathematics practice modules
- 🔄 Parent dashboard and reports
- 🔄 Multiplayer writing challenges
- 🔄 Voice-to-text input
- 🔄 Advanced analytics and insights
- 🔄 Integration with school systems

---

**Made with ❤️ for young learners everywhere** 🌟
