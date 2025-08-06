# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start Next.js development server on :3000
- `npm run dev:backend` - Start Express/WebSocket server on :4000
- `npm run dev:all` - Run both frontend and backend concurrently
- `npm run build` - Build Next.js application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

### Backend Development
The Express server runs on port 4000 and provides:
- REST API endpoints for drones, missions, and authentication
- WebSocket server at `/ws` for real-time communication
- The server automatically kills existing processes on port 4000 before starting

## Code Architecture

### Frontend (Next.js 15 App Router)
- **App Directory Structure**: Each folder in `app/` represents a route segment
  - `app/layout.tsx` - Root layout with providers and global styling
  - `app/providers.tsx` - Provider composition for context managers
  - Major routes: `/drone-control`, `/missions`, `/tactical`, `/ai-lab`, `/analytics`

### State Management & Data Flow
- **Context Providers**: Layered provider architecture in `app/providers.tsx`
  - `AuthProvider` - User authentication and session management
  - `MissionsProvider` - Mission data and operations
  - `DronesProvider` - Drone fleet management
  - `RealtimeProvider` - WebSocket-based real-time updates
- **Custom Hooks**: Located in `hooks/` directory
  - `use-realtime.tsx` - WebSocket connection and real-time data management
  - `use-auth.tsx` - Authentication state and operations
  - `use-missions.tsx` - Mission CRUD operations
  - `use-drones.tsx` - Drone fleet operations

### Core Libraries and Utilities
- **Type System**: Comprehensive types in `lib/types.ts` covering Users, Missions, Drones, Swarms, Analytics, etc.
- **API Layer**: `lib/api.ts` for HTTP requests, `lib/websocket.ts` for WebSocket management
- **Specialized Protocols**: 
  - `lib/mavlink.ts` - MAVLink drone communication protocol
  - `lib/cyphal-protocol.ts` - Cyphal/UAVCAN protocol implementation
  - `lib/enhanced-mavlink-server.ts` - Enhanced MAVLink server with telemetry

### Backend (Express + WebSocket)
- **Server**: `server.js` provides development API with in-memory data store
- **WebSocket**: Real-time communication for drone telemetry, mission updates, and alerts
- **API Endpoints**: RESTful endpoints for drones (`/api/drones/*`) and missions (`/api/missions/*`)

### ArduPilot Integration
The repository includes a complete ArduPilot autopilot system in the `ardupilot/` directory:
- Full ArduPilot source code for multiple vehicle types (Copter, Plane, Rover, Sub)
- Build system using waf/Makefile
- Comprehensive tooling and utilities in `Tools/` directory
- Hardware abstraction layers and board definitions

### UI Components
- **Shadcn/UI**: Component library in `components/ui/`
- **Custom Components**: Application-specific components in `components/`
- **Styling**: TailwindCSS with custom theme configuration
- **Maps**: Mapbox GL integration for tactical mapping

### Key Technical Patterns
- React Context for global state management
- WebSocket-based real-time data updates
- TypeScript strict mode with comprehensive type definitions
- Component composition using Radix UI primitives
- Responsive design with mobile-first approach

## Application Domain
This is a defensive military/security drone control and battle management platform featuring:
- Real-time tactical mapping and drone fleet coordination
- Mission planning and execution systems
- AI-powered autonomous operations and training
- Secure communications and analytics
- Integration with ArduPilot autopilot systems

## Development Notes
- The project uses Next.js 15 with App Router and React 19
- ESLint and TypeScript build errors are ignored during development
- Images are unoptimized for iCloud compatibility
- WebSocket connections persist across development hot reloads