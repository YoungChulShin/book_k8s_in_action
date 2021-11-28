# 쿠버네티스 내부 이해
## 아키텍처 이해
컨트롤 플레인 구성 요소
- etcd 분산 저장 스토리지
- API 서버
- 스케쥴러
- 컨트롤러 매니저
- `k get componentstatuses` 명령어로 상태를 확인할 수 있다
   ```
   NAME                 STATUS      MESSAGE                                                                                       ERROR
   scheduler            Unhealthy   Get "http://127.0.0.1:10251/healthz": dial tcp 127.0.0.1:10251: connect: connection refused
   controller-manager   Healthy     ok
   etcd-0               Healthy     {"health":"true","reason":""}
   ```

워커 노드에서 구성 요소
- Kubelet
- 쿠버네티스 서비스 프록시
- 컨테이너 란타임

애드온 구성 요소
- DNS 서버
- 대시보드
- Ingress Controller
- 힙스터
- 컨테이너 네트워크 인터페이스

구성 요소 통신
- API 서버하고만 통신한다. 직접 통신하지 않는다.

개발 구성 요소의 여러 인스턴스 실행
- 워커 노드의 구성요소는 모두 동일한 노드에서 실행돼야 한다
- 컨트롤 플레인 구성요소는 여러 서버에 걸쳐 실행될 수 있는데, 들 이상 실행해 가용성을 높일 수 있다
   - etcd, API 서버: 병렬로 수행 가능하다
   - 스케쥴러, 컨트롤러 매니저: 하나의 인스턴스만 활성화되고 나머지는 대기 상태에 있는다

구성 요소 실행 방법
- Kubelet은 일반 시스템 구성요소로 실행되는 유일한 구성 요소이며, Kublet이 다른 구성 요소를 파드로 실행한다
- 컨트롤 플레인 구성요소를 파드로 실행하기 위해서 Kubelet도 마스터 노드에 배포된다
- 구성 요소 확인
   ```
    // k get pod -o custom-columns=POD:metadata.name,NODE:spec.nodeName --sort-by spec.nodeName -n kube-system
    // etcd, api server, core-dns, schduler, controller-manager는 마스터에서 실행
    // kube-proxy, kindnet은 워커 노드에서 실행
    POD                                      NODE
    kube-apiserver-multinode-demo            multinode-demo
    etcd-multinode-demo                      multinode-demo
    kube-scheduler-multinode-demo            multinode-demo
    kube-proxy-wp5rf                         multinode-demo
    kube-controller-manager-multinode-demo   multinode-demo
    kindnet-vwszg                            multinode-demo
    coredns-78fcd69978-z45rr                 multinode-demo
    storage-provisioner                      multinode-demo
    kube-proxy-wfwn9                         multinode-demo-m02
    kindnet-dlbzf                            multinode-demo-m02
    kube-proxy-g4sdl                         multinode-demo-m03
    kindnet-j8j6l                            multinode-demo-m03
    kube-proxy-2xzrd                         multinode-demo-m04
    kindnet-75ps4                            multinode-demo-m04
   ```

etcd
- 매니패스트(파드, RC, 서비스, 시크릿 등) 정보가 영구적으로 저장되는 저장소
- 빠르고, 분산해서 저장되며, 일관된 키-값 저장소
- API 서버만 etcd와 직접적으로 통신한다
- 오브젝트의 일관성과 유효성 보장
   - API 서버를 통해서만 통신하도록 함으로써 일관성(낙관적 잠금)을 제공한다
   - 2개 이상의 ectd 인스턴스는 RAFT 합의 알고리즘을 사용해서 각 노드의 상태가 대다수의 노드가 동의하는 현재 상태이거나 이전에 동의된 상태 중에 하나님을 보장한다.
   - 합의 알고리즘 때문에 보통 홀 수로 구성을 한다. 
      - 예: 3개, 4개 모두 1개의 인스턴스의 실패만 허용한다. 4개는 과반을 위해서 3개가 필요한데, 1개만 실패도 3개가 되기 때문이다

API 서버
- 다른 모든 구성요소와 kubelet 같은 클라이언트에서 사용하는 중심 구성 요소
- 클러스터 상태를 조회/변경하기 위해 RESTful API로 CRUD 인터페이스를 제공한다. 상태를 etcd에 저장된다.
- 낙관적 잠금으로 일관성을 보장하고, 유효성 검사로 유효성을 보장한다
- API 서버의 동작
   1. kubectl로 요청 (예: 리소스 생성)
   2. POST 요청
   3. 인증 플러그인 통과
   4. 인가 플러그인 통과
   5. 어드미션 컨트롤 플러그인 통과
   6. 리소스 유효성 검사
   7. etcd에 저장
- 리소스 변경 및 통보
   - 클라이언트는 API 서버에 HTTP 연결을 맺고 변경 사항을 감지한다. 클라이언트는 오브젝트의 변경을 알 수 있는 스트림을 받는다. 
   - 오브젝트가 갱신되면 API 서버는 클라이언트에게 새로운 버전을 보낸다
   - 예시
      ```
      // kubectl로 모니터링 실행
      k get pods --watch

      // 확인
      NAME      READY   STATUS    RESTARTS   AGE
      kubia-0   1/1     Running   0          42m
      kubia-1   1/1     Running   0          42m    // 기존 상태
      kubia-1   1/1     Terminating   0          43m    // statefulset 삭제
      kubia-0   1/1     Terminating   0          43m
      kubia-0   0/1     Terminating   0          43m
      kubia-0   0/1     Terminating   0          43m
      ```