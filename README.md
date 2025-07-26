# Bloxton Investment Group - Real Estate Tooling Platform

A comprehensive real estate management platform with invoice generation, user management, and property access control.

## Features

- 🔐 **Authentication & Authorization**: Secure user management with Clerk
- 🏢 **Property Management**: Manage multiple properties and tenants
- 📄 **Invoice Generation**: Two types of invoices:
  - Basic meter reading invoices with OCR
  - Advanced utility bill processing with redaction
- 📊 **Version Control**: Invoice template versioning
- 🔍 **Audit Logging**: Track all system actions
- 🎯 **Role-Based Access**: Granular permissions for properties and features

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time database)
- **Auth**: Clerk
- **OCR**: Tesseract.js
- **PDF**: PDF.js, react-pdf
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Clerk account
- Convex account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bloxton/investment-group.git
cd bloxton-investment-group
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in the following variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
```

4. Initialize Convex:
```bash
npx convex dev
```

5. Run the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── app/              # Next.js app router
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
└── types/           # TypeScript types

convex/
├── schema.ts        # Database schema
├── auth.ts          # Authentication functions
├── permissions.ts   # Access control
└── invoices.ts      # Invoice operations
```

## Usage

### Creating a Basic Meter Invoice

1. Navigate to Invoices > Create New
2. Select "Basic Meter Reading"
3. Upload meter image
4. System will:
   - Extract meter reading via OCR
   - Multiply by 16 for kWh calculation
   - Use previous invoice end date as start date
   - Apply rate ($0.1479/kWh default)
   - Handle meter rollover (9999 → 0000)

### Creating an Advanced Utility Invoice

1. Navigate to Invoices > Create New
2. Select "Advanced Utility Bill"
3. Upload utility bill PDF
4. System will extract:
   - Total usage (kWh)
   - Gross sales tax
   - Gross receipt
   - Adjustment
   - Electric rate
   - Delivery charge
5. Draw redaction area on summary page
6. Generate invoice with redacted bill

### Managing Permissions

Admins can grant permissions at two levels:
- **Property-level**: Read/write/admin access to specific properties
- **Feature-level**: Access to system features (create_invoice, view_reports, etc.)

## Development

### Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

### Database Schema

See `/convex/schema.ts` for the complete database structure.

### Adding New Features

1. Update schema if needed
2. Create Convex functions (queries/mutations)
3. Create React components
4. Add proper permissions checks
5. Update audit logging

## Deployment

1. Deploy Convex backend:
```bash
npx convex deploy
```

2. Deploy to Vercel:
```bash
vercel
```

## Security

- All actions are authenticated via Clerk
- Row-level security enforced by Convex
- Audit logging for compliance
- Sensitive data redaction for invoices
- Input validation and sanitization

## License

Private - Bloxton Investment Group