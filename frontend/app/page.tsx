"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isLoggedIn, isAdmin } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return }
    router.replace(isAdmin() ? "/dashboard" : "/query")
  }, [router])
  return null
}
