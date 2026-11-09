# Export Functionality Patterns

## Table of Contents

1. [CSV Export](#csv-export)
2. [Chart Export as Image](#chart-export-as-image)
3. [Export Button Component](#export-button-component)

---

## CSV Export

### Client-side CSV Generation

```tsx
"use client";

function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!data.length) return;

  const keys = columns?.map((c) => c.key) || (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns?.map((c) => c.label) || keys.map(String);

  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          // Handle values containing commas or quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  // Add BOM for Unicode support
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Usage Example

```tsx
const salesData = [
  { product: "Product A", quantity: 100, revenue: 5000 },
  { product: "Product B", quantity: 80, revenue: 4000 },
];

<Button onClick={() => exportToCSV(salesData, "sales-report", [
  { key: "product", label: "Product Name" },
  { key: "quantity", label: "Quantity" },
  { key: "revenue", label: "Revenue" },
])}>
  Export CSV
</Button>
```

### Server-side CSV Generation (For Large Datasets)

```typescript
// app/api/export/csv/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let data: string;
  let filename: string;

  switch (type) {
    case "orders":
      data = await generateOrdersCSV();
      filename = "orders";
      break;
    case "products":
      data = await generateProductsCSV();
      filename = "products";
      break;
    default:
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  return new NextResponse("\uFEFF" + data, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

async function generateOrdersCSV() {
  const orders = await prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Order ID", "User", "Amount", "Status", "Created At"];
  const rows = orders.map((o) => [
    o.id,
    o.user.name || o.user.email,
    o.total,
    o.status,
    o.createdAt.toISOString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
```

---

## Chart Export as Image

### Using html2canvas

```bash
npm install html2canvas
```

```tsx
"use client";

import html2canvas from "html2canvas";
import { useRef } from "react";

function ChartWithExport() {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportAsImage = async () => {
    if (!chartRef.current) return;

    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "#ffffff",
      scale: 2, // High-resolution export
    });

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart_${new Date().toISOString().split("T")[0]}.png`;
    link.click();
  };

  return (
    <div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          {/* Chart content */}
        </ResponsiveContainer>
      </div>
      <Button onClick={exportAsImage}>Export Image</Button>
    </div>
  );
}
```

### Using Recharts Built-in SVG Export

```tsx
"use client";

import { useRef } from "react";

function ChartWithSVGExport() {
  const chartRef = useRef<any>(null);

  const exportAsSVG = () => {
    const svgElement = chartRef.current?.container?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chart_${new Date().toISOString().split("T")[0]}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart ref={chartRef} data={data}>
          {/* ... */}
        </LineChart>
      </ResponsiveContainer>
      <Button onClick={exportAsSVG}>Export SVG</Button>
    </div>
  );
}
```

---

## Export Button Component

### Universal Export Button

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Image, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface ExportButtonProps<T> {
  data?: T[];
  chartRef?: React.RefObject<HTMLDivElement>;
  filename?: string;
  columns?: { key: keyof T; label: string }[];
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  chartRef,
  filename = "export",
  columns,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = () => {
    if (!data?.length) return;

    const keys = columns?.map((c) => c.key) || (Object.keys(data[0]) as (keyof T)[]);
    const headers = columns?.map((c) => c.label) || keys.map(String);

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        keys
          .map((key) => {
            const value = row[key];
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportImage = async () => {
    if (!chartRef?.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.png`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {data && (
          <DropdownMenuItem onClick={exportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </DropdownMenuItem>
        )}
        {chartRef && (
          <DropdownMenuItem onClick={exportImage}>
            <Image className="mr-2 h-4 w-4" />
            Export Image
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Usage Example

```tsx
"use client";

import { useRef } from "react";
import { ExportButton } from "@/components/export-button";

function RevenueChart() {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = [
    { month: "Jan", revenue: 4000 },
    { month: "Feb", revenue: 3000 },
  ];

  return (
    <ChartCard
      title="Revenue Trend"
      actions={
        <ExportButton
          data={data}
          chartRef={chartRef}
          filename="revenue"
          columns={[
            { key: "month", label: "Month" },
            { key: "revenue", label: "Revenue" },
          ]}
        />
      }
    >
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            {/* ... */}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
```
