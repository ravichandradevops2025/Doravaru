import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.main import app

# Vercel handler
def handler(request):
    return app