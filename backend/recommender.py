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
        # Combining Title, Author, and Description helps find better matches
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
    Matches the signature expected by main.py.
    """
    if books_df is None:
        print("⚠️ Model not loaded, cannot recommend.")
        return []

    # 1. Construct a search query from user profile
    # Combine interests and recent assignments into one search string
    search_terms = " ".join(interests + recent_assignments)
    
    if not search_terms.strip():
        return []

    try:
        # Create a vector for the user's query
        user_tfidf = count.transform([search_terms])
        
        # Calculate similarity between user query and all books
        sim_scores = cosine_similarity(user_tfidf, count_matrix).flatten()
        
        # Get top indices
        top_indices = sim_scores.argsort()[-num_results:][::-1]
        
        results = []
        for idx in top_indices:
            # Skip if similarity is too low (irrelevant)
            if sim_scores[idx] < 0.05: 
                continue
                
            book = books_df.iloc[idx]
            
            # Handle potential missing columns safely
            desc = str(book.get('description', 'No description available'))
            if len(desc) > 150:
                desc = desc[:150] + "..."

            results.append({
                "id": int(idx),
                "title": str(book.get('title', 'Unknown Title')),
                "author": str(book.get('authors', 'Unknown Author')),
                "description": desc,
                "rating": float(book.get('rating', 0.0)) if book.get('rating') != "" else 0.0,
                "genre": str(book.get('categories', 'General')),
                "difficulty": difficulty, # Just passing back user pref if data missing
                "aiExplanation": f"Recommended because it matches your interest in '{search_terms.split()[0]}'"
            })
            
        return results
        
    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        return []