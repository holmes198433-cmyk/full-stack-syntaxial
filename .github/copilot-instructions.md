# AI Agent Instructions for Syntaxial DSI

## Project Overview
**Syntaxial** is a Shopify SEO optimization platform consisting of:
- **Backend**: Node.js/Express server with Shopify API integration (server.js)
- **Admin UI**: React + Vite SPA for configuration and monitoring
- **Database**: PostgreSQL with Prisma ORM for schema metadata
- **Shopify Integration**: Custom Remix/Shopify app for metafield management

## Architecture & Key Components

### Backend Structure (Express Server)
- **Entry point**: `server.js` - Node.js/Express app, NOT a Remix app
- **Health endpoint**: `GET /api/v1/dsi/pulse`
- **Admin sync endpoint**: `POST /admin/sync-schema` (protected by `DSI_MASTER_KEY` header)
- **Webhook endpoint**: `POST /webhook/rules_update` (validates Shopify HMAC signatures)
- **Security**: Helmet, CORS, rate-limiting (300 req/15min per IP)

### App Services Layer (`app/` directory)
- **`shopify.server.js`**: Shopify app configuration using `@shopify/shopify-app-remix`
  - Handles OAuth, webhooks, REST resources for admin/2026-01
  - Session storage via PrismaSessionStorage
  - Future flags enabled: v3_webhookAdminContext, v3_authenticatePublic, v3_lineItemBilling
  
- **`services.schema.server.js`**: Core business logic for metafield syncing
  - `syncSchema(request)`: Fetches metafield definitions from Shopify GraphQL (SCHEMA_QUERY), upserts into DB in 50-record chunks
  - `getSchema(shop)`: Retrieves local schema definitions for a shop
  - **Key pattern**: Uses Prisma transactions for atomicity, batches ops to avoid limits
  
- **`db.server.js`**: Prisma client initialization
  - Prevents HMR issues in dev by caching on `global.prisma`

### Database Schema (`prisma/schema.prisma`)
```
schemaDefinition:
  - id (Int, PK)
  - shop (String) - shop domain
  - ownerType (String) - e.g. "PRODUCT"
  - key (String) - composite key: `${namespace}.${key}`
  - name, type, description, lastAudited, createdAt
  - Unique constraint: [shop, ownerType, key]
```

### Admin UI (`admin/` - React + Vite)
- Vite-based React 18 app
- Dependencies: React, lucide-react (icons), Firebase
- **Status**: Currently only has `package.json` - no source code yet (in development)
- **Firebase**: Listed as dependency but not actively used in current codebase. Likely intended for:
  - User authentication (replacing Shopify session model if making public-facing admin)
  - Analytics/monitoring of sync operations
  - Real-time notifications from backend webhooks
  - **Action**: Before using, clarify with team if Firebase auth is needed or if Shopify session/DSI_MASTER_KEY is sufficient
- **Build**: `npm run build` → dist/
- **Dev**: `npm run dev` (Vite dev server)

## Developer Workflows

### Setup & Installation
```bash
npm run install:all           # Install root + admin deps
npx prisma generate          # Generate Prisma client (also in CI)
npx prisma migrate deploy    # Run pending migrations
```

### Development
```bash
npm run dev                   # Start server with nodemon (watches all files, restarts on change)
cd admin && npm run dev       # Start admin UI dev server (separate terminal)
```

### Building for Production
```bash
npm run build:admin           # Build admin React app to dist/
docker build -t syntaxial .   # Build Docker image (Node 18 Alpine)
npm start                     # Run production server
```

### CI Pipeline (`.github/workflows/ci.yml`)
1. Checkout code
2. Install root & admin deps
3. Build admin Vite app
4. Generate Prisma client (tolerates failures)
5. Run ESLint (optional, tolerates failures)

## Key Patterns & Conventions

### Shopify Integration
- **Scopes**: `["write_products", "read_themes"]` (configurable via SCOPES env var)
- **Auth flow**: Uses Remix `authenticate.admin()` for server-side requests
- **Webhooks**: Validated via HMAC-SHA256 signature against `SHOPIFY_WEBHOOK_SECRET`
- **GraphQL**: Queries defined as string constants in service files

### Database Operations
- **Transactions**: Use `db.$transaction(operations)` for atomic multi-record updates
- **Chunking**: Batch large operations (50 records/chunk) to avoid hitting Prisma limits
- **Upsert pattern**: `db.model.upsert({ where: { unique_key }, update: {...}, create: {...} })`

### Error Handling
- GraphQL errors thrown with descriptive messages
- Webhook signature validation returns 401 on mismatch, 200 on success
- Admin sync returns JSON: `{ status, count, error? }`

### Environment Variables
- `PORT` (default 3000)
- `DSI_MASTER_KEY` - Bearer token for admin sync endpoint
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`
- `SCOPES` - comma-separated Shopify scopes
- `SHOPIFY_WEBHOOK_SECRET` - validates webhook HMAC
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - production/development (affects Prisma caching)

## Critical Developer Notes

1. **ESM vs CommonJS**: 
   - Server entry (`server.js`) uses CommonJS `require()`
   - App services use ES modules (`import`)
   - DB client imported via CommonJS in server.js, ES modules in services

2. **Shopify authentication**: Always use `authenticate.admin(request)` for server actions that need session/admin context. The raw Express server has a fallback using `DSI_MASTER_KEY` header.

3. **GraphQL Batching**: When syncing large numbers of metafields, always batch in chunks (the code processes 250 metafield definitions in one GraphQL call, then upserts them in 50-record DB chunks).

4. **Prisma HMR Protection**: In development, Prisma client is cached on `global.prisma` to prevent multiple instances during hot reload.

5. **Transaction Atomicity**: All database upserts happen inside `db.$transaction()` to ensure consistency - if one record fails, the entire chunk is rolled back.

## GraphQL Queries & Shopify API

### Current GraphQL Usage
The only GraphQL query currently in use is `SCHEMA_QUERY` in `services.schema.server.js`:
```graphql
query getMetafieldDefinitions {
  metafieldDefinitions(first: 250, ownerType: PRODUCT) {
    edges {
      node {
        id, namespace, key, name, description,
        type { name }, validationStatus
      }
    }
  }
}
```
This fetches all product metafield definitions for a Shopify store (max 250 per query).

### Adding New GraphQL Queries
When adding new queries:
1. Define query string as a constant at top of service file
2. Use `admin.graphql(queryString)` from authenticated context
3. Always check `response.ok` and `responseJson.errors` before processing
4. Example:
   ```javascript
   const NEW_QUERY = `query { ... }`;
   const response = await admin.graphql(NEW_QUERY);
   if (!response.ok) throw new Error(`GraphQL error: ${response.status}`);
   ```

### Shopify API Resources
- **Docs**: https://shopify.dev/docs/api/admin-graphql
- **Explorer**: Available in Shopify admin (`Settings > Apps and integrations > Develop apps`)
- **Rate limits**: Shopify allows 2 requests/sec; batching helps (see chunking pattern below)

## Database Migrations & Schema Changes

### How Migrations Work
Prisma migrations track database schema changes:
1. **Creating**: `npx prisma migrate dev --name <description>` (creates migration + applies it)
2. **Deploying**: `npx prisma migrate deploy` (applies pending migrations in production)
3. **Generating client**: `npx prisma generate` (regenerates @prisma/client types)

### Current Setup
- **Schema file**: `prisma/schema.prisma` - single source of truth
- **No migrations folder yet**: First schema change will create `prisma/migrations/` directory
- **In CI**: CI only runs `prisma generate` (tolerates failure) - migrations assumed applied separately

### Migration Workflow for New Contributors
When modifying `prisma/schema.prisma`:
```bash
# 1. Make schema changes in schema.prisma
# 2. Create & apply migration locally
npx prisma migrate dev --name "descriptive_name"
# 3. Test locally with real database
npm run dev
# 4. Commit schema.prisma + new migration folder
git add prisma/
git commit -m "feat: add new schema field"
# 5. In production, run: npx prisma migrate deploy
```

### Current Database Schema
```
schemaDefinition model:
├── id (Int) - Primary key, auto-incrementing
├── shop (String) - Shopify shop domain (e.g., "mystore.myshopify.com")
├── ownerType (String) - Resource type (currently "PRODUCT", extensible)
├── key (String) - Composite metafield key: "${namespace}.${key}"
├── name (String?) - Display name of metafield
├── type (String?) - Metafield type (e.g., "string", "integer")
├── description (String?) - Metafield description
├── lastAudited (DateTime?) - When schema was last synced
└── createdAt (DateTime) - Record creation timestamp

Constraint: shop + ownerType + key must be unique per store
```

## Testing & Verification

### Current State
- **No test suite** - add Jest or Vitest if needed
- **Manual testing only** - curl commands below

### Unit Testing Strategy (Recommended)
If adding tests, consider:
- **Server routes**: Test `/api/v1/dsi/pulse`, `/admin/sync-schema`, `/webhook/rules_update` with mock Shopify responses
- **Services**: Test `syncSchema()` chunking logic, error handling
- **Database**: Test upsert logic with test database (or use Prisma's in-memory SQLite)

### Manual Testing via curl

**Health check**:
```bash
curl -X GET http://localhost:3000/api/v1/dsi/pulse
# Expected: { "status": "ok", "timestamp": "..." }
```

**Admin sync** (requires DSI_MASTER_KEY):
```bash
export DSI_MASTER_KEY="your-secret-key-here"
curl -X POST http://localhost:3000/admin/sync-schema \
  -H "Authorization: Bearer $DSI_MASTER_KEY" \
  -H "Content-Type: application/json"
# Expected: { "status": "ok", "message": "..." }
```

**Webhook test** (requires valid HMAC):
```bash
# This is complex due to HMAC validation - better done via actual Shopify webhook
# Shopify sends x-shopify-hmac-sha256 header that must match request body
```

### Database Testing
```bash
# Connect to local PostgreSQL and inspect schema
psql $DATABASE_URL
\dt                    # List tables
\d schema_definitions  # Show schemaDefinition table schema
SELECT * FROM schema_definitions LIMIT 5;
```

## Deployment
- Docker container (Node 18 Alpine base)
- Builds admin UI in Docker RUN step
- Exposes port 3000
- Requires: DATABASE_URL, Shopify credentials, DSI_MASTER_KEY in environment

## New Contributor Checklist

When getting started:
- [ ] **Setup**: `npm run install:all` - installs root + admin deps
- [ ] **Database**: Set `DATABASE_URL` in `.env` (PostgreSQL required)
- [ ] **Shopify**: Get API credentials (API key, secret, webhook secret)
- [ ] **Dev Mode**: Run `npm run dev` in one terminal, `cd admin && npm run dev` in another
- [ ] **Test Health**: `curl http://localhost:3000/api/v1/dsi/pulse`
- [ ] **Understand Flow**: Read `server.js` → `services.schema.server.js` → `db.server.js` (the core sync loop)

### Quick Debugging Tips
1. **Server won't start**: Check `DATABASE_URL` env var is set and PostgreSQL is running
2. **Nodemon keeps crashing**: Delete `prisma/` migrations folder if corrupted, run `npx prisma migrate dev` to recreate
3. **GraphQL errors**: Check Shopify API credentials are correct (SHOPIFY_API_KEY, SHOPIFY_API_SECRET)
4. **HMAC validation fails on webhooks**: Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify admin settings
5. **Prisma "Cannot find module"**: Run `npx prisma generate` to regenerate client

### File Structure Quirk to Fix
All files in `app/` and `prisma/` directories have leading spaces in their names (e.g., ` db.server.js`). This is unusual and should be fixed:
```bash
# Fix once when ready:
cd app/
mv " db.server.js" "db.server.js"
mv " services.schema.server.js" "services.schema.server.js"  
mv " shopify.server.js" "shopify.server.js"
cd ../prisma
mv " schema.prisma" "schema.prisma"
# Then update all imports to remove leading space
```
This is a good first PR contribution!
