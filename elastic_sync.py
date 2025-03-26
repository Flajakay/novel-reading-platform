from elasticsearch import Elasticsearch
from pymongo import MongoClient
import os

# MongoDB connection
MONGODB_URI = "mongodb://localhost:27017"  # Replace with your MongoDB URI
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client['novel-platform']  # Replace with your database name
novels_collection = db['novels']

# Elasticsearch connection
ELASTICSEARCH_NODE = "http://localhost:9200"  # Replace with your Elasticsearch URL
ELASTICSEARCH_USERNAME = ""  # Replace if needed
ELASTICSEARCH_PASSWORD = ""  # Replace if needed

es_client = Elasticsearch(
    ELASTICSEARCH_NODE,
    basic_auth=(ELASTICSEARCH_USERNAME, ELASTICSEARCH_PASSWORD) if ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD else None,
    verify_certs=False
)

# Novel index configuration (same as in your elasticsearch.js)
NOVEL_INDEX = 'novels'
NOVEL_MAPPING = {
    "mappings": {
        "properties": {
            "id": { "type": "keyword" },
            "title": { 
                "type": "text",
                "analyzer": "standard",
                "fields": {
                    "keyword": { "type": "keyword" },
                    "completion": { "type": "completion" }
                }
            },
            "description": { 
                "type": "text",
                "analyzer": "standard"
            },
            "author": {
                "properties": {
                    "id": { "type": "keyword" },
                    "username": { "type": "keyword" }
                }
            },
            "genres": { "type": "keyword" },
            "tags": { "type": "keyword" },
            "status": { "type": "keyword" },
            "calculatedStats": {
                "properties": {
                    "averageRating": { "type": "float" },
                    "ratingCount": { "type": "integer" }
                }
            },
            "viewCount": { "type": "integer" },
            "totalChapters": { "type": "integer" },
            "createdAt": { "type": "date" },
            "updatedAt": { "type": "date" }
        }
    },
    "settings": {
        "analysis": {
            "analyzer": {
                "standard": {
                    "type": "standard",
                    "stopwords": "_english_"
                }
            }
        }
    }
}

def setup_elasticsearch():
    """Initialize Elasticsearch index if it doesn't exist"""
    if not es_client.indices.exists(index=NOVEL_INDEX):
        es_client.indices.create(index=NOVEL_INDEX, body=NOVEL_MAPPING)
        print(f"Created Elasticsearch index: {NOVEL_INDEX}")

def transform_novel_for_es(novel):
    """Transform MongoDB novel document to Elasticsearch format"""
    return {
        "id": str(novel["_id"]),
        "title": novel["title"],
        "description": novel["description"],
        "author": {
            "id": str(novel["author"]),
            "username": "author"  
        },
        "genres": novel["genres"],
        "tags": novel["tags"],
        "status": novel["status"],
        "calculatedStats": novel["calculatedStats"],
        "viewCount": novel["viewCount"],
        "totalChapters": novel["totalChapters"],
        "createdAt": novel.get("createdAt"),
        "updatedAt": novel.get("updatedAt")
    }

def sync_novels():
    """Synchronize all novels from MongoDB to Elasticsearch"""
    # First, ensure the index exists
    setup_elasticsearch()

    # Get all novels from MongoDB
    novels = novels_collection.find()
    
    # Counter for progress tracking
    total_synced = 0
    errors = 0

    # Process each novel
    for novel in novels:
        try:
            # Transform the novel document
            es_doc = transform_novel_for_es(novel)
            
            # Index the document in Elasticsearch
            es_client.index(
                index=NOVEL_INDEX,
                id=str(novel["_id"]),
                document=es_doc
            )
            total_synced += 1
            
            if total_synced % 10 == 0:
                print(f"Synchronized {total_synced} novels...")
                
        except Exception as e:
            print(f"Error syncing novel {novel.get('_id')}: {str(e)}")
            errors += 1

    print(f"\nSync completed!")
    print(f"Successfully synchronized: {total_synced} novels")
    print(f"Errors encountered: {errors}")

if __name__ == "__main__":
    print("Starting Elasticsearch synchronization...")
    sync_novels()