# 2장. 도커와 쿠버네티스 첫걸음
## 도커를 사용한 컨테이너 이미지 생성, 실행, 공유
컨테이너 실행
- `docker run {image}:{tag}`
   ```
   docker run busybox echo "hello world"
   ```
- 내부 동작
   1. image:tag 가 local에 존재하는지 체크
   2. 존재하지 않는다면 도커허브에서 이미지를 다운로드
   3. 도커가 이미지로부터 컨테이너를 생성
   4. 컨테이너 내부에서 명령어 (예: echo "hello world")를 실행

도커 파일 생성 및 이미지 생성
- Dockerfile
   ```
   FROM node:7 // 이미지 생성의 기반이 되는 기본 이미지로 사용한 컨테이너 이미지 정의
   ADD app.js /app.js  // 로컬의 파일을 복사
   ENTRYPOINT [ "node", "app.js" ]  // 이미지를 실행했을 때 수행돼야 할 명령어
   ```
- 이미지 빌드
   ```
   docker build -t kubia .
   ```
   1. 도커 클라이언트가 디렉터리의 컨텐츠를 데몬에 업로드 (dockerfile, app.js)
      - 빌드 디렉터리에 불필요한 파일을 포함시키지 않는다
   2. 도커 데몬에서 이미지를 풀한다
   3. 새로운 이미지를 빌드한다
- 도커 데몬
   - 실제 이미지 빌드가 실행되는 곳
   - 리눅스가 아닐 경우 도커 클라이언트는 호스트 OS에 위치하고, 데몬은 가상머신 내부에서 실행된다
- 이미지 레이어
   - 이미지는 여러개의 레이어로 구성되어 있고 호스트 OS에는 하나만 저장된다
   - 예제의 경우
      1. node 이미지를 가져온다 (node 이미지도 여러 레이어로 구성)
      2. 'ADD app.js /app.js'를 하나의 레이어로 추가
      3. 'CMD node app.js'를 하나의 레이어로 추가
      4. 마지막 레이어에 'kubia:latest' 태그를 지정

컨테이너 명령어
```
// 이미지 실행
docker run --name {container name} -p {외부 port}:{내부 port} -d {image}

// 애플리케이션 접근
curl localhost:{외부 port}

// 컨테이너 조회
docker ps
docker ps -a
docker inspect {container name}

// 컨테이너 셸 실행
docker exec -it {{container name}} bin/bash

// 컨테이너 중지
docker stop {container name}

// 컨테이너 삭제
docker rm {container name}

// 도커 허브에 푸쉬
docker tag {image name} {docker hub id}/{image name}
docker push {docker hub id}/{image name}

// 업로드한 이미지 실행
docker run -p 8080:8080 -d {docker hub id}/{image name}
```

## 쿠버네티스
minikube
- 멀티 노드 환경 시작
   ```
   minikube start --nodes 4 -p multinode-demo  
   ```

쿠버네티스 명령어
```
// 노드 조회
kubectl get nodes

// 노드 세부 정보 조회

```
