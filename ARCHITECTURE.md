# Bloxton Investment Group - Real Estate Tooling Architecture

## Overview
This application is built with:
- **Frontend**: Next.js 15 (App Router) + React + TypeScript
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Vercel

## Core Features

### 1. User Management & Access Control
- Clerk handles authentication
- Role-based access control (Admin, Manager, Viewer)
- Property-level and feature-level permissions
- Audit logging for all actions

### 2. Invoice System

#### Basic Meter Invoice
- Upload meter image → OCR extraction → Calculate kWh
- Automatic calculation: extracted_value × 16 = kWh
- Handles meter rollover (9999 → 0000)
- Uses previous invoice end date as start date
- Default rate: $0.1479/kWh

#### Advanced Utility Invoice
- Upload utility bill PDF
- Extract: total usage, taxes, receipts, adjustments, rates, delivery charges
- Redact sensitive portions of summary page
- Save redaction regions for reuse

### 3. Invoice Versioning
- Multiple invoice templates
- Version control for templates
- Ability to use older versions

## Directory Structure

```
bloxton-investment-group/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (auth)/            # Auth-protected routes
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── properties/    # Property management
│   │   │   ├── invoices/      # Invoice creation & management
│   │   │   └── settings/      # User & system settings
│   │   ├── api/               # API routes
│   │   ├── sign-in/           # Clerk sign-in
│   │   └── sign-up/           # Clerk sign-up
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── invoice/           # Invoice-specific components
│   │   │   ├── MeterReader.tsx
│   │   │   ├── UtilityBillProcessor.tsx
│   │   │   └── PDFRedactor.tsx
│   │   ├── auth/              # Auth components
│   │   └── layout/            # Layout components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   └── useOCR.ts
│   ├── lib/
│   │   ├── utils.ts           # Utility functions
│   │   ├── ocr.ts             # OCR processing
│   │   └── pdf.ts             # PDF processing
│   └── types/                 # TypeScript types
├── convex/
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Auth functions
│   ├── users.ts               # User mutations/queries
│   ├── properties.ts          # Property management
│   ├── invoices.ts            # Invoice operations
│   └── permissions.ts         # Access control
├── public/                    # Static assets
└── middleware.ts              # Clerk middleware
```

## Key Design Decisions

### 1. Database Design
- Normalized schema with proper indexes
- Separate tables for different concerns
- Audit logging for compliance
- Soft deletes where appropriate

### 2. Access Control
- Resource-based permissions (property-level)
- Feature-based permissions (functionality-level)
- Hierarchical roles with inheritance

### 3. File Storage
- Store files in Convex file storage or external service
- Keep only URLs in database
- Separate original and processed versions

### 4. OCR & PDF Processing
- Client-side OCR with Tesseract.js
- Server-side PDF processing for security
- Progressive enhancement for better UX

### 5. Invoice Versioning
- Template-based system
- Immutable invoice records
- Version tracking for compliance

## Security Considerations

1. **Authentication**: Clerk handles auth securely
2. **Authorization**: Row-level security via Convex
3. **File Upload**: Validate file types and sizes
4. **Data Redaction**: Process on server, store coordinates only
5. **Audit Trail**: Log all sensitive operations

## Deployment

1. **Vercel**: Frontend hosting with automatic deploys
2. **Convex**: Managed backend with built-in scaling
3. **Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_DEPLOY_KEY`

## Development Workflow

1. Run `npm install` to install dependencies
2. Set up Clerk account and get API keys
3. Run `npx convex dev` to initialize Convex
4. Run `npm run dev` to start development
5. Use `npm run typecheck` and `npm run lint` before commits