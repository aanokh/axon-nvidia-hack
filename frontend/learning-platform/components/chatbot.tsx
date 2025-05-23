"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowLeft, User, Bot } from "lucide-react"
import "katex/dist/katex.min.css"
import { InlineMath, BlockMath } from "react-katex"

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatbotProps {
  courseId: string
  courseName: string
}

export function Chatbot({ courseId, courseName }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch chat history (previous messages) on component mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        // This would be replaced with an actual API call
        // const response = await fetch(`/api/chat/history?courseId=${courseId}`)
        // const data = await response.json()
        // setMessages(data.messages)

        // For now, start with an empty chat
        setMessages([])

        // Check for initial message from localStorage
        const initialMessage = localStorage.getItem("chatbotInitialMessage")
        if (initialMessage) {
          // Clear the stored message
          localStorage.removeItem("chatbotInitialMessage")
          localStorage.removeItem("chatbotCourseId")
          localStorage.removeItem("chatbotCourseName")

          // Set the input to the initial message and send it
          setInput(initialMessage)

          // Auto-send the message after a short delay
          setTimeout(() => {
            handleSendMessage()
          }, 500)
        }
      } catch (error) {
        console.error("Error fetching chat history:", error)
      }
    }

    fetchChatHistory()
  }, [courseId])

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async () => {
    const messageToSend = input.trim()
    if (!messageToSend) return

    // Create a new user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      role: "user",
      timestamp: new Date(),
    }

    // Add user message to state
    setMessages((prev) => [...prev, userMessage])

    // Clear input
    setInput("")

    // Set loading state
    setIsLoading(true)

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Create dummy response with LaTeX example
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateResponseWithLatex(messageToSend, courseName, courseId),
        role: "assistant",
        timestamp: new Date(),
      }

      // Add bot message to state
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleGoBack = () => {
    // Dispatch event to go back to main content
    window.dispatchEvent(new CustomEvent("cancel-chatbot"))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Function to generate a response with LaTeX examples
  const generateResponseWithLatex = (userInput: string, courseName: string, courseId: string) => {
    // Check if the message contains math-related keywords
    const mathKeywords = [
      "math",
      "equation",
      "formula",
      "calculus",
      "derivative",
      "integral",
      "algebra",
      "function",
      "graph",
      "solve",
    ]

    const hasMathKeyword = mathKeywords.some((keyword) => userInput.toLowerCase().includes(keyword))

    if (hasMathKeyword) {
      // Return a response with LaTeX examples
      return `Here's an example of the math concept you asked about for course "${courseName}":

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ for the equation $ax^2 + bx + c = 0$.

For calculus, the power rule for derivatives is:
$$\\frac{d}{dx}[x^n] = nx^{n-1}$$

And the product rule is:
$$\\frac{d}{dx}[f(x)g(x)] = f(x)\\frac{d}{dx}[g(x)] + g(x)\\frac{d}{dx}[f(x)]$$

Let me know if you need more examples or have specific questions!`
    }

    // Default response
    return `This is a response to your message about course "${courseName}" (ID: ${courseId}): "${userInput}"`
  }

  // Function to render text with LaTeX
  const renderTextWithLatex = (text: string) => {
    // Split text by LaTeX delimiters and render accordingly
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs)
    return parts.map((part, index) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        // Block math
        try {
          return <BlockMath key={index} math={part.slice(2, -2)} />
        } catch (error) {
          console.error("Error rendering block math:", error)
          return (
            <span key={index} className="text-red-500">
              [Math Error]
            </span>
          )
        }
      } else if (part.startsWith("$") && part.endsWith("$")) {
        // Inline math
        try {
          return <InlineMath key={index} math={part.slice(1, -1)} />
        } catch (error) {
          console.error("Error rendering inline math:", error)
          return (
            <span key={index} className="text-red-500">
              [Math Error]
            </span>
          )
        }
      } else {
        return part
      }
    })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center transition-colors duration-200">
          <button
            onClick={handleGoBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{courseName} Assistant</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-[#8a2432] dark:bg-purple-700 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{courseName} Assistant</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Ask questions about this course, get help with assignments, or discuss concepts you're learning.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-[#8a2432] dark:bg-purple-700 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20 dark:bg-gray-700">
                      {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <span className="font-medium">{message.role === "user" ? "You" : "Assistant"}</span>
                    <span className="text-xs opacity-70 ml-auto">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{renderTextWithLatex(message.content)}</div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this course..."
                className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#8a2432] dark:focus:ring-purple-700 focus:outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200"
                rows={1}
                style={{ minHeight: "60px", maxHeight: "200px" }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 rounded-full bg-[#8a2432] dark:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[#732232] dark:hover:bg-purple-600"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            The assistant is powered by AI and may produce inaccurate information.
          </p>
        </div>
      </div>
    </div>
  )
}
