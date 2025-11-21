# Powerhouse Museum Sustainable Supplier Evaluation System

A comprehensive frontend application for evaluating suppliers based on sustainability criteria. The system supports manual assessments, AI-powered evaluations, and weighted scoring across multiple categories.

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

## Deployment to GitHub Pages

### Option 1: GitHub Actions (Recommended)

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v2
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

2. In your GitHub repository:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

3. Push to main branch - deployment will trigger automatically.

### Option 2: Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Copy the `dist` folder contents to your `gh-pages` branch:
```bash
git checkout -b gh-pages
git add dist/
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

3. In GitHub repository settings:
   - Go to Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select `gh-pages` branch and `/` folder

### Option 3: Using gh-pages package

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://<your-username>.github.io/<repo-name>"
}
```

3. Deploy:
```bash
npm run deploy
```

## Important Notes for Deployment

1. **Base Path**: If deploying to a subdirectory, update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
})
```

2. **CSV Files**: Ensure `questions.csv` and `weights.csv` are in the `public/` folder (or root) so they're accessible after deployment.

3. **Environment Variables**: For production, use environment variables for API keys:
   - Create `.env.production`:
   ```
   VITE_OPENAI_API_KEY=your-key-here
   ```
   - Access in code: `import.meta.env.VITE_OPENAI_API_KEY`

4. **CORS**: If loading CSV files from a different domain, ensure CORS headers are set correctly.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Questions

1. Update `questions.csv` with new questions
2. The system will automatically parse and load them on next refresh

### Modifying Weights

1. Update `weights.csv` or use the Settings UI
2. Weights are normalized automatically (sum to 1.0)

## Troubleshooting

### CSV Files Not Loading

- Ensure CSV files are in the `public/` directory
- Check browser console for CORS errors
- Verify CSV format matches expected structure

### API Key Issues

- Verify API key format (should start with `sk-`)
- Check browser console for API errors
- Ensure API key has sufficient credits

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)
- Verify all dependencies are installed

## License

[Your License Here]

## Support

For issues or questions, please open an issue on GitHub.

