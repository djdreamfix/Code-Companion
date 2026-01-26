# replit.md

## Overview

This is a real-time location marking PWA (Progressive Web App) built with React, Express, and PostgreSQL. Users can drop colored markers on an interactive map that expire after a set time. The app supports real-time updates via Socket.IO and push notifications for new marks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Mapping**: Leaflet with react-leaflet bindings for interactive maps
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express 5 running on Node.js
- **Real-time**: Socket.IO for bidirectional WebSocket communication
- **API Design**: REST endpoints defined in shared routes file with Zod schemas for validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Push Notifications**: web-push library with VAPID keys for browser push notifications

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Tables**:
  - `marks`: Stores location markers with lat/lng, color, expiration time
  - `push_subscriptions`: Stores browser push notification subscriptions

### PWA Features
- Service Worker (`client/public/sw.js`) handles:
  - Offline caching of static assets and map tiles
  - Push notification display
- Web App Manifest for installability

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Route pages
│   │   └── lib/          # Utilities
│   └── public/       # Static assets, service worker
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route handlers
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle table definitions
│   └── routes.ts     # API route definitions with Zod schemas
└── migrations/       # Drizzle database migrations
```

### Build Process
- Development: Vite dev server with HMR proxied through Express
- Production: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database: Use `npm run db:push` to sync schema changes

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema migrations with `drizzle-kit push`

### Third-Party Services
- **OpenStreetMap**: Map tile provider (cached by service worker)
- **Web Push**: Browser push notifications using VAPID protocol

### Key NPM Packages
- `socket.io` / `socket.io-client`: Real-time bidirectional communication
- `web-push`: Server-side push notification delivery
- `leaflet` / `react-leaflet`: Interactive mapping
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod integration
- `@tanstack/react-query`: Async state management
- `framer-motion`: Animation library
- `zod`: Runtime type validation for API requests/responses