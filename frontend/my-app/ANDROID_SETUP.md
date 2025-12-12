# 안드로이드 네트워크 보안 설정 가이드

안드로이드 9 이상에서 네이버 지도 API 및 HTTP 백엔드 서버를 사용하기 위한 설정 방법입니다.

## 1. 안드로이드 프로젝트 생성 (아직 생성하지 않은 경우)

```bash
cd frontend/my-app
npx cap add android
```

## 2. 네트워크 보안 설정 파일 추가

1. 안드로이드 프로젝트가 생성되면 다음 경로에 파일을 생성합니다:
   - `android/app/src/main/res/xml/network_security_config.xml`

2. 루트에 있는 `android-network-security-config.xml` 파일의 내용을 복사하여 위 경로에 붙여넣습니다.

## 3. AndroidManifest.xml 수정

`android/app/src/main/AndroidManifest.xml` 파일을 열고, `<application>` 태그에 다음 속성을 추가합니다:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
    ...
</application>
```

## 4. 예시 AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:networkSecurityConfig="@xml/network_security_config"
        android:usesCleartextTraffic="false"
        ...>
        ...
    </application>
</manifest>
```

## 주의사항

- `android:usesCleartextTraffic="false"`를 유지하고, 네트워크 보안 설정 파일에서 필요한 도메인만 허용하는 것이 보안상 더 안전합니다.
- 프로덕션 환경에서는 가능한 한 HTTPS를 사용하는 것을 권장합니다.

