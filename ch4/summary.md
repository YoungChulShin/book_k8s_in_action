# 4장. 레플리케이션과 그 밖의 컨트롤러: 관리되는 파드 배포

4장 내용
- 쿠버네티스가 컨테이너를 모니터링하고 실패하면 자동으로 다시 시작하는 법을 배운다
- 관리되는 파드를 활용해 지속적으로 실행되는 파드를 실행하는 방법과 한가지 작업만 수행한 뒤 중지되는 파드를 실행하는 방법을 배운다

## 4.1 파드를 안정적으로 유지하기
파드의 실행을 모니터링
- Kubelet은 파드가 노드에 스케쥴링되는 즉시 파드의 컨테이너를 계속 실행되도록 한다
- 컨테이너의 주 프로세스에 크래시가 발생하면 Kubelet이 컨테이너를 다시 시작한다
- 하지만, 에러가 아니라 무한루프, 교착상태가 빠져서 응답이 없는거라면? 
   - 외부에서 애플리케이션의 상태를 체크해야 한다

### 라이브니스 프로브 (liveness probe)
라이브니스 프로브
- 쿠버네티스는 라이브니스 프로브를 통해서 컨테이너가 살아 있는지 확인할 수 있다
- 주기적으로 프로브를 실행하고, 프로브가 실패할 경우 컨테이너를 다시 시작한다

3가지 매커니즘
- HTTP GET 프로브
   - 지정한 IP주소, 포트, 경로에 GET 요청을 수행한다
   - 서버가 오류 코드를 반환하거나 응답이 없으면 실패한 것으로 간주하고 컨테이너를 다시 시작한다
- TCP 소켓 프로브
   - 컨테이너에 지정된 포트에 TCP 연결을 시도한다
- Exec 프로브
   - 컨테이너 내의 임의의 명령을 실행하고 명령의 종료 상태 코드를 확인한다

### HTTP 기반 라이브니스 프로브 생성
프로스 파일 정보
- 코드
   ~~~yaml
   apiVersion: v1
   kind: Pod
   metadata:
      name: kubia-liveness
   spec:
      containers:
         - image: go1323/kubia-unhealthy
            name: kubia
            livenessProbe:
               httpGet:
                  path: /
                  port: 8080
   ~~~

동작중인 프로브 확인
- 프로브 생성
   ~~~
   kubectl create -f kubia-liveness-probe.yaml
   ~~~
- 프로브 확인
   ~~~
   // 처음 생성
   NAME             READY   STATUS    RESTARTS   AGE
   kubia-liveness   1/1     Running   0          66s

   // 일정 시간 이후 - Restarts 값이 증가
   NAME             READY   STATUS    RESTARTS   AGE
   kubia-liveness   1/1     Running   1          3m12s
   ~~~
- 삭제 세부 사유 확인
   ~~~
   // 조회
   kubectl describe po kubia-liveness

   // 확인
   State:          Running
      Started:      Thu, 25 Jun 2020 22:33:29 +0900
   Last State:     Terminated
      Reason:       Error
      Exit Code:    137
      Started:      Thu, 25 Jun 2020 22:31:39 +0900
      Finished:     Thu, 25 Jun 2020 22:33:26 +0900
    Ready:          True
    Restart Count:  2
   ~~~
   - Last State 값이 Error로 종료된 것을 확인할 수 있다
   - 컨태이너가 종료되면 이후에는 완전히 새로운 컨테이너가 생성된다

### 효과적인 라이브니스 프로브 생성
라이브니스 프로브가 확인해야 할 사항
- 보통은 서버의 응답을 검사하는 것 만으로도 큰 일을 한다
- 조금 더 나아가면 특정 URL에 요청해서 모든 구성요소가 살아있는지 검사할 수도 있다<br>
   (인증이 있으면 실패할 수 있으니 잘 확인해야 한다)

프로브를 가볍게 유지하기
- 기본적으로는 자주 실행되며 1초 내에 완료돼야 한다

프로브에 재시도 루프를 구현하지 마라

레플리케이션 컨트롤러
- 프로브 작업은 노드의 Kubelet에서 수행하고, 마스터에서는 관여하지 않는다
- 노드 자체에 크래시가 발생한 경우에는, 컨트롤 플레인이 관여해줘야 하는데 이 경우 레플리케이션컨트롤러를 이용해서 파드를 관리해야 한다
- _프로브는 파드의 컨테이너가 정상적으로 실행중인지 체크하는 것이고, RC는 파드가 정상적으로 실행중인지 컨트롤_

## 4.2 레플리케이션컨트롤러 소개
레플리케이션컨트롤러
- 쿠버네티스 리소스로서 파드가 항상 실행되도록 보장한다
- 노드가 사라지거나, 노드에서 파드가 사라진 경우 RC는 파드를 감지해서 교체 파드를 생성한다

### 레플리케이션컨트롤러 동작
컨트롤러 조정 루프
- RC의 역할은 정확한 수의 파드가 항상 레이블 셀렉터와 일치하는지 확인하는 것이다
- 의도하는 파드수와 실제 파드수를 일치시키기 위한 조치를 취한다
   1. 레이블 셀렉터를 이용해서 매치되는 파드를 찾음
   2. 너무 많으면 파드를 삭제하고, 너무 적으면 현재 템플릿에서 파드를 추가 생성

레플리케이션컨트롤러의 3가지 요소
- 레이블 셀렉터: RC 범위에 있는 파드를 결정한다
- 레플리카 수: 실행할 파드의 수를 지정한다
- 파드 템플릿: 새로운 파드 레플리카를 만들 때 사용

레플리케이션컨트롤러 이점
- 기존 파드가 사라지만 새 파드를 시작해서 항상 실행되도록 한다
- 클러스터 노드에 장애가 발생하면 장애한 발생한 노드에서 실행중인 모든 파드에 관한 교체 복제본이 생성된다
- 수동 또는 자동으로 파드를 쉽게 확장할 수 있게 한다

레플리케이션 컨트롤러 생성
- yaml 파일로 관리
   ```yaml
   apiVersion: v1
   kind: ReplicationController
   metadata:
      name: kubia
   spec:
      replicas: 3
      selector: 
         app: kubia
      template:
         metadata: 
               labels:
                  app: kubia
         spec:
               containers:
               - name: kubia
               image: luksa/kubia
               ports:
               - containerPort: 8080 
   ```
   - selector: `app: kubia` 와 일치하는 인스턴스를 유지
   - select 값과 templates의 label은 일치해야 한다. 그렇지 않으면 무한대로 생성된다. 
      - 파드 셀렉터를 지정하지 않도록 하는 것도 하나의 방법이다. -> 템플릿에서 가져와서 사용할 수 있도록
- 생성
   ```
   // 생성 커맨드
   kubectl create -f kubia-rc.yaml

   // 작동 확인
   NAME          READY   STATUS    RESTARTS   AGE
   kubia-5thjg   1/1     Running   0          117s
   kubia-g2g8x   1/1     Running   0          117s
   kubia-nnhbk   1/1     Running   0          117s

   // 1개를 삭제 테스트
   kubectl delete po kubia-5thjg

   // 작동 확인
   NAME          READY   STATUS        RESTARTS   AGE
   kubia-5thjg   1/1     Terminating   0          3m34s
   kubia-g2g8x   1/1     Running       0          3m34s
   kubia-nnhbk   1/1     Running       0          3m34s
   kubia-sl2jl   1/1     Running       0          15s
   ```

레플리케이션컨트롤러 정보 조회
- 커맨드
   ~~~
   // 조회
   kubectl get rc

   // 결과
   NAME    DESIRED   CURRENT   READY   AGE
   kubia   3         3         3       4m26s
   ~~~

컨트롤러가 새로운 파드를 생성하는 과정
1. 파드가 삭제
2. 레플리케이션컨트롤러가 삭제되는 파드에 대해서 통지를 받는다
3. 레플리케이션컨트롤러가 실제 파드 수를 확인하고 조치를 취한다.
   - 통지는 적절한 조치를 취하도록 하는 트리거 역할을 한다

장애 대응
1. 파드의 노드를 조회
   ```
   NAME          READY   STATUS    RESTARTS   AGE   IP          NODE
   kubia-g2g8x   1/1     Running   0          13m   10.4.0.15   gke-kubia-default-pool-7985c381-bscm
   kubia-nnhbk   1/1     Running   0          13m   10.4.2.8    gke-kubia-default-pool-7985c381-nk10
   kubia-sl2jl   1/1     Running   0          10m   10.4.1.8    gke-kubia-default-pool-7985c381-jd6x
   ```
2. 노드 하나를 네트워크 다운
   ```
   // ssh 접속
   gcloud compute ssh gke-kubia-default-pool-7985c381-bscm

   // 네트워크 다운
   sudo ifconfig eth0 down
   ```
3. 노드 및 파드 상태 확인
   ```
   // 노드 상태 확인
   NAME                                   STATUS     ROLES    AGE   VERSION
   gke-kubia-default-pool-7985c381-bscm   NotReady   <none>   12d   v1.14.10-gke.36
   gke-kubia-default-pool-7985c381-jd6x   Ready      <none>   12d   v1.14.10-gke.36
   gke-kubia-default-pool-7985c381-nk10   Ready      <none>   12d   v1.14.10-gke.36

   // RC 상태 확인
   NAME    DESIRED   CURRENT   READY   AGE
   kubia   3         3         2       18m

   // 파드 상태 확인 (시간이 몇번 분 걸림)
   NAME          READY   STATUS    RESTARTS   AGE   IP          NODE
   kubia-g2g8x   1/1     Unknown   0          22m   10.4.0.15   gke-kubia-default-pool-7985c381-bscm
   kubia-nnhbk   1/1     Running   0          22m   10.4.2.8    gke-kubia-default-pool-7985c381-nk10
   kubia-sl2jl   1/1     Running   0          19m   10.4.1.8    gke-kubia-default-pool-7985c381-jd6x
   kubia-wmnrp   1/1     Running   0          28s   10.4.2.9    gke-kubia-default-pool-7985c381-nk10
   ```
4. 노드 상태 되돌리기
   - 노드를 리셋해서 되돌린다
      ```
      gcloud compute instances reset gke-kubia-default-pool-7985c381-bscm
      ```
      - Unknown 파드가 삭제된다

### 레플리케이션컨트롤러 범위 안밖으로 파드를 이동하기
레플리케이션컨트롤러와 파드의 관계
- RC는 레이블셀렉터와 일치하는 파드만을 관리한다
- 파드의 레이블이 변경되면 RC의 범위에서 제외되거나 추가될 수 있다
- 제외된 파드는 수동으로 생성한 파드와 같은 개념이 된다

레플리케이션컨트롤러와 파드의 관계 테스트
1. RC가 관리하는 파드에 레이블 추가
   ~~~
   // 레이블 추가
   kubectl label pod kubia-nnhbk type=special

   // 레이블 조회 커맨드
   kubectl get pods --show-labels

   // 레이블 조회 결과 확인
   NAME          READY   STATUS    RESTARTS   AGE    LABELS
   kubia-nnhbk   1/1     Running   0          3d5h   app=kubia,type=special
   kubia-sl2jl   1/1     Running   0          3d4h   app=kubia
   kubia-wmnrp   1/1     Running   0          3d4h   app=kubia
   ~~~
2. 1개의 파드에서 레이블을 변경해서 RC가 관리하지 않도록 하기
   ~~~
   // app 레이블을 kubia에서 foo로 변경하기
   kubectl label pod kubia-nnhbk app=foo --overwrite

   // 레이블 변경 이후에 신규 생성된 파드 확인 (kubia-hrjsx)
   NAME          READY   STATUS    RESTARTS   AGE    APP
   kubia-hrjsx   1/1     Running   0          31s    kubia
   kubia-nnhbk   1/1     Running   0          3d5h   foo
   kubia-sl2jl   1/1     Running   0          3d4h   kubia
   kubia-wmnrp   1/1     Running   0          3d4h   kubia
   ~~~

레플리케이션컨트롤러의 레이블을 변경한다면?
- RC의 Replica 수 만큼 새로운 파드가 생성된다

### 파드 템플릿 변경
변경 영향도
- 템플릿을 변경하면 기존 파드에는 영향을 주지 않아고 새로 생성되는 파드에만 영향을 미친다

템플릿 변경
- 커맨드
   ~~~
   kubectl edit rc kubia
   ~~~

### 파드 스케일링
파드 스케일링하기
1. 스케일업 방법으로 적용하기
   ~~~
   kubectl scale rc kubia --replicas=10
   ~~~
2. RC 정의를 편집해서 스케일링하기
   ~~~
   // RC 정의 파일 열기
   kubectl edit rc kubia

   // 원하는 부분 수정하기
   sepc -> replicas: 10

   // 결과 확인
   NAME          READY   STATUS              RESTARTS   AGE
   kubia-565d6   0/1     ContainerCreating   0          4s
   kubia-58hvp   0/1     ContainerCreating   0          4s
   kubia-5qs89   0/1     ContainerCreating   0          4s
   kubia-5z52g   0/1     ContainerCreating   0          4s
   kubia-gxclw   0/1     ContainerCreating   0          4s
   kubia-hrjsx   1/1     Running             0          26m
   kubia-k2rfw   0/1     ContainerCreating   0          4s
   kubia-nnhbk   1/1     Running             0          3d5h
   kubia-sl2jl   1/1     Running             0          3d5h
   kubia-wmnrp   1/1     Running             0          3d5h
   kubia-xf8zs   0/1     ContainerCreating   0          4s
   ~~~

스케일 다운하기
- kubectl scale 명령어 사용
   ~~~
   // 스케일 축소
   kubectl scale rc kubia --replicas=3

   // 진행 과정
   NAME          READY   STATUS        RESTARTS   AGE
   kubia-565d6   1/1     Terminating   0          107s
   kubia-58hvp   1/1     Terminating   0          107s
   kubia-5qs89   1/1     Terminating   0          107s
   kubia-5z52g   1/1     Terminating   0          107s
   kubia-gxclw   1/1     Terminating   0          107s
   kubia-hrjsx   1/1     Running       0          27m
   kubia-k2rfw   1/1     Terminating   0          107s
   kubia-nnhbk   1/1     Running       0          3d5h
   kubia-sl2jl   1/1     Running       0          3d5h
   kubia-wmnrp   1/1     Running       0          3d5h
   kubia-xf8zs   1/1     Terminating   0          107s
   ~~~

### 페플리케이션컨트롤러 삭제
`kubectl delete`를 이용한 삭제
- 파드도 같이 삭제된다

파드는 유지하면서 RC만 삭제
- `cascade=false` 옵션을 주면 파드는 남아있다
   ~~~
   // RC 삭제
   kubectl delete rc kubia --cascade=false

   // 파드 조회
   NAME          READY   STATUS    RESTARTS   AGE
   kubia-hrjsx   1/1     Running   0          31m
   kubia-nnhbk   1/1     Running   0          3d5h
   kubia-sl2jl   1/1     Running   0          3d5h
   kubia-wmnrp   1/1     Running   0          3d5h
   ~~~


## 4.3 레플리케이션컨트롤러 대신 라플리카셋 사용하기
레플리카셋
- 차세대 레플리케이션컨트롤러이며, 레플리케이션컨트롤러를 완전히 대체할 것이다

### 레플리카셋과 레플리케이션컨트롤러 비교
레플리카셋의 이점
- 이 조금더 풍부한 표현식을 사용하는 파드 셀렉터를 가지고 있다
- 1개의 레플리카셋으로 2개(아마도 이상)의 파드 세트를 매칭시켜 하나의 그룹으로 관리할 수 있다
- 값에 상관없이 카의 존재만으로 파드를 매칭시킬 수 있다

### 레플리카셋 정의하기
kubia-replicaset.yaml: [Link](/ch4/codes/kubia-replicaset/kubia-replicaset.yaml)
- 코드
   ~~~
   apiVersion: apps/v1
   kind: ReplicaSet
   metadata:
       name: kubia
   spec:
       replicas: 3
       selector:
           matchLabels:
               app: kubia
       template:
           metadata:
               labels:
                   app: kubia
           spec:
               containers:
               - name: kubia
                 image: luksa/kubia
   ~~~
   - apps: API 그룹
   - v1: API 버전

### 레플리카셋 생성하기
레플리카셋 생성
- 커맨드
   ~~~
   // 생성
   kubectl create -f kubia-replicaset.yaml

   // 생성 확인
   kubectl get rs

   // 생성 확인 결과
   NAME    DESIRED   CURRENT   READY   AGE
   kubia   3         3         3       2m1s
   ~~~

MatchExpressions
- 셀렉터에 표현식을 추가해서 더 강력한 조건을 설정할 수 있다

레플리카셋 삭제
- 커맨드
   ~~~
   kubectl delete rs kubia
   ~~~

## 4.4 데몬셋을 사용해 각 노드에서 정확히 한 개의 파드 실행하기
### 데몬셋
데몬셋 설명
- 배경: 각 노드에서 하나의 파드만 실행되어야 할 경우가 있다
- 예시: 로그 수집기 또는 리소스 모니터링 또는 kube-proxy 등
- 특징
   - 파드의 타깃 노드가 지정돼 있다
   - 쿠버네티스 스케쥴러를 건너뛴다

데몬셋 생성
- yaml 파일 생성: [Link](/ch4/codes/ssd-monitor-deamonset/ssd-monitor-daemonset.yml)
   ~~~yaml
   apiVersion: apps/v1
   kind: DaemonSet
   metadata:
      name: ssd-monitor
   spec:
      selector:
         matchLabels:
               app: ssd-monitor
      template:
         metadata:
               labels:
                  app: ssd-monitor
         spec:
               nodeSelector:
                  disk: ssd
               containers:
               - name: main
               image: luksa/ssd-monitor
   ~~~
   - `disk:ssd` 레이블을 가지는 노드 셀렉터 생성
- 데몬셋 생성 및 확인
   ~~~
   // 생성 커맨드
   kubectl create -f ssd-monitor-daemonset.yml

   // 데몬셋 조회
   kubectl get ds

   // 데몬셋 조회 결과
   NAME          DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
   ssd-monitor   0         0         0       0            0           disk=ssd        2m54s
   ~~~
- 노드에 레이블을 추가해서 파드 생성하기
   ~~~
   // 노드에 레이블 추가
   kubectl label node gke-kubia-default-pool-7985c381-bscm disk=ssd

   // 파드 생성 확인을 위해서 파드 조회
   NAME                READY   STATUS    RESTARTS   AGE
   ssd-monitor-tm2rs   1/1     Running   0          18s
   ~~~
- 노드에서 레이블 제거하기
   ~~~
   // 노드의 레이블을 변경해보기
   kubectl label node gke-kubia-default-pool-7985c381-bscm disk=hdd --overwrite

   // 데몬셋에 의해서 생성된 파드가 삭제된다
   NAME                READY   STATUS        RESTARTS   AGE
   ssd-monitor-tm2rs   1/1     Terminating   0          3m55s
   ~~~

## 4.5 완료 가능한 단일 태스크를 수행하는 파드 실행
### 잡 리소스
- 배경: 항상 실행되는 것이 아니라, 한번 실행되고 종료되는 태스크를 수행하고 싶다
- 특징
   - 잡을 이용하면 컨테이너 내부에서 실행중인 프로세스가 성공적으로 완료되면 컨테이너를 다시 시작하지 않는 파드를 실행할 수 있다
   - 노드에 장애가 발생한 경우 해당 노드에 있던 잡이 관리하는 파드는 다른 노드로 다시 스케쥴링 된다
- 예시
   - 작업이 제대로 완료되는 것이 매우 중요한 임시 작업에 유용하다
   - 데이터를 어딘가에 저장하고 있고, 이 데이터를 변환해서 어딘가로 전송해야 하는 경우

잡 리소스 정의
- yaml 파일 생성: [Link](/ch4/codes/exporter/exporter.yaml)
   ~~~yaml
   apiVersion: batch/v1
   kind: Job
   metadata:
      name: batch-job
   spec:
      template:
         metadata:
               labels:
                  app: batch-job
         spec:
               restartPolicy: OnFailure
               containers:
               - name: main
               image: luksa/batch-job
   ~~~
   - api group이 batch에 속한다
   - restartPolicy의 기본값은 Always이다.<br>
   잡은 무한성 실행할 수 없으므로 `OnFailure` 또는 `Never` 로 설정한다
   -  
- 잡 생성 및 확인
   ~~~
   // 잡 생성 커맨드
   kubectl create -f exporter.yaml

   // 잡 확인 커맨드
   kubectl get jobs

   // 잡 확인 결과
   NAME        COMPLETIONS   DURATION   AGE
   batch-job   0/1           25s        25s

   // 파드 생성 확인 
   NAME              READY   STATUS    RESTARTS   AGE
   batch-job-fp8d9   1/1     Running   0          69s

   // 120 초 뒤에 
   NAME              READY   STATUS      RESTARTS   AGE
   batch-job-fp8d9   0/1     Completed   0          3m15s
   ~~~
   - 완료된 파드가 삭제되지 않는 이유는 해당 파드의 로그를 검사할 수 있게 하기 위해서다<br>
   (kubectl logs batch-job-fp8d9)

- 잡 설정 
   - 순차적으로 여러 파드를 실행하는 방법
      ~~~yaml
      spec.completions: 5 # 5번 수행 예시
      ~~~
   - 병렬로 여러 파드를 실행하는 방법
      ~~~yaml
      spec.completions: 5 # 5번 수행 예시
      spec.parallelism: 2 # 2개의 노드에서 수행
      ~~~

## 4.6 잡을 주기적으로 또는 한번 실행되도록 스케줄링하기
크론잡
- 배경: 미래의 특정 시간 또는 지정된 간격으로 반복실행이 필요할 경우

크론잡 생성
- yaml 파일 생성
   ~~~yaml
   apiVersion: batch/v1beta1
   kind: CronJob
   metadata:
      name: batch-job-every-fifteen-minutes
   spec:
      schdule: "0,15,30,45 * * * *"
      jobTemplate:
         ## 생략
   ~~~
- schdule 정보
   - 왼쪽에서부터 '분, 시, 일, 월, 요일' 정보를 나타낸다
   - 0,15,30,45 * * * *
      - *은 반복되는 값을 정의
         - 왼쪽부터 시간, 일, 월, 요일
      - 위 내용은 매시간 매일 매월 모든 요일에 0, 15, 30, 45분에 실행되는 것을 의미한다
   - 추가 예시
      - 0, 30 * 1 * * : 매달 첫번째날 30분마다 실행
      - 0 3 * * 0: 일요일마다 새벽 3시에 실행
- 크론잡 설정 
   - 데드라인 설정
      ~~~yaml
      spec.startingDeadlineSeconds: 15 ## 15초가 지날때까지 실행하지 않으면 실패로 간주
      ~~~