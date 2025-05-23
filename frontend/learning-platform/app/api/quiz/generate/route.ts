import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

// This is a dummy API route that simulates generating quiz questions
// In a real implementation, this would connect to an AI service or database

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
    const body = await request.json()
    const { courseId, topics, prompt } = body

    // Validate the request
    if (!topics || !topics.length) {
      return NextResponse.json({ error: "Topics are required" }, { status: 400 })
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const response = await fetch('http://localhost:8000/generate-quiz', {
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

    //const flashcards: { question: string; answer: string }[] = result.result.flashcards.map(
    //  ({ question, answer }: { question: string; answer: string }) => ({
    //    question,
    //    answer,
    //  })
    //)

    // In a real implementation, we would fetch course-specific data
    // For now, we'll simulate this by using the courseId in our mock data

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate quiz questions based on the topics and courseId
    //const questions = generateQuizQuestions(courseId, topics, prompt)
    const questions = result.result.questions;

    return NextResponse.json({
      success: true,
      questions,
    })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate quiz",
      },
      { status: 500 },
    )
  }
}

// Helper function to generate quiz questions based on actual topics and courseId
function generateQuizQuestions(courseId: string, topics: string[], prompt: string) {
  const questions = []
  const totalQuestions = Math.min(10, topics.length * 2) // 2 questions per topic, max 10

  // Use courseId to seed the random number generator for consistent results per course
  const courseIdNum = Number.parseInt(courseId, 10) || 1
  const seedRandom = (max: number, seed = 0) => {
    return Math.floor((((courseIdNum * 9301 + 49297 + seed) % 233280) / 233280) * max)
  }

  // Question generation strategies with more complex LaTeX
  const questionStrategies = [
    (topic: string) => `What is the definition of ${topic}?`,
    (topic: string) => `Which of the following best describes ${topic}?`,
    (topic: string) => `What is the main purpose of ${topic}?`,
    (topic: string) => `How does ${topic} relate to other concepts in this field?`,
    (topic: string) => `What is a key characteristic of ${topic}?`,
  ]

  // Math-specific question strategies with complex LaTeX
  const mathQuestionStrategies = [
    (topic: string) => `In ${topic}, if $f(x) = x^2 + 3x + 2$, what is $f'(x)$?`,
    (topic: string) => `For ${topic}, evaluate the integral $\\int_0^2 x^3 dx$.`,
    (topic: string) => `In the context of ${topic}, solve the equation $3x^2 - 12 = 0$.`,
    (topic: string) =>
      `For ${topic}, if $\\vec{a} = 3\\hat{i} + 4\\hat{j}$ and $\\vec{b} = 2\\hat{i} - \\hat{j}$, what is $\\vec{a} \\cdot \\vec{b}$?`,
    (topic: string) =>
      `In ${topic}, what is the solution to the system of equations: $\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}$`,
    (topic: string) => `For ${topic}, calculate $\\lim_{x \\to \\infty} \\frac{3x^2 + 2x}{x^2 + 1}$.`,
    (topic: string) =>
      `In ${topic}, if $P(A) = 0.3$ and $P(B) = 0.4$ and events A and B are independent, what is $P(A \\cap B)$?`,
    (topic: string) => `For ${topic}, evaluate the expression $\\sum_{i=1}^5 i^2$.`,
    (topic: string) => `In ${topic}, what is the derivative of $f(x) = e^{2x} \\sin(x)$?`,
    (topic: string) =>
      `For ${topic}, find the eigenvalues of the matrix $\\begin{pmatrix} 3 & 1 \\\\ 1 & 3 \\end{pmatrix}$.`,
    (topic: string) => `In ${topic}, what is the value of $\\cos(\\pi/4) + \\sin(\\pi/4)$?`,
    (topic: string) =>
      `For ${topic}, solve the differential equation $\\frac{dy}{dx} = 2xy$ with initial condition $y(0) = 1$.`,
  ]

  // Generate questions for each topic
  for (let i = 0; i < totalQuestions; i++) {
    const topic = topics[i % topics.length]

    // Increase chance of math questions to test LaTeX (70% chance for math)
    const useMath = (seedRandom(100, i) + i) % 100 < 70
    const strategies = useMath ? mathQuestionStrategies : questionStrategies

    // Select a strategy based on courseId and index for consistency
    const strategyIndex = (seedRandom(strategies.length, i) + i) % strategies.length
    const strategy = strategies[strategyIndex]
    const question = strategy(topic)

    // Generate options using the new schema
    const questionData = generateQuestionWithNewSchema(topic, question, useMath, courseIdNum + i)

    questions.push(questionData)
  }

  return questions
}

// Helper function to generate questions with the new schema
function generateQuestionWithNewSchema(topic: string, question: string, isMath: boolean, seed: number) {
  if (isMath) {
    return generateMathQuestionNewSchema(question, seed)
  }

  // Generate topic-specific options
  const correctAnswers = [
    `A fundamental concept that explains ${topic}`,
    `The core principle underlying ${topic}`,
    `A systematic approach to understanding ${topic}`,
    `The primary method used in ${topic}`,
    `A key component of ${topic}`,
  ]

  const wrongAnswers = [
    `An unrelated concept`,
    `A secondary consideration`,
    `A historical artifact`,
    `A common misconception`,
    `An outdated approach`,
    `A tangential idea`,
    `A superficial understanding`,
    `A contradictory principle`,
  ]

  const wrongSuggestions = [
    `This is not correct. Focus on the core concepts and principles of ${topic}.`,
    `This answer doesn't capture the main idea. Review the fundamental aspects of ${topic}.`,
    `While this might seem related, it's not the primary focus of ${topic}.`,
    `This is a common misconception. Study the key characteristics of ${topic} more carefully.`,
    `This approach is outdated. Modern understanding of ${topic} has evolved.`,
    `This is too narrow a view. ${topic} encompasses broader concepts.`,
    `This misses the essential nature of ${topic}. Review the core principles.`,
    `This contradicts the established understanding of ${topic}.`,
  ]

  // Select correct answer and wrong answers
  const correctOption = correctAnswers[seed % correctAnswers.length]

  // Use seed to deterministically select wrong answers
  const shuffledWrongAnswers = [...wrongAnswers].sort((a, b) => {
    return ((seed * 9301 + 49297) % 233280) / 233280 - 0.5
  })

  const shuffledWrongSuggestions = [...wrongSuggestions].sort((a, b) => {
    return ((seed * 7919 + 65537) % 233280) / 233280 - 0.5
  })

  return {
    question,
    correctOption,
    wrongOptionOne: shuffledWrongAnswers[0],
    wrongSuggestionOne: shuffledWrongSuggestions[0],
    wrongOptionTwo: shuffledWrongAnswers[1],
    wrongSuggestionTwo: shuffledWrongSuggestions[1],
    wrongOptionThree: shuffledWrongAnswers[2],
    wrongSuggestionThree: shuffledWrongSuggestions[2],
  }
}

// Helper function to generate math-specific questions with the new schema
function generateMathQuestionNewSchema(question: string, seed: number) {
  const mathQuestionSets = [
    {
      correctOption: "$2x + 3$",
      wrongOptionOne: "$x^2 + 3x$",
      wrongSuggestionOne:
        "Remember the power rule: the derivative of $x^n$ is $nx^{n-1}$. Also, the derivative of a constant is 0.",
      wrongOptionTwo: "$2x + 2$",
      wrongSuggestionTwo: "You're close! Check the derivative of the constant term.",
      wrongOptionThree: "$x + 3$",
      wrongSuggestionThree: "Review the power rule for derivatives. The derivative of $x^2$ is $2x$, not $x$.",
    },
    {
      correctOption: "$4$",
      wrongOptionOne: "$8$",
      wrongSuggestionOne: "Remember to apply the power rule for integration: $\\int x^n dx = \\frac{x^{n+1}}{n+1}$.",
      wrongOptionTwo: "$16/3$",
      wrongSuggestionTwo: "You're close, but check your calculation again.",
      wrongOptionThree: "$12$",
      wrongSuggestionThree: "This would be the result if the limits were different. Check your integration.",
    },
    {
      correctOption: "$x = \\pm 2$",
      wrongOptionOne: "$x = 2$",
      wrongSuggestionOne: "Remember to consider both positive and negative solutions when taking the square root.",
      wrongOptionTwo: "$x = \\pm 4$",
      wrongSuggestionTwo: "You need to divide by 3 after taking the square root of 12.",
      wrongOptionThree: "$x = 4$",
      wrongSuggestionThree: "You need to take the square root of 12, not just divide by 3.",
    },
    {
      correctOption: "$2$",
      wrongOptionOne: "$6$",
      wrongSuggestionOne:
        "Remember that the dot product is calculated as $\\vec{a} \\cdot \\vec{b} = a_1b_1 + a_2b_2$.",
      wrongOptionTwo: "$10$",
      wrongSuggestionTwo: "You might have calculated $3 \\cdot 2 + 4 \\cdot (-1)$ incorrectly.",
      wrongOptionThree: "$-2$",
      wrongSuggestionThree: "Check the sign in your calculation. The dot product can be positive or negative.",
    },
    {
      correctOption: "$(2, 0)$",
      wrongOptionOne: "$(3, 1)$",
      wrongSuggestionOne: "Try substituting your answer back into both equations to verify.",
      wrongOptionTwo: "$(2, 1)$",
      wrongSuggestionTwo: "You're close! Double-check your arithmetic when solving the system.",
      wrongOptionThree: "$(3, -1)$",
      wrongSuggestionThree: "Make sure you're solving for x and y correctly. Try the substitution method.",
    },
    {
      correctOption: "$3$",
      wrongOptionOne: "$\\infty$",
      wrongSuggestionOne: "When evaluating limits as x approaches infinity, focus on the highest power terms.",
      wrongOptionTwo: "$0$",
      wrongSuggestionTwo: "The limit is finite. Divide both numerator and denominator by the highest power of x.",
      wrongOptionThree: "$1$",
      wrongSuggestionThree: "You're close! Divide both the numerator and denominator by x² and simplify.",
    },
    {
      correctOption: "$0.12$",
      wrongOptionOne: "$0.7$",
      wrongSuggestionOne: "For independent events, $P(A \\cap B) = P(A) \\times P(B)$.",
      wrongOptionTwo: "$0.3$",
      wrongSuggestionTwo: "This is just $P(A)$, not $P(A \\cap B)$.",
      wrongOptionThree: "$0.1$",
      wrongSuggestionThree: "Check your multiplication: $0.3 \\times 0.4 = 0.12$.",
    },
    {
      correctOption: "$55$",
      wrongOptionOne: "$15$",
      wrongSuggestionOne: "Remember that $\\sum_{i=1}^5 i^2 = 1^2 + 2^2 + 3^2 + 4^2 + 5^2$.",
      wrongOptionTwo: "$30$",
      wrongSuggestionTwo: "You might have calculated $\\sum_{i=1}^5 i$ instead of $\\sum_{i=1}^5 i^2$.",
      wrongOptionThree: "$25$",
      wrongSuggestionThree: "You're missing some terms. Make sure to include all five squared terms.",
    },
    {
      correctOption: "$2e^{2x}\\sin(x) + e^{2x}\\cos(x)$",
      wrongOptionOne: "$e^{2x}\\sin(x)$",
      wrongSuggestionOne: "Remember to apply the product rule: $(f \\cdot g)' = f' \\cdot g + f \\cdot g'$.",
      wrongOptionTwo: "$e^{2x}\\cos(x)$",
      wrongSuggestionTwo: "You've only calculated part of the derivative. Don't forget the product rule.",
      wrongOptionThree: "$2e^{2x}\\cos(x)$",
      wrongSuggestionThree: "You've missed the term with $\\sin(x)$. Apply the product rule correctly.",
    },
    {
      correctOption: "$2$ and $4$",
      wrongOptionOne: "$4$ and $2$",
      wrongSuggestionOne:
        "The eigenvalues are the solutions to the characteristic equation $\\det(A - \\lambda I) = 0$.",
      wrongOptionTwo: "$3 + \\sqrt{2}$ and $3 - \\sqrt{2}$",
      wrongSuggestionTwo: "You're close! The characteristic equation is $(3-\\lambda)^2 - 1 = 0$.",
      wrongOptionThree: "$\\sqrt{2}$ and $-\\sqrt{2}$",
      wrongSuggestionThree: "These would be the eigenvalues of a different matrix. Check your calculations.",
    },
    {
      correctOption: "$\\sqrt{2}$",
      wrongOptionOne: "$1$",
      wrongSuggestionOne: "Remember that $\\cos(\\pi/4) = \\sin(\\pi/4) = \\frac{\\sqrt{2}}{2}$.",
      wrongOptionTwo: "$2$",
      wrongSuggestionTwo: "You might have used the wrong angle. $\\cos(\\pi/4) + \\sin(\\pi/4) \\neq 2$.",
      wrongOptionThree: "$\\frac{\\sqrt{2}}{2}$",
      wrongSuggestionThree: "This is just $\\cos(\\pi/4)$ or $\\sin(\\pi/4)$, not their sum.",
    },
    {
      correctOption: "$y = e^{x^2}$",
      wrongOptionOne: "$y = e^x$",
      wrongSuggestionOne: "This is a separable differential equation. Try separating the variables and integrating.",
      wrongOptionTwo: "$y = xe^{x^2}$",
      wrongSuggestionTwo: "You're close! Remember to use the initial condition $y(0) = 1$ to find the constant.",
      wrongOptionThree: "$y = e^{-x^2}$",
      wrongSuggestionThree: "Check your integration. The solution should satisfy both the DE and initial condition.",
    },
  ]

  // Select a set based on seed for consistency
  const selectedSet = mathQuestionSets[seed % mathQuestionSets.length]

  return {
    question,
    ...selectedSet,
  }
}
