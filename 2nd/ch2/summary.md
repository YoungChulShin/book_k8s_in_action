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

## 쿠버네티스 환경 구성
minikube 멀티 노드 환경 시작
```
minikube start --nodes 4 -p multinode-demo  
```

쿠버네티스 명령어
```
// 노드 조회
kubectl get nodes

// 노드 세부 정보 조회
kubectl describe node {node name}

// 별칭 생성 - .bashrc 또는 .zshrc 에서 아래 값 추가
alias k=kubectl
```

## 쿠버네티스 애플리케이션 실행
애플리케이션 구동
```
kubectl run {pod name} --image={image} --port=8080
```

파드(Pod)
- 컨테이너의 그룹 개념
- 같은 워커노드에서 같은 리눅스 네임스페이스로 실행
- 각 파드는 자체 IP, 호스트 이름, 프로세스 등이 있는 논리적으로 분리된 머신
- 파드에서 실행중인 모든 컨테이너는 동일한 머신에서 실행되는 것처럼 보이는 반면, 다른 파드에서 실행중인 컨테이너는 같은 워커노드라도 다른 머신에서 실행 중인 것으로 나타난다. (= _리눅스의 네임스페이스 격리인듯_)

파드 생성 프로세스
1. kubectl 명령어로 API 서버로 REST HTTP 요청이 전달
2. API 서버는 변경 내용을 ectd에 저장
3. 컨트롤러 매니저가 관련 컨트롤러를 생성
   1. ReplicationController 오브젝트 생성
   2. ReplicationController는 Pod를 생성
4. 스케줄러에 의해서 하나의 워커노드에 스케줄링
5. Kubelet은 파드가 스케줄링 된 것을 확인하고 도커(conatiner runtime)에게 이미지를 풀 하도록 지시
6. 이미지 풀이 완료되면 도커가 컨테이너를 생성 하고 실행

서비스
- 클러스터 IP 서비스
   - 내부에서 접근 가능한 IP를 노출
- 로드밸런서 서비스
   - 파드를 외부에서 접근 가능하도록 노출
   ```
   kubectl expose rc kubia --type=LoadBalancer --name kubia-http
   minikube service kubia-http --profile {profile name}
   ```
- 필요한 이유
   - 파드는 일시적이기 때문에 계속 생성되고 삭제되는 파드들에 접근할 수 있는 단일 접속 포인트가 필요하다. 서비스가 이 역할을 한다. 
   - 서비스가 생성되면 정적 IP를 할당 받고, 서비스가 존속되는 동안 변경되지 않는다. 
   - 클라이언트는 파드에 직접 접근하는 대신, 서비스의 IP 주소를 통해 연결해야 한다. 
- 서비스는 파드가 2개 이상일 경우, 로드밸런서 역할을 한다. 

레플리케이션 컨트롤러
- replicas 수 만큼 파드가 실행되도록 한다
- replicas 수 늘리기
   ```
   kubectl scale rc kubia --repliocas=3
   ```

파드 명렁어
```
// 파드 조회
kubectl get pods 
kubectl get pods -o wide
kubectl get pods -o yaml

// 파드 세부 정보 조회
kubectl describe pod {pod name}

// 서비스 조회
kubectl get services

```