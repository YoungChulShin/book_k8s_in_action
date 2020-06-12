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

## 쿠버네티스 클러스터 설치
쿠버네티스 설치 방법
- 로컬 머신에 단일 노드 쿠버네티스 클러스터를 실햏하는 방법 (2장)
- 구글 쿠버네티스 엔진에 실행중인 클러스터에 접근하는 방법 (2장)
- kubeadm 도구를 사용해 클러스터를 설치하는 방법 (부록 B)
- AWS에 쿠버네티스를 설치하는 방법

### Minikube를 활용한 단일 노드 
Minikube
- 로컬에서 쿠버네티스를 테스트하고 애플리케이션을 개발하는 목적으로 단일 노드 클러스터를 설치하는 도구
- Github: [Link](https://github.com/kubernetes/minikube)

Minikube 설치 및 시작
- 설치 가이드: [Link](https://minikube.sigs.k8s.io/docs/start/)
- macOX 기준 (linux와 Windows도 위 설치 가이드에서 확인 가능)
1. 설치
   ```
   brew install minikube
   ```
   ```
   curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
   sudo install minikube-darwin-amd64 /usr/local/bin/minikube
   ```
2. 클러스터 시작
   ```
   minikube start
   ```
3. 쿠버네티스 클라이언트 설치하기 (CLI 클라이언트)
   ```
   // 설치 커맨드
   brew install kubectl

   // 기존 정보 삭제
   rm '/usr/local/bin/kubectl'
   ```
   ```
   // 최신버전 다운로드
   curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/darwin/amd64/kubectl"

   // 권한 변경
   chmod +x ./kubectl

   // 바이너리를 Path 설정 폴더로 옮기기 
   sudo mv ./kubectl /usr/local/bin/kubectl
   ```
   ```
   // 설치 버전 확인
   kubectl version --client

   // 실행 결과
   Client Version: version.Info{Major:"1", Minor:"18", GitVersion:"v1.18.3", GitCommit:"2e7996e3e2712684bc73f0dec0200d64eec7fe40", GitTreeState:"clean", BuildDate:"2020-05-21T14:51:23Z", GoVersion:"go1.14.3", Compiler:"gc", Platform:"darwin/amd64"}
   ```
4. 클라스터 작동 여부 확인하기
   ```
   // 실행 커맨드
   kubelctl cluster-info

   // 결과 (dashboard가 왜 없지..)
   Kubernetes master is running at https://192.168.64.2:8443
   KubeDNS is running at https://192.168.64.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
   ```