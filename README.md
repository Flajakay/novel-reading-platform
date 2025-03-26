# Novel Reading Platform API

A robust REST API for a web-based novel reading platform that allows authors to publish novels and readers to discover, read, and track their reading progress.

## ⚠️ Development Status

This project is currently in active development and is **not production ready**. Use at your own risk. Features may change, APIs may be updated, and security improvements are ongoing.

## 🚀 Features

- **Novel Management**: Create, read, update, and delete novels with metadata such as title, description, genres, tags, and cover images
- **Chapter Management**: Organize novels into chapters with read tracking and analytics
- **User Authentication**: Secure JWT-based authentication system
- **Reader Library**: Allows users to save novels to their personal library and track reading progress
- **Search and Filtering**: Advanced search functionality powered by Elasticsearch
- **Analytics**: Reading statistics and insights for authors
- **RESTful API**: Well-documented API for easy frontend integration
- **Swagger Documentation**: Interactive API documentation

## 📋 Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Search Engine**: Elasticsearch for full-text search and filtering
- **Authentication**: JWT (JSON Web Tokens)
- **Documentation**: Swagger/OpenAPI
- **Validation**: Express Validator
- **File Handling**: Multer
- **Logging**: Winston

## 🔧 Setup and Installation

### Prerequisites

- Node.js (v14+ recommended)
- MongoDB (v4+ recommended)
- Elasticsearch (v7+ recommended)

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/novel-api

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_chars_long
JWT_ACCESS_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=30d

# CORS
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/novel-reading-platform.git
   cd novel-reading-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start your MongoDB server

4. Start Elasticsearch server

5. Run the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000` (or the port specified in your .env file).

### API Documentation

Access the Swagger API documentation at: `http://localhost:5000/api/docs`

## 📜 License

This project is licensed under the MIT License - see the [LICENSE] file for details.

## 👥 Contributing

Contributions are welcome! This project is in active development and could benefit from community involvement. Here's how you can contribute:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to your branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a pull request**

### Contribution Guidelines

- Follow the existing code style and structure
- Update documentation as needed
- Keep pull requests focused on a single feature or bug fix

### Development Roadmap

- [ ] Comment system for novels and chapters
- [ ] Reading recommendations
- [ ] Notification system
- [ ] User profile customization
- [ ] Improved analytics
- [ ] Admin panel
- and more...

## 🌐 Deployment

Deployment documentation will be added once the project reaches a more stable state.
