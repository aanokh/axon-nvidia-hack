"use client"

import { useState, useRef, useEffect } from "react"
import {
  ArrowLeft,
  Calendar,
  Save,
  X,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  FileText,
  Download,
  Printer,
  Share2,
  Pencil,
  MinusCircle,
  PlusCircle,
  BookOpenCheck,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Types
type Topic = {
  topic_name: string
  topic_content: string
}

type Test = {
  test_date: string
  covered_topic_names: string[]
}

type CourseData = {
  course_name: string
  course_description: string
  topics: Topic[]
  tests: Test[]
  additional_info: string
}

// Color scheme for topics
const topicColors = [
  { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", icon: "text-blue-600", accent: "bg-blue-600" },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-800",
    icon: "text-indigo-600",
    accent: "bg-indigo-600",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
    icon: "text-purple-600",
    accent: "bg-purple-600",
  },
  {
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-300",
    text: "text-fuchsia-800",
    icon: "text-fuchsia-600",
    accent: "bg-fuchsia-600",
  },
  { bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-800", icon: "text-pink-600", accent: "bg-pink-600" },
  { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-800", icon: "text-rose-600", accent: "bg-rose-600" },
]

export function LearningPlan() {
  // State for loading and error
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [editState, setEditState] = useState({
    courseInfo: false,
    topicIndex: null as number | null,
    testIndex: null as number | null,
    additionalInfo: false,
  })
  const [tempData, setTempData] = useState<{
    courseInfo: {
      course_name: string
      course_description: string
    }
    topics: Topic[]
    tests: Test[]
    additionalInfo: string
  } | null>(null)
  const [collapsedTopics, setCollapsedTopics] = useState<number[]>([])

  // Refs
  const topicRefs = useRef<(HTMLDivElement | null)[]>([])
  const newTopicRef = useRef<HTMLDivElement | null>(null)
  const newTestRef = useRef<HTMLDivElement | null>(null)

  // Fetch course data from API
  useEffect(() => {
    async function fetchCourseData() {
      try {
        // Get the active course ID from the URL or a custom event
        const urlParams = new URLSearchParams(window.location.search)
        const courseId = urlParams.get("courseId") || localStorage.getItem("activeCourseId") || "1"

        const response = await fetch(`/api/learning-plan/${courseId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch course data")
        }

        const data = await response.json()
        setCourseData(data)

        // Initialize tempData with the fetched data
        setTempData({
          courseInfo: {
            course_name: data.course_name,
            course_description: data.course_description,
          },
          topics: [...data.topics],
          tests: [...data.tests],
          additionalInfo: data.additional_info,
        })

        // Initialize collapsed topics
        setCollapsedTopics(Array.from({ length: data.topics.length }, (_, i) => i))

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching course data:", err)
        setError("Failed to load course data. Please try again.")
        setIsLoading(false)
      }
    }

    fetchCourseData()
    // Empty dependency array ensures this only runs once when component mounts
  }, [])

  // Helper functions
  const markUnsaved = () => setHasUnsavedChanges(true)
  const getTopicColor = (index: number) => topicColors[index % topicColors.length]

  const isTopicCoveredInTest = (topicName: string) => {
    if (!courseData) return false
    return courseData.tests.some((test) => test.covered_topic_names.includes(topicName))
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  // Navigation
  const handleBack = () => window.dispatchEvent(new CustomEvent("cancel-learning-plan"))

  // Topic functions
  const toggleTopicCollapse = (index: number) => {
    setCollapsedTopics((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const startEditingTopic = (index: number) => {
    if (!tempData || !courseData) return
    setTempData((prev) => (prev ? { ...prev, topics: [...courseData.topics] } : null))
    setEditState((prev) => ({ ...prev, topicIndex: index }))
  }

  const handleTopicChange = (index: number, field: keyof Topic, value: string) => {
    if (!tempData) return
    setTempData((prev) => {
      if (!prev) return null
      const updatedTopics = [...prev.topics]
      updatedTopics[index] = { ...updatedTopics[index], [field]: value }
      return { ...prev, topics: updatedTopics }
    })
  }

  const addTopic = () => {
    if (!courseData || !tempData) return

    const newTopic = { topic_name: "New Topic", topic_content: "Enter topic content here..." }
    const updatedTopics = [...courseData.topics, newTopic]

    setCourseData((prev) => (prev ? { ...prev, topics: updatedTopics } : null))
    setTempData((prev) => (prev ? { ...prev, topics: updatedTopics } : null))
    setEditState((prev) => ({ ...prev, topicIndex: updatedTopics.length - 1 }))
    markUnsaved()

    setTimeout(() => {
      newTopicRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const removeTopic = (index: number) => {
    if (!courseData) return

    const updatedTopics = courseData.topics.filter((_, i) => i !== index)
    setCourseData((prev) => (prev ? { ...prev, topics: updatedTopics } : null))
    setEditState((prev) => ({ ...prev, topicIndex: null }))
    markUnsaved()
  }

  // Test functions
  const startEditingTest = (index: number) => {
    if (!tempData || !courseData) return
    setTempData((prev) => (prev ? { ...prev, tests: [...courseData.tests] } : null))
    setEditState((prev) => ({ ...prev, testIndex: index }))
  }

  const handleTestChange = (index: number, field: keyof Test, value: string) => {
    if (!tempData) return
    setTempData((prev) => {
      if (!prev) return null
      const updatedTests = [...prev.tests]
      updatedTests[index] = { ...updatedTests[index], [field]: value }
      return { ...prev, tests: updatedTests }
    })
  }

  const handleTestTopicChange = (testIndex: number, topicName: string, checked: boolean) => {
    if (!tempData) return
    setTempData((prev) => {
      if (!prev) return null
      const updatedTests = [...prev.tests]
      const currentTopics = updatedTests[testIndex].covered_topic_names

      updatedTests[testIndex] = {
        ...updatedTests[testIndex],
        covered_topic_names: checked
          ? [...currentTopics, topicName]
          : currentTopics.filter((name) => name !== topicName),
      }

      return { ...prev, tests: updatedTests }
    })
  }

  const addTest = () => {
    if (!courseData || !tempData) return

    const newTest = {
      test_date: new Date().toISOString().split("T")[0],
      covered_topic_names: [],
    }
    const updatedTests = [...courseData.tests, newTest]

    setCourseData((prev) => (prev ? { ...prev, tests: updatedTests } : null))
    setTempData((prev) => (prev ? { ...prev, tests: updatedTests } : null))
    setEditState((prev) => ({ ...prev, testIndex: updatedTests.length - 1 }))
    markUnsaved()

    setTimeout(() => {
      newTestRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const removeTest = (index: number) => {
    if (!courseData) return

    const updatedTests = courseData.tests.filter((_, i) => i !== index)
    setCourseData((prev) => (prev ? { ...prev, tests: updatedTests } : null))
    setEditState((prev) => ({ ...prev, testIndex: null }))
    markUnsaved()
  }

  // Course info functions
  const handleCourseInfoChange = (field: keyof typeof tempData.courseInfo, value: string) => {
    if (!tempData) return
    setTempData((prev) => {
      if (!prev) return null
      return {
        ...prev,
        courseInfo: { ...prev.courseInfo, [field]: value },
      }
    })
  }

  // Additional info functions
  const handleAdditionalInfoChange = (value: string) => {
    if (!tempData) return
    setTempData((prev) => (prev ? { ...prev, additionalInfo: value } : null))
  }

  // Update functions (close editors and mark unsaved)
  const updateSection = (section: keyof typeof editState) => {
    if (!tempData || !courseData) return

    // Update the courseData state with the tempData changes
    if (section === "courseInfo") {
      setCourseData({
        ...courseData,
        course_name: tempData.courseInfo.course_name,
        course_description: tempData.courseInfo.course_description,
      })
    } else if (section === "topicIndex") {
      setCourseData({
        ...courseData,
        topics: [...tempData.topics],
      })
    } else if (section === "testIndex") {
      setCourseData({
        ...courseData,
        tests: [...tempData.tests],
      })
    } else if (section === "additionalInfo") {
      setCourseData({
        ...courseData,
        additional_info: tempData.additionalInfo,
      })
    }

    // Reset the edit state
    setEditState((prev) => ({
      ...prev,
      [section]: section === "topicIndex" || section === "testIndex" ? null : false,
    }))

    // Mark as unsaved
    markUnsaved()
  }

  // Global save function
  const saveAllChanges = async () => {
    if (!courseData || !tempData) return

    try {
      // Get the active course ID from the URL or localStorage, just like we do when fetching
      const urlParams = new URLSearchParams(window.location.search)
      const courseId = urlParams.get("courseId") || localStorage.getItem("activeCourseId") || "1"

      // Prepare the updated data
      const updatedData = {
        course_name: tempData.courseInfo.course_name,
        course_description: tempData.courseInfo.course_description,
        topics: tempData.topics,
        tests: tempData.tests,
        additional_info: tempData.additionalInfo,
      }

      // Send PUT request to update the learning plan with the correct courseId
      const response = await fetch(`/api/learning-plan/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        throw new Error("Failed to save learning plan")
      }

      // Update local state with the saved data
      setCourseData(updatedData)
      setHasUnsavedChanges(false)
      alert("Learning plan saved successfully!")
    } catch (err) {
      console.error("Error saving learning plan:", err)
      alert("Failed to save learning plan. Please try again.")
    }
  }

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="w-16 h-16 border-4 border-[#8a2432] dark:border-purple-600 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Show error state
  if (error || !courseData || !tempData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 max-w-md">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Error Loading Course Data</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error || "Failed to load course data."}</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800 text-white py-6 shadow-md mb-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-4 text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-3xl font-bold">Learning Plan</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Course Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 relative overflow-hidden group transition-colors duration-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800"></div>

          {editState.courseInfo ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="course-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Course Name
                </label>
                <input
                  id="course-name"
                  type="text"
                  value={tempData.courseInfo.course_name}
                  onChange={(e) => handleCourseInfoChange("course_name", e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="course-description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Course Description
                </label>
                <textarea
                  id="course-description"
                  value={tempData.courseInfo.course_description}
                  onChange={(e) => handleCourseInfoChange("course_description", e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditState((prev) => ({ ...prev, courseInfo: false }))}
                  className="mr-2"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateSection("courseInfo")}
                  className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Update
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <BookOpen className="h-6 w-6 text-[#8a2432] dark:text-purple-400 mr-3" />
                  <h2 className="text-2xl font-bold dark:text-white">{courseData.course_name}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditState((prev) => ({ ...prev, courseInfo: true }))}
                  className="text-gray-400 hover:text-[#8a2432] dark:hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit Course Info</span>
                </Button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-4 ml-9">{courseData.course_description}</p>

              {/* Action buttons */}
              <div className="flex mt-6 ml-9 gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Printer className="h-4 w-4" />
                  <span>Print Plan</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>Export as PDF</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Share2 className="h-4 w-4" />
                  <span>Share Plan</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Learning Path Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center dark:text-white">
              <span className="bg-[#8a2432] dark:bg-purple-800 text-white p-1 rounded-md mr-2">
                <Layers className="h-6 w-6" />
              </span>
              Learning Path
            </h2>
            <Button
              onClick={addTopic}
              className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Topic
            </Button>
          </div>

          {/* Topics list */}
          <div className="space-y-6">
            {courseData.topics.map((topic, index) => {
              const colors = getTopicColor(index)
              const isEditing = editState.topicIndex === index
              const isCollapsed = collapsedTopics.includes(index)
              const isLastTopic = index === courseData.topics.length - 1

              return (
                <div
                  key={index}
                  ref={(el) => {
                    topicRefs.current[index] = el
                    if (isLastTopic && isEditing) newTopicRef.current = el
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-md ${
                    isEditing
                      ? "border-[#8a2432] dark:border-purple-600 ring-2 ring-[#8a2432]/20 dark:ring-purple-600/20"
                      : "border-gray-200 dark:border-gray-700"
                  } group overflow-hidden`}
                >
                  {/* Topic header */}
                  <div
                    className={`${colors.bg} dark:bg-gray-700 border-l-4 ${colors.border} dark:border-gray-600 px-4 py-3`}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => toggleTopicCollapse(index)}
                        className="flex items-center text-left group/title transition-colors flex-1"
                      >
                        <span className="text-gray-500 dark:text-gray-400 font-medium mr-2">{index + 1}.</span>
                        <h3 className={`text-xl font-bold ${colors.text} dark:text-gray-100`}>{topic.topic_name}</h3>
                        <div className="ml-3">
                          {isCollapsed ? (
                            <PlusCircle className="h-5 w-5 opacity-70" />
                          ) : (
                            <MinusCircle className="h-5 w-5 opacity-70" />
                          )}
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditingTopic(index)}
                        className={`${colors.text} dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-600/30 opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Topic</span>
                      </Button>
                    </div>
                  </div>

                  {/* Topic content */}
                  {isEditing ? (
                    <div className="p-4 space-y-4">
                      <div>
                        <label
                          htmlFor={`topic-name-${index}`}
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Topic Name
                        </label>
                        <input
                          id={`topic-name-${index}`}
                          type="text"
                          value={tempData.topics[index].topic_name}
                          onChange={(e) => handleTopicChange(index, "topic_name", e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`topic-content-${index}`}
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Topic Content
                        </label>
                        <textarea
                          id={`topic-content-${index}`}
                          value={tempData.topics[index].topic_content}
                          onChange={(e) => handleTopicChange(index, "topic_content", e.target.value)}
                          rows={4}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="flex justify-between">
                        <Button variant="destructive" size="sm" onClick={() => removeTopic(index)}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete Topic
                        </Button>

                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditState((prev) => ({ ...prev, topicIndex: null }))}
                            className="mr-2"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateSection("topicIndex")}
                            className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
                          >
                            <Save className="mr-1 h-4 w-4" />
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Content area with smooth height transition */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100 p-4"
                        }`}
                      >
                        <p className="text-gray-700 dark:text-gray-300">{topic.topic_content}</p>

                        {/* Topic status indicators */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {isTopicCoveredInTest(topic.topic_name) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                              <Calendar className="h-3 w-3 mr-1" />
                              Tested
                            </span>
                          )}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                            <BookOpenCheck className="h-3 w-3 mr-1" />
                            Required
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tests Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center dark:text-white">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 p-1 rounded-md mr-2">
                <Calendar className="h-6 w-6" />
              </span>
              Upcoming Tests
            </h2>
            <Button
              onClick={addTest}
              className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Test
            </Button>
          </div>

          <div className="space-y-6">
            {courseData.tests.map((test, index) => (
              <div
                key={index}
                ref={index === courseData.tests.length - 1 && editState.testIndex === index ? newTestRef : null}
                className={`border rounded-lg overflow-hidden transition-all hover:shadow-md group ${
                  editState.testIndex === index
                    ? "border-[#8a2432] dark:border-purple-600 ring-2 ring-[#8a2432]/20 dark:ring-purple-600/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {editState.testIndex === index ? (
                  <div className="p-4 space-y-4">
                    <div>
                      <label
                        htmlFor={`test-date-${index}`}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Test Date
                      </label>
                      <input
                        id={`test-date-${index}`}
                        type="date"
                        value={new Date(tempData.tests[index].test_date).toISOString().split("T")[0]}
                        onChange={(e) => handleTestChange(index, "test_date", e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Covered Topics
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-md">
                        {courseData.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`topic-${index}-${topicIndex}`}
                              checked={tempData.tests[index].covered_topic_names.includes(topic.topic_name)}
                              onChange={(e) => handleTestTopicChange(index, topic.topic_name, e.target.checked)}
                              className="h-4 w-4 text-[#8a2432] dark:text-purple-600 focus:ring-[#8a2432] dark:focus:ring-purple-600 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <label
                              htmlFor={`topic-${index}-${topicIndex}`}
                              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                            >
                              {topic.topic_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="destructive" size="sm" onClick={() => removeTest(index)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete Test
                      </Button>

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditState((prev) => ({ ...prev, testIndex: null }))}
                          className="mr-2"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateSection("testIndex")}
                          className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
                        >
                          <Save className="mr-1 h-4 w-4" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Test header with gradient */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-blue-800 dark:text-blue-300 mr-2" />
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                          Test on {formatDate(test.test_date)}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditingTest(index)}
                        className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Test</span>
                      </Button>
                    </div>

                    {/* Test content */}
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Covered Topics:</h4>
                      <div className="flex flex-wrap gap-2">
                        {test.covered_topic_names.map((topicName, topicIndex) => {
                          // Find the topic index to get its color
                          const topicIndex2 = courseData.topics.findIndex((t) => t.topic_name === topicName)
                          const colors = getTopicColor(topicIndex2 >= 0 ? topicIndex2 : topicIndex)

                          return (
                            <span
                              key={topicIndex}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} dark:bg-gray-700 ${colors.text} dark:text-gray-300 transition-all hover:shadow-sm`}
                            >
                              {topicName}
                            </span>
                          )
                        })}
                      </div>

                      {/* Countdown */}
                      <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          {Math.max(
                            0,
                            Math.floor(
                              (new Date(test.test_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            ),
                          )}{" "}
                          days until test
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 group transition-colors duration-200">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold flex items-center dark:text-white">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 p-1 rounded-md mr-2">
                <FileText className="h-6 w-6" />
              </span>
              Additional Information
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditState((prev) => ({ ...prev, additionalInfo: true }))}
              className="text-gray-400 hover:text-[#8a2432] dark:hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit Additional Info</span>
            </Button>
          </div>

          {editState.additionalInfo ? (
            <div className="space-y-4">
              <textarea
                value={tempData.additionalInfo}
                onChange={(e) => handleAdditionalInfoChange(e.target.value)}
                rows={6}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditState((prev) => ({ ...prev, additionalInfo: false }))}
                  className="mr-2"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateSection("additionalInfo")}
                  className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Update
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{courseData.additional_info}</p>
            </div>
          )}
        </div>
      </div>

      {/* Global Save Button */}
      <div
        className={`fixed bottom-8 right-8 z-50 transition-all ${hasUnsavedChanges ? "scale-110 animate-pulse" : ""}`}
      >
        <div className="relative">
          {hasUnsavedChanges && (
            <span className="absolute -top-2 -right-2 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 dark:bg-purple-500"></span>
            </span>
          )}
          <Button
            onClick={saveAllChanges}
            disabled={!hasUnsavedChanges}
            size="lg"
            className={`shadow-lg ${
              hasUnsavedChanges
                ? "bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700 text-white"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <Save className="mr-2 h-5 w-5" />
            Save Learning Plan
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Reminder */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-24 right-8 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg shadow-lg max-w-xs animate-bounce-once">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-amber-500 dark:text-amber-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You have unsaved changes. Don't forget to save your learning plan!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

