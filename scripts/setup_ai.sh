#!/bin/bash

# SoccerStats Setup Script - AI Summary Configuration

echo "🚀 SoccerStats AI Summary Setup"
echo "==============================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env created (update with your API key!)"
else
    echo "✓ .env already exists"
fi

echo ""
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Get your Gemini API key: https://ai.google.dev"
echo "   2. Edit .env and add your API key:"
echo "      GEMINI_API_KEY=your_key_here"
echo "   3. Run: python3 web/server.py"
echo "   4. Go to http://localhost:5050/#!/average-touches"
echo ""
echo "📚 For more help, see SETUP_AI_SUMMARY.md"
echo ""
