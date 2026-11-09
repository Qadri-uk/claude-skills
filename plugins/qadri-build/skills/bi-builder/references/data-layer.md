# Data Layer Patterns

## Table of Contents

1. [Database Connection & Schema Pull](#database-connection--schema-pull)
2. [Schema Analysis & Metric Identification](#schema-analysis--metric-identification)
3. [Prisma Schema Design](#prisma-schema-design)
4. [Common BI Data Models](#common-bi-data-models)
5. [API Route Patterns](#api-route-patterns)
6. [Data Aggregation Queries](#data-aggregation-queries)
7. [Server Components Data Fetching](#server-components-data-fetching)

---

## Database Connection & Schema Pull

### Initialize Prisma

```bash
# Initialize Prisma in project
npx prisma init
```

### Configure Database Connection

```env
# .env
# MySQL
DATABASE_URL="mysql://username:password@host:3306/database"

# PostgreSQL
DATABASE_URL="postgresql://username:password@host:5432/database"

# SQLite
DATABASE_URL="file:./dev.db"
```

### Pull Schema from Existing Database

```bash
# Pull database schema
npx prisma db pull

# Generate Prisma Client
npx prisma generate

# Open database management UI (optional, for data exploration)
npx prisma studio
```

### Common Issue Handling

**Connection failure**: Check firewall, database user permissions, SSL configuration

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // If SSL is required
  // sslmode  = "require"
}
```

**Table name mapping**: Prisma auto-handles snake_case to camelCase conversion

```prisma
model User {
  id        Int      @id
  firstName String   @map("first_name")  // Database field name

  @@map("users")  // Database table name
}
```

---

## Schema Analysis & Metric Identification

### Analysis Process

After reading `prisma/schema.prisma`, analyze along these dimensions:

#### 1. Table Classification

| Table Type | Characteristics | Examples |
|------------|-----------------|----------|
| **Fact Tables** | Contains transaction/event data, has timestamps | orders, transactions, events |
| **Dimension Tables** | Descriptive data, rarely changes | users, products, categories |
| **Junction Tables** | Many-to-many relationship intermediaries | order_items, user_roles |

#### 2. Field Types & Metric Potential

```typescript
// Analyze schema to identify available metrics
interface FieldAnalysis {
  // Numeric fields → Aggregate metrics
  numericFields: {
    field: string;
    metrics: ('sum' | 'avg' | 'min' | 'max' | 'count')[];
  }[];

  // Date fields → Time series analysis
  dateFields: {
    field: string;
    granularities: ('day' | 'week' | 'month' | 'quarter' | 'year')[];
  }[];

  // Category fields → Grouping dimensions
  categoryFields: {
    field: string;
    type: 'enum' | 'string' | 'relation';
  }[];
}
```

#### 3. Metric Identification Table

| Field Pattern | Buildable Metrics | Examples |
|---------------|-------------------|----------|
| `Decimal` amount fields | Total, average, max/min | Total revenue, Average order value |
| `Int` quantity fields | Total, average, count | Total sales, Average orders |
| `DateTime` created time | Time aggregation, YoY/MoM | Daily/monthly sales, Growth rate |
| `Enum` status fields | Distribution, conversion rate | Order status distribution, Completion rate |
| `@relation` associations | Join aggregations, rankings | Category sales, User spending leaderboard |
| `Boolean` flags | Ratio statistics | Activation rate, Completion rate |

#### 4. Relationship Analysis

```
orders ─┬─ 1:N ─── order_items ───── N:1 ──┬─ products
        │                                   │
        └─ N:1 ─── users                    └─ N:1 ─── categories
```

Based on relationships, you can build:
- **Order dimension**: Order amount, order count, AOV
- **User dimension**: User total spend, purchase frequency, user value
- **Product dimension**: Product sales, product revenue, top sellers
- **Category dimension**: Category sales distribution, category trends

### Analysis Report Template

```markdown
## Database Analysis Report

### Table Overview
| Table | Type | Est. Records | Core Fields |
|-------|------|--------------|-------------|
| orders | Fact | ~100K | total, status, created_at |
| users | Dimension | ~10K | name, email, created_at |
| products | Dimension | ~1K | name, price, category_id |

### Available Metrics

#### Transaction Metrics
- [ ] Total Revenue = SUM(orders.total)
- [ ] Order Count = COUNT(orders)
- [ ] Average Order Value = AVG(orders.total)
- [ ] Order Completion Rate = COUNT(status='DELIVERED') / COUNT(*)

#### User Metrics
- [ ] Total Users = COUNT(users)
- [ ] New Users = COUNT(users WHERE created_at >= ?)
- [ ] Active Users = COUNT(DISTINCT orders.user_id WHERE ...)

#### Product Metrics
- [ ] Product Sales Ranking = GROUP BY product_id ORDER BY SUM(quantity)
- [ ] Category Sales Distribution = GROUP BY category_id

### Available Analysis Dimensions
- Time: Day/Week/Month/Quarter/Year
- Category: Product categories
- Status: Order status
- User: User segments

### Recommended Charts
| Metric | Recommended Chart | Data Source |
|--------|-------------------|-------------|
| Revenue Trend | Line Chart | orders.total BY created_at |
| Category Distribution | Pie Chart | categories.sales |
| Product Ranking | Bar Chart | products TOP 10 |
```

---

## Prisma Schema Design

### Basic Configuration

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Common Field Patterns

```prisma
// Timestamp fields
model Example {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("examples")
}

// Soft delete pattern
model SoftDeleteExample {
  id        Int       @id @default(autoincrement())
  deletedAt DateTime? @map("deleted_at")

  @@map("soft_delete_examples")
}
```

---

## Common BI Data Models

### E-commerce Sales Model

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")
  orders    Order[]

  @@map("users")
}

model Product {
  id          Int         @id @default(autoincrement())
  name        String
  price       Decimal     @db.Decimal(10, 2)
  category    Category    @relation(fields: [categoryId], references: [id])
  categoryId  Int         @map("category_id")
  createdAt   DateTime    @default(now()) @map("created_at")
  orderItems  OrderItem[]

  @@map("products")
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]

  @@map("categories")
}

model Order {
  id         Int         @id @default(autoincrement())
  user       User        @relation(fields: [userId], references: [id])
  userId     Int         @map("user_id")
  status     OrderStatus @default(PENDING)
  total      Decimal     @db.Decimal(10, 2)
  createdAt  DateTime    @default(now()) @map("created_at")
  orderItems OrderItem[]

  @@map("orders")
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   Int     @map("order_id")
  product   Product @relation(fields: [productId], references: [id])
  productId Int     @map("product_id")
  quantity  Int
  price     Decimal @db.Decimal(10, 2)

  @@map("order_items")
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### User Behavior Analytics Model

```prisma
model Event {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id")
  eventType String   @map("event_type")
  eventData Json?    @map("event_data")
  timestamp DateTime @default(now())
  sessionId String?  @map("session_id")

  @@index([userId])
  @@index([eventType])
  @@index([timestamp])
  @@map("events")
}

model DailyMetric {
  id            Int      @id @default(autoincrement())
  date          DateTime @db.Date
  metricName    String   @map("metric_name")
  metricValue   Decimal  @db.Decimal(15, 2) @map("metric_value")
  dimensionKey  String?  @map("dimension_key")
  dimensionValue String? @map("dimension_value")

  @@unique([date, metricName, dimensionKey, dimensionValue])
  @@index([date])
  @@index([metricName])
  @@map("daily_metrics")
}
```

---

## API Route Patterns

### Basic API Structure

```typescript
// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const data = await getDashboardData({ startDate, endDate, category });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
```

### API with Validation

```typescript
// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const result = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, endDate, category, limit } = result.data;

  // ... query logic
}
```

### Modular API Structure

```
app/api/dashboard/
├── route.ts           # GET /api/dashboard - Combined data
├── kpi/
│   └── route.ts       # GET /api/dashboard/kpi - KPI metrics
├── revenue/
│   └── route.ts       # GET /api/dashboard/revenue - Revenue trend
├── categories/
│   └── route.ts       # GET /api/dashboard/categories - Category distribution
└── top-products/
    └── route.ts       # GET /api/dashboard/top-products - Top selling products
```

---

## Data Aggregation Queries

### Time Series Aggregation

```typescript
// Monthly revenue aggregation
async function getMonthlyRevenue(year: number) {
  const result = await prisma.$queryRaw<{ month: number; revenue: number }[]>`
    SELECT
      MONTH(created_at) as month,
      SUM(total) as revenue
    FROM orders
    WHERE YEAR(created_at) = ${year}
      AND status != 'CANCELLED'
    GROUP BY MONTH(created_at)
    ORDER BY month
  `;
  return result;
}

// Daily active users aggregation
async function getDailyActiveUsers(startDate: Date, endDate: Date) {
  const result = await prisma.$queryRaw<{ date: Date; users: number }[]>`
    SELECT
      DATE(timestamp) as date,
      COUNT(DISTINCT user_id) as users
    FROM events
    WHERE timestamp BETWEEN ${startDate} AND ${endDate}
    GROUP BY DATE(timestamp)
    ORDER BY date
  `;
  return result;
}
```

### KPI Aggregation

```typescript
interface KPIData {
  totalRevenue: number;
  orderCount: number;
  userCount: number;
  avgOrderValue: number;
  revenueChange: number;
  orderChange: number;
}

async function getKPIs(startDate: Date, endDate: Date): Promise<KPIData> {
  const previousStart = new Date(startDate);
  previousStart.setMonth(previousStart.getMonth() - 1);
  const previousEnd = new Date(endDate);
  previousEnd.setMonth(previousEnd.getMonth() - 1);

  const [current, previous, userCount] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: true,
      _avg: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: previousStart, lte: previousEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
  ]);

  const currentRevenue = Number(current._sum.total) || 0;
  const previousRevenue = Number(previous._sum.total) || 0;
  const currentOrders = current._count;
  const previousOrders = previous._count;

  return {
    totalRevenue: currentRevenue,
    orderCount: currentOrders,
    userCount,
    avgOrderValue: Number(current._avg.total) || 0,
    revenueChange: previousRevenue
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0,
    orderChange: previousOrders
      ? ((currentOrders - previousOrders) / previousOrders) * 100
      : 0,
  };
}
```

### Category Distribution

```typescript
async function getCategoryDistribution() {
  const result = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    _count: true,
  });

  // Join with product and category info
  const products = await prisma.product.findMany({
    where: { id: { in: result.map((r) => r.productId) } },
    include: { category: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Aggregate by category
  const categoryStats = new Map<string, { name: string; value: number }>();
  for (const item of result) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const categoryName = product.category.name;
    const existing = categoryStats.get(categoryName) || { name: categoryName, value: 0 };
    existing.value += item._sum.quantity || 0;
    categoryStats.set(categoryName, existing);
  }

  return Array.from(categoryStats.values());
}
```

### Top N Ranking

```typescript
async function getTopProducts(limit = 10) {
  const result = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, price: true },
    orderBy: { _sum: { price: "desc" } },
    take: limit,
  });

  const productIds = result.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return result.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      quantity: item._sum.quantity || 0,
      revenue: Number(item._sum.price) || 0,
    };
  });
}
```

---

## Server Components Data Fetching

### Direct Data Fetching (Recommended)

```tsx
// app/dashboard/components/kpi-cards.tsx
import { prisma } from "@/lib/prisma";
import { KPICard } from "@/components/ui/kpi-card";

async function getKPIData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenue, orders, users] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
  ]);

  return {
    revenue: Number(revenue._sum.total) || 0,
    orders,
    users,
  };
}

export async function KPICards() {
  const data = await getKPIData();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard title="Monthly Revenue" value={`$${data.revenue.toLocaleString()}`} />
      <KPICard title="Orders" value={data.orders.toLocaleString()} />
      <KPICard title="New Users" value={data.users.toLocaleString()} />
    </div>
  );
}
```

### Cached Data Fetching

```tsx
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getCachedKPIs = unstable_cache(
  async () => {
    // ... query logic
  },
  ["dashboard-kpis"],
  { revalidate: 60 } // 60 second cache
);

export async function KPICards() {
  const data = await getCachedKPIs();
  // ...
}
```

### Prisma Client Configuration

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
