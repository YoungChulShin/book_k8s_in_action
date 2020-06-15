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
- ![2-3](/images/2-3.png)

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

### 구글 쿠버네티스 엔진을 활용한 관리형 클러스터 사용하기
장점
- 클러스터 노드와 네트워킹을 수동으로 설정할 필요가 없어서 처음사용자에게 부담을 줄여준다

환경 구성
- 관련 문서
   - Quick Start Guide: [Link](https://cloud.google.com/kubernetes-engine/docs/quickstart)
   - GCC Kubernetes Engins: [Link](https://console.cloud.google.com/projectselector/kubernetes?_ga=2.164466687.1348488840.1592002485-1118888932.1577827910)
- 무료 평가판 사용 가능. (_개인 개정은 모두 사용해서 회사 계정으로 생성_)
1. GCP 에서 프로젝트 생성
   - study-k8s
2. 쿠버네티스 엔진 API 활성화
   - 쿠버네티스 엔진을 들어가면 자동으로 활성화 (2분 정도 소요)
3. 구글 클라우드 SDK 설치
   - 가이드 문사: [Link](https://cloud.google.com/sdk/install?hl=ko)
   - 설치 과정
      ```
      // 설치
      curl https://sdk.cloud.google.com | bash

      // 쉘 다시 시작
      exec -l $SHELL

      // gcloud 환경 초기화
      gcloud init

      // kubectl 도구 설치
      gcloud components install kubectl
      ```

노드 3개를 가진 클러스터 생성
```
// 실행 커맨드
cloud container clusters create kubia --num-nodes 3 --machine-type g1-small

// 실행 결과
Creating cluster kubia in asia-east2-a... Cluster is being health-checked (master is healthy)...done.
Created [https://container.googleapis.com/v1/projects/study-k8s-280123/zones/asia-east2-a/clusters/kubia].
To inspect the contents of your cluster, go to: https://console.cloud.google.com/kubernetes/workload_/gcloud/asia-east2-a/kubia?project=study-k8s-280123
kubeconfig entry generated for kubia.
NAME   LOCATION      MASTER_VERSION  MASTER_IP     MACHINE_TYPE  NODE_VERSION    NUM_NODES  STATUS
kubia  asia-east2-a  1.14.10-gke.36  34.92.87.121  g1-small      1.14.10-gke.36  3          RUNNING
```
- `1.12.0` 버전 부터 1GB 메모리 이하는 사용할 수 없어서, f1-micro는 생성이 불가능

클러스터 개념
- ![2-4](/images/2-4.png)

클러스터 노드를 조회
- 동작 상태 조회
   ```
   // 실행 커맨드
   kubectl get nodes

   // 결과
   NAME                                   STATUS   ROLES    AGE     VERSION
   gke-kubia-default-pool-7985c381-bscm   Ready    <none>   3m54s   v1.14.10-gke.36
   gke-kubia-default-pool-7985c381-jd6x   Ready    <none>   3m53s   v1.14.10-gke.36
   gke-kubia-default-pool-7985c381-nk10   Ready    <none>   3m53s   v1.14.10-gke.36
   ```
- 오브젝트 세부 정보 조회
   ```
   kubectl describe node <nodename>
   kubectl describe node gke-kubia-default-pool-7985c381-bscm
   ```

## 쿠버네티스 첫 애플리케이션 실행하기
### Node.js 애플리케이션 구동하기
쿠버네티스 실행해보기
```
// 생성 커맨드
kubectl run kubia --image=go1323/kubia --port=8080 --generator=run/v1
(--generator=run-pod/v1)

// 결과
replicationcontroller/kubia created
```
- `--image=go1323/kubia` : 실행하고자 하는 컨테이너
- `-port=8080` : 수신대기 포트
- `--generator=run-pod/v1` : 디플로이먼트 대신 레플리케이션컨트롤러를 생성하기 위한 커맨드

파드 (Pod)
- 하나 이상의 밀접하게 연관된 컨테이너의 그룹
- 같은 워크노트에서 같은 리눅스 네임스페이스로 함께 실행된다
- 각 파드는 자체 IP, 호스트 이름, 프로세스 등이 있는 논리적으로 분리된 머신
- 파드에서 실행중인 모든 컨테이너는 동일한 논리적 머신에서 실행한 것처럼 보인다.<br>
다른 파드에서 실행중인 컨테이너는 같은 워커 노드에서 실행 중이라 할지라도 다른 머신에서 실행중인 것으로 나타난다

파드 조회하기
```
// 실행 커맨드
kubectl get pods

// 결과
NAME          READY   STATUS    RESTARTS   AGE
kubia-hrpbr   1/1     Running   0          14m
```

백그라운드 동작 보기
- ![2-6](/images/2-6.png)

### 웹 애플리케이션 접근하기
배경
- 파드는 개별 IP를 가지고 있지만, 이 주소는 클러스터 내부에 있기 때문에 외부에서 접근이 불가능하다
- LoadBalancer 유형의 서비스를 생성해서, 여기서 제공되는 퍼블릭 IP를 통해서 파드에 연결할 수 있다

서비스 오브젝트 생성하기
~~~
// 실행 커맨드
kubectl expose rc kubia --type=LoadBalancer --name kubia-http

// 결과
service/kubia-http exposed
~~~
- `LoadBalancer` 타입의 `kubia-http` 서비스를 생성

서비스 조회하기
~~~
// 실행 커맨드
kubectl get services

// 결과
NAME         TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)          AGE
kubernetes   ClusterIP      10.7.240.1    <none>           443/TCP          9h
kubia-http   LoadBalancer   10.7.248.27   35.241.103.213   8080:32453/TCP   2m46s
~~~

서비스 실행하기
~~~
// 실행 커맨드
curl 35.241.103.213:8080

// 결과
You've hit kubia-hrpbr
~~~

### 이번에는 논리적으로 일어나는 일을 보자
레플리케이션 컨트롤러, 파드, 서비스의 동작
- ![2-7](/images/2-7.png)
- 파드
   - N개의 컨테이너를 포함한다
   - 예제에서는 1개의 컨테이너(Node.js 프로세스, 8080 바인딩)를 포함한다
   - 자체의 고유한 IP와 호스트이름을 가진다
- 레플리케이션컨트롤러
   - 항상 정확히 하나의 파드 인스턴스를 실행하도록 지정한다
   - 어떤 이유로 파드가 사라진다면 레플리케이션컨트롤러 사라진 파드를 대체하기 위한 새로운 파드를 생성한다
- 서비스
   - 일시적인(=생성되고, 사라질 수 있는) 파드에 대해서, 외부에서 정적인 주소로 접근할 수 있도록 외부 요청과 파드 사이에 위치한다
   - 서비스가 생성되면 정적인 IP를 할당 받고, 서비스가 존속하는 동안 변경되지 않는다
   - 서비스는 동일한 서비스를 제공하는 하나 이상의 파드 그룹의 정적 위치를 나타낸다
      - _파드 그룹? 레플리카를 말하는 건가? 서비스가 로드밸런서니까 그런것 같긴한데. 그럼 하나의 파드 인스턴스를 레플리케이션 컨트롤러가 실행하도록 지정하는건 뭐지_
      - _메모 그럼 보여주자_

### 애플리케이션 수평 확장
현재 레플리케이션컨트롤러 조회
```
// 실행 커맨드
kubectl get replicationcontrollers

// 결과
NAME    DESIRED   CURRENT   READY   AGE
kubia   1         1         1       14h

// All 조회
NAME              READY   STATUS    RESTARTS   AGE
pod/kubia-hrpbr   1/1     Running   0          14h

NAME                          DESIRED   CURRENT   READY   AGE
replicationcontroller/kubia   1         1         1       14h

NAME                 TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)          AGE
service/kubernetes   ClusterIP      10.7.240.1    <none>           443/TCP          22h
service/kubia-http   LoadBalancer   10.7.248.27   35.241.103.213   8080:32453/TCP   13h
```

레플리카 수 늘리기
```
// 실행 커맨드
kubectl scale rc kubia --replicas=3

// 결과 (바로 되네)
replicationcontroller/kubia scaled 

// 결과 조회 커맨드
kubectl get rc

// 결과 조회
NAME    DESIRED   CURRENT   READY   AGE
kubia   3         3         1       14h

NAME    DESIRED   CURRENT   READY   AGE
kubia   3         3         3       14h

// Pod 조회
kubectl get pods

// Pod 조회 결과
NAME          READY   STATUS    RESTARTS   AGE (IP)
kubia-hrpbr   1/1     Running   0          14h (10.4.0.10)
kubia-htb95   1/1     Running   0          95s (10.4.2.5)
kubia-tctjg   1/1     Running   0          95s (10.4.1.3)

// Client 입장에서 호출 테스트
curl 35.241.103.213:8080

// 호출 테스트 결과 (아래 값들이 호출이 됨)
You've hit kubia-tctjg
You've hit kubia-hrpbr
You've hit kubia-htb95
```

그림 2.8 추가


### 애플리케이션이 실행 중인 노드 검사하기
```
// Pid를 IP와 Node를 함께 조회하는 커맨드
kubectl get pods -o wide

// 결과
NAME          READY   STATUS    RESTARTS   AGE     IP          NODE                                   NOMINATED NODE   READINESS GATES
kubia-hrpbr   1/1     Running   0          14h     10.4.2.5    gke-kubia-default-pool-7985c381-nk10   <none>           <none>
kubia-htb95   1/1     Running   0          8m52s   10.4.0.10   gke-kubia-default-pool-7985c381-bscm   <none>           <none>
kubia-tctjg   1/1     Running   0          8m52s   10.4.1.3    gke-kubia-default-pool-7985c381-jd6x   <none>           <none>

// pid 세부 정보 보기
kubectl describe pod kubia-hrpbr
```

비교 그럼 추가

### 쿠버네티스 대시보드
기능 
- GUI 환경에서 파드, RC, 서비스 같은 클러스터의 많은 오브젝트를 조회, 생성, 삭제, 수정이 가능하다

대시보드 URL 조회
- GKE 기준: `kubectl cluster-info`
   - 나오지 않네..
   ```
   Kubernetes 대시보드
   Kubernetes 대시보드 부가기능은 GKE에서 기본적으로 사용 중지됩니다.

   GKE v1.15부터는 더 이상 부가기능 API를 사용하여 Kubernetes 대시보드를 사용 설정할 수 없습니다. 프로젝트의 저장소에 있는 안내에 따라 수동으로는 Kubernetes 대시보드를 설치할 수 있습니다. 부가기능을 이미 배포한 클러스터는 계속해서 작동하지만 출시된 모든 업데이트와 보안 패치를 수동으로 적용해야 합니다.

   Cloud Console은 GKE 클러스터, 워크로드, 애플리케이션을 관리, 문제해결, 모니터링할 수 있는 대시보드를 제공합니다.
   ```
   - GKE 대시보드 설명 링크: [Link](https://cloud.google.com/kubernetes-engine/docs/concepts/dashboards?hl=ko)