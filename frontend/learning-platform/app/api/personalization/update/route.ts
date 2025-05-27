import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, courseId, data } = body

    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    // TODO: Implement personalization update logic
    // This route will handle two types of data:
    // 1. Quiz results (type: 'quiz')
    // 2. Chat history (type: 'chat')

    console.log("\nPersonalization!\n")

    const response = await fetch('http://localhost:8000/update-personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            data: data
        }),
    });
    
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    if (type === "quiz") {
      // Handle quiz results
      // data will contain: { questions, answers, score, percentage }
      console.log("Quiz results received:", data)
    } else if (type === "chat") {
      // Handle chat history
      // data will contain: { messages }
      console.log("Chat history received:", data)
    } else {
      return NextResponse.json({ success: false, error: "Invalid data type" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating personalization:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
