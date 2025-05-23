"use client"

import { useEffect, useState, useRef } from "react"
import {
  Upload,
  Video,
  FileText,
  BookMarked,
  PenLine,
  FileSpreadsheet,
  PlayCircle,
  FileQuestion,
  FlaskConical,
  BookText,
  BookOpen,
  Brain,
  Presentation,
  Sigma,
  PenTool,
  BookOpenCheck,
  Sparkles,
  Route,
  ArrowRight,
  Layers,
  Headphones,
  MessageSquare,
  Globe,
  FileVideo,
  Newspaper,
  Bookmark,
  Zap,
} from "lucide-react"
import { CreateCourseScreen } from "./create-course-screen"
import { LearningPlan } from "./learning-plan"
import { FlashcardGenerator } from "./flashcard-generator"
import { ProfileView } from "./profile-view"
import { Chatbot } from "./chatbot"
import { QuizGenerator } from "./quiz-generator"
import { StudyGuideGenerator } from "./study-guide-generator"
import { FormulaGenerator } from "./formula-generator"

// Define the Course type
type Course = {
  id: number
  name: string
  description: string
  isAiGenerated: boolean
  createdAt: string
}

type TabType = "learn" | "practice" | "review"

export function MainContent() {
  // State for course data
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [courseError, setCourseError] = useState<string | null>(null)
  const [activeCourse, setActiveCourse] = useState<Course | null>(null)

  const [uploadType, setUploadType] = useState<string | null>(null)
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("practice")
  const [isViewingLearningPlan, setIsViewingLearningPlan] = useState(false)
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [isViewingProfile, setIsViewingProfile] = useState(false)
  const [isViewingChatbot, setIsViewingChatbot] = useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isGeneratingStudyGuide, setIsGeneratingStudyGuide] = useState(false)
  const [isGeneratingFormula, setIsGeneratingFormula] = useState(false)

  // Create a reusable file input ref to avoid recreating it on each upload
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch courses from API
  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true)
      const response = await fetch("/api/courses")

      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }

      const data = await response.json()
      setCourses(data.courses)
      setCourseError(null)

      // If we have an active course ID, find the updated course data
      if (activeCourseId) {
        const course = data.courses.find((c: Course) => c.id === activeCourseId)
        setActiveCourse(course || null)
      }
    } catch (err) {
      console.error("Error fetching courses:", err)
      setCourseError("Failed to load courses")
    } finally {
      setIsLoadingCourses(false)
    }
  }

  // Fetch courses on initial load
  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    // Create a file input element once
    const input = document.createElement("input")
    input.type = "file"
    fileInputRef.current = input

    // Clean up function to remove the input when component unmounts
    return () => {
      fileInputRef.current = null
    }
  }, [])

  // Add these event listeners to the useEffect hook
  useEffect(() => {
    const handleCourseChange = async (e: Event) => {
      const courseId = (e as CustomEvent).detail
      setActiveCourseId(courseId)

      // Ensure we have the latest courses data
      const currentCourses = [...courses]

      // Find the course in our current state
      let course = currentCourses.find((c) => c.id === courseId)

      // If we can't find the course, fetch courses again to get updated data
      if (!course) {
        await fetchCourses()
        // After fetching, try to find the course again
        const updatedCourses = [...courses]
        course = updatedCourses.find((c) => c.id === courseId)
      }

      // Set the active course
      if (course) {
        setActiveCourse(course)

        // Set default active tab based on course type
        if (course.isAiGenerated) {
          setActiveTab("learn")
        } else {
          setActiveTab("practice")
        }
      }

      // Ensure we exit all special views when a course is selected
      setIsCreatingCourse(false)
      setIsViewingLearningPlan(false)
      setIsGeneratingFlashcards(false)
      setIsViewingProfile(false)
      setIsViewingChatbot(false)
      setIsGeneratingQuiz(false)
      setIsGeneratingStudyGuide(false)
      setIsGeneratingFormula(false)
    }

    const handleStudyGuideGenerator = () => setIsGeneratingStudyGuide(true)
    const handleCancelStudyGuideGenerator = () => setIsGeneratingStudyGuide(false)

    const handleFormulaGenerator = () => setIsGeneratingFormula(true)
    const handleCancelFormulaGenerator = () => setIsGeneratingFormula(false)

    const handleCreateCourse = () => setIsCreatingCourse(true)
    const handleCancelCreateCourse = () => setIsCreatingCourse(false)
    const handleLearningPlanView = () => setIsViewingLearningPlan(true)
    const handleCancelLearningPlan = () => setIsViewingLearningPlan(false)

    const handleFlashcardGenerator = () => setIsGeneratingFlashcards(true)
    const handleCancelFlashcardGenerator = () => setIsGeneratingFlashcards(false)

    const handleQuizGenerator = () => setIsGeneratingQuiz(true)
    const handleCancelQuizGenerator = () => setIsGeneratingQuiz(false)

    const handleProfileView = () => setIsViewingProfile(true)
    const handleCancelProfileView = () => setIsViewingProfile(false)

    const handleChatbotView = () => setIsViewingChatbot(true)
    const handleCancelChatbot = () => setIsViewingChatbot(false)

    // Listen for refresh-and-select-course event
    const handleRefreshAndSelectCourse = async (event: CustomEvent<{ courseId: string }>) => {
      if (event.detail && event.detail.courseId) {
        // First refresh the courses to get the latest data
        await fetchCourses()

        // Then set the active course ID
        const courseId = Number.parseInt(event.detail.courseId)
        setActiveCourseId(courseId)

        // Find the course in our updated state
        const course = courses.find((c) => c.id === courseId)
        setActiveCourse(course || null)

        // Ensure we exit all special views
        setIsCreatingCourse(false)
        setIsViewingLearningPlan(false)
        setIsGeneratingFlashcards(false)
        setIsViewingProfile(false)
        setIsViewingChatbot(false)
        setIsGeneratingQuiz(false)
        setIsGeneratingStudyGuide(false)
        setIsGeneratingFormula(false)

        // Set default tab
        setActiveTab("practice")
      }
    }

    const handleRefreshCourses = async () => {
      await fetchCourses()
    }

    // Update the handleChatbotViewWithMessage function to ensure it closes other views
    const handleChatbotViewWithMessage = (event: CustomEvent) => {
      const { message, courseId, courseName } = event.detail

      // Store the initial message and course info for the chatbot
      localStorage.setItem("chatbotInitialMessage", message)
      localStorage.setItem("chatbotCourseId", courseId)
      localStorage.setItem("chatbotCourseName", courseName)

      // Close all other views before opening the chatbot
      setIsCreatingCourse(false)
      setIsViewingLearningPlan(false)
      setIsGeneratingFlashcards(false)
      setIsViewingProfile(false)
      setIsGeneratingQuiz(false)
      setIsGeneratingStudyGuide(false)
      setIsGeneratingFormula(false)

      // Open the chatbot view
      setIsViewingChatbot(true)
    }

    window.addEventListener("course-changed", handleCourseChange as EventListener)
    window.addEventListener("create-course", handleCreateCourse as EventListener)
    window.addEventListener("cancel-create-course", handleCancelCreateCourse as EventListener)
    window.addEventListener("view-learning-plan", handleLearningPlanView as EventListener)
    window.addEventListener("cancel-learning-plan", handleCancelLearningPlan as EventListener)
    window.addEventListener("generate-flashcards", handleFlashcardGenerator as EventListener)
    window.addEventListener("cancel-flashcard-generator", handleCancelFlashcardGenerator as EventListener)
    window.addEventListener("generate-quiz", handleQuizGenerator as EventListener)
    window.addEventListener("cancel-quiz-generator", handleCancelQuizGenerator as EventListener)
    window.addEventListener("view-profile", handleProfileView as EventListener)
    window.addEventListener("cancel-profile-view", handleCancelProfileView as EventListener)
    window.addEventListener("refresh-and-select-course", handleRefreshAndSelectCourse as EventListener)
    window.addEventListener("refresh-courses", handleRefreshCourses as EventListener)
    window.addEventListener("view-chatbot", handleChatbotView as EventListener)
    window.addEventListener("cancel-chatbot", handleCancelChatbot as EventListener)
    window.addEventListener("generate-study-guide", handleStudyGuideGenerator as EventListener)
    window.addEventListener("cancel-study-guide-generator", handleCancelStudyGuideGenerator as EventListener)
    window.addEventListener("generate-formula", handleFormulaGenerator as EventListener)
    window.addEventListener("cancel-formula-generator", handleCancelFormulaGenerator as EventListener)
    window.addEventListener("view-chatbot-with-message", handleChatbotViewWithMessage as EventListener)

    return () => {
      window.removeEventListener("course-changed", handleCourseChange as EventListener)
      window.removeEventListener("create-course", handleCreateCourse as EventListener)
      window.removeEventListener("cancel-create-course", handleCancelCreateCourse as EventListener)
      window.removeEventListener("view-learning-plan", handleLearningPlanView as EventListener)
      window.removeEventListener("cancel-learning-plan", handleCancelLearningPlan as EventListener)
      window.removeEventListener("generate-flashcards", handleFlashcardGenerator as EventListener)
      window.removeEventListener("cancel-flashcard-generator", handleCancelFlashcardGenerator as EventListener)
      window.removeEventListener("generate-quiz", handleQuizGenerator as EventListener)
      window.removeEventListener("cancel-quiz-generator", handleCancelQuizGenerator as EventListener)
      window.removeEventListener("view-profile", handleProfileView as EventListener)
      window.removeEventListener("cancel-profile-view", handleCancelProfileView as EventListener)
      window.removeEventListener("refresh-and-select-course", handleRefreshAndSelectCourse as EventListener)
      window.removeEventListener("refresh-courses", handleRefreshCourses as EventListener)
      window.removeEventListener("view-chatbot", handleChatbotView as EventListener)
      window.removeEventListener("cancel-chatbot", handleCancelChatbot as EventListener)
      window.removeEventListener("generate-study-guide", handleStudyGuideGenerator as EventListener)
      window.removeEventListener("cancel-study-guide-generator", handleCancelStudyGuideGenerator as EventListener)
      window.removeEventListener("generate-formula", handleFormulaGenerator as EventListener)
      window.removeEventListener("cancel-formula-generator", handleCancelFormulaGenerator as EventListener)
      window.removeEventListener("view-chatbot-with-message", handleChatbotViewWithMessage as EventListener)
    }
  }, [courses])

  // Update the handleLearningPlan function
  const handleLearningPlan = () => {
    console.log("Learning Plan clicked")
    // Store the active course ID in localStorage before navigating
    if (activeCourseId) {
      localStorage.setItem("activeCourseId", activeCourseId.toString())
    }
    window.dispatchEvent(new CustomEvent("view-learning-plan"))
  }

  const handleUpload = async (type: string) => {
    if (!fileInputRef.current) return

    setUploadType(type)

    // Set the accept attribute based on file type
    fileInputRef.current.accept =
      type === "Lecture Videos" ? "video/*" : type === "Syllabus" ? ".pdf,.doc,.docx" : ".pdf,.doc,.docx,.txt"

    // Clear the value to ensure change event fires even if selecting the same file
    fileInputRef.current.value = ""

    // Set up the onchange handler before clicking
    fileInputRef.current.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]

      // If no file was selected (user canceled), clear the upload state
      if (!file) {
        setUploadType(null)
        return
      }

      try {
        // Create form data
        const formData = new FormData()
        formData.append("file", file)
        formData.append("fileType", type)
        formData.append("courseId", activeCourseId?.toString() || "1") // Replace with the actual course ID

        // Upload file
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const result = await response.json()
        console.log("Upload successful:", result)

        setUploadType(null)
        alert(`${type} uploaded successfully!`)
      } catch (error) {
        console.error("Error uploading file:", error)
        setUploadType(null)
        alert(`Error uploading ${type}. Please try again.`)
      }
    }

    // Trigger file picker
    fileInputRef.current.click()
  }

  // Add this condition before the isCreatingCourse check
  if (isViewingProfile) {
    return <ProfileView />
  }

  // If we're creating a course, show the full-screen create course component
  if (isCreatingCourse) {
    return <CreateCourseScreen />
  }

  // Add this condition at the beginning of the return statement, after the isCreatingCourse check
  if (isViewingLearningPlan) {
    return <LearningPlan />
  }

  // Add this condition before the return statement, after the isViewingLearningPlan check
  if (isGeneratingFlashcards) {
    return <FlashcardGenerator />
  }

  // Add this condition before the return statement, after the isGeneratingFlashcards check
  if (isGeneratingQuiz) {
    return <QuizGenerator />
  }

  // Add this condition before the return statement, after the isGeneratingQuiz check
  if (isViewingChatbot) {
    return <Chatbot />
  }

  if (isGeneratingStudyGuide) {
    return <StudyGuideGenerator />
  }

  if (isGeneratingFormula) {
    return <FormulaGenerator />
  }

  if (isLoadingCourses) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] transition-colors duration-200">
        <div className="w-12 h-12 border-4 border-[#8a2432] dark:border-purple-600 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (courseError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] transition-colors duration-200">
        <div className="text-lg text-red-600 dark:text-red-400">{courseError}</div>
      </div>
    )
  }

  if (!activeCourse) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] transition-colors duration-200">
        <p className="text-lg text-gray-500 dark:text-gray-400">Select a course to view its content</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto transition-colors duration-200">
      <h1 className="text-4xl font-bold mb-4">{activeCourse.name}</h1>
      <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">{activeCourse.description}</p>

      {/* Learning Plan and Chatbot Buttons */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={handleLearningPlan}
          className="flex items-center gap-2 px-6 py-3 bg-[#8a2432] dark:bg-purple-800 text-white rounded-lg font-medium text-lg shadow-md hover:bg-[#732232] dark:hover:bg-purple-700 transition-colors focus:ring-2 focus:ring-[#8a2432] dark:focus:ring-purple-700 focus:ring-opacity-50 focus:outline-none group"
        >
          <Route className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span>Learning Plan</span>
          <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("view-chatbot"))}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-medium text-lg shadow-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:outline-none group"
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>Chatbot</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-10">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-2 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="grid w-full gap-2 grid-cols-3">
            <button
              disabled
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 opacity-70 cursor-not-allowed relative overflow-hidden"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Learn</span>
              <span className="absolute top-0 right-0 bg-gray-700/80 text-white text-xs px-2 py-1 rounded-bl-md">
                Coming Soon
              </span>
            </button>
            <button
              onClick={() => setActiveTab("practice")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                activeTab === "practice"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <PenTool className="w-5 h-5" />
              <span className="font-medium">Practice</span>
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                activeTab === "review"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <BookOpenCheck className="w-5 h-5" />
              <span className="font-medium">Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {/* ... */}

      {/* Tab Content */}
      <div className="mb-12">
        {/* Learn Tab Content */}
        {activeTab === "learn" && (
          <div className="space-y-10">
            <h2 className="text-2xl font-bold text-blue-700">Learning Resources</h2>

            {/* Course Content Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-600 border-b border-blue-200 pb-2">Course Content</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Interactive Course */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Interactive Course</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">AI-generated lessons</p>
                  </div>
                </div>

                {/* Video Lectures */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <FileVideo className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Video Lectures</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Watch course videos</p>
                  </div>
                </div>

                {/* Course Outline */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Course Outline</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">View curriculum</p>
                  </div>
                </div>

                {/* Lecture Slides */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Presentation className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Lecture Slides</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Presentation materials</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Learning Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-600 border-b border-blue-200 pb-2">
                Interactive Learning
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* AI Tutor */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">AI Tutor</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">1-on-1 assistance</p>
                  </div>
                </div>

                {/* Concept Maps */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Concept Maps</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Visual learning aids</p>
                  </div>
                </div>

                {/* Discussion Forum */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Discussion Forum</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Engage with peers</p>
                  </div>
                </div>

                {/* Interactive Simulations */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Simulations</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Interactive demos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reference Materials Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-600 border-b border-blue-200 pb-2">Reference Materials</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Textbooks */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Textbooks</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Course readings</p>
                  </div>
                </div>

                {/* Glossary */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <BookText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Glossary</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Key terms & definitions</p>
                  </div>
                </div>

                {/* Research Papers */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Research Papers</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Academic articles</p>
                  </div>
                </div>

                {/* Formula Reference */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Sigma className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Formula Reference</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Key equations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Resources Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-blue-600 border-b border-blue-200 pb-2">
                Additional Resources
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* External Resources */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">External Resources</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Helpful websites</p>
                  </div>
                </div>

                {/* Audio Lectures */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Headphones className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Audio Lectures</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Podcast-style learning</p>
                  </div>
                </div>

                {/* Case Studies */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Case Studies</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Real-world examples</p>
                  </div>
                </div>

                {/* Recommended Reading */}
                <div className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-pointer">
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-blue-100 rounded-full p-3 mb-2">
                      <Bookmark className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Recommended Reading</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Supplementary texts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Practice Tab Content */}
        {activeTab === "practice" && (
          <div className="space-y-10">
            <h2 className="text-2xl font-bold text-emerald-700">Practice Activities</h2>

            {/* Quizzes & Assessments Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-600 border-b border-emerald-200 pb-2">
                Quizzes & Assessments
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Practice Quiz */}
                <div
                  className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-emerald-300 cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent("generate-quiz"))}
                >
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-emerald-100 rounded-full p-3 mb-2">
                      <FileQuestion className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Practice Quiz</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Test your knowledge</p>
                  </div>
                </div>

                {/* Generate Flash Cards */}
                <div
                  className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-emerald-300 cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent("generate-flashcards"))}
                >
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-emerald-100 rounded-full p-3 mb-2">
                      <FlaskConical className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Generate Cards</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Create AI flashcards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Tab Content */}
        {activeTab === "review" && (
          <div className="space-y-10">
            <h2 className="text-2xl font-bold text-purple-700">Review Tools</h2>

            {/* Study Guide Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-purple-600 border-b border-purple-200 pb-2">Study Guides</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Generate Study Guide */}
                <div
                  className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-purple-300 cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent("generate-study-guide"))}
                >
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-purple-100 rounded-full p-3 mb-2">
                      <BookText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Create Guide</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Generate study guide</p>
                  </div>
                </div>

                {/* Generate Formula Sheet */}
                <div
                  className="aspect-square bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-purple-300 cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent("generate-formula"))}
                >
                  <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="bg-purple-100 rounded-full p-3 mb-2">
                      <Sigma className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium mb-1">Generate Formulas</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Create formula sheet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Course Files Section */}
      <div className="mt-12 mb-12 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center mb-6">
          <Upload className="w-6 h-6 text-[#8a2432] mr-2" />
          <h3 className="text-xl font-semibold">Add Course Files</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Syllabus */}
          <button
            onClick={() => handleUpload("Syllabus")}
            className={`relative aspect-square flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all hover:border-red-300 ${uploadType === "Syllabus" ? "bg-gray-50 border-red-300" : ""}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium">Syllabus</span>
            <span className="text-xs text-gray-500 mt-1">Click to upload</span>
            {uploadType === "Syllabus" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="w-6 h-6 border-2 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {/* PDF Notes */}
          <button
            onClick={() => handleUpload("PDF Notes")}
            className={`relative aspect-square flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all hover:border-purple-300 ${uploadType === "PDF Notes" ? "bg-gray-50 border-purple-300" : ""}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
              <PenLine className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium">PDF Notes</span>
            <span className="text-xs text-gray-500 mt-1">Click to upload</span>
            {uploadType === "PDF Notes" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="w-6 h-6 border-2 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {/* Slides */}
          <button
            onClick={() => handleUpload("Slides")}
            className={`relative aspect-square flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all hover:border-amber-300 ${uploadType === "Slides" ? "bg-gray-50 border-amber-300" : ""}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium">Slides</span>
            <span className="text-xs text-gray-500 mt-1">Click to upload</span>
            {uploadType === "Slides" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="w-6 h-6 border-2 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {/* Lecture Transcripts */}
          <button
            onClick={() => handleUpload("Lecture Transcripts")}
            className={`relative aspect-square flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all hover:border-green-300 ${uploadType === "Lecture Transcripts" ? "bg-gray-50 border-green-300" : ""}`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium">Lecture Transcripts</span>
            <span className="text-xs text-gray-500 mt-1">Click to upload</span>
            {uploadType === "Lecture Transcripts" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="w-6 h-6 border-2 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {/* Lecture Videos */}
          <button
            disabled
            className="relative aspect-square flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg bg-gray-100 opacity-70 cursor-not-allowed"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium">Lecture Videos</span>
            <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  )
}
