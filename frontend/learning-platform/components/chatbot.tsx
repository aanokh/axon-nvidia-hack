"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowLeft, User, Bot } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"

// Update the Message type to the simplified schema
type Message = {
  role: "user" | "assistant"
  content: string
}

interface ChatbotProps {
  courseId: string
  courseName: string
}

export function Chatbot({ courseId, courseName }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Update the fetchChatHistory function:
  useEffect(() => {
    const fetchChatHistory = async () => {
      setIsLoadingHistory(true)
      try {
        // Use the courseId prop directly
        const response = await fetch(`/api/chat/history?courseId=${courseId}`)

        if (!response.ok) {
          throw new Error("Failed to fetch chat history")
        }

        const data = await response.json()
        setMessages(data.messages || [])

        // Check for initial message from localStorage after loading history
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
        // Start with empty messages if history fetch fails
        setMessages([])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchChatHistory()
  }, [courseId])

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input on mount after history is loaded
  useEffect(() => {
    if (!isLoadingHistory) {
      inputRef.current?.focus()
    }
  }, [isLoadingHistory])

  // Update the handleSendMessage function to use the courseId prop:
  const handleSendMessage = async () => {
    const messageToSend = input.trim()
    if (!messageToSend) return

    // Create a new user message with simplified schema
    const userMessage: Message = {
      role: "user",
      content: messageToSend,
    }

    // Add user message to state
    setMessages((prev) => [...prev, userMessage])

    // Clear input
    setInput("")

    // Set loading state
    setIsLoading(true)

    try {
      // Call the actual API route using the courseId prop
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          courseId: courseId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      // Add bot message to state
      setMessages((prev) => [...prev, data.message])
    } catch (error) {
      console.error("Error sending message:", error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your message. Please try again.",
        },
      ])
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

  // Function to render text with LaTeX
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
          {isLoadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-[#8a2432] dark:bg-purple-700 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Loading chat history...</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Please wait while we load your previous conversations.
              </p>
            </div>
          ) : messages.length === 0 ? (
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
            // Update the message rendering in the Messages section to use the simplified schema
            // Replace the messages.map section with:
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
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
                  </div>
                  <div className="whitespace-pre-wrap">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                      {normalizeLatex(message.content)}
                    </ReactMarkdown>
                  </div>
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
                disabled={isLoadingHistory}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || isLoadingHistory}
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
