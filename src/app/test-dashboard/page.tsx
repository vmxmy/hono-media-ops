"use client"

import { DashboardShell } from "@/components/dashboard-shell"

export default function TestDashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Test Dashboard Page</h1>
          <p className="text-muted-foreground">This page uses the shared DashboardShell component</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Card 1</h2>
            <p className="text-sm text-muted-foreground">Some content here</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Card 2</h2>
            <p className="text-sm text-muted-foreground">Some content here</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Card 3</h2>
            <p className="text-sm text-muted-foreground">Some content here</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Benefits of DashboardShell</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ Single source of truth for navigation</li>
            <li>✅ No need to import buildGroupedNavItems in every page</li>
            <li>✅ No need to create appShellNode in every page</li>
            <li>✅ Cleaner page components - only business logic</li>
            <li>✅ Consistent navigation across all pages</li>
          </ul>
        </div>
      </div>
    </DashboardShell>
  )
}
