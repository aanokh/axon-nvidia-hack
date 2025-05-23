import { NextResponse } from "next/server"

// This is a dummy API route that simulates generating quiz questions
// In a real implementation, this would connect to an AI service or database

export async function POST(request: Request) {
  try {
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

    // In a real implementation, we would fetch course-specific data
    // For now, we'll simulate this by using the courseId in our mock data

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate quiz questions based on the topics and courseId
    const questions = generateQuizQuestions(courseId, topics, prompt)

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
  const seedRandom = (max: number) => {
    return Math.floor((((courseIdNum * 9301 + 49297) % 233280) / 233280) * max)
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
    const useMath = (seedRandom(100) + i) % 100 < 70
    const strategies = useMath ? mathQuestionStrategies : questionStrategies

    // Select a strategy based on courseId and index for consistency
    const strategyIndex = (seedRandom(strategies.length) + i) % strategies.length
    const strategy = strategies[strategyIndex]
    const question = strategy(topic)

    // Generate 4 options with one correct answer
    const correctOptionIndex = (seedRandom(4) + i) % 4
    const options = generateTopicSpecificOptions(topic, correctOptionIndex, useMath, courseIdNum + i)

    questions.push({
      id: `q-${courseId}-${i + 1}`,
      question,
      options,
      correctOptionIndex,
    })
  }

  return questions
}

// Helper function to generate topic-specific options
function generateTopicSpecificOptions(topic: string, correctIndex: number, isMath: boolean, seed: number) {
  if (isMath) {
    return generateMathOptions(correctIndex, seed)
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

  // Create options array
  const options = []

  // Add correct answer at the specified index
  const correctAnswer = correctAnswers[seed % correctAnswers.length]

  // Add wrong answers for other positions
  // Use seed to deterministically shuffle
  const shuffledWrongAnswers = [...wrongAnswers].sort((a, b) => {
    return ((seed * 9301 + 49297) % 233280) / 233280 - 0.5
  })

  for (let i = 0; i < 4; i++) {
    if (i === correctIndex) {
      options.push({
        text: correctAnswer,
        feedback: "",
      })
    } else {
      options.push({
        text: shuffledWrongAnswers[i % shuffledWrongAnswers.length],
        feedback: `This is not correct. Focus on the core concepts and principles of ${topic}.`,
      })
    }
  }

  return options
}

// Helper function to generate math-specific options with LaTeX
function generateMathOptions(correctIndex: number, seed: number) {
  const mathOptionSets = [
    {
      options: ["$2x + 3$", "$x^2 + 3x$", "$2x + 2$", "$x + 3$"],
      feedbacks: [
        "",
        "Remember the power rule: the derivative of $x^n$ is $nx^{n-1}$. Also, the derivative of a constant is 0.",
        "You're close! Check the derivative of the constant term.",
        "Review the power rule for derivatives. The derivative of $x^2$ is $2x$, not $x$.",
      ],
    },
    {
      options: ["$4$", "$8$", "$16/3$", "$12$"],
      feedbacks: [
        "",
        "Remember to apply the power rule for integration: $\\int x^n dx = \\frac{x^{n+1}}{n+1}$.",
        "You're close, but check your calculation again.",
        "This would be the result if the limits were different. Check your integration.",
      ],
    },
    {
      options: ["$x = \\pm 2$", "$x = 2$", "$x = \\pm 4$", "$x = 4$"],
      feedbacks: [
        "",
        "Remember to consider both positive and negative solutions when taking the square root.",
        "You need to divide by 3 after taking the square root of 12.",
        "You need to take the square root of 12, not just divide by 3.",
      ],
    },
    {
      options: ["$2$", "$6$", "$10$", "$-2$"],
      feedbacks: [
        "",
        "Remember that the dot product is calculated as $\\vec{a} \\cdot \\vec{b} = a_1b_1 + a_2b_2$.",
        "You might have calculated $3 \\cdot 2 + 4 \\cdot (-1)$ incorrectly.",
        "Check the sign in your calculation. The dot product can be positive or negative.",
      ],
    },
    {
      options: ["$(2, 0)$", "$(3, 1)$", "$(2, 1)$", "$(3, -1)$"],
      feedbacks: [
        "",
        "Try substituting your answer back into both equations to verify.",
        "You're close! Double-check your arithmetic when solving the system.",
        "Make sure you're solving for x and y correctly. Try the substitution method.",
      ],
    },
    {
      options: ["$3$", "$\\infty$", "$0$", "$1$"],
      feedbacks: [
        "",
        "When evaluating limits as x approaches infinity, focus on the highest power terms.",
        "The limit is finite. Divide both numerator and denominator by the highest power of x.",
        "You're close! Divide both the numerator and denominator by x² and simplify.",
      ],
    },
    {
      options: ["$0.12$", "$0.7$", "$0.3$", "$0.1$"],
      feedbacks: [
        "",
        "For independent events, $P(A \\cap B) = P(A) \\times P(B)$.",
        "This is just $P(A)$, not $P(A \\cap B)$.",
        "Check your multiplication: $0.3 \\times 0.4 = 0.12$.",
      ],
    },
    {
      options: ["$55$", "$15$", "$30$", "$25$"],
      feedbacks: [
        "",
        "Remember that $\\sum_{i=1}^5 i^2 = 1^2 + 2^2 + 3^2 + 4^2 + 5^2$.",
        "You might have calculated $\\sum_{i=1}^5 i$ instead of $\\sum_{i=1}^5 i^2$.",
        "You're missing some terms. Make sure to include all five squared terms.",
      ],
    },
    {
      options: ["$2e^{2x}\\sin(x) + e^{2x}\\cos(x)$", "$e^{2x}\\sin(x)$", "$e^{2x}\\cos(x)$", "$2e^{2x}\\cos(x)$"],
      feedbacks: [
        "",
        "Remember to apply the product rule: $(f \\cdot g)' = f' \\cdot g + f \\cdot g'$.",
        "You've only calculated part of the derivative. Don't forget the product rule.",
        "You've missed the term with $\\sin(x)$. Apply the product rule correctly.",
      ],
    },
    {
      options: ["$2$ and $4$", "$4$ and $2$", "$3 + \\sqrt{2}$ and $3 - \\sqrt{2}$", "$\\sqrt{2}$ and $-\\sqrt{2}$"],
      feedbacks: [
        "",
        "The eigenvalues are the solutions to the characteristic equation $\\det(A - \\lambda I) = 0$.",
        "You're close! The characteristic equation is $(3-\\lambda)^2 - 1 = 0$.",
        "These would be the eigenvalues of a different matrix. Check your calculations.",
      ],
    },
    {
      options: ["$\\sqrt{2}$", "$1$", "$2$", "$\\frac{\\sqrt{2}}{2}$"],
      feedbacks: [
        "",
        "Remember that $\\cos(\\pi/4) = \\sin(\\pi/4) = \\frac{\\sqrt{2}}{2}$.",
        "You might have used the wrong angle. $\\cos(\\pi/4) + \\sin(\\pi/4) \\neq 2$.",
        "This is just $\\cos(\\pi/4)$ or $\\sin(\\pi/4)$, not their sum.",
      ],
    },
    {
      options: ["$y = e^{x^2}$", "$y = e^x$", "$y = xe^{x^2}$", "$y = e^{-x^2}$"],
      feedbacks: [
        "",
        "This is a separable differential equation. Try separating the variables and integrating.",
        "You're close! Remember to use the initial condition $y(0) = 1$ to find the constant.",
        "Check your integration. The solution should satisfy both the DE and initial condition.",
      ],
    },
  ]

  // Select a set based on seed for consistency
  const selectedSet = mathOptionSets[seed % mathOptionSets.length]

  // Create the options array with feedback
  return selectedSet.options.map((text, index) => ({
    text,
    feedback: selectedSet.feedbacks[index],
  }))
}
