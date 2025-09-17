#!/bin/bash
echo "🚀 Setting up Doravaru Trading Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Copy environment file
echo "📝 Setting up environment..."
cp .env.example .env
echo "✅ Environment file created. Please edit .env with your API keys."

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/historical data/news data/config
mkdir -p monitoring/logs

echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for services to start..."
sleep 10

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys (especially OPENAI_API_KEY)"
echo "2. Run: docker-compose up"
echo "3. Access the platform at: http://localhost:3000"
echo "4. API docs at: http://localhost:8000/docs"
echo ""
echo "⚠️  Remember: This provides educational analysis only, not investment advice!"