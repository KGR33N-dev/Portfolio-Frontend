#!/bin/bash

# Skrypt do przełączania między lokalnym a zdalnym API
# Usage: ./switch-api.sh [local|remote|status]

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Plik .env nie istnieje"
    exit 1
fi

function show_status() {
    local api_url=$(grep "^PUBLIC_API_URL=" "$ENV_FILE" | cut -d'=' -f2-)
    local frontend_url=$(grep "^PUBLIC_FRONTEND_URL=" "$ENV_FILE" | cut -d'=' -f2-)
    
    echo "🔧 Aktualna konfiguracja:"
    echo "📡 API URL: $api_url"
    echo "🌐 Frontend URL: $frontend_url"
    
    if [[ "$api_url" == *"localhost"* ]]; then
        echo "🏠 Tryb: LOKALNY"
    else
        echo "☁️ Tryb: PRODUKCYJNY"
    fi
}

function switch_to_local() {
    sed -i 's|PUBLIC_API_URL=.*|PUBLIC_API_URL=http://localhost:8000|g' "$ENV_FILE"
    sed -i 's|PUBLIC_FRONTEND_URL=.*|PUBLIC_FRONTEND_URL=http://localhost:4321|g' "$ENV_FILE"
    sed -i 's|NODE_ENV=.*|NODE_ENV=development|g' "$ENV_FILE"
    echo "✅ Przełączono na LOKALNY backend"
    echo "📍 API URL: http://localhost:8000"
    echo "🌐 Frontend URL: http://localhost:4321"
    echo "💡 Pamiętaj aby uruchomić lokalny serwer FastAPI!"
}

function switch_to_remote() {
    sed -i 's|PUBLIC_API_URL=.*|PUBLIC_API_URL=https://api.kgr33n.com|g' "$ENV_FILE"
    sed -i 's|PUBLIC_FRONTEND_URL=.*|PUBLIC_FRONTEND_URL=https://kgr33n.com|g' "$ENV_FILE"
    sed -i 's|NODE_ENV=.*|NODE_ENV=production|g' "$ENV_FILE"
    echo "✅ Przełączono na ZDALNY backend"
    echo "📍 API URL: https://api.kgr33n.com"
    echo "🌐 Frontend URL: https://kgr33n.com"
    echo "☁️ Używa serwera produkcyjnego"
}

case "$1" in
    "local")
        switch_to_local
        ;;
    "remote")
        switch_to_remote
        ;;
    "status")
        show_status
        ;;
    *)
        echo "🔧 Przełącznik API Backend"
        echo ""
        echo "Usage: $0 [local|remote|status]"
        echo ""
        echo "Commands:"
        echo "  local   - Przełącz na lokalny backend (localhost:8000)"
        echo "  remote  - Przełącz na zdalny backend (EC2)"
        echo "  status  - Pokaż aktualną konfigurację"
        echo ""
        show_status
        echo ""
        echo "Po zmianie uruchom: npm run build lub npm run dev"
        ;;
esac
