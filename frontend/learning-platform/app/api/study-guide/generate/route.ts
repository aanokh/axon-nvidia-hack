import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { courseId, topics, prompt } = body

    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    const response = await fetch('http://localhost:8000/generate-study-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId,
        user_query: prompt,
        topic_names: topics
      }),
    });
    
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    
    const result = await response.json();
    console.log(JSON.stringify(result));

    const studyGuide = result.result.text

    console.log(studyGuide)

    return NextResponse.json({
      success: true,
      studyGuide,
    })
  } catch (error) {
    console.error("Error generating study guide:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate study guide",
      },
      { status: 500 },
    )
  }
}
