# SentientEdge

## Auto-Adaptive AI Autopilot and Battle Management Platform

SentientEdge is an advanced drone control and battle management platform that combines real-time tactical mapping, swarm coordination, and AI-powered decision support systems.

## Features

- **Real-time Tactical Map**: Interactive 3D mapping with operational zone management
- **Drone Fleet Management**: Monitor and control individual drones and swarm formations
- **Mission Planning & Execution**: Plan, schedule, and execute complex missions
- **AI Laboratory**: Train and deploy AI models for autonomous operations
- **Secure Communications**: End-to-end encrypted messaging across operational channels
- **Analytics Dashboard**: Comprehensive mission analytics and performance metrics

## Technology Stack

- Next.js 15.1.0 with App Router
- React 19 with TypeScript
- TailwindCSS for styling
- Mapbox GL for interactive mapping
- WebSockets for real-time data
- Shadcn UI component library

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or pnpm
- Mapbox API Token (for mapping features)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/sentientedge.git
cd sentientedge
```

2. Install dependencies
```
npm install
# or
pnpm install
```

3. Set up environment variables
```
cp .env.example .env.local
```
Then edit `.env.local` to add your Mapbox token and other configuration values.

4. Run the development server
```
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation

For more detailed documentation on the platform's capabilities and usage, please refer to the [docs](docs/) directory.

## Testing

To run tests:
```
npm run test
# or
pnpm test
```

## Deployment

This application can be deployed on any platform that supports Next.js applications.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For questions or support, contact support@sentientedge.ai