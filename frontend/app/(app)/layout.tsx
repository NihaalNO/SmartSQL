import { Suspense } from "react"
import Sidebar from "@/components/Sidebar"

// Layout for the main application - protected by middleware
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  )
}
