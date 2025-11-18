import re
import nltk
import re
# nltk.download('punkt')
from nltk.tokenize import sent_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from tqdm import tqdm
import joblib
import os
import numpy as np
import torch
from sentence_transformers import SentenceTransformer,util
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import sys
from text_extractor import extract_content
tqdm.pandas()


def split_into_500_word_chunks(text, chunk_size=500):
    words = text.split()
    chunks = [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
    return chunks


def pre_process_data(s, stop_words):
    """
    Preprocess text data for AI detection (matches training script)
    """
    stemmer = PorterStemmer()
    processed_words = []
    
    # Remove special characters and keep only letters and spaces
    text = re.sub('[^a-zA-Z]', ' ', s)
    
    # Convert to lowercase
    text = text.lower()
    
    # Split into words
    words = text.split()
    
    # Remove stopwords and apply stemming
    for word in words:
        if word not in stop_words and len(word) > 2:  # Remove short words too
            processed_words.append(stemmer.stem(word))
    
    return " ".join(processed_words)


def split_into_paragraphs(text, min_length=100):
    # Try splitting by double line breaks first
    paragraphs = text.split('\n\n')

    # If we didn’t get many paragraphs, fall back to single line breaks
    if len(paragraphs) < 5:
        paragraphs = text.split('\n')

    # Clean and filter
    cleaned_paragraphs = [p.strip() for p in paragraphs if len(p.strip()) >= min_length]
    return cleaned_paragraphs


def predict_ai_probability(text: str) -> float:
    """
    Predict AI probability using the newly trained logistic regression model
    """
    try:
        # Load the model and vectorizer from current directory
        model = joblib.load("ai_detector_model.pkl")
        vectorizer = joblib.load("tfidf_vectorizer.pkl")
        
        # Preprocess the text (same as training script)
        stemmer = PorterStemmer()
        stop_words = set(stopwords.words("english"))
        
        # Clean the text
        cleaned_text = re.sub('[^a-zA-Z]', ' ', text)
        cleaned_text = cleaned_text.lower()
        words = cleaned_text.split()
        
        # Remove stopwords and apply stemming
        processed_words = []
        for word in words:
            if word not in stop_words and len(word) > 2:
                processed_words.append(stemmer.stem(word))
        
        processed_text = " ".join(processed_words)
        
        # Transform and predict
        vec = vectorizer.transform([processed_text])
        prob = model.predict_proba(vec)[0][1]  # Probability of class '1' (AI)
        return prob
    except Exception as e:
        print(f"Error in predict_ai_probability: {e}")
        return 0.5  # Return neutral probability if error
def giving_avg_score(chunks_of_data):
    """
    Calculate average AI probability score across all text chunks
    """
    if not chunks_of_data:
        return 0.0
    
    prob_arr = []
    for chunk in chunks_of_data:
        if chunk.strip():  # Only process non-empty chunks
            prob = predict_ai_probability(chunk)
            prob_arr.append(prob)
    
    if not prob_arr:
        return 0.0
    
    # Calculate the average
    return sum(prob_arr) / len(prob_arr)


def clean_and_filter_sentences(text):
    # Split into sentences
    sentences = sent_tokenize(text)

    cleaned = []
    for sentence in sentences:
        # Remove commas and periods
        sentence = sentence.replace(',', '').replace('.', '')

        # Remove other special characters (optional)
        sentence = re.sub(r'[^\w\s]', '', sentence)

        # Normalize spaces and strip
        sentence = re.sub(r'\s+', ' ', sentence).strip()

        # Keep sentences with more than 5 words
        if len(sentence.split()) > 5:
            cleaned.append(sentence)

    return cleaned


def robert_evaluation(list_of_sentences):
    """
    AI evaluation using logistic regression model (replaces RoBERTa model)
    Returns predictions and average AI probability for sentences
    """
    if not list_of_sentences:
        return [], 0.0
    
    store_results_of_labels = []
    probabilities = []
    
    try:
        # Process each sentence using the logistic regression model
        for sentence in list_of_sentences:
            if sentence.strip():  # Only process non-empty sentences
                ai_prob = predict_ai_probability(sentence)
                probabilities.append(ai_prob)
                # Convert probability to binary prediction (1 = AI, 0 = Human)
                prediction = 1 if ai_prob > 0.5 else 0
                store_results_of_labels.append(prediction)
        
        # Calculate average AI probability
        if probabilities:
            final_result = sum(probabilities) / len(probabilities)
        else:
            final_result = 0.0
        
        return store_results_of_labels, final_result
        
    except Exception as e:
        print(f"Error in robert_evaluation: {e}")
        # Return neutral values if error occurs
        return [0] * len(list_of_sentences), 0.5

# --------------------------    VECTORIZATION TECHNIQUES    --------------------------
def tfidf_similarity_approach(student_solution,teacher_solution):
    # convert to sentences
    # clean the sentences
    student_sen=clean_and_filter_sentences(student_solution)
    teacher_sen=clean_and_filter_sentences(teacher_solution)
    total_sen=student_sen+teacher_sen

    # tfidf vectorizer
    tfidf=TfidfVectorizer()
    tfidf_matrix=tfidf.fit_transform(total_sen)

    # cosine similarity
    cosine_similarity_apply=cosine_similarity(tfidf_matrix[:len(student_sen)],tfidf_matrix[len(student_sen)+1:])

    # average similarity
    average_similarity=np.mean(np.max(cosine_similarity_apply,axis=1))
    return average_similarity

def bert_mpnet_technique(student_solution,teacher_solution):
    device=''
    if (torch.cuda.is_available()):
        device='cuda'
    else:
        device='cpu'
    # convert to sentences
    # clean the sentences
    
    student_sen=clean_and_filter_sentences(student_solution)
    teacher_sen=clean_and_filter_sentences(teacher_solution)

    # import the model
    model=SentenceTransformer('all-mpnet-base-v2',device=device)

    # convert the sentences to the tensorts
    mpnet_teacher_sen=model.encode(teacher_sen,convert_to_tensor=True,device=device)
    mpnet_student_sen=model.encode(student_sen,convert_to_tensor=True,device=device)

    # not calculating the similartiy
    results_simarity=[]
    sum=0
    for i,stud_vec in enumerate(mpnet_student_sen):
        similaty=util.cos_sim(stud_vec,mpnet_teacher_sen)
        for_final_maxing=similaty.argmax()
        results_simarity.append(f"{similaty[0][for_final_maxing]}")

    # calculation the average similartiy
    for x in results_simarity:
        sum+=float(x)
    store=sum/len(results_simarity)
    
    # return the final value
    return store
# ----------------------------  MODULE 3: Compare with other students   ------------------------
def compare_with_others(student_solution):
    """
    Compare student solution with other student assignments using TF-IDF similarity
    """
    folder_path = 'src/data/student_assignments'
    arr_comparison = []
    
    try:
        # Check if directory exists
        if not os.path.exists(folder_path):
            print(f"Warning: Directory {folder_path} does not exist")
            return [0.0], 0.0
        
        # Get list of files in directory
        files = os.listdir(folder_path)
        if not files:
            print(f"Warning: No files found in {folder_path}")
            return [0.0], 0.0
        
        for filename in files:
            if filename.endswith(('.txt', '.pdf')):  # Only process text/PDF files
                file_path = os.path.join(folder_path, filename)
                try:
                    # Extract content from file
                    other_student_content = extract_content(file_path)
                    if other_student_content and not other_student_content.startswith("Error"):
                        # Calculate TF-IDF similarity with current student solution
                        similarity_score = tfidf_similarity_approach(student_solution, other_student_content)
                        arr_comparison.append(similarity_score)
                except Exception as e:
                    print(f"Error processing file {filename}: {e}")
                    continue
        
        # Return results
        if arr_comparison:
            return arr_comparison, max(arr_comparison)
        else:
            print("Warning: No valid student assignments found for comparison")
            return [0.0], 0.0
            
    except Exception as e:
        print(f"Error in compare_with_others: {e}")
        return [0.0], 0.0

        # print(x)