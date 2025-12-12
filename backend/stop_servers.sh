#!/bin/bash
# 실행 중인 모든 서버를 종료하는 스크립트
# 사용법: bash stop_servers.sh

LOG_DIR="./logs"

echo "⚠️  서버를 종료합니다..."

# PID 파일이 있으면 해당 프로세스 종료
if [ -d "$LOG_DIR" ]; then
    for pidfile in "$LOG_DIR"/server_*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "   프로세스 $pid 종료 중..."
                kill "$pid"
            fi
            rm "$pidfile"
        fi
    done
fi

# uvicorn 프로세스 직접 종료
pkill -f 'uvicorn app.main:app' 2>/dev/null

echo "✅ 모든 서버가 종료되었습니다."

