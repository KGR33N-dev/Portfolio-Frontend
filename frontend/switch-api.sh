#!/bin/bash

# Skrypt do przełączania między lokalnym a zdalnym API
# Usage: ./switch-api.sh [local|remote|status]

API_CONFIG_FILE="src/config/api.ts"

if [ ! -f "$API_CONFIG_FILE" ]; then
    echo "❌ Plik konfiguracyjny nie istnieje: $API_CONFIG_FILE"
    exit 1
fi

function show_status() {
    local line=$(grep "const USE_LOCAL_API = " "$API_CONFIG_FILE")
    if [[ "$line" == *"= true"* ]]; then
        echo "🔧 Aktualnie używany: LOKALNY backend (localhost:8000)"
    else
        echo "🔧 Aktualnie używany: ZDALNY backend (EC2: 51.20.78.79:8000)"
    fi
}

function switch_to_local() {
    sed -i 's/const USE_LOCAL_API = false;/const USE_LOCAL_API = true;/g' "$API_CONFIG_FILE"
    echo "✅ Przełączono na LOKALNY backend"
    echo "📍 Backend URL: http://localhost:8000"
    echo "💡 Pamiętaj aby uruchomić lokalny serwer FastAPI!"
}

function switch_to_remote() {
    sed -i 's/const USE_LOCAL_API = true;/const USE_LOCAL_API = false;/g' "$API_CONFIG_FILE"
    echo "✅ Przełączono na ZDALNY backend"
    echo "📍 Backend URL: http://51.20.78.79:8000"
    echo "🌐 Używa serwera na EC2"
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
