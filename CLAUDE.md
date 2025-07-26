# CLAUDE.md - Project Guidelines and Best Practices

## Project Overview
This is the Bloxton Investment Group Real Estate Property Management System. It's built with Next.js 15 (App Router), Convex, Clerk authentication, and TypeScript.

## Core Principles

### 1. Separation of Concerns
- **Authentication**: All auth logic is handled by Clerk and should remain isolated in auth-specific files
- **Database Operations**: All database operations go through Convex mutations/queries
- **Business Logic**: Keep business logic in Convex functions, not in React components
- **UI Components**: Components should be presentational and delegate logic to hooks/Convex
- **Permissions**: Use the centralized permission system in `convex/permissions.ts`

### 2. Authentication Best Practices (Following Latest Clerk Docs)
- Use `clerkMiddleware` with `createRouteMatcher` for route protection
- Always use `auth.protect()` for protecting non-public routes
- Use `auth()` in Server Components and Route Handlers
- Use `useAuth()` hook in Client Components
- Sync Clerk users to Convex using the pattern in `convex/auth.ts`

### 3. File Structure Conventions
```
src/
├── app/                    # Next.js pages (server components by default)
│   ├── (auth)/            # Protected route group
│   ├── api/               # API routes
│   └── sign-in/           # Public auth pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
└── lib/                  # Utility functions and helpers

convex/
├── schema.ts             # Database schema definition
├── auth.ts              # Authentication functions
├── permissions.ts       # Permission checking
└── [feature].ts         # Feature-specific mutations/queries
```

### 4. Security Requirements
- **Never expose secrets**: All sensitive operations must happen server-side
- **Validate permissions**: Always check permissions in Convex mutations
- **Audit logging**: Log all sensitive operations to the auditLogs table
- **File validation**: Validate file types and sizes before processing
- **Data redaction**: Process PDFs server-side only

### 5. Development Workflow

#### Before Making Changes:
1. Check current implementation with search tools
2. Reference latest docs using the MCP context7 server
3. Follow existing patterns in the codebase

#### Testing Commands:
```bash
npm run typecheck  # Run before committing
npm run lint       # Run before committing
npm run dev        # Starts both Next.js and Convex
```

#### Common Tasks:

**Adding a new protected page:**
1. Create the page in `src/app/(auth)/[feature]/page.tsx`
2. The middleware will automatically protect it

**Adding a new Convex function:**
1. Add the function to the appropriate file in `convex/`
2. Always check permissions using `checkPermission` from `permissions.ts`
3. Add audit logging for sensitive operations

**Adding a new component:**
1. Create in `src/components/[feature]/`
2. Use shadcn/ui components from `src/components/ui/`
3. Keep components focused and delegate logic to hooks

### 6. State Management Pattern
- **Authentication State**: Managed by Clerk, accessed via hooks
- **User Data**: Synced to Convex, accessed via `useQuery`
- **Permissions**: Checked via `usePermissions` hook
- **Form State**: Use react-hook-form with zod validation
- **Server State**: Managed by Convex with React Query integration

### 7. Error Handling
- Use try-catch blocks in async functions
- Show user-friendly error messages with toast notifications
- Log errors to console in development
- Consider adding error boundaries for critical sections

### 8. Performance Considerations
- Use dynamic imports for heavy components (OCR, PDF processing)
- Implement pagination for large data sets
- Use React.memo for expensive components
- Leverage Convex's real-time capabilities instead of polling

### 9. Accessibility
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers
- Maintain proper color contrast ratios

### 10. Code Style
- Use TypeScript strictly (no `any` types)
- Prefer functional components with hooks
- Use async/await over promises
- Keep functions small and focused
- Add comments for complex logic only

## Important Reminders
1. Always run `npm run typecheck` and `npm run lint` before committing
2. Test authentication flows after any auth-related changes
3. Verify permissions work correctly for different user roles
4. Keep the ARCHITECTURE.md file updated with major changes
5. Use the TodoWrite tool to track implementation tasks