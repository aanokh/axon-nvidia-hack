from langchain.prompts import PromptTemplate

latex_format_instructions = r"""
Basic Latex Format Rules

Inline Equations: Use single dollar signs $...$ for inline equations
Example: The formula for kinetic energy is $E_k = \frac12mv^2$

Block Equations: Use double dollar signs $$...$$ for standalone equations
Example: The quadratic formula is:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

Common LaTeX Commands

Fractions: \frac{numerator}{denominator}
Example: \frac{1}{2} renders as ½

Square Roots: \sqrt{expression}
Example: \sqrt{x^2 + y^2} renders as √(x² + y²)

Superscripts: Use ^ for exponents
Example: E = mc^2

Subscripts: Use _ for subscripts
Example: H_2O

Greek Letters: Use \ followed by the letter name
Example: \alpha, \beta, \gamma, \omega

Example Formulas

Hooke's Law:
F = -kx

F: Force on spring

k: Spring constant

x: Displacement

Oscillatory Motion:
x(t) = A cos(ω t + φ)

A: Amplitude

ω: Angular frequency (ω = √(k/m))

φ: Phase constant

Period of a Mass-Spring System:
T = 2π √(m/k)

Period of a Simple Pendulum:
T = 2π √(l/g)

l: Length of pendulum

g: Acceleration due to gravity

Damped Oscillations:
x(t) = A e^(-bt/(2m)) cos(ω′ t + φ)
"""

pz_prompt = PromptTemplate.from_template(
    """
    You are an esteemed professor with 30 years of experience of teaching and working with students.
    Your task is to extract relevant personalization info based on a new interaction you just had with
    the student, to enhance their education so it is more targeted and relevant.

    You will be provided some new information, which could be either their score on an assessment or
    a chat discussion, as well as their old personalization info. Based on the combination of
    both informations, create a new personalization plan which is the average of the two.
    Be aware, if the two informations differ by a lot, prioritize the old plan which has been assmebled
    for many study sessions over the current session info!
    If the new session supports the old plan, no need to change much.

    Here is the old plan:
    {existing}
    
    Here is the new update results after the current study session:
    {new}

    Please return a JSON object matching the PersonalizationInfo schema.
    """
)

lp_new_prompt = PromptTemplate.from_template(
    """You are an academic assistant helping to build a structured learning plan for a student.
    Based on the content extracted from the provided course PDFs (syllabi, outlines, lecture notes, and other materials),
    analyze and organize the course into a well-defined LearningPlan.

    Your output must fully populate the following fields:

    course_name: Extract or infer the course title.

    course_description: Summarize what the course is about in 1-2 sentences.

    topics: Break down the course into logical CourseTopic entries, each with a clear topic_name, a 2–4 sentence topic_content summary, and a bullet-style topic_master list describing what the student needs to master.

    tests: Identify any major assessments and link them to relevant topics.

    additional_info: Mention any other details (e.g. grading policies, final project, pacing expectations).

    Use only the content from the PDF sources. Do not invent information. Be clear, concise, and pedagogically helpful.

    Here are your sources:
    {context}

    Please return a JSON object matching the LearningPlan schema.
    """
)

lp_existing_prompt = PromptTemplate.from_template(
    """You are an academic assistant helping to update and improve a structured learning plan for a student.

    A previous version of the LearningPlan already exists, and new course materials (such as syllabi, outlines, lecture notes, or updated assessments) have been added.

    Your task is to carefully review the new and existing content, and return an improved, merged LearningPlan that:
    - Preserves valid and complete information from the original plan  
    - Adds or updates any topics, descriptions, or tests based on the new materials  
    - Ensures that no duplicate topics or tests exist  
    - Refines wording for clarity and educational value where appropriate  

    Your output must fully populate the following fields:

    course_name: Use the most accurate or updated course title.

    course_description: Update the summary if new materials change the scope.

    topics: Return a complete, de-duplicated list of CourseTopic entries. Each should include:  
    topic_name: A concise title  
    topic_content: A 2-4 sentence summary of the core material  
    topic_master: A bullet-style list of what the student must master

    tests: Update with any new test info, linking them clearly to relevant topics.

    additional_info: Update or add any relevant notes (e.g. changes in grading, new projects, timeline shifts).

    Use only the content from the provided documents. Do not invent information. Be clear, concise, and pedagogically helpful.

    Here is the original LearningPlan:  
    {learning_plan}

    Here are the new or updated course sources:  
    {context}

    Please return a single, updated JSON object matching the LearningPlan schema.
    """
)

flash_prompt = PromptTemplate.from_template(
    """You are a professor with 30 years of experience. Your task is to generate some useful and concise flashcards
    based on the materials provided. You will be given one or more topics, a user request, and some context snippets
    from relevant lecture transcripts and book materials.

    Make flashcards to assist with memorizing core information like names, formulas, equations, concepts,
    procedures, etc. Make sure that the answers and questions are simple and conceptual, and can be solved
    mentally without needing to actually do calculations or use paper. You are making flashcards NOT practice problems!

    Create 10 relevant flashcards, providing a concise question and correct answer for each.

    User's personalization education info (disregard topics that are not for this course): {personalization}

    Your topic(s) you should cover are: {topics}

    Here are some relevant snippets you can support your thought process with:
    {context}

    The user's request is:
    {input}

    Please return a JSON object matching the FlashcardSet schema.
    """
)

quiz_prompt = PromptTemplate.from_template(
    """You are a professor with 30 years of experience. Your task is to generate a useful quiz to test your student
    based on the materials provided. You will be given one or more topics, a user request, and some context snippets
    from relevant lecture transcripts and book materials.

    Make 10 multiple choice quiz questions to help the student test their knowledge. Do not make them too complicated nor too easy,
    make them at an undergraduate university level. Make sure they are possible to solve. Provide four answer options,
    with one being the correct one and the other three being wrong, but make sure that they are not so blatantly wrong
    you can tell at first glance.
    For each wrong answer option, also provide a suggestion hint, basically explaining why exactly that option is wrong, it
    will be shown to the student if they pick that option.

    Make your questions and answers concse, but make them technical - do not fear to use
    technical problems like integrals, or multiple step problems. Use latex when needed!

    Create 10 relevant questions, providing concise question and options with hints for each.

    Emphasize actual problem solving, for example ask actual problems that require calculations;
    Do NOT just ask concepts

    User's personalization education info (disregard topics that are not for this course): {personalization}


    Your topic(s) you should cover are: {topics}

    Here are some relevant snippets you can support your thought process with:
    {context}

    The user's request is:
    {input}

    Please return a JSON object matching the QuizSet schema.

    Important: for your latex, use single dollar signs $...$ for inline equations and
    use double dollar signs $$..$$ for standalone equations!!! Don't use anything else!!
    """
)

qa_prompt = PromptTemplate.from_template(
    """You are a professor with 30 years of experience. Your task is to answer a students question based on
    the materials provided and previous chat history. You will be given the user request, history, and some relevant context snippets
    from relevant lecture transcripts and book materials that you should use for your answer.
    
    Be nice, helpful, and explain on an undergraduate university level.

    User's personalization education info (disregard topics that are not for this course): {personalization}

    The previous chat history is:
    {history}

    Here are some relevant snippets you can support your thought process with:
    {context}

    The user's request is:
    {input}

    """
)

formula_prompt = PromptTemplate.from_template(
    """You are a professor with 30 years of experience. Your task is to generate a useful formula sheet for your student
    based on the materials provided. You will be given one or more topics, a user request, and some context snippets
    from relevant lecture transcripts and book materials.

    Make a very concise but thorough formula sheet that captures all of the most important
    formulas and concepts a student will need for the mentioned topics or prompt.
    Your sheet should prepare the student for an exam! Don't write too much text unless needed,
    focus on making it like a formula sheet with more formulas, and be as concise as posisble, space is valuable here!

    DO NOT use markdown! You can use latex though. Aim for around half to one page though
    it can change depending on the query.

    User's personalization education info (disregard topics that are not for this course): {personalization}

    Your topic(s) you should cover are: {topics}

    Here are some relevant snippets you can support your thought process with:
    {context}

    The user's request is:
    {input}

    Please return a JSON object matching the FormulaSheet schema.

    Do not write in bold!!

    Important: for your latex, use single dollar signs $...$ for inline equations and
    use double dollar signs $$..$$ for standalone equations!!! Don't use anything else!!
    """
    #When using latex, make sure to follow the following instructions and nothing else!
    #"""
    #+ f"{latex_format_instructions}"
)

study_prompt = PromptTemplate.from_template(
    """You are a professor with 30 years of experience. Your task is to generate a useful study guide for your student
    based on the materials provided. You will be given one or more topics, a user request, and some context snippets
    from relevant lecture transcripts and book materials.

    Make a bullet-point style study guide to help the student review core concepts and topics,
    so they can use it to prepare for an exam. This is not a formula sheet, you don't need to show formulas!
    Just make a conceptual map to help the student prepare.
    
    DO NOT use markdown! You can use latex though. Aim for around one to two pages though
    it can change depending on the query.

    User's personalization education info (disregard topics that are not for this course): {personalization}

    Your topic(s) you should cover are: {topics}

    Here are some relevant snippets you can support your thought process with:
    {context}

    The user's request is:
    {input}

    Please return a JSON object matching the StudyGuide schema.

    Do not write in bold!!

    Important: for your latex, use single dollar signs $...$ for inline equations and
    use double dollar signs $$..$$ for standalone equations!!! Don't use anything else!!
    """
    #When using latex, make sure to follow the following instructions and nothing else!
    #"""
    #+ f"{latex_format_instructions}"
)