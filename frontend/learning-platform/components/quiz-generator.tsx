"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Sparkles,
  CheckCircle2,
  Circle,
  Info,
  Lightbulb,
  Layers,
  X,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"
import { Chatbot } from "./chatbot"

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

// Quiz generation templates
const quizTemplates = [
  {
    name: "Basic Concepts",
    description: "Generate quiz questions covering the main concepts and definitions",
    prompt: "Create quiz questions for key concepts and definitions",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    name: "Applied Knowledge",
    description: "Generate quiz questions focusing on practical applications",
    prompt: "Create quiz questions for practical applications and real-world scenarios",
    icon: <FileText className="h-5 w-5" />,
  },
]

// Updated type for the new schema
type QuizQuestion = {
  question: string
  correctOption: string
  wrongOptionOne: string
  wrongSuggestionOne: string
  wrongOptionTwo: string
  wrongSuggestionTwo: string
  wrongOptionThree: string
  wrongSuggestionThree: string
}

// Internal type for shuffled questions
type ShuffledQuizQuestion = {
  id: string
  question: string
  options: {
    text: string
    feedback: string
    isCorrect: boolean
  }[]
  correctOptionIndex: number
}

export function QuizGenerator() {
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

  // State for generated quiz (using shuffled format internally)
  const [quizQuestions, setQuizQuestions] = useState<ShuffledQuizQuestion[] | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [showFeedback, setShowFeedback] = useState<string | null>(null)
  const [showingResults, setShowingResults] = useState(false)

  // State for course ID
  const [courseId, setCourseId] = useState<string>("")

  // Add this after the other state declarations
  const [isShowingChatbot, setIsShowingChatbot] = useState(false)

  // Function to shuffle options and create internal format
  const shuffleQuestionOptions = (question: QuizQuestion, questionIndex: number): ShuffledQuizQuestion => {
    const options = [
      { text: question.correctOption, feedback: "", isCorrect: true },
      { text: question.wrongOptionOne, feedback: question.wrongSuggestionOne, isCorrect: false },
      { text: question.wrongOptionTwo, feedback: question.wrongSuggestionTwo, isCorrect: false },
      { text: question.wrongOptionThree, feedback: question.wrongSuggestionThree, isCorrect: false },
    ]

    // Shuffle options using a deterministic approach based on question index
    const shuffled = [...options]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (questionIndex * 7 + i * 3) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Find the correct option index after shuffling
    const correctOptionIndex = shuffled.findIndex((option) => option.isCorrect)

    return {
      id: `q-${questionIndex + 1}`,
      question: question.question,
      options: shuffled,
      correctOptionIndex,
    }
  }

  // Fetch course data from API
  useEffect(() => {
    async function fetchCourseData() {
      try {
        // Get the active course ID from localStorage only
        const courseId = localStorage.getItem("activeCourseId") || "1"

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

      // Add this event listener inside the existing useEffect
      const handleChatbotView = () => setIsShowingChatbot(true)
      const handleChatbotCancel = () => setIsShowingChatbot(false)

      window.addEventListener("view-chatbot-with-message", handleChatbotView as EventListener)
      window.addEventListener("cancel-chatbot", handleChatbotCancel as EventListener)

      // Add cleanup in the return statement
      return () => {
        window.removeEventListener("view-chatbot-with-message", handleChatbotView as EventListener)
        window.removeEventListener("cancel-chatbot", handleChatbotCancel as EventListener)
      }
    }

    fetchCourseData()
  }, [])

  // Handle going back to main content
  const handleBack = () => {
    // In a real app, this would navigate back or change the view
    window.dispatchEvent(new CustomEvent("cancel-quiz-generator"))
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
    setCustomPrompt(quizTemplates[index].prompt)
  }

  // Handle generate button click
  const handleGenerate = async () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic")
      return
    }

    if (!customPrompt.trim()) {
      alert("Please enter a prompt for quiz generation")
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

      // Call the API to generate quiz
      const response = await fetch("/api/quiz/generate", {
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
        throw new Error("Failed to generate quiz")
      }

      const data = await response.json()

      if (data.success) {
        // Convert the new schema to internal format with shuffled options
        const shuffledQuestions = data.questions.map((q: QuizQuestion, index: number) =>
          shuffleQuestionOptions(q, index),
        )

        // Short delay to show 100% before displaying results
        setTimeout(() => {
          setQuizQuestions(shuffledQuestions)
          setCurrentQuestionIndex(0)
          setSelectedAnswers({})
          setShowFeedback(null)
          setShowingResults(false)
          setIsGenerating(false)
        }, 500)
      } else {
        throw new Error(data.error || "Failed to generate quiz")
      }
    } catch (error) {
      console.error("Error generating quiz:", error)
      alert("Error generating quiz. Please try again.")
      setIsGenerating(false)
    }
  }

  // Get topic color based on index
  const getTopicColor = (index: number) => {
    return topicColors[index % topicColors.length]
  }

  // Handle back from quiz
  const handleBackFromQuiz = () => {
    setQuizQuestions(null)
    setSelectedAnswers({})
    setShowFeedback(null)
    setShowingResults(false)
  }

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (selectedAnswers[questionId] !== undefined) return

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))

    const currentQuestion = quizQuestions![currentQuestionIndex]
    if (optionIndex !== currentQuestion.correctOptionIndex) {
      setShowFeedback(currentQuestion.options[optionIndex].feedback)
    } else {
      setShowFeedback(null)
    }
  }

  // Handle next question
  const handleNextQuestion = () => {
    if (!quizQuestions) return

    const currentQuestion = quizQuestions[currentQuestionIndex]
    const hasAnswered = selectedAnswers[currentQuestion.id] !== undefined

    // Allow moving forward regardless of answer
    if (hasAnswered) {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
        setShowFeedback(null)
      } else {
        setShowingResults(true)
      }
    }
  }

  // Handle previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      setShowFeedback(null)
    }
  }

  function normalizeLatex(input: string): string {
    if (typeof input !== "string") return input

    // Step 1: Convert escaped newlines to actual newlines
    let text = input.replace(/\\n/g, "\n")

    // Step 2: Normalize LaTeX delimiters
    text = text
      .replace(/\\$$(.+?)\\$$/gs, (_, inner) => `$${inner.trim()}$`)
      .replace(/\\\[(.+?)\\\]/gs, (_, inner) => `$$${inner.trim()}$$`)

    const lines = text.split("\n")
    const result = []

    let insideBlockMath = false
    let blockBuffer = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed === "$$") {
        if (insideBlockMath) {
          // Closing block
          result.push("$$")
          result.push(...blockBuffer.map((l) => l.trim()))
          result.push("$$")
          blockBuffer = []
          insideBlockMath = false
        } else {
          // Opening block
          insideBlockMath = true
          blockBuffer = []
        }
        continue
      }

      if (insideBlockMath) {
        blockBuffer.push(trimmed)
      } else {
        // Keep original line
        result.push(line)
      }
    }

    // In case block was never closed
    if (insideBlockMath && blockBuffer.length) {
      result.push("$$")
      result.push(...blockBuffer.map((l) => l.trim()))
      result.push("$$")
    }

    // Step 3: Join and clean up nested LaTeX
    const joined = result.join("\n")

    const sanitized = joined.replace(/\$\$([\s\S]*?)\$\$/g, (_, block) => {
      const cleanBlock = block.replace(/\$(.+?)\$/g, (_, inner) => inner)
      return `$$\n${cleanBlock.trim()}\n$$`
    })

    return sanitized
  }

  // If quiz has been generated, show the quiz interface
  if (quizQuestions) {
    // If chatbot is showing, render it on top
    if (isShowingChatbot) {
      return <Chatbot courseId={courseId} courseName={courseData?.course_name || "Course"} />
    }

    if (showingResults) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 transition-colors duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800 text-white py-6 shadow-md mb-8 transition-colors duration-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackFromQuiz}
                className="mr-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
              <h1 className="text-3xl font-bold">Quiz Complete</h1>
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

            {/* Quiz Complete */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Congratulations!</h2>
              <p className="text-lg mb-8 dark:text-gray-300">
                You have successfully completed the quiz on{" "}
                <span className="font-semibold">{selectedTopics.join(", ")}</span>
              </p>

              <Button
                onClick={handleBackFromQuiz}
                className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700 text-white px-8 py-2 rounded-lg"
              >
                Create New Quiz
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // Quiz taking interface
    const currentQuestion = quizQuestions[currentQuestionIndex]
    const hasAnswered = selectedAnswers[currentQuestion.id] !== undefined
    const isCorrect = hasAnswered && selectedAnswers[currentQuestion.id] === currentQuestion.correctOptionIndex

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8a2432] to-[#b02a3a] dark:from-purple-900 dark:to-purple-800 text-white py-6 shadow-md mb-8 transition-colors duration-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackFromQuiz}
              className="mr-4 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold">Practice Quiz</h1>
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

          {/* Question Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold dark:text-white">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                {normalizeLatex(currentQuestion.question)}
              </ReactMarkdown>
            </h2>
          </div>

          {/* Quiz Question */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </div>
            </div>

            <div className="mb-6">
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                    disabled={hasAnswered}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      hasAnswered && index === currentQuestion.correctOptionIndex
                        ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                        : hasAnswered && selectedAnswers[currentQuestion.id] === index
                          ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                          : hasAnswered
                            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">
                        {hasAnswered && index === currentQuestion.correctOptionIndex ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : hasAnswered && selectedAnswers[currentQuestion.id] === index ? (
                          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                        )}
                      </div>
                      <span className="dark:text-gray-200">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                          {normalizeLatex(option.text)}
                        </ReactMarkdown>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {showFeedback && (
              <div className="p-4 rounded-lg mb-6 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Incorrect!
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                    {normalizeLatex(showFeedback)}
                  </ReactMarkdown>
                </p>
              </div>
            )}

            {hasAnswered && isCorrect && (
              <div className="p-4 rounded-lg mb-6 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                <p className="font-medium text-green-800 dark:text-green-200">Correct! Well done.</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="disabled:opacity-50"
              >
                Previous
              </Button>

              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestion.id] === undefined}
                className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700 text-white disabled:opacity-50"
              >
                {currentQuestionIndex === quizQuestions.length - 1 ? "Complete Quiz" : "Next Question"}
              </Button>
            </div>
            <button
              onClick={() => {
                const currentQuestion = quizQuestions![currentQuestionIndex]
                const message = `I have a question about this quiz question:\n\n${currentQuestion.question}\n\nOptions:\n${currentQuestion.options.map((opt, idx) => `${idx + 1}. ${opt.text}`).join("\n")}\n\nCan you help me understand this question better?`

                // Store the message and course info
                localStorage.setItem("chatbotInitialMessage", message)
                localStorage.setItem("chatbotCourseId", courseId)
                localStorage.setItem("chatbotCourseName", courseData?.course_name || "Course")

                // Show chatbot within quiz
                setIsShowingChatbot(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mt-4"
            >
              <MessageSquare className="w-4 h-4" />
              Ask Chatbot
            </button>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {quizQuestions.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full ${
                    index === currentQuestionIndex
                      ? "bg-[#8a2432] dark:bg-purple-600"
                      : selectedAnswers[quizQuestions[index].id] !== undefined
                        ? "bg-gray-400 dark:bg-gray-500"
                        : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
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
          <h1 className="text-3xl font-bold">Generate Quiz</h1>
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
                    Select one or more topics to generate quiz questions. The more specific your selection, the more
                    focused your quiz will be.
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
                Quiz Generation
              </h2>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Choose a Template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {quizTemplates.map((template, index) => (
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
                  placeholder="Describe what kind of quiz questions you want to generate..."
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
                    {selectedTemplate !== null ? quizTemplates[selectedTemplate].name : "Custom"}
                  </p>
                  <p>
                    <span className="font-medium">Estimated questions:</span>{" "}
                    {selectedTopics.length > 0 ? selectedTopics.length * 2 + " - " + selectedTopics.length * 4 : "0"}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col">
                {isGenerating ? (
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Generating quiz questions...
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
                      {generationProgress >= 60 && generationProgress < 80 && "Formatting quiz questions..."}
                      {generationProgress >= 80 && "Finalizing your quiz..."}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={selectedTopics.length === 0 || !customPrompt.trim()}
                    className="bg-[#8a2432] hover:bg-[#732232] dark:bg-purple-800 dark:hover:bg-purple-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 self-end"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Generate Quiz</span>
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
