import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

/**
 * API Route: /api/flashcards/generate
 *
 * This endpoint generates flashcards based on the provided topics, prompt, and course ID.
 *
 * Request Schema:
 * {
 *   topics: string[]       // Array of topic names to generate flashcards for
 *   prompt: string         // Custom prompt to guide flashcard generation
 *   courseId: string       // ID of the course these flashcards belong to
 * }
 *
 * Response Schema:
 * {
 *   success: boolean       // Whether the request was successful
 *   flashcards: {          // Array of generated flashcards
 *     question: string     // The question side of the flashcard
 *     answer: string       // The answer side of the flashcard
 *   }[]
 *   error?: string         // Error message if success is false
 * }
 */

// This is a dummy implementation that returns hardcoded flashcards
// In a real application, this would call an AI service to generate flashcards based on the topics and prompt
export async function POST(request: Request) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    const body = await request.json()
    const { topics, prompt, courseId } = body

    const response = await fetch('http://localhost:8000/generate-flashcards', {
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

    const flashcards: { question: string; answer: string }[] = result.result.flashcards.map(
      ({ question, answer }: { question: string; answer: string }) => ({
        question,
        answer,
      })
    )

    // Example of how you would use the user ID in a database query:
    // 1. You might want to log the flashcard generation request:
    // await prisma.flashcardGenerationLog.create({
    //   data: {
    //     userId: userId,
    //     topics: topics,
    //     prompt: prompt,
    //     timestamp: new Date()
    //   }
    // })

    // 2. You might want to save the generated flashcards to the user's account:
    // const generatedFlashcards = await generateFlashcardsWithAI(topics, prompt)
    // await prisma.flashcardDeck.create({
    //   data: {
    //     userId: userId,
    //     name: `Deck for ${topics.join(', ')}`,
    //     flashcards: {
    //       createMany: {
    //         data: generatedFlashcards.map(fc => ({
    //           question: fc.question,
    //           answer: fc.answer
    //         }))
    //       }
    //     }
    //   }
    // })

    // Or with raw SQL:
    // await pgPool.query(
    //   'INSERT INTO flashcard_generation_logs (user_id, topics, prompt, timestamp) VALUES ($1, $2, $3, $4)',
    //   [userId, JSON.stringify(topics), prompt, new Date()]
    // )

    // Parse the request body
    

    console.log(`Generating flashcards for user: ${userId}`)
    console.log(`Generating flashcards for course: ${courseId}`)
    console.log("Generating flashcards for topics:", topics)
    console.log("Using prompt:", prompt)

    // Simulate API delay
    //await new Promise((resolve) => setTimeout(resolve, 2000))

    // Return dummy flashcards data
    return NextResponse.json({
      success: true,
      flashcards:flashcards
    })
  } catch (error) {
    console.error("Error generating flashcards:", error)
    return NextResponse.json({ success: false, error: "Failed to generate flashcards" }, { status: 500 })
  }
}
