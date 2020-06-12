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
// 커맨드
docker build -t kubia .

// 이미지 조회
docker images

// 이미지 조회 결과
REPOSITORY           TAG                 IMAGE ID            CREATED             SIZE
kubia                latest              9e7edfb36631        17 seconds ago      660MB
```

이미지 레이어
- 이미지는 하나의 큰 바이너리 덩어리가 아니라 여러개의 레이어로 구성된다
- 서로 다른 이미지가 여러개의 레이어를 공유할 수 있기 때문에 저장, 전송에 효과적이다
- 그림2-3 넣기

컨태이너 이미지 실행
```
docker run --name kubia-container -p 8080:8080 -d kubia
```
- --name kubia-container : 컨테이너 이름
- -p 8080:8080 : 포트 포워딩
- -d : 백그라운드 실행
- kubia : 이미지 이름

이미지 실행 확인
```
// 커맨드
curl localhost:8080

// 실행 확인
You've hit 58ba62ac6ccd
```

도커 명령어
- `docker ps` : 실행중인 모든 컨테이너 조회하기
- `docker inspect <container name>` : 컨테이너 상세 정보를 JSON 형식으로 출력
- `docker exec -it <container name> bash` : 실행중인 컨테이너 내부 실행
   - -i : 표준 입력을 오픈 상태로 유지. 셸에 명령어를 입력하기 위해서 필요
   - -t : pseudo 터미널을 할당한다 (-it를 보통 같이 사용)
- `ps aux` : 실행중인 프로세스를 조회
   - 컨테이너 내부에서 조회화면 현재 실행중인 프로세스만 조회되고, 호스트 운영체제의 프로세스는 볼 수 없다
   - 호스트 운영체제에서 실행해보면 컨테이너에서 실행중인 프로세스를 조회할 수 있다.<br>
   이는 실행중인 프로세스가 호스트 운영체제에서 실행중이라는 것을 말한다
      ```
      ps aux | grep app.js
      ```
- `docker stop <container name>` : 컨테이너 중지
- `docker rm <container name>` : 컨테이너 삭제

이미지를 레지스트리에 푸쉬
- 널리 사용되는 레지스트리
   - 도커 허브, Quay.io, Google Container Registry
- 태그를 도커 허브 ID로 시작하도록 변경
   ```
   // 커맨드
   docker tag kubia go1323/kubia

   // 결과 (같은 이미지에 2개의 태그를 가지게 된다)
   REPOSITORY     TAG       IMAGE ID  
   kubia          latest    9e7edfb36631
   go1323/kubia   latest    9e7edfb36631
   ```
- 도커 허브에 푸쉬
   ~~~
   // 커맨드
   docker push go1323/kubia

   // 확인
   https://hub.docker.com/r/go1323/kubia
   ~~~
- 다른 이미지에서 실행
   ```
   docker run -p 8080:8080 -d go1323/kubia
   ```