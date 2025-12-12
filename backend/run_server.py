#!/usr/bin/env python3
"""
브랜치별로 다른 포트에서 FastAPI 서버를 실행하는 스크립트

사용법:
  python run_server.py                    # 브랜치 이름 기반 자동 포트 선택
  python run_server.py --port 8000       # 특정 포트 지정
  python run_server.py -p 8001           # 짧은 옵션
  PORT=8002 python run_server.py         # 환경 변수로 포트 지정
"""
import uvicorn
import subprocess
import sys
import argparse
import os
import re

# 브랜치별 기본 포트 매핑 (브랜치 이름의 해시값 기반)
BRANCH_PORT_MAP = {
    "main": 8000,
    "master": 8000,
    "develop": 8001,
    "dev": 8001,
    # 추가 브랜치 매핑 가능
}

# 기본 포트 범위 (브랜치 이름이 매핑에 없을 때 사용)
DEFAULT_PORT_BASE = 8000
HOST = "0.0.0.0"


def get_current_branch() -> str:
    """현재 Git 브랜치 이름 가져오기"""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def get_port_from_branch(branch_name: str) -> int:
    """브랜치 이름으로부터 포트 번호 결정"""
    if not branch_name:
        return DEFAULT_PORT_BASE
    
    # 직접 매핑 확인
    if branch_name in BRANCH_PORT_MAP:
        return BRANCH_PORT_MAP[branch_name]
    
    # 브랜치 이름의 해시값 기반 포트 계산 (8000-8999 범위)
    # 간단한 해시 함수 사용
    hash_value = hash(branch_name) % 1000
    port = DEFAULT_PORT_BASE + (hash_value % 100)  # 8000-8099 범위
    
    return port


def is_port_in_use(port: int) -> bool:
    """포트가 사용 중인지 확인"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((HOST, port))
            return False
        except OSError:
            return True


def find_available_port(start_port: int, max_attempts: int = 10) -> int:
    """사용 가능한 포트 찾기"""
    for i in range(max_attempts):
        port = start_port + i
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"사용 가능한 포트를 찾을 수 없습니다 (시작 포트: {start_port})")


def main():
    parser = argparse.ArgumentParser(
        description="브랜치별로 다른 포트에서 FastAPI 서버 실행"
    )
    parser.add_argument(
        "-p", "--port",
        type=int,
        help="사용할 포트 번호 (지정하지 않으면 브랜치 기반 자동 선택)"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=HOST,
        help=f"호스트 주소 (기본값: {HOST})"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="코드 변경 시 자동 재시작 (개발 모드)"
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["critical", "error", "warning", "info", "debug", "trace"],
        help="로그 레벨 (기본값: info)"
    )
    
    args = parser.parse_args()
    
    # 포트 결정
    if args.port:
        port = args.port
        source = "명령줄 인자"
    elif os.getenv("PORT"):
        port = int(os.getenv("PORT"))
        source = "환경 변수 (PORT)"
    else:
        branch = get_current_branch()
        port = get_port_from_branch(branch)
        source = f"브랜치 '{branch}' 기반 자동 선택" if branch else "기본값"
    
    # 포트 사용 가능 여부 확인
    if is_port_in_use(port):
        print(f"⚠️  포트 {port}가 이미 사용 중입니다.")
        try:
            port = find_available_port(port)
            print(f"   → 사용 가능한 포트 {port}로 변경합니다.")
        except RuntimeError as e:
            print(f"❌ {e}")
            sys.exit(1)
    
    # 서버 정보 출력
    print("=" * 60)
    print("🚀 FastAPI 서버 시작")
    print("=" * 60)
    print(f"📍 포트: {port} ({source})")
    print(f"🌐 주소: http://{args.host}:{port}")
    print(f"📝 로그 레벨: {args.log_level}")
    if args.reload:
        print(f"🔄 자동 재시작: 활성화")
    print("=" * 60)
    print("서버를 중지하려면 Ctrl+C를 누르세요.\n")
    
    # 서버 실행
    try:
        uvicorn.run(
            "app.main:app",
            host=args.host,
            port=port,
            reload=args.reload,
            log_level=args.log_level,
        )
    except KeyboardInterrupt:
        print("\n\n✅ 서버가 종료되었습니다.")
        sys.exit(0)


if __name__ == "__main__":
    main()

