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
   - In **Authentication → URL Configuration**, add to **Redirect URLs**: `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/callback`, and `http://localhost:3000/auth/reset-password` (and production equivalents). Required for email confirmation, password reset, and Google OAuth.
   - **Google sign-in:** In **Authentication → Providers**, enable **Google**. You’ll need a Google OAuth client: in [Google Cloud Console](https://console.cloud.google.com/) create a project (or use an existing one), go to **APIs & Services → Credentials → Create credentials → OAuth client ID**, choose **Web application**, set **Authorized redirect URIs** to the Supabase callback (e.g. `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` — Supabase shows this when you enable Google). Copy the **Client ID** and **Client secret** into Supabase’s Google provider fields and save. The app’s login and signup pages include “Sign in with Google” / “Sign up with Google”; after auth, users are redirected to `/auth/callback` then to the dashboard.
   - **Password reset with code:** The app lets users enter a 6-digit code from the email instead of clicking the link. Supabase only includes that code if you add it to the **Reset password** email template.
     - Go to **Authentication → Email Templates**, open **Reset password**.
     - In the **Message body** (HTML), add a line with the code, e.g. right after the first paragraph:
       - **Your 6-digit code: <strong>{{ .Token }}</strong>**
     - You can keep the existing “Follow this link” / “Reset Password” link as well; then the email will have both the link and the code. Example snippet to include in the body:
       ```
       <p>Your 6-digit code: <strong>{{ .Token }}</strong></p>
       <p>Follow this link to reset the password for your user:</p>
       <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
       ```
     - Save. After that, recovery emails will contain the code and the link.
   - **Test custom SMTP:** After configuring custom SMTP (Authentication → SMTP), add `NEXT_PUBLIC_ALLOW_TEST_SMTP=true` to `.env.local`, restart the dev server, and open [http://localhost:3000/test-smtp](http://localhost:3000/test-smtp). Enter an email and click “Send test recovery email”; if the message arrives, custom SMTP is working.
   - **Rate limits for testing (email/code):** The reset code uses the same limit as the reset link. Two things apply:
     - **Per-user window:** Supabase allows one recovery request per user per **60 seconds** by default. To test more often: open **Authentication → Rate limits** in the dashboard, find **Password reset / Recover** (or “Email sent”) and **lower the interval** (e.g. to **10** or **30** seconds). Then you can request another code after that many seconds. Set it back to 60+ for production.
     - **Emails per hour:** There is also a global limit (e.g. 2 emails per hour per project with default SMTP). If you hit that, use a different email address to test or wait; that limit is only changeable with [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
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
