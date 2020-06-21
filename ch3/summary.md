# 3장. 파드: 쿠버네티스에서 컨테이너 실행

3장의 내용
- 파드의 생성, 실행, 정지
- 파드와 다른 리소스를 레이블로 조직화하기
- 특정 레이블을 가진 모든 파드에서 작업 수행
- 네임스페이스를 사용해 파드를 겹치지 않는 그룹으로 나누기
- 특정한 형식을 가진 워커 노드에 파드 배치

## 3.1 파드 소개
개념
- 함께 배치된 컨테이너 그룹
- 쿠버네티스의 기본 빌딩 블록 (컨네이너를 개별 배포하는 것이 아니라 컨테이너를 가진 파드를 배포하고 운영)
- 파드가 여러 컨테이너를 가지고 있을 경우, 항상 같은 워커 노드에서 실행된다

파드가 필요한 이유
- 컨테이너는 단일 프로세스를 실행하는 것을 목적으로 설계했다
- 따라서 각 프로세스를 자체의 개별 컨테이너로 실행해야 한다
- 여러 프로세스를 단일 컨테이너로 묶지 않기 때문에 컨테이너를 함께 묶고 관리할 다른 상위 구조가 필요한데, 이게 파드가 필요한 이유다

파드에서 컨테이너간 부분 격리
- 방향성은 컨테이너 그룹을 분리하고, 그룹안에 컨테이너는 특정 리소스 공유를 위해서 완벽하게 격리되지 않도록 하는 것이다
- 쿠버네티스는 파드 안에 있는 모든 컨테이너가 자체 네임스페이스가 아닌 동일한 리눅스 네임스페이스를 공유하도록 도커를 설정한다
- 파드의 모든 컨테이너는 동일한 네트워크 네임스페이스와 UTS 네임스페이스안에서 실행되기 때문에, 모든 컨테이너는 같은 호스트 이름과 네트워크 인터페이스를 공유한다
   - UTS: Unix Timesharing System Namespace, 호스트 이름을 네임스페이스 별로 격리한다

컨테이너가 동일한 IP와 포트 공간을 공유하는 방법
- 파드 안의 컨테이너는 동일한 네트워크 네임스페이스에서 실해되기 때문에 동일한 IP주소와 포트 공간을 공유한다
- 이는 파드 안 컨테이너에서 실행중인 프로세스가 같은 포트 번호를 사용하지 않도록 주의해야 함을 의미한다

파드간 플랫 네트워크
- 쿠버네티스 클러스터의 모든 파드는 하나의 픐랫한 공유 네트워크 주소 공간에 상주하므로 모든 파드는 다른 파드의 IP 주소를 사용해 접근하는 것이 가능하다
   - 두 파드가 동일 혹은 다른 워커 노드에 있는지는 중요하지 않다

### 파드에서 컨테이너의 적절한 구성
2개의 서비스(프론트엔드, 백엔드)를 한개의 파드에 넣지 말아야 하는 이유
- 항상 2개가 같은 파드에서 실행해야 할 이유는 없다
- 워커 노드가 2개가 있을 때 한개의 노드를 놀게 한다
- 스케일링 문제
   - 쿠버네티스는 파드가 스케일링의 기본단위다
   - 프론트엔드와 백엔드가 서로 다른 스케일링 요구 사항을 가지고 있다면 만족하지 못한다

파드에서 여러 컨테이너를 사용하는 경우
- 애플리케이션이 하나의 주요 프로세스와 하나 이상의 부완 프로세스로 구성될 경우
- 단일 파드로 넣을지, 두개의 별도 파드로 구성할지에 대한 질문
   1. 컨테이너를 함께 실행해야 하는가? 혹은 서로 다른 호스트에서 실행할 수 있는가?
   2. 여러 컨테이너가 모여 하나의 구성 요소를 나타내는가? 혹은 개별적인 구성 요소인가?
   3. 컨테이너가 함께 혹은 개별적으로 스케일링 되어야 하는가?
- 기본적으로는 분리된 파드에서 컨테이너를 실행하는 것이 좋다

## 3.2 YAML 또는 JSON 디스크립터로 파드 생성
YAML 파일 사용 이점
- 파일을 이용해서 오브젝트를 정의하면 버전 관리 시스템에 넣어서 관리하는 것이 가능해진다

기 생성된 파드의 YAML 정의가 어떻게 되어 있는지 살펴보기
- 커맨드
   ```
   // 커맨드 실행
   kubectl get po kubia-hrpbr -o yaml
   ```
   - `-o`는 출력타입을 결정하는 옵션
   - Metadata: 이름, 네임스페이스, 레이블 및 파드에 관한 기타 정보를 포함
   - Spec: 파드 컨테이너, 볼륨, 기타 데이터 등 파드에 관한 실제 명서
   - Status: 파드 상태, 컨테이너 설명 및 상태, 파드 IP, 기타 정보 등

파드를 정의하는 YAML 작성해보기
- yaml 파일: [Link](/ch3/codes/kubia-manual.yaml)
- API 오브젝트 필드 찾기
   - 레퍼런스 문서 활용: [Link](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/)
   - kubectl explain 활용
      - kubectl explain pods
      - kubectl explain pod.spec

kubectl create 명령으로 파드 만들기
- 커맨드
   ```
   // 커맨드 실행
   kubectl create 0f kubia-manual.yaml

   // 실행 결과
   pod/kubia-manual created

   // 생성 파드 목록 보기 실행
   kubectl get pods

   // 실행 결과
   NAME           READY   STATUS    RESTARTS   AGE
   kubia-hrpbr    1/1     Running   0          7d16h
   kubia-htb95    1/1     Running   0          7d1h
   kubia-manual   1/1     Running   0          119s
   kubia-tctjg    1/1     Running   0          7d1h
   ```

애플리케이션 로그 보기
- 파드 로그 보기
   ```
   kubectl logs kubia-manual
   ```
- 여러 컨테이너를 포함하는 파드
   ```
   kubectl logs kubia-manual -c kubia
   ```
   - 현재 존재하는 파드의 컨테이너 로그만 가져올 수 있고, 파드가 삭제되면 로그도 같이 삭제된다
   - 파드 삭제 이후에도 로그를 보려면 로그를 중앙 저장소에 저장하는 설정을 해주면 된다

파드에 요청 보내기
- 포트 포워딩: 서비스를 거치지 않고 특정 파드에 연결하고 싶을 때 사용
- 커맨드
   ```
   // 포트 포워딩 실행
   kubectl port-forward kubia-manual 8888:8080

   // 결과
   Forwarding from 127.0.0.1:8888 -> 8080
   Forwarding from [::1]:8888 -> 8080

   // 로컬 호스트에서 명령 보내기
   curl localhost:8888

   // 결과
   You've hit kubia-manua
   ```
   ![3-5](/images/3-5.png)

## 3.5 레이블을 이용한 파드 구성
레이블
- 파드와 모든 다른 쿠버네티스 리소스를 조직화할 수 있는 단순하면서 강력한 쿠버네티스 기능
- 레이블은 리소스에 첨부하는 키-값 쌍으로, 이 쌍은 레이블 셀렉터를 사용해 리소스를 선택할 때 활용된다
- 레이블 구성 예시
   ![3-5](/images/3-7.png)
   
레이블을 지정해서 파드 생성
- 2개의 레이블을 지정
   1. creation_method: manual
   2. env: prod
- yaml 파일: [Link](/ch3/codes/kubia-manual-with-labels.yaml)
- 커맨드
   ```
   // 커맨드 실행
   kubectl create -f kubia-manual-with-labels.yaml

   // 결과
   pod/kubia-manual-v2 created

   // 파드 조회
   kubectl get po --show-labels

   // 결과
   NAME              READY   STATUS    RESTARTS   AGE     LABELS
   kubia-hrpbr       1/1     Running   0          8d      run=kubia
   kubia-manual      1/1     Running   0          12h     <none>
   kubia-manual-v2   1/1     Running   0          2m16s   creation_method=manual,env=prod

   // 레이블을 열(Column)에 표시해서 조회
   kubectl get po -L creation_method,env

   // 결과
   NAME              READY   STATUS    RESTARTS   AGE     CREATION_METHOD   ENV
   kubia-hrpbr       1/1     Running   0          8d
   kubia-manual      1/1     Running   0          12h
   kubia-manual-v2   1/1     Running   0          3m40s   manual            prod
   ```

기존 파드 레이블 수정
- 수정
   ```
   // 커맨드 실행
   kubectl label po kubia-manual creation_method=manual

   // 결과
   NAME              READY   STATUS    RESTARTS   AGE     CREATION_METHOD   ENV
   kubia-hrpbr       1/1     Running   0          8d
   kubia-manual      1/1     Running   0          12h     manual
   kubia-manual-v2   1/1     Running   0          7m32s   manual            prod
   ```
- 덮어쓰기
   ```
   kubectl label po kubia-manual-v2 env=debug --overwrite
   ```

## 3.4 레이블 셀렉터
레이블 셀렉터 기능
- 특정 레이블로 태그된 파드의 부분 집합을 선택해 원하는 작업을 수행한다
- 리소스 선택 기준
   - 특정한 키를 포함하거나 포함하지 않는 레이블
   - 특정한 키와 값을 가진 레이블
   - 특정한 키를 갖고 있지만, 다른 값을 가진 레이블

레이블 셀렉터 사용
- creation_method가 manual인 것 조회
   ~~~
   kubectl get po -l creation_method=manual
   ~~~
- env 레이블을 가지고 있지만, 값은 상관없는 파드 조회
   ~~~
   kubectl get po -l env
   ~~~
- env 레이블을 가지고 있지 않은 파드
   ~~~
   kubectl get po -l '!env'
   ~~~
- 기타
   - in, notin 도 지원한다
   - 레이블이 2개 이상일 경우, 쉼표(,)를 이용해서 여러개의 검색 조건을 줄 수도 있다

## 3.5 레이블과 셀렉터를 이용해 파드 스케쥴링 제한
개념
- 기본적으로 파드가 어느 노드에서 실행되는지는 알 필요는 없다
- 하지만 특정 환경에 대해서 약간의 제약을 두고 싶을 때 셀렉터를 통해 이 작업을 할 수 있다

워커노드 분류에 레이블 사용
- 레이블은 노드를 포함안 모든 오브젝트에 부착할 수 있다
- 일반적으로 ops팀은 노드를 클러스터에 추가할 때 관련 정보들을 레이블로 지정해서 노드를 분류한다
- 커맨드
   ```
   // 노드에 gpu 레이블 추가
   kubectl label node gke-kubia-default-pool-7985c381-bscm gpu=true

   // 결과
   node/gke-kubia-default-pool-7985c381-bscm labeled

   // 노드 조회
   kubectl get nodes -l gpu=true

   // 결과
   NAME                                   STATUS   ROLES    AGE   VERSION
   gke-kubia-default-pool-7985c381-bscm   Ready    <none>   8d    v1.14.10-gke.36
   ```

특정 노드에 파드 스케쥴링
- yaml 파일: [Link](/ch3/codes/kubia-gpu.yaml)

## 3.6 파드에 어노테이션 달기
어노테이션
- 레이블과 비슷하지만 식별 정보를 가지지 않는다
- 특정 어노테이션은 자동으로 오브젝트에 추가되고, 나머지는 수동으로 추가할 수 있다
- 쿠버네티스에 새로운 기능을 추가하거나, 파드나 또는 다른 API 오브젝트에 설명을 추가할 때 사용된다
- 총 256KB 까지 저장 가능하다

오브젝트의 어노테이션 조회
- 커맨드
   ~~~
   // 조회 커맨드 (파드 정보에서 확인 가능하다)
   kubectl get po kubia-hrpbr -o yaml

   // 결과
   apiVersion: v1
   kind: Pod
   metadata:
     annotations:
       kubernetes.io/limit-ranger: 'LimitRanger plugin set: cpu request for container kubia'
   ~~~

어노테이션 추가
- 커맨드
   ~~~
   // 어노테이션 추가
   kubectl annotate pod kubia-hrpbr mycompany.com/someannotation="foo bar"

   // 결과 
   pod/kubia-hrpbr annotated

   // 어노테이션 조회
   kubectl describe pod kubia-hrpbr

   // 조회 결과
   Annotations:
      kubernetes.io/limit-ranger: LimitRanger plugin set: cpu request for container kubia
      mycompany.com/someannotation: foo bar
   ~~~

## 3.7 네임스페이스를 사용한 리소스 그룹화
네임스페이스 
- 오브젝트 이름의 범위. (리눅스의 네임스페이스와는 다르다)
- 여러 네임스페이스를 사용하면 많은 구성 요소를 가진 복잡한 시스템을 좀 더 작은 개별 그룹으로 분리할 수 있다
   - 여러 사용자 또는 그룹이 동일한 쿠버네티스 클러스터를 사용하고 있고, 각자 자신들의 리소스를 관리한다면 각각의 고유한 네임스페이스를 사용해야 한다
   - 이렇게 하면 다른 사용자의 리소스를 수정하거나 삭제하지 않도록 주의를 기울일 필요가 없다
- 멀티테넌트 환경처럼 리소스를 분리하는데 사용된다
   - 예:  QA, 개발, 프로덕션 등
- 리소스 이름은 네임스페이스 안에서만 고유하면 되며, 서로 다른 두 네임스페이스는 동일한 이름의 리소스를 가질 수 있다
- 노드 리소스는 전역이며, 단일 네임스페이스에 얽매이지 않는다

### 네임스페이스 관리
네임스페이스 조회
- 기본적으로는 default 네임스페이스에 대해서만 표시된다
   ~~~
   // 네임스페이스 조회
   kubectl get ns   
   // 조회 결과
   NAME                   STATUS   AGE
   default                Active   8d
   kube-node-lease        Active   8d
   kube-public            Active   8d
   kube-system            Active   8d   
   // 특정 네임스페이스 파드 보기
   kubectl get po --namespace kube-system   
   // 결과
   NAME                                                        READY     STATUS    RESTARTS   AGE
   event-exporter-v0.2.5-599d65f456-hl4ph                      2/2       Running   0          8d
   fluentd-gcp-scaler-bfd6cf8dd-44gdp                          1/1       Running   0          8d
   fluentd-gcp-v3.1.1-b9m8c                                    2/2       Running   0          8d
   fluentd-gcp-v3.1.1-ctvnc                                    2/2       Running   0          8d
   fluentd-gcp-v3.1.1-sbp9m                                    2/2       Running   0          8d
   heapster-gke-75bcf6dd94-5tlsn                               3/3       Running   0          8d
   kube-dns-5995c95f64-5m68k                                   4/4       Running   0          8d
   kube-dns-5995c95f64-mpmtw                                   4/4       Running   0          8d
   kube-dns-autoscaler-8687c64fc-62hq8                         1/1       Running   0          8d
   kube-proxy-gke-kubia-default-pool-7985c381-bscm             1/1       Running   0          8d
   kube-proxy-gke-kubia-default-pool-7985c381-jd6x             1/1       Running   0          8d
   kube-proxy-gke-kubia-default-pool-7985c381-nk10             1/1       Running   0          8d
   l7-default-backend-8f479dd9-4dnfn                           1/1       Running   0          8d
   metrics-server-v0.3.1-5c6fbf777-rf8dw                       2/2       Running   0          8d
   prometheus-to-sd-676wx                                      2/2       Running   0          8d
   prometheus-to-sd-6pgr2                                      2/2       Running   0          8d
   prometheus-to-sd-g9t48                                      2/2       Running   0          8d
   stackdriver-metadata-agent-cluster-level-5ddfff45b6-l64td   2/2       Running   0          8d
   ~~~

네임스페이스 생성
- yaml 파일 또는 커맨드 옵션을 이용해서 생성할 수 있다
- yaml 파일: [Link](/ch3/codes/custom-namespace.yaml)
- 커맨드
   ~~~
   // yaml 파일을 이용해서 네임스페이스 생성
   kubectl create -f custom-namespace.yam   
   // 결과
   namespace/custom-namespace create   
   // 커맨드 옵션으로 생성
   kubectl create namespace custom-namespace
   ~~~
    
다른 네임스페이스의 오브젝트 관리
- kubectl 을 사용할 때 `--namespace` 플래그를 전달해야 한다
- 커맨드
   ~~~
   // custom-namespace의 파드 조회
   kubectl get pods -n custom-namespace

   // 결과
   NAME           READY   STATUS    RESTARTS   AGE
   kubia-manual   1/1     Running   0          21s
   ~~~

네임스페이스가 제공하는 격리
- 네임스페이스를 사용하면 오브젝트를 별도의 그룹으로 분리해 특정한 네임스페이스 안에 속한 리소스를 대상으로 작업할 수 있게 해주지만, 실행 중인 오브젝트에 대한 격리는 제공하지 않는다
- 예를 들어 네트워크 솔루션이 네임스페이스간 격리를 제공하지 않는 경우, 서로 다른 네임스페이스에 있는 파드끼리 IP주소를 알고 있으면 통신 가능하다

## 3.8 파드 중지와 제거

이름으로 파드 제거
- 커맨드
   ~~~
   kubectl delete po kubia-gpu
   ~~~
- 파드를 삭제하면 쿠버네티스는 파드 안에 있는 모든 컨테이너를 종료하도록 지시한다
   1. 쿠버네티스는 SIGTERM 신호를 프로세스에 보내고 지정된 시간(기본 30초)를 기다린다
   2. 시간 내에 종료되지 않으면 SIGKILL 신호를 통해 종료한다

레이블 셀렉터를 이용한 파드 삭제
- 커맨드
   ~~~
   kubectl delete po -l creation_method=manual
   ~~~

네임스페이스를 이용한 파드 제거 
- 커맨드
   ~~~
   kubectl delete ns custom-namespace
   ~~~
- 네임스페이스 전체를 삭제하면 파드는 함께 삭제된다

네임스페이스를 유지하면서 모든 파드 삭제
- 커맨드
   ~~~
   kubectl delete po --all
   ~~~
- 하지만 삭제해도 replication-controller에 의해서 해당 수량만큼 다시 생성된다

네임스페이스에서 (거의) 모든 리소스 삭제
- 커맨드
   ~~~
   // 삭제 커맨드
   kubectl delete all --all

   // 결과
   pod "kubia-hrpbr" deleted
   replicationcontroller "kubia" deleted
   service "kubernetes" deleted
   service "kubia-http" deleted
   ~~~
- 쿠버네티스 서비스도 삭제되지만, 잠시후에 다시 생성된다
   ~~~
   NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
   kubernetes   ClusterIP   10.7.240.1   <none>        443/TCP   68s
   ~~~