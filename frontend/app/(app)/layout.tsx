"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isLoggedIn, getRole } from "@/lib/auth"
import Sidebar from "@/components/Sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login")
      return
    }
    // Admins belong in the moderator panel, not the main app
    if (getRole() === "admin") {
      router.replace("/moderator/dashboard")
    }
  }, [router])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
