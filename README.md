# AI-Powered Personalized Learning Platform 🚀

**NVIDIA Agentic Toolkit Hackathon Submission**

## Deployed at https://axonlearn.com/

Demo Video: https://youtu.be/2hLfvUNRs1w

An intelligent, full-stack education platform that leverages AI to create personalized learning experiences, featuring adaptive study plans, intelligent content generation, and conversational AI tutoring.

## 🏆 Hackathon Overview

This project was built for the NVIDIA Agentic Toolkit Hackathon, showcasing the power of AI agents in educational technology. Our platform demonstrates how modern AI can transform traditional learning into a dynamic, personalized experience.

## ✨ Features

### 🎯 Core Learning Features
- **Personalized Learning Plans** - AI-generated study paths tailored to individual learning styles
- **Smart Study Guides** - Dynamic study materials adapted to user progress
- **AI-Powered Flashcards** - Context-aware flashcard generation for effective memorization
- **Interactive Quizzes** - Adaptive assessments that adjust difficulty based on performance
- **Formula Generator** - Mathematical and scientific formula explanations with visual aids

### 🤖 AI & Conversational Features
- **AI Chatbot Tutor** - Real-time conversational assistance and explanations
- **Document Upload & Processing** - Upload PDFs and documents for AI analysis and content extraction
- **Contextual Help** - AI provides relevant assistance based on current learning context

### 👤 User Experience
- **Secure Authentication** - NextAuth.js powered login/signup system
- **Responsive Design** - Modern, dark/light theme compatible interface
- **Progress Tracking** - Visual progress indicators and learning analytics
- **Profile Management** - Customizable user profiles with learning preferences

## 🛠️ Technology Stack

### Frontend
- **Next.js** - React framework with app router
- **Tailwind CSS** - Utility-first styling
- **NextAuth** - Authentication and session management

### Backend
- **FastAPI** - High-performance Python web framework
- **LangChain** - AI application framework and orchestration
- **NVIDIA AIQ Toolkit** - For AI Workflow Observability
- **AWS DynamoDB** - NoSQL database for user data and learning plans
- **AWS S3** - Document storage and processing
- **PostgreSQL** - Structured data storage

### AI & ML Components
- **NVIDIA NIM Endpoints** - Optimized inference for AI models
- **NemoRetriever RAG and Ingestor Servers** - Full RAG and Ingestion Workflow
- **Milvus** - Vector database for similarity search

## 🏗️ Architecture Diagrams



## 🚀 Deployment

## Due to this being a fullstack app, deployment is complicated and not recommended; visit the deployed version at https://axonlearn.com/ (uses this exact repo code)

1. Authenticate docker with Nvidia key credentials
2. Add following .env to backend directory:
```
NGC_API_KEY=YOUR KEY HERE
AWS_ACCESS_KEY_ID=YOUR KEY HERE
AWS_SECRET_ACCESS_KEY=YOUR KEY HERE
AWS_DEFAULT_REGION=us-west-2
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=axon
NIM_API_KEY=YOUR KEY HERE
NIM_RETRIEVER_URL=http://rag-server:8081
NIM_INGESTION_URL=http://ingestor-server:8082

# NVIDIA ENV

# ==== Endpoints for using cloud NIMs ===
APP_EMBEDDINGS_SERVERURL=""
APP_LLM_SERVERURL=""
APP_RANKING_SERVERURL=""
EMBEDDING_NIM_ENDPOINT=https://integrate.api.nvidia.com/v1
PADDLE_HTTP_ENDPOINT=https://ai.api.nvidia.com/v1/cv/baidu/paddleocr
PADDLE_INFER_PROTOCOL=http
YOLOX_HTTP_ENDPOINT=https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-page-elements-v2
YOLOX_INFER_PROTOCOL=http
YOLOX_GRAPHIC_ELEMENTS_HTTP_ENDPOINT=https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-graphic-elements-v1
YOLOX_GRAPHIC_ELEMENTS_INFER_PROTOCOL=http
YOLOX_TABLE_STRUCTURE_HTTP_ENDPOINT=https://ai.api.nvidia.com/v1/cv/nvidia/nemoretriever-table-structure-v1
YOLOX_TABLE_STRUCTURE_INFER_PROTOCOL=http

# Set GPU IDs for local deployment
# ==== LLM ====
LLM_MS_GPU_ID=1

# ==== Embeddings ====
EMBEDDING_MS_GPU_ID=0

# ==== Reranker ====
RANKING_MS_GPU_ID=0

# ==== Vector DB GPU ID ====
VECTORSTORE_GPU_DEVICE_ID=0

# ==== Ingestion NIMs GPU ids ====
YOLOX_MS_GPU_ID=0
YOLOX_GRAPHICS_MS_GPU_ID=0
YOLOX_TABLE_MS_GPU_ID=0
PADDLE_MS_GPU_ID=0

APP_VECTORSTORE_ENABLEGPUSEARCH=False
APP_VECTORSTORE_ENABLEGPUINDEX=False
```
3. The backend requires the following AWS Resources:
S3 Bucket: axon
DynamoDB Tables:
- learning-plans: user_id primary key string, timestamp sort key integer
- chat-history: user_id primary key string, timestamp sort key integer
- personalization: user_id primary key string, timestamp sort key integer

4. run docker compose build and docker compose up in backend directory

5. Frontend .env: ```NEXTAUTH_URL=YOUR URL
NEXTAUTH_SECRET=73JFNyORgCOkliVNbHDB1btorDHNlLpeLyM17NBj0enAUNmHHRzrP+CBNjM=
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=axon
DB_HOST=localhost
DB_PORT=5432```

6. Frontend: in frontend/learning-run `npm install . --legacy-peer-deps`, then `npm run build`, then `npm run start`
