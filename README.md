# Aquatic Emerald Website

A full-stack e-commerce platform for ordering aquatic products, built with Next.js, React, TypeScript, and Tailwind CSS. Features include product management, order tracking, promotional codes, customer FAQ, and admin dashboard.

## Overview

Aquatic Emerald is a modern, serverless e-commerce solution designed to manage product catalogs, process orders, handle discounts, and provide an intuitive admin interface for business operations.

## Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript
- **Styling**: Tailwind CSS 4, Emotion, Material-UI
- **Database**: PostgreSQL via Neon (serverless)
- **UI Components**: Radix UI, shadcn/ui
- **Forms**: React Hook Form
- **Charts & Visualization**: Recharts
- **Authentication**: JWT via jose, bcrypt-ts
- **File Storage**: Vercel Blob
- **Drag & Drop**: React DnD
- **Hosting**: Vercel

## Features

### Customer Features
- **Product Browsing**: Browse aquatic products by category
- **Shopping Cart**: Add, update, and manage cart items
- **Checkout**: Secure order placement with address and contact info
- **Discount Codes**: Apply promo codes and auto-discounts
- **Order Tracking**: View order status and history
- **FAQ Section**: Browse frequently asked questions
- **Guides**: Access product guides and care instructions

### Admin Dashboard
- **Product Management**: Create, edit, and delete products with images
- **Order Management**: View, filter, and manage customer orders
- **Category Management**: Organize products into categories
- **Discount Management**: 
  - Manual promo codes with fixed/percentage discounts
  - Auto-discounts based on criteria (cart total, product quantity, etc.)
- **Content Management**:
  - FAQ management
  - Product guides
  - Business hours/times
- **Locations**: Manage multiple store locations
- **Settings**: Configure business settings
- **Reports**: View sales data and analytics

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (auth, etc.)
│   ├── admin/            # Admin dashboard pages
│   │   ├── categories/   # Category management
│   │   ├── faq/          # FAQ management
│   │   ├── guides/       # Guide management
│   │   ├── orders/       # Order management
│   │   ├── promo/        # Discount management
│   │   ├── settings/     # Settings
│   │   ├── times/        # Business hours
│   │   └── locations/    # Location management
│   ├── api/              # API routes
│   │   ├── auto-discounts/
│   │   ├── categories/
│   │   ├── discount-codes/
│   │   ├── faqs/
│   │   ├── guides/
│   │   ├── locations/
│   │   ├── orders/
│   │   ├── products/
│   │   └── [other endpoints]
│   ├── checkout/         # Checkout pages
│   ├── faq/              # Customer FAQ
│   └── shop/             # Product shop pages
├── components/           # Reusable React components
├── lib/                  # Utilities and services
│   ├── dataService.ts    # Database queries
│   ├── db.ts             # Database connection
│   ├── actions.ts        # Server actions
│   └── [utils]
└── styles/               # Global styles
```

## Getting Started

### Prerequisites
- Node.js 18+ or later
- npm or yarn
- PostgreSQL database (This specific one uses NeonDB)

## Key Features & Workflows

### Admin Authentication
- Admin login/logout via `/admin` route
- Session management with JWT tokens
- Bcrypt password hashing

### Product Management
- Add, edit, delete products
- Upload product images to Vercel Blob
- Organize by categories
- Track inventory and pricing

### Order Processing
- View all customer orders
- Filter by status, date, customer
- Update order status
- Track order history

### Discount System
- **Promo Codes**: Fixed or percentage-based discounts with expiration dates
- **Auto-Discounts**: Rule-based discounts (e.g., 10% off on orders over $50)
- Discount validation and application in checkout

### Analytics
- Sales dashboard with charts
- Order trends and revenue tracking
- Customer insights

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/[id]` - Update product (admin)
- `DELETE /api/products/[id]` - Delete product (admin)

### Orders
- `GET /api/orders` - List orders (admin)
- `POST /api/orders` - Create order (customer)
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]` - Update order (admin)

### Discount Codes
- `GET /api/discount-codes` - List codes (admin)
- `POST /api/discount-codes` - Create code (admin)
- `POST /api/discount-codes/validate` - Validate code
- `DELETE /api/discount-codes/[id]` - Delete code (admin)

### Auto-Discounts
- `GET /api/auto-discounts` - List auto-discounts (admin)
- `POST /api/auto-discounts/evaluate` - Evaluate applicable discounts
- `PUT /api/auto-discounts/[id]` - Update (admin)
- `DELETE /api/auto-discounts/[id]` - Delete (admin)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create (admin)
- `PUT /api/categories/[id]` - Update (admin)
- `DELETE /api/categories/[id]` - Delete (admin)

### FAQs & Guides
- `GET /api/faqs` - List FAQs
- `POST /api/faqs` - Create (admin)
- `GET /api/guides` - List guides
- `POST /api/guides` - Create (admin)

### Locations
- `GET /api/locations` - List store locations
- `POST /api/locations` - Create (admin)

## Database Schema

Key tables:
- **products** - Product catalog with pricing and images
- **categories** - Product categories
- **orders** - Customer orders with status tracking
- **order_items** - Line items for orders
- **discount_codes** - Promo codes with validity periods
- **auto_discounts** - Rule-based discount configurations
- **faqs** - Frequently asked questions
- **guides** - Product guides and care instructions
- **locations** - Store location information
- **business_hours** - Operating hours

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `ADMIN_USERNAME` | Admin portal username | Yes |
| `ADMIN_PASSWORD_HASH` | Hashed admin password | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API token for image storage | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | No |

For the devs, please, if you find any bugs, submit a PR or email me (check my email at https://github.com/SahasTechnologies)
