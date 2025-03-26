from pymongo import MongoClient
from faker import Faker
import random
from datetime import datetime
import os
from bson import ObjectId

# Initialize Faker
fake = Faker()

# MongoDB connection
MONGODB_URI = "mongodb://localhost:27017"  # Replace with your MongoDB URI
client = MongoClient(MONGODB_URI)
db = client['novel-platform']  # Replace with your database name
novels_collection = db['novels']

# Predefined lists for generating realistic novel data
GENRES = [
    "fantasy", "science-fiction", "romance", "mystery", "thriller",
    "horror", "historical-fiction", "adventure", "contemporary",
    "literary-fiction", "coming-of-age", "dystopian", "paranormal",
    "urban-fantasy", "epic-fantasy"
]

TAGS = [
    "magic", "dragons", "space", "time-travel", "love", "war",
    "mystery", "supernatural", "politics", "kingdom", "epic",
    "young-adult", "dark", "adventure", "quest", "ancient",
    "future", "technology", "prophecy", "heroes", "villains",
    "mythology", "legends", "empire", "rebellion", "survival",
    "friendship", "family", "revenge", "journey"
]

NOVEL_STATUS = ["ongoing", "completed", "hiatus"]

def generate_description():
    """Generate a realistic novel description"""
    templates = [
        f"In a {fake.word()} world where {fake.sentence(nb_words=6)}, {fake.sentence(nb_words=8)} Now, {fake.sentence(nb_words=10)}",
        f"When {fake.name()} discovers {fake.sentence(nb_words=6)}, {fake.sentence(nb_words=12)}",
        f"The story follows {fake.name()}, a {fake.word()} {fake.word()} who {fake.sentence(nb_words=8)} {fake.sentence(nb_words=10)}",
        f"In the {fake.word()} kingdom of {fake.city()}, {fake.sentence(nb_words=8)} {fake.sentence(nb_words=10)}"
    ]
    return random.choice(templates)

def generate_novel():
    """Generate a single novel document"""
    # Use an existing author ID from your database
    author_id = ObjectId("6789049c8f7134745f1aea7f")
    
    num_genres = random.randint(1, 4)
    num_tags = random.randint(3, 8)
    
    return {
        "title": fake.sentence(nb_words=random.randint(2, 6)).rstrip('.'),
        "description": generate_description(),
        "author": author_id,
        "genres": random.sample(GENRES, num_genres),
        "tags": random.sample(TAGS, num_tags),
        "status": random.choice(NOVEL_STATUS),
        "totalChapters": random.randint(0, 50),
        "viewCount": random.randint(0, 10000),
        "calculatedStats": {
            "averageRating": round(random.uniform(3.0, 5.0), 2),
            "ratingCount": random.randint(0, 1000)
        },
        "createdAt": fake.date_time_between(start_date="-2y", end_date="now"),
        "updatedAt": fake.date_time_between(start_date="-1y", end_date="now")
    }

def insert_novels(count=100):
    """Generate and insert multiple novels"""
    novels = []
    for _ in range(count):
        novel = generate_novel()
        novels.append(novel)
    
    # Insert novels in bulk
    try:
        result = novels_collection.insert_many(novels)
        print(f"Successfully inserted {len(result.inserted_ids)} novels")
    except Exception as e:
        print(f"Error inserting novels: {e}")

if __name__ == "__main__":
    # Insert 100 novels
    print("Starting novel generation...")
    insert_novels(100)
    print("Novel generation completed!")