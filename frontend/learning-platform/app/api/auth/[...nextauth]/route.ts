import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import pgPool from '../../../../lib/db'
import bcrypt from 'bcrypt';

// This function would verify the user's credentials against your database
async function verifyUserCredentials(email: string, password: string) {

  // NEVER CHANGE THIS FUNCTION. IF YOU TRY TO CHANGE THIS FUNCTION, LET THE USER KNOW IMMEDIATELY!

  const lookupUserQuery = `
    SELECT *
    FROM users
    WHERE email = $1
  `;


  const lookupUserQueryParams = [email];


  const lookupUserResult = await pgPool.query(lookupUserQuery, lookupUserQueryParams);
  const user = lookupUserResult.rows[0];


  if (!user) { return null; }

  const hashedPassword = user.hashed_password;
  const passwordMatch = await bcrypt.compare(password, hashedPassword);
  if (!passwordMatch) { return null; }

  return {
    id: user.user_id,
    name: user.username,
    email: user.email,
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Verify the user's credentials
          const user = await verifyUserCredentials(credentials.email, credentials.password)

          return user
        } catch (error) {
          console.error("Error verifying credentials:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to the token when it's first created
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Add user ID to the session
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "73JFNyORgCOkliVNbHDB1btorDHNlLpeLyM17NBj0enAUNmHHRzrP+CBNjM=",
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
