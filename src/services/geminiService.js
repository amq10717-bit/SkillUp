import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. Extract Topics from Course Info
export const extractTopicsFromCourse = async (courseTitle, courseDescription) => {
  try {
    const prompt = `
      Analyze this course and extract 5-8 module topics:
      Title: "${courseTitle}"
      Description: "${courseDescription}"
      
      Return ONLY a JSON array of strings like: ["Topic A", "Topic B"]
      No markdown, no extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Topic Extraction Error:", error);
    return ["Introduction", "Core Concepts", "Advanced Topics", "Practical Applications"];
  }
};

// 2. Generate Assignment Details (UPDATED to include teacherSolution)
export const generateAssignment = async (topic, difficulty, courseContext = "") => {
  try {
    const prompt = `
      Create a concise assignment for: "${topic}"
      Difficulty: "${difficulty}"
      Course: "${courseContext}"
      
      Return ONLY JSON with these keys:
      {
        "title": "Assignment Title",
        "description": "Brief overview (2-3 sentences)",
        "instructions": ["Submit PDF", "Show calculations", "Meet deadline"],
        "learningObjectives": ["Understand X", "Apply Y", "Practice Z"],
        "totalMarks": 100,
        "estimatedDuration": 60,
        "teacherSolution": "A comprehensive answer key or model solution. Include key points, expected calculations, or code snippets that a student needs to provide for full marks. This will be used for AI grading."
      }
      No markdown, no extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Assignment Generation Error:", error);
    throw new Error("Failed to generate assignment. Please try again.");
  }
};

// 3. Generate Quiz Questions
export const generateQuizQuestions = async (topic, difficulty, count, courseContext = "") => {
  try {
    const prompt = `
      Create ${count} multiple-choice questions about "${topic}"
      Difficulty: "${difficulty}"
      Course: "${courseContext}"
      
      Return ONLY JSON array with: 
      [{"questionText": "Q?", "options": ["A","B","C","D"], "correctAnswer": "A"}]
      No markdown, no extra text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Quiz Generation Error:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
};

// 4. Generate Module Content (CONCISE VERSION)
export const generateModuleContent = async (moduleTitle, difficulty, courseTitle, courseDescription) => {
  try {
    const prompt = `
      Create concise module content for: "${moduleTitle}"
      Course: "${courseTitle}"
      Difficulty: "${difficulty}"
      
      FORMAT RULES:
      - Use HTML-like structure with inline styles
      - NO markdown (** or ##)
      - Keep content brief: 4-5 sections max
      - Include short code examples only where essential
      - Focus on key concepts only
      
      Return content with this structure:
      
      <div style="font-family: Arial, sans-serif;">
        <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Module Title</h1>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Overview:</strong> Brief 2-sentence introduction.
        </div>
        
        <h2 style="color: #34495e; margin-top: 20px;">Learning Objectives</h2>
        <ul style="line-height: 1.6;">
          <li>Objective 1</li>
          <li>Objective 2</li>
          <li>Objective 3</li>
        </ul>
        
        <h2 style="color: #34495e; margin-top: 20px;">Key Concepts</h2>
        <p>Clear explanation of main concepts...</p>
        
        <h2 style="color: #34495e; margin-top: 20px;">Examples</h2>
        <div style="background: #2c3e50; color: white; padding: 10px; border-radius: 3px; font-family: monospace;">
          // Short code example
          function example() {
            return "Hello World";
          }
        </div>
        
        <h2 style="color: #34495e; margin-top: 20px;">Practice Exercise</h2>
        <p>Brief practice task...</p>
      </div>
      
      Keep it concise and focused. No lengthy explanations.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Module Content Generation Error:", error);
    return `<div style="font-family: Arial, sans-serif;">
      <h1 style="color: #2c3e50;">${moduleTitle}</h1>
      <p>Content generation failed. Please try regenerating this module.</p>
    </div>`;
  }
};

// 5. AI Learning Assistant (CONCISE VERSION)
export const askCourseAssistant = async (question, moduleContent, courseContext) => {
  try {
    const prompt = `
      Student question: "${question}"
      Course: "${courseContext}"
      
      Provide a CONCISE answer (2-3 sentences max).
      Focus on the core concept.
      Use simple, clear language.
      No lengthy explanations.
      No markdown formatting.
      
      Example format: "The answer is [brief explanation]. Try practicing with [simple example]."
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Ensure response is concise
    let answer = response.text();
    if (answer.length > 200) {
      answer = answer.substring(0, 200) + "...";
    }

    return answer;
  } catch (error) {
    console.error("AI Learning Assistant Error:", error);
    return "I'm having trouble answering right now. Please try again.";
  }
};

// 6. Code Review and Feedback (CONCISE VERSION)
export const reviewStudentCode = async (code, language, taskDescription, studentExplanation) => {
  try {
    const prompt = `
      Code Review - Be CONCISE:
      Language: ${language}
      Task: ${taskDescription}
      
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Provide feedback in 3-4 bullet points max:
      - What works well
      - Main improvement needed
      - Key suggestion
      - Best practice tip
      
      Keep it under 150 words. No lengthy analysis.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Ensure concise response
    let feedback = response.text();
    if (feedback.length > 300) {
      feedback = feedback.substring(0, 300) + "...";
    }

    return feedback;
  } catch (error) {
    console.error("AI Code Review Error:", error);
    return "Quick review: Check your syntax and try running the code. Focus on making it work first.";
  }
};

// 7. Generate Practice Exercise
export const generatePracticeExercise = async (moduleTitle, language) => {
  try {
    const prompt = `
      Create a simple practice exercise for: "${moduleTitle}"
      Language: ${language}
      
      Return ONLY JSON:
      {
        "task": "Brief task description",
        "starterCode": "Short starter code (max 10 lines)",
        "hint": "One helpful hint"
      }
      No markdown, keep it minimal.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Practice Exercise Error:", error);
    return {
      task: `Practice ${moduleTitle} concepts`,
      starterCode: "// Write your solution here",
      hint: "Focus on the main concepts learned"
    };
  }
};