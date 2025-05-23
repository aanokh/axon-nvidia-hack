import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Replace with actual database query to fetch user profile data
    // Example query:
    // const user = await db.user.findUnique({ where: { id: session.user.id } })
    // const createdAt = user.created_at

    // Returning dummy data for now
    return NextResponse.json({
      created_at: "2023-01-15T00:00:00.000Z", // This would come from your database
      // Other user profile data can be added here
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
