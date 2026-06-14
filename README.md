# 🕊️ NayePankh AI Assistant

An AI-powered webpage for **NayePankh Foundation** that helps visitors learn about the NGO, volunteering opportunities, and social initiatives — powered by **Groq API + Llama 3.3 (70B)**.

---

## 🌟 Features

### AI Feature 1: AI NGO Chatbot
Ask questions about NayePankh Foundation and get instant AI-powered responses.
- "What does NayePankh do?"
- "How can I volunteer?"
- "Tell me about education initiatives"
- "How can I donate?"

### AI Feature 2: Personalized Volunteer Recommendation
Fill in your profile (name, interests, skills, available time) and get AI-generated volunteer role recommendations matched to your strengths.

### AI Feature 3: AI Campaign Content Generator
Enter a campaign topic (e.g., "Tree Plantation Drive") and the AI generates:
- Social media caption
- Awareness message
- Volunteer recruitment text

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| AI Model | Groq Cloud API (Llama 3.3 70B) |
| Database | SQLite |
| Data | JSON |

---

## 📁 Folder Structure

```
nayepankh-ai-platform/
│
├── backend/
│   ├── __init__.py              # Python package marker
│   ├── main.py                  # FastAPI application
│   ├── chat.py                  # AI Chatbot endpoint
│   ├── recommendation.py       # Volunteer recommendation endpoint
│   ├── content_generator.py    # Campaign content generator endpoint
│   └── database.py             # SQLite database setup & helpers
│
├── frontend/
│   ├── index.html               # Main webpage
│   ├── style.css                # Styling
│   └── script.js                # Frontend logic
│
├── data/
│   └── ngo_info.json            # NayePankh Foundation data
│
├── requirements.txt             # Python dependencies
├── .gitignore
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- **Python 3.8+** installed
- **Ollama** installed ([Download Ollama](https://ollama.com/download))

### Step 1: Get Your Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com) and create a free account.
2. Navigate to "API Keys" and click "Create API Key".
3. Copy the generated key.
4. Open the `.env` file in the root of your project directory.
5. Paste your key in the file: `GROQ_API_KEY="your_actual_key_here"`

### Step 2: Setup Backend

```bash
# Navigate to the project directory
cd nayepankh-ai-platform

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn backend.main:app --reload --port 8000
```

The backend will be running at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Step 3: Open Frontend

Simply open `frontend/index.html` in your browser:
- Double-click the file, OR
- Use VS Code Live Server extension, OR
- Use Python: `python -m http.server 5500 --directory frontend`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ngo-info` | Get NGO information |
| POST | `/api/chat` | Chat with AI assistant |
| POST | `/api/recommend` | Get volunteer recommendation |
| POST | `/api/generate-content` | Generate campaign content |

### Example API Calls

```bash
# Health check
curl http://localhost:8000/api/health

# Chat with AI
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What does NayePankh do?"}'

# Get volunteer recommendation
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"name": "Priya", "interests": "education", "skills": "teaching", "available_time": "4-6 hours per week"}'

# Generate campaign content
curl -X POST http://localhost:8000/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{"campaign_topic": "Tree Plantation Drive"}'
```

---

## 📊 Database

The app uses **SQLite** to store:
- **chat_history** — All chatbot conversations
- **recommendations** — Volunteer recommendation requests and results
- **generated_content** — AI-generated campaign content

The database file (`nayepankh.db`) is automatically created in the `data/` directory when the server starts.

---

## 🤝 About NayePankh Foundation

**NayePankh Foundation** is a UP Government registered NGO and one of the biggest student-led organizations in India. They help underprivileged communities through:

- 📚 Education initiatives
- 🏥 Health awareness campaigns
- 💪 Women empowerment programs
- 🍲 Food distribution drives
- 🌱 Environmental campaigns

**Website:** [www.nayepankh.com](https://www.nayepankh.com)

---

## 📝 License

This project is built for educational purposes and portfolio demonstration.

Built with ❤️ using AI.
