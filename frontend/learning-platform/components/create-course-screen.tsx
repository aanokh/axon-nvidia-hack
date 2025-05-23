"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Upload,
  Video,
  FileText,
  BookMarked,
  PenLine,
  FileSpreadsheet,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Lightbulb,
  Code,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type ProcessStep = {
  id: string
  label: string
}

export function CreateCourseScreen() {
  const [courseType, setCourseType] = useState<"academic" | "ai-generated">("academic")
  const [courseName, setCourseName] = useState("")
  const [uploadType, setUploadType] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [syllabusUploaded, setSyllabusUploaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queuedFiles, setQueuedFiles] = useState<
    {
      file: File
      type: string
    }[]
  >([])

  // Progress tracking states
  const [showProgress, setShowProgress] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Create a reusable file input ref to avoid recreating it on each upload
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Create a file input element once
  useEffect(() => {
    const input = document.createElement("input")
    input.type = "file"
    fileInputRef.current = input

    // Clean up function to remove the input when component unmounts
    return () => {
      fileInputRef.current = null
    }
  }, [])

  const handleUpload = (type: string) => {
    if (!fileInputRef.current) return

    setUploadType(type)

    // Set the accept attribute based on file type
    fileInputRef.current.accept =
      type === "Lecture Videos" ? "video/*" : type === "Syllabus" ? ".pdf,.doc,.docx" : ".pdf,.doc,.docx,.txt"

    // Clear the value to ensure change event fires even if selecting the same file
    fileInputRef.current.value = ""

    // Set up the onchange handler before clicking
    fileInputRef.current.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]

      // If no file was selected (user canceled), clear the upload state
      if (!file) {
        setUploadType(null)
        return
      }

      // Queue the file instead of uploading immediately
      setQueuedFiles((prev) => [...prev, { file, type }])

      // Mark syllabus as uploaded if that's what was selected
      if (type === "Syllabus") {
        setSyllabusUploaded(true)
      }

      setUploadType(null)
    }

    // Trigger file picker
    fileInputRef.current.click()
  }

  // Define the process steps
  const getProcessSteps = (): ProcessStep[] => {
    const steps: ProcessStep[] = [{ id: "create", label: "Creating course" }]

    // Add upload steps for each file type
    queuedFiles.forEach((file, index) => {
      steps.push({ id: `upload-${index}`, label: `Uploading ${file.type}` })
    })

    // Add new steps for topic extraction and learning plan generation
    steps.push({ id: "extract-topics", label: "Extracting topics" })
    steps.push({ id: "generate-plan", label: "Generating learning plan" })

    // Add final step
    steps.push({ id: "finish", label: "Finishing setup" })

    return steps
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!courseName) {
      alert("Please enter a course name")
      return
    }

    if (courseType === "academic" && !syllabusUploaded) {
      alert("Please upload a syllabus for your academic course")
      return
    }

    if (courseType === "ai-generated") {
      alert("AI-generated courses are not currently available. Please select Academic Course instead.")
      return
    }

    // Start the submission process
    setIsSubmitting(true)
    setShowProgress(true)
    setProgressValue(0)
    setCurrentStepIndex(0)

    const steps = getProcessSteps()

    try {
      // Step 1: Create course
      updateProgress(0, steps.length)

      // Call the API to create a new course
      const response = await fetch("/api/courses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: courseName,
          description: "", // We could add a description field to the form
          isAiGenerated: false, // Force to false for now
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create course")
      }

      const data = await response.json()

      if (data.success) {
        const newCourseId = data.course.id.toString()

        // Step 2+: Upload any queued files with the new course ID
        if (queuedFiles.length > 0) {
          for (let i = 0; i < queuedFiles.length; i++) {
            const queuedFile = queuedFiles[i]
            updateProgress(i + 1, steps.length)

            try {
              // Create form data
              const formData = new FormData()
              formData.append("file", queuedFile.file)
              formData.append("fileType", queuedFile.type)
              formData.append("courseId", newCourseId)

              // Upload file
              const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              })

              if (!uploadResponse.ok) {
                console.error(`Failed to upload ${queuedFile.type}`)
              }

              // Add a small delay for visual feedback
              await new Promise((resolve) => setTimeout(resolve, 500))
            } catch (error) {
              console.error(`Error uploading ${queuedFile.type}:`, error)
            }
          }
        }

        // Topic extraction step
        updateProgress(steps.length - 3, steps.length)
        await new Promise((resolve) => setTimeout(resolve, 800))

        // Learning plan generation step
        updateProgress(steps.length - 2, steps.length)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Final step - update progress to 100%
        updateProgress(steps.length - 1, steps.length)

        // Wait a moment before closing
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Store the course data for immediate use
        window.dispatchEvent(
          new CustomEvent("course-created", {
            detail: {
              course: data.course,
              shouldSelect: true,
            },
          }),
        )

        // Refresh courses list
        window.dispatchEvent(new CustomEvent("refresh-courses"))

        // Return to main view
        window.dispatchEvent(new CustomEvent("cancel-create-course"))
      } else {
        throw new Error(data.error || "Failed to create course")
      }
    } catch (error) {
      console.error("Error creating course:", error)
      setCurrentStepIndex(-1) // Error state
    } finally {
      setIsSubmitting(false)
      if (currentStepIndex === -1) {
        // Only close on error after a delay
        setTimeout(() => setShowProgress(false), 3000)
      }
    }
  }

  // Update progress bar and current step
  const updateProgress = (index: number, total: number) => {
    setCurrentStepIndex(index)
    const percent = Math.round(((index + 1) / total) * 100)
    setProgressValue(percent)
  }

  const handleCancel = () => {
    window.dispatchEvent(new CustomEvent("cancel-create-course"))
  }

  const setExamplePrompt = (prompt: string) => {
    setAiPrompt(prompt)
  }

  // Get the current step label
  const steps = getProcessSteps()
  const currentStepLabel =
    currentStepIndex >= 0 && currentStepIndex < steps.length ? steps[currentStepIndex].label : "Error creating course"

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <header className="bg-[#8a2432] text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <button
            onClick={handleCancel}
            className="flex items-center hover:bg-white/10 p-2 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="text-lg">Back</span>
          </button>
          <h1 className="text-3xl font-bold">Create New Course</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {/* Progress Modal */}
        {showProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full">
              <h3 className="text-2xl font-bold mb-4">Creating Your Course</h3>
              <p className="text-gray-600 mb-4">Please wait while we set up your course...</p>

              <div className="mb-6">
                <Progress value={progressValue} className="h-2 w-full bg-gray-200" />
                <p className="mt-2 text-lg font-medium">{currentStepLabel}</p>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full mr-2 ${index === currentStepIndex ? "bg-[#8a2432]" : "bg-gray-200"}`}
                      ></div>
                    )}
                    <span className={`${index < currentStepIndex ? "text-gray-500" : "text-gray-700"}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                This process may take a few moments. Please don't close this page.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Course Type Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-8 text-center">Select Course Type</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button
                type="button"
                onClick={() => setCourseType("academic")}
                className={`relative overflow-hidden h-64 rounded-xl border-4 transition-all duration-300 flex flex-col items-center justify-center p-8 ${
                  courseType === "academic"
                    ? "border-[#8a2432] shadow-xl scale-105 bg-white"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                {courseType === "academic" && (
                  <div className="absolute top-0 right-0 bg-[#8a2432] text-white px-4 py-2 rounded-bl-lg">Selected</div>
                )}
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <BookOpen className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Academic Course</h3>
                <p className="text-center text-gray-600">
                  Create a traditional course with your own materials and structure
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCourseType("academic")} // Force academic selection
                className={`relative overflow-hidden h-64 rounded-xl border-4 transition-all duration-300 flex flex-col items-center justify-center p-8 ${
                  courseType === "ai-generated"
                    ? "border-[#8a2432] shadow-xl scale-105 bg-white"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                {courseType === "ai-generated" && (
                  <div className="absolute top-0 right-0 bg-[#8a2432] text-white px-4 py-2 rounded-bl-lg">Selected</div>
                )}
                {/* Coming Soon Banner */}
                <div className="absolute top-0 left-0 w-full bg-gray-700/80 text-white px-4 py-2 flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="font-bold">Coming Soon</span>
                </div>
                <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">AI-Generated Course</h3>
                <p className="text-center text-gray-600">Let our AI create a course based on your specifications</p>
                <p className="mt-2 text-sm text-amber-600 font-medium">This feature is not yet available</p>
              </button>
            </div>
          </div>

          {/* Course Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Course Details</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="courseName" className="block text-lg font-medium text-gray-700 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#8a2432] focus:border-transparent"
                  placeholder="e.g. Introduction to Programming"
                  required
                />
              </div>
            </div>
          </div>

          {/* AI Course Prompt (only for AI-generated courses) */}
          {courseType === "ai-generated" && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm relative">
              {/* Overlay to disable the section */}
              <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-10 rounded-xl">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                  <p className="text-gray-600 mb-4">
                    AI-generated courses are currently in development and will be available soon. Please use Academic
                    Course for now.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold">AI Course Generation</h2>
              </div>

              <div className="space-y-6">
                <p className="text-lg text-gray-600">
                  Describe the course you want to create in detail. Include the target audience, learning objectives,
                  key topics to cover, and any specific teaching approaches you prefer.
                </p>

                <textarea
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#8a2432] focus:border-transparent"
                  placeholder="e.g. Create a beginner-friendly Python programming course for high school students. Cover basic syntax, control structures, functions, and simple data structures. Include interactive exercises and real-world examples."
                  rows={6}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  required
                />

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-purple-800 mb-3">Tips for effective prompts:</h3>
                  <ul className="text-purple-700 list-disc pl-6 space-y-2">
                    <li>Be specific about the target audience and their prior knowledge</li>
                    <li>List key topics you want to be covered</li>
                    <li>Mention any specific teaching approaches or examples you prefer</li>
                    <li>Include the desired difficulty level and learning outcomes</li>
                  </ul>
                </div>

                {/* Example Prompts */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Example Prompts:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExamplePrompt(
                          "Create a comprehensive introduction to machine learning for undergraduate computer science students. Cover supervised and unsupervised learning, neural networks, and practical applications. Include Python code examples using scikit-learn and TensorFlow.",
                        )
                      }
                      className="p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Machine Learning Course</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        A comprehensive introduction to machine learning for undergraduate computer science students...
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExamplePrompt(
                          "Design a creative writing course for high school students. Focus on short story writing, character development, plot structure, and descriptive language. Include writing prompts, peer review activities, and examples from contemporary literature.",
                        )
                      }
                      className="p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Creative Writing Course</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        A creative writing course for high school students focusing on short story writing...
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExamplePrompt(
                          "Create an introductory course on environmental science for middle school students. Cover ecosystems, climate change, conservation, and sustainable practices. Include interactive activities, virtual field trips, and age-appropriate assessments.",
                        )
                      }
                      className="p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Environmental Science</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        An introductory course on environmental science for middle school students...
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExamplePrompt(
                          "Develop a comprehensive calculus course for first-year college students. Cover limits, derivatives, integrals, and applications. Include step-by-step explanations, practice problems with solutions, and real-world examples from physics and engineering.",
                        )
                      }
                      className="p-4 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">College Calculus</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        A comprehensive calculus course for first-year college students...
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center mb-4">
              <Upload className="w-6 h-6 text-[#8a2432] mr-3" />
              <h2 className="text-2xl font-bold">Add Course Files</h2>
            </div>

            {/* Requirement notice */}
            <div
              className={`mb-6 p-4 rounded-lg ${courseType === "academic" ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}
            >
              <p className={`text-lg ${courseType === "academic" ? "text-red-700" : "text-gray-600"}`}>
                {courseType === "academic" ? (
                  <span className="font-medium">Required: Please upload a syllabus for your academic course.</span>
                ) : (
                  "File uploads are optional for AI-generated courses but can enhance the learning experience."
                )}
              </p>
            </div>

            {/* Display queued files */}
            {queuedFiles.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Files queued for upload:</h3>
                <ul className="list-disc pl-5 text-green-700">
                  {queuedFiles.map((queuedFile, index) => (
                    <li key={index}>
                      {queuedFile.type}: {queuedFile.file.name} ({Math.round(queuedFile.file.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-green-600">These files will be uploaded when you create the course.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {/* Syllabus */}
              <button
                type="button"
                onClick={() => handleUpload("Syllabus")}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl hover:bg-gray-50 transition-colors ${
                  syllabusUploaded
                    ? "border-green-500 bg-green-50"
                    : courseType === "academic"
                      ? "border-red-300"
                      : "border-gray-200"
                } ${uploadType === "Syllabus" ? "bg-gray-100" : ""}`}
              >
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-red-600" />
                </div>
                <span className="text-lg font-medium">Syllabus</span>
                {syllabusUploaded && <span className="mt-2 text-sm text-green-600">✓ Queued</span>}
                {courseType === "academic" && !syllabusUploaded && (
                  <span className="mt-2 text-sm text-red-600">Required</span>
                )}
                {uploadType === "Syllabus" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                    <div className="w-8 h-8 border-3 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* PDF Notes */}
              <button
                type="button"
                onClick={() => handleUpload("PDF Notes")}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl hover:bg-gray-50 transition-colors ${
                  queuedFiles.some((f) => f.type === "PDF Notes") ? "border-green-500 bg-green-50" : "border-gray-200"
                } ${uploadType === "PDF Notes" ? "bg-gray-100" : ""}`}
              >
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <PenLine className="w-8 h-8 text-purple-600" />
                </div>
                <span className="text-lg font-medium">PDF Notes</span>
                {queuedFiles.some((f) => f.type === "PDF Notes") && (
                  <span className="mt-2 text-sm text-green-600">✓ Queued</span>
                )}
                {uploadType === "PDF Notes" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                    <div className="w-8 h-8 border-3 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* Slides */}
              <button
                type="button"
                onClick={() => handleUpload("Slides")}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl hover:bg-gray-50 transition-colors ${
                  queuedFiles.some((f) => f.type === "Slides") ? "border-green-500 bg-green-50" : "border-gray-200"
                } ${uploadType === "Slides" ? "bg-gray-100" : ""}`}
              >
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <BookMarked className="w-8 h-8 text-amber-600" />
                </div>
                <span className="text-lg font-medium">Slides</span>
                {queuedFiles.some((f) => f.type === "Slides") && (
                  <span className="mt-2 text-sm text-green-600">✓ Queued</span>
                )}
                {uploadType === "Slides" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                    <div className="w-8 h-8 border-3 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* Lecture Transcripts */}
              <button
                type="button"
                onClick={() => handleUpload("Lecture Transcripts")}
                className={`relative flex flex-col items-center p-6 border-2 rounded-xl hover:bg-gray-50 transition-colors ${
                  queuedFiles.some((f) => f.type === "Lecture Transcripts")
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                } ${uploadType === "Lecture Transcripts" ? "bg-gray-100" : ""}`}
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <span className="text-lg font-medium">Lecture Transcripts</span>
                {queuedFiles.some((f) => f.type === "Lecture Transcripts") && (
                  <span className="mt-2 text-sm text-green-600">✓ Queued</span>
                )}
                {uploadType === "Lecture Transcripts" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                    <div className="w-8 h-8 border-3 border-[#8a2432] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>

              {/* Lecture Videos */}
              <button
                type="button"
                disabled
                className="relative flex flex-col items-center p-6 border-2 rounded-xl border-gray-200 bg-gray-100 opacity-70 cursor-not-allowed"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-blue-600" />
                </div>
                <span className="text-lg font-medium">Lecture Videos</span>
                <span className="mt-2 text-xs text-gray-500">Coming Soon</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#8a2432] text-white rounded-lg px-8 py-4 text-xl font-semibold hover:bg-[#732232] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Course..." : "Create Course"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
