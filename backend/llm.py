import google.generativeai as genai

# The client gets the API key from the environment variable `GOOGLE_API_KEY`.
genai.configure(api_key="AIzaSyCVRdxoPO10abVlk79iz-tA-wDled7aD-c")  # Will use GOOGLE_API_KEY env variable
def setup_genai(topic):

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(f"Write a detailed explanation about {topic} subject is data structures and algorithm that is engaging and easy to understand. Include examples, analogies, and step-by-step explanations so that the text is long enough to be read aloud for at least 30 seconds. Make sure the content is clear, informative, and uses complete sentences.Make sure one thing the output text should have no bullet points or numbering,.,-,() or any other special characters.")
    print(response.text)
    return response.text