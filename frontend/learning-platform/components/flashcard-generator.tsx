"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, BookOpen, FileText, Sparkles, CheckCircle2, Circle, Info, Lightbulb, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FlashcardViewer, type Flashcard } from "./flashcard-viewer"

// Types for course data
type Topic = {
  topic_name: string
  topic_content: string
}

type CourseData = {
  course_name: string
  course_description: string
  topics: Topic[]
  tests: Array<{
    test_date: string
    covered_topic_names: string[]
  }>
  additional_info: string
}

// Topic card colors for the learning path (same gradient as in learning-plan.tsx)
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

// Flashcard generation templates
const flashcardTemplates = [
  {
    name: "Key Concepts",
    description: "Generate flashcards covering the main concepts and definitions",
    prompt: "Create flashcards for key concepts and definitions",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    name: "Formulas & Equations",
    description: "Generate flashcards focusing on important formulas and equations",
    prompt: "Create flashcards for essential formulas and equations with explanations",
    icon: <FileText className="h-5 w-5" />,
  },
]

export function FlashcardGenerator() {
  // State for course data
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for selected topics
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  // State for custom prompt
  const [customPrompt, setCustomPrompt] = useState("")

  // State for selected template
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

  // State for loading
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  // State for generated flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null)

  // State for course ID
  const [courseId, setCourseId] = useState<string>("")

  // Fetch course data from API
  useEffect(() => {
    async function fetchCourseData() {
      try {
        // Get the active course ID from the URL or localStorage
        // This is the same approach used in the learning plan component
        const urlParams = new URLSearchParams(window.location.search)
        const courseId = urlParams.get("courseId") || localStorage.getItem("activeCourseId") || "1"

        setCourseId(courseId)

        const response = await fetch(`/api/learning-plan/${courseId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch course data")
        }

        const data = await response.json()
        setCourseData(data)
      } catch (err) {
        console.error("Error fetching course data:", err)
        setError("Failed to load course data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourseData()
  }, [])

  // Handle going back to main content
  const handleBack = () => {
    // In a real app, this would navigate back or change the view
    window.dispatchEvent(new CustomEvent("cancel-flashcard-generator"))
  }

  // Toggle topic selection
  const toggleTopic = (topicName: string) => {
    if (selectedTopics.includes(topicName)) {
      setSelectedTopics(selectedTopics.filter((name) => name !== topicName))
    } else {
      setSelectedTopics([...selectedTopics, topicName])
    }
  }

  // Select all topics
  const selectAllTopics = () => {
    if (courseData) {
      setSelectedTopics(courseData.topics.map((topic) => topic.topic_name))
    }
  }

  // Clear all selected topics
  const clearSelectedTopics = () => {
    setSelectedTopics([])
  }

  // Select a template
  const selectTemplate = (index: number) => {
    setSelectedTemplate(index)
    setCustomPrompt(flashcardTemplates[index].prompt)
  }

  // Handle generate button click
  const handleGenerate = async () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic")
      return
    }

    if (!customPrompt.trim()) {
      alert("Please enter a prompt for flashcard generation")
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      // Call the API to generate flashcards
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          topics: selectedTopics,
          prompt: customPrompt,
        }),
      })

      clearInterval(progressInterval)
      setGenerationProgress(100)

      if (!response.ok) {
        throw new Error("Failed to generate flashcards")
      }

      const data = await response.json()

      if (data.success) {
        // Short delay to show 100% before displaying results
        setTimeout(() => {
          setFlashcards(data.flashcards)
          setIsGenerating(false)
        }, 500)
      } else {
        throw new Error(data.error || "Failed to generate flashcards")
      }
    } catch (error) {
      console.error("Error generating flashcards:", error)
      alert("Error generating flashcards. Please try again.")
      setIsGenerating(false)
    }
  }

  // Get topic color based on index
  const getTopicColor = (index: number) => {
    return topicColors[index % topicColors.length]
  }

  // Handle back from flashcard viewer
  const handleBackFromViewer = () => {
    setFlashcards(null)
  }

  // If flashcards have been generated, show the flashcard viewer
  if (flashcards) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800 text-white py-6 shadow-md mb-8 transition-colors duration-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackFromViewer}
              className="mr-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold">Flashcards</h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Course Info Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6 relative overflow-hidden transition-colors duration-200">
            {/* Decorative element */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800"></div>

            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-[#8a2432] dark:text-purple-400 mr-2" />
              <h2 className="text-xl font-bold dark:text-white">{courseData?.course_name || "Course"}</h2>
            </div>
          </div>

          {/* Flashcard Viewer */}
          <FlashcardViewer flashcards={flashcards} onBack={handleBackFromViewer} courseId={courseId} />
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="w-16 h-16 border-4 border-[#8a2432] dark:border-purple-600 border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Show error state
  if (error || !courseData) {
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
          <h1 className="text-3xl font-bold">Generate Flashcards</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Course Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 relative overflow-hidden transition-colors duration-200">
          {/* Decorative element */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800"></div>

          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-[#8a2432] dark:text-purple-400 mr-3" />
            <h2 className="text-2xl font-bold dark:text-white">{courseData.course_name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Topic Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center dark:text-white">
                  <Layers className="h-5 w-5 text-[#8a2432] dark:text-purple-400 mr-2" />
                  Select Topics
                </h2>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={selectAllTopics} className="whitespace-nowrap">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelectedTopics} className="whitespace-nowrap">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {courseData.topics.map((topic, index) => {
                  const colors = getTopicColor(index)
                  const isSelected = selectedTopics.includes(topic.topic_name)

                  return (
                    <div
                      key={index}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? `${colors.bg} dark:bg-gray-700 ${colors.border} dark:border-gray-600 border`
                          : "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => toggleTopic(topic.topic_name)}
                    >
                      <div className="mr-3">
                        {isSelected ? (
                          <CheckCircle2 className={`h-5 w-5 ${colors.text} dark:text-gray-300`} />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${isSelected ? colors.text : "text-gray-700"} dark:text-gray-300`}>
                          {topic.topic_name}
                        </h3>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Select one or more topics to generate flashcards. The more specific your selection, the more focused
                    your flashcards will be.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Prompt and Generation */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
              <h2 className="text-xl font-bold flex items-center mb-4 dark:text-white">
                <Sparkles className="h-5 w-5 text-[#8a2432] dark:text-purple-400 mr-2" />
                Flashcard Generation
              </h2>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Choose a Template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {flashcardTemplates.map((template, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedTemplate === index
                          ? "border-[#8a2432] dark:border-purple-600 bg-red-50 dark:bg-purple-900/30 ring-1 ring-[#8a2432] dark:ring-purple-600"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => selectTemplate(index)}
                    >
                      <div className="flex items-center mb-2">
                        <div
                          className={`p-1 rounded-md ${
                            selectedTemplate === index
                              ? "bg-[#8a2432] dark:bg-purple-800 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {template.icon}
                        </div>
                        <h3
                          className={`ml-2 font-medium ${
                            selectedTemplate === index
                              ? "text-[#8a2432] dark:text-purple-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {template.name}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="mb-6">
                <label
                  htmlFor="custom-prompt"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Custom Prompt
                </label>
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe what kind of flashcards you want to generate..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-[#8a2432] dark:focus:ring-purple-600 focus:border-[#8a2432] dark:focus:border-purple-600 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium">Topics:</span>{" "}
                    {selectedTopics.length > 0 ? selectedTopics.join(", ") : "No topics selected"}
                  </p>
                  <p>
                    <span className="font-medium">Template:</span>{" "}
                    {selectedTemplate !== null ? flashcardTemplates[selectedTemplate].name : "Custom"}
                  </p>
                  <p>
                    <span className="font-medium">Estimated cards:</span>{" "}
                    {selectedTopics.length > 0 ? selectedTopics.length * 5 + " - " + selectedTopics.length * 10 : "0"}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col">
                {isGenerating ? (
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Generating flashcards...
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Math.round(generationProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-[#8a2432] dark:bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {generationProgress < 20 && "Analyzing selected topics..."}
                      {generationProgress >= 20 && generationProgress < 40 && "Extracting key concepts..."}
                      {generationProgress >= 40 && generationProgress < 60 && "Creating question-answer pairs..."}
                      {generationProgress >= 60 && generationProgress < 80 && "Formatting flashcards..."}
                      {generationProgress >= 80 && "Finalizing your flashcard deck..."}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={selectedTopics.length === 0 || !customPrompt.trim()}
                    className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 self-end"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Generate Flashcards</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

