"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function UserNav() {
  const { data: session } = useSession()

  // Extract user data from session
  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || "user@example.com"
  const userImage = session?.user?.image || "/placeholder.svg?height=40&width=40"

  // Get initials for avatar fallback
  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <span className="text-sm font-medium hidden md:inline-block">{userName}</span>
      <Avatar className="h-10 w-10 cursor-pointer">
        <AvatarImage src={userImage || "/placeholder.svg"} alt={userName} />
        <AvatarFallback className="bg-[#8a2432] text-white">{initials}</AvatarFallback>
      </Avatar>
    </Link>
  )
}
