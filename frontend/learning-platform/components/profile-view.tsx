"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, LogOut, Save, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

type ProfileData = {
  created_at: string
}

export function ProfileView() {
  const { data: session, update } = useSession()
  const { theme, setTheme } = useTheme()
  const [isUpdating, setIsUpdating] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
  })

  // Get initials for avatar fallback
  const userName = session?.user?.name || "User"
  const userImage = session?.user?.image || "/placeholder.svg?height=100&width=100"
  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  // Fetch profile data
  useEffect(() => {
    async function fetchProfileData() {
      try {
        const response = await fetch("/api/user/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch profile data")
        }
        const data = await response.json()
        setProfileData(data)
      } catch (error) {
        console.error("Error fetching profile data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent("cancel-profile-view"))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800 text-white py-6 shadow-md mb-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-4 text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Profile Card */}
          <Card className="h-fit">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userImage || "/placeholder.svg"} alt={userName} />
                  <AvatarFallback className="bg-[#8a2432] dark:bg-purple-800 text-white text-2xl transition-colors duration-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{userName}</CardTitle>
              <CardDescription>{session?.user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  Member since: {profileData ? new Date(profileData.created_at).toLocaleDateString() : "Loading..."}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full mt-4 flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>

          {/* Settings Tabs */}
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Update your account information here.</CardDescription>
                </CardHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsUpdating(true)
                    try {
                      const response = await fetch("/api/user/update", {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          name: formData.name,
                        }),
                      })

                      if (!response.ok) {
                        throw new Error("Failed to update profile")
                      }

                      // Update the session after successful API call
                      await update({
                        ...session,
                        user: {
                          ...session?.user,
                          name: formData.name,
                        },
                      })

                      alert("Profile updated successfully!")
                    } catch (error) {
                      alert("Failed to update profile. Please try again.")
                    } finally {
                      setIsUpdating(false)
                    }
                  }}
                >
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" value={formData.email} disabled />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed. Contact support for assistance.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={isUpdating} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Preferences */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>Manage your app preferences and settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                      <Moon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
