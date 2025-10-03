# AI Lead Generation System

## Overview

This is a comprehensive AI-powered lead generation system designed as a multi-tenant SaaS platform. The system automates the entire lead capture and qualification process through intelligent data analysis, personalized video sales letters (VSLs), landing page generation, and AI-driven conversation management. The platform enables agencies to manage multiple clients from a single dashboard while providing sub-2-minute response times to leads through automated WhatsApp/SMS messaging and AI conversation agents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for build tooling
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live conversation monitoring

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with real-time WebSocket support
- **Middleware**: Custom logging, error handling, and CORS configuration
- **File Structure**: Modular service-based architecture separating concerns

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL via Neon serverless connections
- **Schema**: Multi-tenant design with users, clients, leads, conversations, messages, VSLs, bookings, and analytics tables
- **Migrations**: Drizzle Kit for schema management and migrations
- **Session Storage**: PostgreSQL-based session storage for authentication

### AI and External Services
- **AI Provider**: OpenAI integration for lead qualification, audit generation, and VSL script creation
- **Messaging**: WhatsApp Business API for automated lead communication
- **Lead Qualification**: Custom scoring algorithm with AI-powered conversation analysis
- **Audit System**: Automated business audit generation based on industry-specific templates

### Multi-Tenant Architecture
- **Client Isolation**: Each client has dedicated workspace with isolated data
- **User Management**: Role-based access control with admin capabilities
- **Dashboard**: Unified interface for managing multiple client accounts
- **Analytics**: Per-client metrics and cross-client reporting capabilities

### Real-time Features
- **WebSocket Server**: Live updates for conversations, lead status changes, and system notifications
- **Response Time Tracking**: Sub-2-minute response monitoring and alerting
- **AI Handoff**: Automatic escalation to human agents based on qualification scores and trigger words
- **Live Conversations**: Real-time conversation monitoring with manual takeover capabilities

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Build Tools**: Vite, esbuild, and TypeScript compiler
- **Development**: Replit-specific tooling for hot reload and runtime error overlay

### AI and Communication APIs
- **OpenAI API**: GPT models for lead qualification, audit generation, and conversation AI
- **WhatsApp Business API**: Meta's messaging platform for automated lead communication
- **Messaging Infrastructure**: WhatsApp webhook handling and message template management

### UI and Frontend Libraries
- **Component Library**: Radix UI primitives with Shadcn/ui components
- **Form Handling**: React Hook Form with Zod validation
- **Date Utilities**: date-fns for date manipulation and formatting
- **Styling**: Tailwind CSS with class-variance-authority for component variants

### Development and Deployment
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
- **Build Process**: Dual build for client (Vite) and server (esbuild) with production optimization