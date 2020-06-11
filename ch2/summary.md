# 2장. 도커와 쿠버네티스 첫걸음

## 2장의 내용
- 도커를 사용한 컨테이너 이미지 생성, 실행, 공유
- 로컬에 단일 노드 쿠버네티스 클러스터 실행
- 구글 쿠버네티스 엔진에서 쿠버네티스 클러스터 설치
- kubectl CLI 클라이언트 설정과 사용
- 쿠버네티스에서 애플리케이션의 배포와 수평 스케일링

## 도커를 사용한 컨테이너 이미지 생성, 실행, 공유하기
### Hello World 컨테이너 실행
```
// 커맨드
$ docker run busybox echo "Hello world"

// 실행
Hello world
```

`docker  run` 내부 동작
1. busybox:latest 이미지가 로컬 컴퓨터에 존재하는지 체크
2. 이미지가 없으면 도커 허브에서 이미지를 다운로드
3. 도커가 격리된 컨테이너에서 `echo "Hello world"` 명령어를 수행
4. `Hello World`가 출력

이미지 관련 추가 정보
- `https://hub.docker.com/` 에서 이미지 검색할 수 있다
- 이미지 이름을 알고 있으면 아래 명령어로도 확인 가능하다
   ```
   docker search <image>
   ```
- 버전 지정
   ```
   docker run <image>:<tag>
   ```

### 간단한 node.js 애플리케이션 생성하기
app.js 파일 생성
- 소스 코드: [Link](/sample_app_js/app.js)

이미지를 위한 도커 파일 생성
- 소스 코드: [Link](/sample_app_js/Dockerfile)

컨테이너 이미지 생성
```

```