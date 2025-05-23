import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Check if the path is a public path (login or signup)
  const isPublicPath = path === "/login" || path === "/signup"

  // Check if the path is an API path or static asset
  const isApiOrAsset = path.startsWith("/api") || path.startsWith("/_next") || path.includes("favicon.ico")

  // If it's an API route or asset, allow the request
  if (isApiOrAsset) {
    return NextResponse.next()
  }

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "your-secret-here",
  })

  // If the user is authenticated and trying to access a public path, redirect to home
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If the user is not authenticated and trying to access a protected path, redirect to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Otherwise, continue
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all paths except static assets and API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
