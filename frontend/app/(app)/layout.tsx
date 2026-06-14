import "../globals.css"
import { Toaster } from "react-hot-toast"
import Sidebar from "@/components/Sidebar"

// Layout for the main application - protected by middleware
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Toaster position="top-right" />
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
