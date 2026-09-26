# 📦 StockSense — Next-Gen Warehouse & Inventory Management System

> **Odoo Hackathon Solution** — An enterprise-grade, high-performance Inventory & Stock Management web application built with React 19, TypeScript, Tailwind CSS v4, and Supabase.

---

## 🌟 Key Features

### 🔐 Authentication & Enterprise Security
- **Multi-Factor / Flexible Auth**: Supabase-powered Email/Password and Phone OTP authentication workflows.
- **Self-Service Recovery**: Complete password reset flow (Forgot Password → OTP Verification → Reset Password).
- **Profile & Preferences**: Avatar management, user details updating, security options, and role assignment.
- **Row-Level Security (RLS)**: Strict database-level authorization policies ensuring data isolation and privacy.

### 📊 Real-Time Operations Dashboard
- **Key Metrics Overview**: Real-time counters for Total Products, Low Stock Alerts, Pending Inbound Receipts, Pending Internal Transfers, and Inventory Valuation.
- **Actionable Insights**: Instant stock movement feeds and quick navigation to high-priority warehouse tasks.

### 📦 Product Catalog & Stock Control
- **Comprehensive Product Catalog**: Detailed product records with SKU, Barcode, Unit of Measure (UOM), cost price, sales price, category, and minimum stock threshold rules.
- **Live Stock View**: Real-time stock levels broken down by warehouse, location, reserved quantity, and available quantity.

### 🏭 Multi-Warehouse & Location Hierarchy
- **Warehouse Management**: Multi-facility configuration (Warehouse Codes, Addresses, Operational status).
- **Location Bins**: Hierarchical layout structure (Physical Storage Bins, Internal Stock, Scrap Locations, Transit Locations).

### ⚡ Inventory Operations Workflow
- **Inbound Receipts**: Create vendor receipts, receive inventory, validate stock items, and automatically update physical stock balances.
- **Internal Transfers**: Multi-stage transfer management (`Draft` → `Ready` → `Done`) for seamless stock movements between warehouses and locations.
- **Inventory Adjustments**: Physical inventory counts, discrepancy identification, manual adjustments, and automated audit logging.

### 📜 Audit Ledger & Move History
- **Immutable Movement Ledger**: Complete audit trail tracking every stock transaction (Receipts, Transfers, Adjustments) with timestamp, source/destination locations, user info, and reference numbers.
- **Deep Linking & Dynamic Filtering**: Full URL search query parameter synchronization for seamless filtering, pagination, and shareable operational views.

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Modern, type-safe UI components |
| **Build System** | [Vite 8](https://vitejs.dev/) | High-performance HMR and bundling |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility-first styling engine |
| **UI Components & Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent icons |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query) | Server state management and caching |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Performant forms with schema validation |
| **Routing** | [React Router v7](https://reactrouter.com/) | Nested client-side routing & guards |
| **Backend & Database** | [Supabase](https://supabase.com/) | PostgreSQL, Auth, Realtime, RPC, & RLS |
| **Linting & Code Quality** | [Oxlint](https://oxc.rs/) | Blazing fast JavaScript/TypeScript linter |

---

## 📁 Project Structure

```
stock_sense_odoo_hackathon/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images and design assets
│   ├── components/         # Shared UI & layout components (DataTable, Modal, Toast, etc.)
│   ├── context/            # React context providers (AuthContext)
│   ├── hooks/              # Custom hooks (useUrlFilterParams, etc.)
│   ├── layouts/            # Page layouts (AppShell, RootLayout)
│   ├── lib/                # Supabase client initialization & helpers
│   ├── pages/              # Application screens & pages
│   │   ├── audit/          # Move History audit trail
│   │   ├── auth/           # Login, Register, Forgot Password, OTP, Reset Password
│   │   ├── locations/      # Warehouse location & bin management
│   │   ├── operations/     # Receipts, Transfers, Adjustments
│   │   ├── products/       # Product management
│   │   ├── stock/          # Stock balance list
│   │   └── warehouses/     # Warehouse setup
│   ├── routes/             # App routing and protected route guards
│   ├── services/           # API service modules talking to Supabase
│   ├── types/              # TypeScript type definition files
│   └── utils/              # Utility functions
├── supabase/
│   ├── migrations/         # SQL schema, triggers, RPC functions, and RLS policies
│   └── seed.sql            # Initial sample data for testing
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** / **yarn**
- **Supabase Account**: A Supabase project instance (local or hosted)

---

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd stock_sense_odoo_hackathon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database Migration & Setup**:
   Apply SQL files from `supabase/migrations/` in sequential order to your Supabase PostgreSQL instance:
   - `20260926000000_initial_schema.sql`
   - `20260926000001_complete_schema.sql`
   - `20260926000002_auth_and_rls.sql`
   - `20260926000003_products_and_inventory.sql`
   - `20260926000004_warehouse_locations.sql`
   - `20260926000005_receipts_and_completion.sql`
   - `20260926000006_transfers_and_completion.sql`
   - `20260926000007_adjustments_and_completion.sql`
   - `20260926000008_move_history_and_ledger_rls.sql`

   *(Optional)* Run `supabase/seed.sql` to populate sample products, warehouses, and locations.

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 📜 Available Scripts

- `npm run dev`: Launch the Vite development server with HMR.
- `npm run build`: Type-check and compile production bundle.
- `npm run preview`: Locally preview the production build output.
- `npm run lint`: Run Oxlint for code quality and linting checks.

---

## 🤝 License

Distributed under the MIT License. See `LICENSE` for more information.

