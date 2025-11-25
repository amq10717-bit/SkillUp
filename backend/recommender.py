import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

# Global variables to store the model state
books_df = None
count_matrix = None
count = None

def load_model():
    """Loads the dataset and trains the TF-IDF model in memory."""
    global books_df, count_matrix, count
    try:
        # Construct path to CSV (assumes it's in the same folder as this script)
        csv_path = os.path.join(os.path.dirname(__file__), "merged_books_dataset.csv")
        
        if not os.path.exists(csv_path):
            print(f"❌ Error: CSV file not found at {csv_path}")
            return

        books_df = pd.read_csv(csv_path)
        
        # Fill missing values to avoid errors
        books_df = books_df.fillna("")
        
        # Create a combined string for content matching
        books_df['combined_features'] = books_df['title'].astype(str) + " " + \
                                      books_df['authors'].astype(str) + " " + \
                                      books_df['description'].astype(str) + " " + \
                                      books_df['categories'].astype(str)
        
        # Initialize TF-IDF Vectorizer
        count = TfidfVectorizer(stop_words='english')
        count_matrix = count.fit_transform(books_df['combined_features'])
        
        print("✅ Book Recommender Model Loaded Successfully!")
        
    except Exception as e:
        print(f"❌ Error loading book recommender: {e}")
        books_df = None

# Load model immediately on import
load_model()

def get_recommendations(interests, recent_assignments, difficulty="Intermediate", skill_level=3, num_results=5):
    """
    Generates book recommendations based on user interests and recent work.
    Now properly uses difficulty and skill_level parameters.
    """
    if books_df is None:
        print("⚠️ Model not loaded, cannot recommend.")
        return []

    # 1. Construct a search query from user profile
    search_terms = " ".join(interests + recent_assignments)
    
    if not search_terms.strip():
        return []

    try:
        # Create a vector for the user's query
        user_tfidf = count.transform([search_terms])
        
        # Calculate similarity between user query and all books
        sim_scores = cosine_similarity(user_tfidf, count_matrix).flatten()
        
        # Get top indices (more than we need for filtering)
        top_indices = sim_scores.argsort()[-(num_results * 3):][::-1]
        
        results = []
        for idx in top_indices:
            # Skip if similarity is too low (irrelevant)
            if sim_scores[idx] < 0.05: 
                continue
                
            book = books_df.iloc[idx]
            
            # Apply difficulty filtering based on skill level
            if not matches_difficulty_preference(book, difficulty, skill_level):
                continue
            
            # Handle potential missing columns safely
            desc = str(book.get('description', 'No description available'))
            if len(desc) > 150:
                desc = desc[:150] + "..."

            # Determine actual book difficulty for display
            book_difficulty = determine_book_difficulty(book, skill_level)
            
            results.append({
                "id": int(idx),
                "title": str(book.get('title', 'Unknown Title')),
                "author": str(book.get('authors', 'Unknown Author')),
                "description": desc,
                "rating": float(book.get('rating', 0.0)) if book.get('rating') != "" else 0.0,
                "genre": str(book.get('categories', 'General')),
                "difficulty": book_difficulty,
                "aiExplanation": generate_ai_explanation(book, interests, recent_assignments, difficulty, skill_level)
            })
            
            # Stop if we have enough results
            if len(results) >= num_results:
                break
                
        return results
        
    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        return []

def matches_difficulty_preference(book, desired_difficulty, skill_level):
    """
    Filter books based on difficulty preference and skill level.
    """
    # Extract book characteristics that might indicate difficulty
    title = str(book.get('title', '')).lower()
    description = str(book.get('description', '')).lower()
    categories = str(book.get('categories', '')).lower()
    
    # Define difficulty keywords
    beginner_keywords = ['beginner', 'introductory', 'introduction', 'basic', 'fundamentals', 'getting started', 'learn', 'starter']
    advanced_keywords = ['advanced', 'expert', 'professional', 'master', 'deep dive', 'comprehensive', 'complex']
    
    # Determine book's inherent difficulty
    book_difficulty = 'Intermediate'  # default
    
    beginner_count = sum(1 for keyword in beginner_keywords if keyword in title or keyword in description)
    advanced_count = sum(1 for keyword in advanced_keywords if keyword in title or keyword in description)
    
    if beginner_count > advanced_count:
        book_difficulty = 'Beginner'
    elif advanced_count > beginner_count:
        book_difficulty = 'Advanced'
    
    # Match with user preference
    if desired_difficulty == 'Beginner':
        return book_difficulty == 'Beginner' or (book_difficulty == 'Intermediate' and skill_level <= 2)
    elif desired_difficulty == 'Intermediate':
        return book_difficulty in ['Beginner', 'Intermediate', 'Advanced']
    elif desired_difficulty == 'Advanced':
        return book_difficulty == 'Advanced' or (book_difficulty == 'Intermediate' and skill_level >= 4)
    
    return True

def determine_book_difficulty(book, skill_level):
    """
    Determine the actual difficulty level of a book.
    """
    title = str(book.get('title', '')).lower()
    description = str(book.get('description', '')).lower()
    
    beginner_keywords = ['beginner', 'introductory', 'introduction', 'basic', 'fundamentals']
    advanced_keywords = ['advanced', 'expert', 'professional', 'master', 'complex']
    
    beginner_count = sum(1 for keyword in beginner_keywords if keyword in title or keyword in description)
    advanced_count = sum(1 for keyword in advanced_keywords if keyword in title or keyword in description)
    
    if beginner_count > advanced_count:
        return 'Beginner'
    elif advanced_count > beginner_count:
        return 'Advanced'
    else:
        return 'Intermediate'

def generate_ai_explanation(book, interests, recent_assignments, difficulty, skill_level):
    """
    Generate personalized AI explanation for why the book was recommended.
    """
    explanations = []
    
    if interests:
        explanations.append(f"matches your interest in '{interests[0]}'")
    
    if recent_assignments:
        explanations.append(f"relates to your recent work on '{recent_assignments[0][:30]}...'")
    
    # Add difficulty-based explanation
    if difficulty:
        explanations.append(f"appropriate for your {difficulty.lower()} level")
    
    # Add skill level explanation
    explanations.append(f"suits your skill level ({skill_level}/5)")
    
    return "Recommended because it " + ", and ".join(explanations) + "."