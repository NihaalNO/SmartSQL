import "../globals.css"
import { Toaster } from "react-hot-toast"

// Layout for the moderator panel - protected by middleware
export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      {children}
    </div>
  )
}
