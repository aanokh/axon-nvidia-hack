"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { PlusCircle, BrainIcon as Neuron } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

// Define the Course type
type Course = {
  id: number
  name: string
  description: string
  isAiGenerated: boolean
  createdAt: string
}

export function AppSidebar() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCourse, setActiveCourse] = useState<number | null>(null)
  const [isViewingProfile, setIsViewingProfile] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  // Extract user data from session
  const userName = session?.user?.name || "User"
  const userImage = session?.user?.image || "/placeholder.svg?height=40&width=40"
  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/courses")

      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }

      const data = await response.json()
      setCourses(data.courses)
      setError(null)
    } catch (err) {
      console.error("Error fetching courses:", err)
      setError("Failed to load courses")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch courses on initial load
  useEffect(() => {
    fetchCourses()
  }, [])

  // Listen for profile view events
  useEffect(() => {
    const handleCourseChanged = (e: Event) => {
      const courseId = (e as CustomEvent).detail
      setActiveCourse(courseId)
      setIsViewingProfile(false)
    }

    const handleViewProfile = () => {
      setIsViewingProfile(true)
    }

    const handleCancelProfileView = () => {
      setIsViewingProfile(false)
    }

    window.addEventListener("view-profile", handleViewProfile)
    window.addEventListener("cancel-profile-view", handleCancelProfileView)
    window.addEventListener("course-changed", handleCourseChanged as EventListener)

    return () => {
      window.removeEventListener("view-profile", handleViewProfile)
      window.removeEventListener("cancel-profile-view", handleCancelProfileView)
      window.removeEventListener("course-changed", handleCourseChanged as EventListener)
    }
  }, [])

  // Listen for refresh-courses event
  useEffect(() => {
    const handleRefreshCourses = async () => {
      await fetchCourses()
    }

    window.addEventListener("refresh-courses", handleRefreshCourses as EventListener)
    return () => {
      window.removeEventListener("refresh-courses", handleRefreshCourses as EventListener)
    }
  }, [])

  // Set default active course on home page
  useEffect(() => {
    // No longer auto-selecting the first course
    // This effect is kept for potential future functionality
  }, [pathname, activeCourse, isViewingProfile, courses])

  const handleCourseClick = (courseId: number) => {
    setActiveCourse(courseId)
    setIsViewingProfile(false)

    // Cancel any special views
    window.dispatchEvent(new CustomEvent("cancel-create-course"))
    window.dispatchEvent(new CustomEvent("cancel-learning-plan"))
    window.dispatchEvent(new CustomEvent("cancel-flashcard-generator"))
    window.dispatchEvent(new CustomEvent("cancel-profile-view"))

    // If not on home page, navigate there first
    if (pathname !== "/") {
      router.push("/")
    }

    // Dispatch course change event
    window.dispatchEvent(new CustomEvent("course-changed", { detail: courseId }))
  }

  const handleProfileClick = () => {
    // De-highlight any active course
    setIsViewingProfile(true)
    window.dispatchEvent(new CustomEvent("view-profile"))
  }

  return (
    <div className="bg-[#8a2432] dark:bg-[#2d1e3e] text-white w-64 fixed h-full z-10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center">
            <Neuron className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-semibold">Axon.ai</span>
        </div>
      </div>

      {/* Profile */}
      <div className="py-4 px-4 border-b border-white/10 flex-shrink-0">
        <button
          className={`flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity ${
            isViewingProfile ? "bg-white/20 rounded-md p-2 -m-2" : ""
          }`}
          onClick={handleProfileClick}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={userImage || "/placeholder.svg"} alt={userName} />
            <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-lg">{userName}</span>
        </button>
      </div>

      {/* Courses Header with Add Button */}
      <div className="px-4 pt-6 pb-3 flex-shrink-0">
        <h2 className="text-2xl font-semibold mb-4">Courses</h2>
        <Button
          onClick={() => window.dispatchEvent(new CustomEvent("create-course"))}
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 py-2 h-auto"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          <span>Add New Course</span>
        </Button>
      </div>

      {/* Courses List - Scrollable */}
      <div className="flex-1 overflow-y-auto mt-2">
        {isLoading ? (
          <div className="px-4 py-3 text-center text-white/70">Loading courses...</div>
        ) : error ? (
          <div className="px-4 py-3 text-center text-white/70">{error}</div>
        ) : courses.length === 0 ? (
          <div className="px-4 py-3 text-center text-white/70">No courses found</div>
        ) : (
          <ul>
            {courses.map((course) => (
              <li key={course.id}>
                <div
                  className={`w-full ${
                    activeCourse === course.id && !isViewingProfile ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <button className="px-4 py-3 text-left w-full" onClick={() => handleCourseClick(course.id)}>
                    <div className="text-lg" style={{ wordWrap: "break-word", overflowWrap: "break-word" }}>
                      {course.name}
                    </div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

