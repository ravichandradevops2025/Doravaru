#!/bin/bash
# deploy.sh

echo "🚀 Deploying Doravaru Trading Platform..."

# Build and start services
docker-compose down
docker-compose build
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
docker-compose exec backend python -c "
from app.database.database import engine
from app.database.models import Base
Base.metadata.create_all(bind=engine)
print('✅ Database tables created')
"

# Health check
echo "🔍 Running health checks..."
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:3000 || exit 1

echo "✅ Doravaru platform deployed successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"

echo ""
echo "⚠️  IMPORTANT DISCLAIMERS:"
echo "📋 This platform provides educational analysis only"
echo "💰 Not investment advice - always do your own research"
echo "🔐 Ensure proper API keys are configured"
echo "📊 Verify all trade ideas with your broker"