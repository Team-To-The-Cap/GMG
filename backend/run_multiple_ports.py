#!/usr/bin/env python3
"""
여러 포트에서 FastAPI 서버를 동시에 실행하는 스크립트
사용법: 
  python run_multiple_ports.py                    # 기본 포트 (8000, 8001)
  python run_multiple_ports.py --ports 8000 8002  # 특정 포트 지정
"""
import uvicorn
import multiprocessing
import sys
import signal
import os
import argparse

# 기본 포트 목록
DEFAULT_PORTS = [8000, 8001]
HOST = "0.0.0.0"  # 모든 인터페이스에서 접근 가능

def run_server(port: int):
    """특정 포트에서 서버 실행"""
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=port,
        reload=False,  # multiprocessing과 함께 사용할 때는 False 권장
        log_level="info",
    )

def main():
    """메인 함수: 여러 포트에서 서버 실행"""
    parser = argparse.ArgumentParser(
        description="여러 포트에서 FastAPI 서버를 동시에 실행"
    )
    parser.add_argument(
        "--ports",
        nargs="+",
        type=int,
        default=DEFAULT_PORTS,
        help=f"실행할 포트 목록 (기본값: {DEFAULT_PORTS})"
    )
    parser.add_argument(
        "--host",
        type=str,
        default=HOST,
        help=f"호스트 주소 (기본값: {HOST})"
    )
    
    args = parser.parse_args()
    ports = args.ports
    
    processes = []
    
    print(f"🚀 {len(ports)}개의 서버를 시작합니다...")
    for port in ports:
        print(f"   - http://{args.host}:{port}")
        p = multiprocessing.Process(target=run_server, args=(port,))
        p.start()
        processes.append(p)
    
    print(f"\n✅ 모든 서버가 시작되었습니다!")
    print(f"   서버를 중지하려면 Ctrl+C를 누르세요.\n")
    
    try:
        # 모든 프로세스가 종료될 때까지 대기
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        print("\n\n⚠️  서버를 종료합니다...")
        for p in processes:
            p.terminate()
            p.join()
        print("✅ 모든 서버가 종료되었습니다.")
        sys.exit(0)

if __name__ == "__main__":
    main()

