import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

/**
 * GET /api/chat/history
 *
 * This route fetches the chat history (previous messages) for the current user and course.
 * Returns messages in chronological order.
 */
export async function GET(request: Request) {
  // Get the courseId from the query parameters
  const url = new URL(request.url)
  const courseId = url.searchParams.get("courseId")

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

  const fetchResponse = await fetch('http://localhost:8000/get-chat-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      course_id: courseId
    }),
  });
  
  if (!fetchResponse.ok) throw new Error(`Request failed: ${fetchResponse.status}`);
  
  const result = await fetchResponse.json();
  console.log(JSON.stringify(result));

  const messages = result.history;

  // In a real implementation, you would:
  // 1. Get the user ID from the session
  // 2. Query the database for chat messages for this user and course
  // 3. Return the messages in chronological order

  // Mock chat history data
  const mockMessages = [
    {
      role: "user",
      content: "What is Newton's second law?",
    },
    {
      role: "assistant",
      content:
        "Newton's second law states that the force acting on an object is equal to the mass of that object times its acceleration. This can be expressed as the equation $F = ma$, where:\n\n- $F$ is the net force applied to the object\n- $m$ is the mass of the object\n- $a$ is the acceleration of the object\n\nThis law explains how the velocity of an object changes when it is subjected to an external force.",
    },
    {
      role: "user",
      content: "Can you give me an example problem?",
    },
    {
      role: "assistant",
      content:
        "Here's a simple example:\n\n**Problem:** A car with a mass of 1000 kg accelerates at $2 \\text{ m/s}^2$. What is the net force acting on the car?\n\n**Solution:** Using Newton's second law $F = ma$:\n\n$$F = (1000 \\text{ kg})(2 \\text{ m/s}^2) = 2000 \\text{ N}$$\n\nTherefore, the net force acting on the car is 2000 Newtons.\n\nWould you like to try another example or have questions about this one?",
    },
  ]

  return NextResponse.json({ messages: messages })
}
