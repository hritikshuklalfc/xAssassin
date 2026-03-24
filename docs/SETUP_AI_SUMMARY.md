# AI Summary Setup Guide

## Quick Start

The Formation Analyzer webapp now includes **AI-powered tactical analysis** using Google Gemini AI. Here's how to set it up:

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Get Your Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev)
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your text editor and add your Gemini API key:

   ```
   GEMINI_API_KEY=your_key_here_from_step_2
   ENABLE_AI_SUMMARY=True
   AI_MODEL=gemini-pro
   ```

3. Save the file

### Step 4: Run the App

```bash
python3 web/server.py
```

Visit `http://localhost:5050` and go to **Average Touches** page. AI summaries will appear automatically!

## Features

### What Gets Analyzed?

When you select a match and team, the AI analyzes:

- **Formation Shape**: Detected formation (e.g., 4-3-3, 3-5-2)
- **Player Involvement**: Top players by touch count
- **Positioning**: Average x,y coordinates showing field dominance
- **Substitution Impact**: How tactical changes affected play

### Summary Section

The tactical analysis appears above the pitch visualizations:

- Shows formation analysis for both teams
- Explains positioning and key tactics
- Highlights substitution impacts
- 100% AI-generated based on match data

## Troubleshooting

**"AI summary disabled" error:**

- Check that `ENABLE_AI_SUMMARY=True` in `.env`
- Restart the Flask server

**No summaries appearing:**

- Verify `GEMINI_API_KEY` is set correctly
- Check browser console (F12) for API errors
- Ensure you're selecting a valid match

**Error: "No module named 'google'":**

- Run: `pip install google-generativeai`

## Privacy & Security

- API key is stored **locally** in `.env` (never committed to git)
- `.env` is in `.gitignore` by default
- All processing happens server-side
- No data is stored externally

## Disabling AI

To disable AI summaries:

1. Set `ENABLE_AI_SUMMARY=False` in `.env`
2. Restart the app
3. Summaries won't appear

## File Changes

New files created:

- `.env.example` - Template for environment variables
- `.env` - Your actual secrets (never committed)
- `requirements.txt` - Python dependencies with Gemini

Updated files:

- `web/server.py` - Added `/api/match/<id>/ai-summary` endpoint
- `web/static/js/app.jsx` - Added AI summary display component
- `web/static/css/styles.css` - Added CSS for summary cards

## Next Steps

- 🎯 **Set up your API key** (see Step 2 above)
- 🚀 **Run the app** and test on the Average Touches page
- 📊 **Check the tactical analysis** for insights
- ⚙️ **Customize** by modifying the prompt in `web/server.py` if desired
