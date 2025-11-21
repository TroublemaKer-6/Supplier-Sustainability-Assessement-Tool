# Backend Server for Powerhouse Supplier Evaluation System

This backend server handles OpenAI API calls securely, keeping the API key on the server side.

## Setup

1. **Install dependencies:**
```bash
cd server
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

3. **Add your OpenAI API key to `.env`:**
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

4. **Start the server:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### AI Assessment
```
POST /api/assess
Content-Type: application/json

{
  "supplierName": "Company Name",
  "location": "Sydney, NSW",
  "materials": ["Timber", "Steel"],
  "website": "https://example.com",
  "additionalNotes": "Any additional context",
  "criteria": {
    "1.1": {
      "question": "...",
      "options": [...],
      "maxScore": 4
    },
    ...
  }
}
```

Returns assessment results for all criteria.