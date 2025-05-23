"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export function DebugStorage() {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)

  useEffect(() => {
    // Update the state when the component mounts
    const id = localStorage.getItem("activeCourseId")
    setActiveCourseId(id)

    // Set up an interval to check for changes
    const interval = setInterval(() => {
      const currentId = localStorage.getItem("activeCourseId")
      if (currentId !== activeCourseId) {
        setActiveCourseId(currentId)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCourseId])

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 p-2 rounded-md shadow-md text-xs z-50">
      <div>Active Course ID: {activeCourseId || "none"}</div>
      <Button
        size="sm"
        variant="outline"
        className="mt-1 text-xs h-6 px-2"
        onClick={() => {
          localStorage.removeItem("activeCourseId")
          setActiveCourseId(null)
        }}
      >
        Clear
      </Button>
    </div>
  )
}

