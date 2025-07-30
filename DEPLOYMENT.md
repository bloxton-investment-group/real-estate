# Deployment Guide

## Production Environment Variables

### Required for Vercel Deployment

```bash
# Convex (Production)
NEXT_PUBLIC_CONVEX_URL=https://affable-gazelle-170.convex.cloud

# Clerk Authentication (You'll need to create production app)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Replace with production publishable key
CLERK_SECRET_KEY=sk_live_...                   # Replace with production secret key

# Clerk Webhook Signing Secret (for user sync)
CLERK_WEBHOOK_SECRET=whsec_...                 # From Clerk dashboard webhooks
```

## Deployment Steps

### 1. Convex Production Deployment
✅ **COMPLETED** - Already deployed to: `https://affable-gazelle-170.convex.cloud`

### 2. Clerk Production Setup
- [ ] Create production Clerk application at https://clerk.com
- [ ] Configure production domain (your-domain.com)
- [ ] Set up webhook for user synchronization
- [ ] Update redirect URLs for production

### 3. Vercel Deployment
- [ ] Connect GitHub repository to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy and test

## Build Configuration
- ✅ Build process tested successfully
- ✅ PDF worker files properly copied to public folder
- ✅ TypeScript and ESLint validation passing

## Key Features Verified for Production
- Real estate property management
- Document upload and OCR processing
- PDF redaction and processing  
- Tenant billing calculations
- Invoice generation
- User authentication with Clerk
- Real-time updates with Convex

## Production URLs
- **Convex Backend**: https://affable-gazelle-170.convex.cloud
- **Frontend**: Will be assigned by Vercel (e.g., your-app.vercel.app)

## Security Notes
- All API routes are protected by Clerk authentication
- File uploads go through Convex secure storage
- Sensitive operations logged to audit table
- PDF processing happens server-side only