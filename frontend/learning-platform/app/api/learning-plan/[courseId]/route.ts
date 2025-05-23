import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

// GET: Fetch the entire learning plan for a course
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id
    const { courseId } = await params;

    console.log(`Calling with course id: ${courseId}`)

    const response = await fetch('http://localhost:8000/get-learning-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId
      }),
    });
    
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    
    const result = await response.json();
    console.log(result);


    // Example of how you would use the user ID in a database query:
    // const learningPlan = await prisma.learningPlan.findFirst({
    //   where: {
    //     courseId: params.courseId,
    //     userId: userId
    //   }
    // })

    // Or with raw SQL:
    // const result = await pgPool.query(
    //   'SELECT * FROM learning_plans WHERE course_id = $1 AND user_id = $2',
    //   [params.courseId, userId]
    // )
    // const learningPlan = result.rows[0]

    //console.log(`Fetching learning plan for course: ${courseId} for user: ${userId}`)

    // TODO: In the future, fetch this from a database
    // Mock data for now - this would come from your database
    /*
    const learningPlan = {
      course_name: "Physics 32 – Physics for Scientists and Engineers II",
      course_description:
        "This course builds on the foundations learned in Physics 31, covering advanced topics in fluid mechanics, thermodynamics, oscillators, waves, sound, optics, and modern physics.",
      topics: [
        {
          topic_name: "Fluid Mechanics",
          topic_content:
            "This topic includes the study of the physical properties of fluids, both liquids and gases, and how they respond to external forces.",
        },
        // Additional topics would be here in the real implementation
      ],
      tests: [
        {
          test_date: "April 25, 2025",
          covered_topic_names: ["Fluid Mechanics", "Thermodynamics"],
        },
        // Additional tests would be here in the real implementation
      ],
      additional_info: "Labs make up 15% of the grade and must be passed separately.",
    }*/

    return NextResponse.json(result.learning_plan)
  } catch (error) {
    console.error("Error fetching learning plan:", error)
    return NextResponse.json({ error: "Failed to fetch learning plan" }, { status: 500 })
  }
}

// PUT: Save the entire learning plan when the save button is pressed
export async function PUT(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions)

    // Check if the user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user ID from the session
    const userId = session.user.id

    const { courseId } = await params;
    console.log(`COURSE ID TO SAVE!! ${courseId}`)
    const updatedPlan = await request.json()

    const response = await fetch('http://localhost:8000/save-learning-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId,
        learning_plan: updatedPlan
      }),
    });
    
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    
    const result = await response.json();
    console.log(result);


    // Example of how you would use the user ID in a database query:
    // const updatedPlan = await request.json()
    // await prisma.learningPlan.upsert({
    //   where: {
    //     courseId_userId: {
    //       courseId: params.courseId,
    //       userId: userId
    //     }
    //   },
    //   update: {
    //     ...updatedPlan
    //   },
    //   create: {
    //     courseId: params.courseId,
    //     userId: userId,
    //     ...updatedPlan
    //   }
    // })

    // Or with raw SQL:
    // const updatedPlan = await request.json()
    // await pgPool.query(
    //   `INSERT INTO learning_plans (course_id, user_id, data)
    //    VALUES ($1, $2, $3)
    //    ON CONFLICT (course_id, user_id)
    //    DO UPDATE SET data = $3`,
    //   [params.courseId, userId, JSON.stringify(updatedPlan)]
    // )


    console.log(`Saving learning plan for course: ${courseId} for user: ${userId}`)
    // TODO: In the future, save this to a database
    // For now, just log what would be saved
    console.log("Plan data to save:", updatedPlan)

    // Simulate a successful save
    return NextResponse.json({
      success: true,
      message: "Learning plan saved successfully",
    })
  } catch (error) {
    console.error("Error saving learning plan:", error)
    return NextResponse.json({ error: "Failed to save learning plan" }, { status: 500 })
  }
}
