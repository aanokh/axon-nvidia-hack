import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

/**
 * POST /api/chat/message
 *
 * This route would handle sending a message to the AI and receiving a response.
 * The courseId is passed to provide context about which course the chat is for.
 * For now, it returns a dummy response after a delay.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, courseId } = body

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    const fetchResponse = await fetch('http://localhost:8000/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId,
        user_query: message
      }),
    });
    
    if (!fetchResponse.ok) throw new Error(`Request failed: ${fetchResponse.status}`);
    
    const result = await fetchResponse.json();
    console.log(JSON.stringify(result));

    const text = result.result

    // Simplified response format
    const response = {
      role: "assistant",
      content: text,
    }

    return NextResponse.json({ message: response })
  } catch (error) {
    console.error("Error processing message:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
