#!/bin/bash
# 여러 포트에서 FastAPI 서버를 동시에 실행하는 쉘 스크립트
# 사용법: bash run_multiple_ports.sh

# 실행할 포트 목록
PORTS=(8000 8001)
HOST="0.0.0.0"

# 로그 파일 디렉토리
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

echo "🚀 ${#PORTS[@]}개의 서버를 시작합니다..."

# 각 포트에서 서버 실행 (백그라운드)
for port in "${PORTS[@]}"; do
    echo "   - http://$HOST:$port"
    nohup uvicorn app.main:app --host "$HOST" --port "$port" > "$LOG_DIR/server_$port.log" 2>&1 &
    echo $! > "$LOG_DIR/server_$port.pid"
done

echo ""
echo "✅ 모든 서버가 시작되었습니다!"
echo "   로그 파일: $LOG_DIR/server_*.log"
echo "   PID 파일: $LOG_DIR/server_*.pid"
echo ""
echo "서버를 중지하려면: bash stop_servers.sh"
echo "또는: pkill -f 'uvicorn app.main:app'"

