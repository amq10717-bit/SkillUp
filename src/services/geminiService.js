// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Select the model that worked for you (e.g., gemini-2.5-flash or gemini-pro)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. NEW: Extract Topics from Course Info
export const extractTopicsFromCourse = async (courseTitle, courseDescription) => {
    try {
        const prompt = `
      Analyze the following course:
      Title: "${courseTitle}"
      Description: "${courseDescription}"
      
      Extract 5 to 8 distinct, quiz-worthy sub-topics or modules from this course content.
      Return ONLY a raw JSON array of strings. 
      Example: ["Topic A", "Topic B", "Topic C"]
      Do not include markdown formatting.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();

        return JSON.parse(text);
    } catch (error) {
        console.error("AI Topic Extraction Error:", error);
        // Fallback topics if AI fails
        return ["General Knowledge", "Core Concepts", "Advanced Topics"];
    }
};

// 2. UPDATED: Generate Questions with Course Context
export const generateQuizQuestions = async (topic, difficulty, count, courseContext = "") => {
    try {
        // We add courseContext to the prompt to make questions more relevant
        const prompt = `
      Create a quiz for the course "${courseContext}".
      Focus specifically on the topic: "${topic}".
      Difficulty Level: "${difficulty}".
      Generate exactly ${count} multiple-choice questions.
      
      Return the response ONLY as a JSON array of objects with this exact structure:
      [
        {
          "questionText": "The question string",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "The exact string of the correct option"
        }
      ]
      Do not include markdown formatting.
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
// 3. NEW: Generate Assignment Details
export const generateAssignment = async (topic, difficulty, courseContext = "") => {
    try {
        const prompt = `
      Act as an expert tutor. Create a detailed assignment for the course "${courseContext}".
      Topic: "${topic}"
      Difficulty: "${difficulty}"

      Return ONLY a raw JSON object with these exact keys:
      {
        "title": "A professional and engaging title",
        "description": "A comprehensive text description that includes: 1) The learning objective. 2) Step-by-step instructions. 3) Deliverables required.",
        "totalMarks": 100
      }
      Do not include markdown formatting (no \`\`\`json).
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