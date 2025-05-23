"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Download, Share2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chatbot } from "./chatbot"

// Replace the entire component with the original one, but add the Ask Chatbot button
export type Flashcard = {
  question: string
  answer: string
}

interface FlashcardViewerProps {
  flashcards: Flashcard[]
  onBack: () => void
  courseId?: string // Add courseId prop
}

export function FlashcardViewer({ flashcards, onBack, courseId }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [isShowingChatbot, setIsShowingChatbot] = useState(false)

  const currentFlashcard = flashcards[currentIndex]
  const totalCards = flashcards.length

  useEffect(() => {
    const handleChatbotView = () => setIsShowingChatbot(true)
    const handleChatbotCancel = () => setIsShowingChatbot(false)

    window.addEventListener("view-chatbot-with-message", handleChatbotView as EventListener)
    window.addEventListener("cancel-chatbot", handleChatbotCancel as EventListener)

    return () => {
      window.removeEventListener("view-chatbot-with-message", handleChatbotView as EventListener)
      window.removeEventListener("cancel-chatbot", handleChatbotCancel as EventListener)
    }
  }, [])

  // If chatbot is showing, render it on top
  if (isShowingChatbot) {
    return <Chatbot courseId={courseId || localStorage.getItem("activeCourseId") || "1"} courseName="Course" />
  }

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setShowAnswer(false)
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setShowAnswer(false)
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleCardClick = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setShowAnswer(!showAnswer)
      setIsFlipping(false)
    }, 150)
  }

  const handleReset = () => {
    setCurrentIndex(0)
    setShowAnswer(false)
  }

  // Example of using courseId in a function (for future implementation)
  const handleExport = async () => {
    console.log(`Exporting flashcards for course ID: ${courseId || "unknown"}`)
    // In a real implementation, this would use the courseId to export flashcards
    // For example:
    // await fetch(`/api/flashcards/export?courseId=${courseId}`)
  }

  const handleShare = async () => {
    console.log(`Sharing flashcards for course ID: ${courseId || "unknown"}`)
    // In a real implementation, this would use the courseId to share flashcards
  }

  const handleAskChatbot = () => {
    const message = `I have a question about this flashcard:\n\nQuestion: ${currentFlashcard.question}\nAnswer: ${currentFlashcard.answer}\n\nCan you help me understand this better?`

    // Get the active course ID from props or localStorage
    const activeCourseId = courseId || localStorage.getItem("activeCourseId") || "1"

    // Store the message and course info
    localStorage.setItem("chatbotInitialMessage", message)
    localStorage.setItem("chatbotCourseId", activeCourseId)
    localStorage.setItem("chatbotCourseName", "Course")

    // Show chatbot within flashcard viewer
    setIsShowingChatbot(true)
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Flashcard counter */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Card {currentIndex + 1} of {totalCards}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1">
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative mb-4">
        <Card
          className={`w-full max-w-xl mx-auto aspect-[5/3] flex items-center justify-center p-6 cursor-pointer transition-all duration-150 shadow-lg hover:shadow-xl ${
            isFlipping ? "scale-95 opacity-50" : "scale-100 opacity-100"
          } ${
            showAnswer
              ? "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-800"
              : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-800"
          }`}
          onClick={handleCardClick}
        >
          <div className="absolute top-4 left-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            {showAnswer ? "Answer" : "Question"}
          </div>
          <div className="text-center max-w-2xl">
            <p className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200">
              {showAnswer ? currentFlashcard.answer : currentFlashcard.question}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 text-sm text-gray-500 dark:text-gray-400">
            Click to {showAnswer ? "see question" : "reveal answer"}
          </div>
        </Card>

        {/* Navigation buttons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-md disabled:opacity-0"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Previous card</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-md disabled:opacity-0"
          onClick={handleNext}
          disabled={currentIndex === totalCards - 1}
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Next card</span>
        </Button>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center items-center gap-1 flex-wrap mt-4">
        {flashcards.map((_, index) => (
          <button
            key={index}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              index === currentIndex
                ? "bg-[#8a2432] dark:bg-purple-600 scale-125"
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
            onClick={() => {
              setShowAnswer(false)
              setCurrentIndex(index)
            }}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>

      {/* Ask Chatbot Button */}
      <div className="flex justify-center mt-6">
        <Button onClick={handleAskChatbot} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <MessageSquare className="h-4 w-4" />
          <span>Ask Chatbot</span>
        </Button>
      </div>
    </div>
  )
}
