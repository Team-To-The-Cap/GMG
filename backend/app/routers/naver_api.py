# 네이버 검색 API 예제 - 블로그 검색
# 주의: 이 파일은 예제 파일입니다. 실제 사용 시에는 naver_search.py를 참고하세요.
import urllib.request
import urllib.parse

# .env에서 네이버 API 키 가져오기
try:
    from core.config import client_id, client_secret
except ImportError:
    print("Error: core.config를 import할 수 없습니다. .env 파일을 확인하세요.")
    client_id = None
    client_secret = None

if not client_id or not client_secret:
    print("Error: client_id 또는 client_secret이 .env 파일에 설정되지 않았습니다.")
else:
    encText = urllib.parse.quote("신촌 볼링")
    url = "https://openapi.naver.com/v1/search/local?query=" + encText+ "&display=10&sort=comment" # JSON 결과
    # url = "https://openapi.naver.com/v1/search/blog.xml?query=" + encText # XML 결과
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", client_id)
    request.add_header("X-Naver-Client-Secret", client_secret)
    response = urllib.request.urlopen(request)
    rescode = response.getcode()
    if(rescode==200):
        response_body = response.read()
        print(response_body.decode('utf-8'))
    else:
        print("Error Code:" + rescode)