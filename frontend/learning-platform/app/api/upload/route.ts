import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(request: Request) {
  try {
    // In a real implementation:
    // 1. Parse the multipart form data
    // 2. Extract the file(s) and metadata (like file type, course ID)
    // 3. Validate the file (type, size, etc.)
    // 4. Store the file (cloud storage, local filesystem, etc.)
    // 5. Save file metadata to database

    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileType = formData.get("fileType") as string
    const courseId = formData.get("courseId") as string

    const presignResponse = await fetch("http://localhost:8000/generate-upload-url", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId
      }),
      headers: { "Content-Type": "application/json" },
    });
    
    const { url, fields, key_prefix } = await presignResponse.json();

    console.log(`File upload received: ${file.name}, type: ${fileType}, for course: ${courseId}`)
    console.log(`File size: ${file.size} bytes`)


    // Step 2: Build the multipart form and upload directly to S3
    const s3Form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      // force TS to treat v as a string
      s3Form.append(k, v as string);
    });
    // Replace ${filename} if it's in the key
    const actualKey = fields.key.replace("${filename}", file.name);

    console.log(`ACTUAL KEYY!! : ${actualKey}`)
    s3Form.set("key", actualKey); // override with full key path
    s3Form.append("file", file);

    const uploadResult = await fetch(url, {
      method: "POST",
      body: s3Form,
    });

    if (!uploadResult.ok) {
      throw new Error("Upload to S3 failed");
    }

    if (fileType == "Syllabus") {
      const syllabusResponse = await fetch("http://localhost:8000/process-syllabus", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
          filename: file.name
        }),
        headers: { "Content-Type": "application/json" },
      });


      const response = await fetch('http://localhost:8000/generate-learning-plan', {
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
  
    } else {
      const response = await fetch('http://localhost:8000/process-new-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
          filename: file.name
        }),
      });
    }

    // Just return success for now
    return NextResponse.json({
      success: true,
      message: "File received successfully",
      fileName: file.name,
      fileSize: file.size,
      fileType: fileType,
    })
  } catch (error) {
    console.error("Error handling file upload:", error)
    return NextResponse.json({ error: "Failed to process file upload" }, { status: 500 })
  }
}
