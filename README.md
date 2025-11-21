# Powerhouse Museum Sustainable Supplier Evaluation System

Prototype frontend for supplier sustainability assessments: structured questionnaires, evidence capture, and weighted scoring with optional AI assist. Demo video placeholder: [YouTube link](https://youtu.be/lWaKeU7Omo0)

## Background

Built to support circularity-focused exhibitions, this prototype helps teams choose suppliers who plan for material reuse, disassembly, and low waste across every build. The goal is a simple, evidence-based way to track sustainability and circularity from procurement through installation and decommissioning.

## Features

- **Supplier Management**: Add, edit, and manage supplier assessments
- **Weighted Scoring**: Adjustable category weights for custom scoring
- **AI Assessment**: OpenAI integration for automated supplier evaluation (placeholder)
- **CSV-based Questions**: Dynamic question loading from CSV files
- **Data Persistence**: Local storage with JSON export/import
- **Settings Management**: Configure API keys and category weights

## Project Structure

```
tph/
├── server/                               # Backend server
│   ├── index.js                         # Express server with OpenAI integration
│   ├── package.json
│   └── .env.example                     # Backend environment template
├── src/
│   ├── components/
│   │   └── PowerhouseSupplierSystem.tsx  # Main component
│   ├── utils/
│   │   ├── csvParser.ts                  # CSV parsing utilities
│   │   ├── storage.ts                    # Data persistence
│   │   ├── scoring.ts                    # Scoring calculations
│   │   └── openai.ts                     # Backend API client
│   ├── App.tsx                           # App entry point
│   └── main.tsx                          # React entry
├── public/
│   ├── questions.csv                     # Assessment questions
│   └── weights.csv                       # Category weights
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tph
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Configuration

### AI Assessment Setup

The system uses a secure backend server to handle OpenAI API calls. The API key is stored server-side and never exposed to the frontend.

#### Backend Setup

1. **Navigate to server directory:**
```bash
cd server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure API key:**
```bash
cp .env.example .env
```

4. **Add your OpenAI API key to `server/.env`:**
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

5. **Start the backend server:**
```bash
npm start
```

The server runs on `http://localhost:3001` by default.

#### Frontend Configuration (Optional)

If your backend is running on a different URL, create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:3001
```

See `server/README.md` for more details on the backend setup.

### Category Weights

1. Navigate to Settings
2. Adjust the weights for each category (weights will auto-normalize to sum to 1.0)
3. Click "Save Weights"

Default weights are loaded from `weights.csv`.

## Data Storage

- **Local Storage**: All data is stored in browser localStorage
- **Export**: Export suppliers to JSON via Settings
- **Import**: Import suppliers from JSON via Settings
