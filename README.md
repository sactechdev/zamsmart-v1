# ZAMS Mart - E-commerce for Nigeria

A modern, production-ready e-commerce platform built with React, Express, and Supabase.

## 🚀 Features
- **Jumia-style Grid Layout**: Clean, responsive product displays.
- **Nigerian Naira (₦) Support**: All prices and totals in local currency.
- **Bank Transfer Payment**: Secure checkout with proof of payment upload.
- **Admin Dashboard**: Manage orders, products, and categories.
- **Supabase Integration**: Auth, Database, and Storage with RLS.

## 🛠 Setup Instructions

### 1. Supabase Project Setup
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run the contents of `supabase_schema.sql` provided in this repository.
3. Go to **Storage** and create two public buckets:
   - `payment-proofs`
   - `product-images`
4. In **Project Settings > API**, get your `URL` and `anon public` key.

### 2. Environment Variables
Add the following to your AI Studio Secrets or `.env` file:
```env
VITE_SUPABASE_URL="your-project-url"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Admin Access
To make a user an admin:
1. Sign up through the app.
2. Go to the Supabase Dashboard > Table Editor > `profiles`.
3. Change the `role` of your user from `customer` to `admin`.

## 📦 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Motion, Lucide React.
- **Backend**: Express (serving the SPA and API).
- **Database**: Supabase (PostgreSQL).
- **Auth**: Supabase Auth.
- **Storage**: Supabase Storage.
