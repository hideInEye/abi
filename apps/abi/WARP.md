# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is **Trust ABI** - an intelligent conversational analysis platform built with modern frontend technologies. The project is a React 18 application using TypeScript, featuring AI-powered data analysis capabilities with support for both standalone deployment and qiankun microfrontend architecture.

## Architecture

### Core Technology Stack
- **Frontend**: React 18, TypeScript, Vite 5
- **Routing**: React Router V6 with elegant auto-routing system (@ohh-889/react-auto-route)
- **State Management**: Redux Toolkit with custom slice patterns
- **Styling**: UnoCSS with custom preset (@sa/uno-preset) + Ant Design 5.21.6
- **Build Tool**: Vite 5 with custom plugin ecosystem
- **Package Manager**: pnpm with monorepo workspace support

### Key Architectural Patterns

#### Microfrontend Support
The application supports dual deployment modes:
- **Standalone**: Traditional SPA deployment (`VITE_BASE_URL=/`)
- **Qiankun Microfrontend**: Deployed as a sub-application (`VITE_BASE_URL=/subapp/chatbi`)

The qiankun integration is handled in `src/main.tsx` with automatic detection and lifecycle management.

#### Auto-Generated Routing
Uses elegant-router for convention-based routing:
- Pages are auto-discovered from `src/pages/`
- Route configuration is auto-generated in `src/router/elegant/`
- Each page directory contains a `config.ts` for route metadata

#### Redux Store Architecture
- Custom slice pattern using `createAppSlice.ts`
- Modular slices in `src/store/slice/`: app, auth, route, tab, theme
- Centralized loading states and error handling

#### Component Organization
```
src/components/
├── stateful/     # Components with state/side effects (AppProvider, GlobalLoading)
├── stateless/    # Pure components (SystemLogo, ButtonIcon)
└── advanced/     # Complex reusable components (DragContent, TableHeaderOperation)
```

## Development Commands

### Environment Setup
```bash
# Install dependencies (must use pnpm due to monorepo)
pnpm i

# Start development server (test environment)
pnpm dev

# Start development server (prod environment) 
pnpm dev:prod
```

### Building & Testing
```bash
# Build for production
pnpm build

# Build for test environment
pnpm build:test

# Type checking
pnpm typecheck

# Linting and formatting
pnpm lint
```

### Development Tools
```bash
# Generate routes (after adding new pages)
pnpm gen-route

# Git commit with conventional commits
pnpm commit        # English
pnpm commit:zh     # Chinese

# Preview built application
pnpm preview

# Package management
pnpm update-pkg
pnpm cleanup
```

## Environment Configuration

### Key Environment Files
- `.env` - Base configuration and development defaults
- `.env.test` - Test environment overrides  
- `.env.prod` - Production environment settings
- `.env.prod8` - Alternative production configuration

### Critical Environment Variables
```bash
# Deployment mode
VITE_BASE_URL=/                    # Standalone deployment
VITE_BASE_URL=/subapp/chatbi       # Qiankun sub-app

# API endpoints
VITE_SERVICE_API_URL               # Main API service
VITE_CHAT_SERVICE_BASE_URL         # Chat service endpoint
VITE_MICRO_AI_BOT_ENTRY           # AI bot microfrontend entry

# Routing
VITE_AUTH_ROUTE_MODE=dynamic       # Route authorization mode
VITE_ROUTER_HISTORY_MODE=history   # Router mode
```

## Page Structure & Routing

### Main Application Areas
- **Home** (`/home`) - Dashboard with data assets overview
- **Data Preparation** (`/data-preparation/*`) - Data source management, collection operations
- **AI Assistant** (`/ai-assistant/*`) - Conversational analysis interface
- **Assistant Management** (`/assistant-manage/*`) - AI configuration and memory management

### Adding New Pages
1. Create directory in `src/pages/` following existing conventions
2. Add `config.ts` with route metadata
3. Implement `index.tsx` component
4. Run `pnpm gen-route` to regenerate routing

## Service Layer & APIs

### API Organization
Services are organized by domain in `src/service/api/`:
- `auth.ts` - Authentication and authorization
- `data-preparation.ts` - Data source and collection management  
- `assistant-manage.ts` - AI assistant configuration
- `conv.ts` - Conversational analysis
- `home.ts` - Dashboard data

### Request Configuration
- Request interceptors configured in `src/utils/requestInterceptor.ts`
- Error handling centralized in `src/service/request/error.ts`
- Success/error codes configurable via environment variables

## Qiankun Integration Notes

When working with qiankun microfrontend mode:

### Build Configuration
Update `BUILD_README.md` guidance for deployment-specific settings:
1. API URLs in `.env.prod` 
2. Base URL in `.env` for routing
3. Props basename in conversational analysis component

### Key Integration Points
- `src/main.tsx` - Qiankun lifecycle management
- `src/router/index.ts` - Dynamic basename handling
- Communication with parent app via `window.qiankunStore`

## Styling & Theming

### UnoCSS Configuration
- Custom preset from `@sa/uno-preset`
- Theme variables in `src/theme/vars`
- Custom shortcuts defined in `uno.config.ts`

### Ant Design Integration
- Theme configuration synchronized with custom theme system
- Watermark and global styling handled in `src/App.tsx`

## Development Guidelines

### Code Standards
- Follows SoybeanJS conventions with ESLint configuration
- Strict TypeScript checking enabled
- Pre-commit hooks for linting and type checking
- Import/export organization enforced via ESLint rules

### Performance Considerations  
- Code splitting handled by Vite automatically
- Lazy loading for route components
- Optimized dependency bundling configured in `vite.config.ts`

## Troubleshooting

### Common Build Issues
- Ensure using pnpm (not npm/yarn) due to monorepo setup
- Check environment variable configuration for different deployment modes
- Verify qiankun props configuration when deploying as microfrontend

### Development Server Issues
- Port conflicts: Default dev port is 9527, preview port is 9725
- Proxy configuration in `vite.config.ts` for API calls during development
