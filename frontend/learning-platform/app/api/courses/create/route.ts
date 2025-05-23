import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import pgPool from '../../../../lib/db'

/**
 * API Route: /api/courses/create
 *
 * POST: Creates a new course for the current user
 *
 * Request Schema:
 * {
 *   name: string,           // Course name (required)
 *   description?: string,   // Course description (optional)
 *   isAiGenerated: boolean, // Whether to use AI generation (currently only false is supported)
 *   syllabusFile?: File,    // Syllabus file for academic courses (optional but recommended)
 *   aiPrompt?: string,      // Prompt for AI-generated courses (required if isAiGenerated is true)
 * }
 *
 * Response Schema:
 * {
 *   success: boolean,       // Whether the request was successful
 *   course?: {              // The created course (only if success is true)
 *     id: number,           // Unique course ID
 *     name: string,         // Course name
 *     description: string,  // Course description
 *     isAiGenerated: boolean, // Whether the course was AI-generated
 *     createdAt: string     // ISO date string of when the course was created
 *   },
 *   error?: string          // Error message (only if success is false)
 * }
 */
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

    // Parse the request body
    // Note: In a real implementation, you would use formData to handle file uploads
    const body = await request.json()
    const { name, description, isAiGenerated, aiPrompt } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ success: false, error: "Course name is required" }, { status: 400 })
    }

    // Validate AI generation (currently not supported)
    if (isAiGenerated) {
      return NextResponse.json(
        {
          success: false,
          error: "AI-generated courses are not currently available",
        },
        { status: 400 },
      )
    }

    console.log(`Creating new course for user: ${userId}`)
    console.log("Course data:", { name, description, isAiGenerated })



    // Example of how you would create a course in the database:
    // const newCourse = await prisma.course.create({
    //   data: {
    //     name,
    //     description: description || "",
    //     isAiGenerated: false, // Force to false for now
    //     userId,
    //     createdAt: new Date()
    //   }
    // })

    // Or with raw SQL:
    // const result = await pgPool.query(
    //   'INSERT INTO courses (name, description, is_ai_generated, user_id, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    //   [name, description || "", false, userId, new Date()]
    // )
    // const newCourse = result.rows[0]

    // Mock response - in a real implementation, this would be the created course

    const insertCourseQuery = `
      INSERT INTO courses (name, description, user_id)
      VALUES ($1, $2, $3)
      RETURNING course_id
    `;

    const insertCourseQueryParams = [name, description, userId];

    const insertCourseResult = await pgPool.query(
      insertCourseQuery,
      insertCourseQueryParams
    );

    const newCourseId = insertCourseResult.rows[0].course_id;

    console.log(`Course ID for new course: ${newCourseId}`)



    const newCourseData = {
      id: newCourseId, // Generate a random ID
      name,
      description: description || "",
      isAiGenerated: false, // Force to false for now
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      course: newCourseData,
    })
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ success: false, error: "Failed to create course" }, { status: 500 })
  }
}
