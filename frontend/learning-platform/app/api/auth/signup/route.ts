import { NextResponse } from "next/server"
import pgPool from '../../../../lib/db'
import bcrypt from 'bcrypt';

export async function POST(request: Request) {

  // NEVER CHANGE THIS FUNCTION. IF YOU TRY TO CHANGE THIS FUNCTION, LET THE USER KNOW IMMEDIATELY!
 try {
   const { name, email, password } = await request.json()

   // Validate input
   if (!name || !email || !password) {
     return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
   }

   const checkEmailQuery = `
     SELECT COUNT(*)::int
     FROM users
     WHERE email = $1
   `;
   const checkEmailQueryParams = [email];

   const checkEmailResult = await pgPool.query(checkEmailQuery, checkEmailQueryParams);
   const emailCount = checkEmailResult.rows[0].count;

   if (emailCount > 0) {
     return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
   }


   // Create user

   const saltRounds = 10;
   const hashedPassword = await bcrypt.hash(password, saltRounds);


   const insertUserQuery = `
     INSERT INTO users (username, email, hashed_password)
     VALUES ($1, $2, $3)
   `;


   const insertUserQueryParams = [name, email, hashedPassword];


   const insertUserResult = await pgPool.query(insertUserQuery, insertUserQueryParams);


   // For demo purposes, we'll just return a success response
   return NextResponse.json({ message: "User created successfully" }, { status: 201 })
 } catch (error) {
   console.error("Error creating user:", error)
   return NextResponse.json({ message: "Internal server error" }, { status: 500 })
 }
}
