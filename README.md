# Invoicing System (Sales & Purchase + FBR)

## Folder structure

```
invoicing-system/
├── README.md
├── .env.local.example      # Copy to .env.local and fill in Supabase keys
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── supabase/
│   └── schema.sql           # Run once in Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Redirects to /dashboard or /login
│   │   ├── globals.css
│   │   ├── (auth)/          # Auth route group (no dashboard shell)
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/      # Protected dashboard
│   │   │   ├── layout.tsx   # Sidebar nav + main
│   │   │   ├── page.tsx     # Dashboard home
│   │   │   ├── company/page.tsx
│   │   │   ├── customers/page.tsx
│   │   │   ├── vendors/page.tsx
│   │   │   ├── items/page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   └── purchases/page.tsx
│   │   └── api/
│   │       └── auth/signout/route.ts
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts    # Browser client
│   │       └── server.ts    # Server client (RSC / API)
│   └── middleware.ts        # Supabase auth cookie refresh
```

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com/dashboard).
   - In **SQL Editor**, run the contents of `supabase/schema.sql`.
   - In **Authentication → Providers**, enable Email (and confirm email if you want).
   - In **Project Settings → API**, copy **Project URL** and **anon** key.

2. **App**
   - `cp .env.local.example .env.local` and set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `npm install`
   - `npm run dev`

3. Open [http://localhost:3000](http://localhost:3000). Sign up → you’ll be redirected to the dashboard. Create your company next (Phase 2).

## Phases

- **Phase 1** (this repo): DB schema, auth, dashboard shell, placeholder pages.
- **Phase 2**: Company, customers, vendors, tax rates, items (CRUD).
- **Phase 3**: Sales invoices + items + payments.
- **Phase 4**: Purchase invoices + items + payments.
- **Phase 5**: Polish and navigation.
- **Phase 6**: FBR middleware and “Submit to FBR” for sales invoices.
