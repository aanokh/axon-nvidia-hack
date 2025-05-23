import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import pgPool from '../../../lib/db'

/**
 * API Route: /api/courses
 *
 * GET: Fetches all courses for the current user
 *
 * Response Schema:
 * {
 *   courses: {
 *     id: number,           // Unique course ID
 *     name: string,         // Course name
 *     description: string,  // Course description
 *     isAiGenerated: boolean, // Whether the course was AI-generated
 *     createdAt: string     // ISO date string of when the course was created
 *   }[]
 * }
 */
export async function GET(request: Request) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    // Example of how you would use the user ID in a database query:
    // const userCourses = await prisma.course.findMany({
    //   where: {
    //     userId: userId
    //   },
    //   orderBy: {
    //     createdAt: 'desc'
    //   }
    // })

    // Or with raw SQL:
    // const result = await pgPool.query(
    //   'SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC',
    //   [userId]
    // )
    // const userCourses = result.rows

    console.log(`Fetching courses for user: ${userId}`)


    const selectCoursesQuery = `
      SELECT
        course_id,
        name,
        description,
        created_at
      FROM courses
      WHERE user_id = $1
    `;
    const selectCoursesQueryParams = [userId];

    // 3. Run the query
    const selectCoursesResult = await pgPool.query(
      selectCoursesQuery,
      selectCoursesQueryParams
    );

    interface CourseRow {
      course_id:      number;
      name:           string;
      description:    string;
      created_at:     Date;
    }

    // 4. Transform rows into the desired JSON shape
    const userCourses = selectCoursesResult.rows.map((row: CourseRow) => ({
      id:             row.course_id,
      name:           row.name,
      description:    row.description,
      isAiGenerated:  false,
      createdAt:      row.created_at.toISOString(),
    }));

    console.log(`Got courses: ${JSON.stringify(userCourses)}`)

    // Mock data for now - this would come from your database
    const userMockCourses = [
      {
        id: 1,
        name: "Introduction to Programming",
        description:
          "Learn the fundamentals of programming using Python. This course covers variables, control structures, functions, and basic data structures.",
        isAiGenerated: true,
        createdAt: "2023-09-15T14:30:00.000Z",
      },
      {
        id: 2,
        name: "Calculus II",
        description:
          "Advanced calculus topics including integration techniques, sequences, series, and multivariable calculus.",
        isAiGenerated: false,
        createdAt: "2023-10-05T09:15:00.000Z",
      },
      {
        id: 3,
        name: "Composition",
        description:
          "Develop effective writing skills for academic and professional contexts. Focus on clarity, organization, and rhetorical strategies.",
        isAiGenerated: true,
        createdAt: "2023-11-20T11:45:00.000Z",
      },
      {
        id: 4,
        name: "Mechanics",
        description:
          "Introduction to classical mechanics, including Newton's laws, conservation principles, and applications to various physical systems.",
        isAiGenerated: false,
        createdAt: "2024-01-10T13:20:00.000Z",
      },
      {
        id: 5,
        name: "World History",
        description: "Survey of major historical developments and civilizations from ancient times to the modern era.",
        isAiGenerated: true,
        createdAt: "2024-02-28T16:10:00.000Z",
      },
      {
        id: 6,
        name: "Advanced Machine Learning and Artificial Intelligence Applications",
        description:
          "Explore advanced techniques in machine learning and AI, including deep learning, reinforcement learning, and natural language processing.",
        isAiGenerated: false,
        createdAt: "2024-03-15T10:30:00.000Z",
      },
    ]

    return NextResponse.json({ courses: userCourses })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
