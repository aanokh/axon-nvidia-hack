"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { MainContent } from "@/components/main-content"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-[#8a2432] dark:border-purple-600 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex">
      <AppSidebar />
      <div className="ml-64 w-full min-h-screen">
        <MainContent />
      </div>
    </div>
  )
}
