# 레플리케이션과 그밖의 컨트롤러
## 라이브니스 프로브
배경
- 애플리케이션에 버그가 있고 크래시가 발생하는 경우 쿠버네티스가 애플리케이션을 재시작한다. 그 외에 OutOfMemory 등이 발생해도 재시작된다
- 애플리케이션이 교착상태에 빠져서 응답을 하지 않는 상황이면 어떨까? 외부에서 애플리케이션의 상태를 체크할 수 있어야 한다

라이브니스 프로브
- 쿠버네티스는 주기적으로 라이브니스 프로브를 실행하고 프로브가 실패할 경우 컨테이너를 다시 시작한다
- 종류
   - HTTP GET: 특정 주소롤 http 요청
   - TCP Socket: 컨테이너의 지정된 포트에 TCP 연결을 시도
   - Exec 프로브: 컨테이너에 임의의 명령을 실행하고 종료 상태 코드를 확인하는 방식
- 생성 커맨드: `'source/kubia-liveness-probe.yaml'` 파일 참고
- 노드의 kubelet에서 수행하며, 마스터에서는 이 작업을 관여하지 않는다

컨테이너 종료 상태 확인
- 이전 파드의 로그 확인: `'kubectl logs {{pod name}} --previous'`
- Pod describe에서 'Last State' 값 확인
   ```
   Last State:     Terminated
      Reason:       Error
      Exit Code:    137 # 종료 코드: 128 + x. x는 프로세스에 전송된 시그널 번호, 여기서 x는 SIGKILL 번호인 9이다.
      Started:      Mon, 11 Oct 2021 19:54:42 +0900
      Finished:     Mon, 11 Oct 2021 19:56:24 +0900
   ```

재시작 조건 확인
- `Liveness:       http-get http://:8080/ delay=0s timeout=1s period=10s #success=1 #failure=3`
   - delay: 컨테이너가 시작된 후 프로브가 바로 시작되었다는 뜻. 이 값을 조정하려면 initialDelaySeconds를 설정해줘야한다
   - timeout: 컨테이너가 1초 안에 응답해야 한다
   - period: 10초마다 프로브를 실행한다
   - success: 1번 성공하면 성공한 것으로 판단한다
   - failure: 연속으로 3번 실패하면 컨테이너가 다시 시작된다


## 레플리케이션컨트롤러
개념
- 정해진 수 만큼의 파드가 항상 실행되도록 보장한다
- 이를 위해서 정확한 수의 파드가 항상 레이블 셀렉터와 일치하는지 확인한다
   - 수보다 많으면 삭제하고, 수보다 작으면 신규로 생성한다

3가지 구성요소
- 레이블 셀렉터: 파드의 범위를 설정
- 레플리카 수: 실행할 파드의 수를 지정
- 파드 템플릿: 새로운 파드를 만들 때 사용할 템플릿 정보

특징
- 레이블 셀렉터와 파드 템플릿을 변경해도 기존 파드에는 영향을 미치지 않는다
   - 레이블 셀렉터를 변경하면 기존 파드는 관리 범위에서 빠지게 된다
   - 파드 템플릿을 변경하는 것은 새 파드를 생성할 때에만 영향을 미친다. 기존 파드에는 영향을 주지 않는다. 
- 이점
   - 파드가 항상 실행되도록 보장한다
   - 노드에 장애가 발생하면 장애가 발생한 노드에서 실행중인 모든 파드에 관한 교체 복제본이 생성된다
   - 수정 또는 자동으로 수평 확장할 수 있다
- rc를 삭제하면 파드도 함께 삭제된다
   - '--cascade=false' 옵션을 주면 파드가 삭제되는 것을 막을 수 있다

`kubectl get rc 정보`
- desired: rc이 원하는 파드의 수
- current: 현재 하드의 수
- ready: 준비 된 파드의 수 (파드가 생성중이라면 current와 ready가 다를 수 있다)

## 레플리카셋
개념
- 레플리카겟을 대체할 리소스

레플리케이션 컨트롤러와 비교
- 좀 더 풍부한 표현식을 제공한다
   - 특정 레이블이 없는 파드나, 레이블의 값과 상관이 키를 갖는 파드만을 매칭시킬 수 있다.
   - 1개의 rs으로 두 파드 세트를 매칭시켜 하나의 그룹으로 취급할 수 있다

생성 커맨드
- `'source/kubia-replicaset.yaml'` 파일 참고

matchExpressions
- matchExpressions를 이용하면 좀 더 다양한 조건으로 대상을 선택할 수 있다
- 샘플
   ```yaml
   selector:
    matchExpressions:
      - key: app # label의 키는 app
        operator: In  # 아래 values 중 지정된 값과 일치하는 하나
        values:
          - kubia
   ```
- operator에 'In', 'NotIn', 'Exists', 'DoesNotExists' 를 사용할 수 있다

rs를 삭제하면 파드를 함께 삭제한다
- '--cascade=orphan' 옵션을 통해서 삭제되는 것을 막을 수 있다

## 데몬 셋
개념
- 노드마다 파드를 하나만 생성할 때 사용하는 오브젝트

특징
- 노드마다 수행되기 때문에 ReplicaCount 개념이 없다
- 노드가 다운되어도 다른 노두에 파드를 생성하지 않는다. 반대로 새 노드가 생성되면 파드가 생성된다. 
- `'nodeSelector'`를 이용해서 특정 노드를 지정할 수 있다
   ```yaml
    spec:
      nodeSelector:
        disk: ssd
      containers:
      - name: main
        image: luksa/ssd-monitor
   ```

데몬셋 생성 정보
```
NAME          DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
ssd-monitor   2         2         2       2            2           disk=ssd        37s
```
- nodeSelector를 지정하면 위와 같이 column에 포현된다. 이 값이 없으면 전체 노드에 생성되면 none으로 표현된다

## 잡, 크론 잡
잡
- 특정 작업이 수행되는 제대로 완료되는 것이 중요한 작업에 사용에 사용된다
- 작업은 횟수(completions)를 지정할 수 있고, 병렬(parallelism)로 처리되도록 설정할 수 도 있다
- 참고: https://kubernetes.io/ko/docs/concepts/workloads/controllers/job/

크론 잡
- 특정 주기에 맞게 잡 리소스를 수행
- 실간 설정 예시
   ```yaml
   spec:
    schedule: "0,15,30,45 * * * *"  # 15분만다 작업을 수행한다
   ```
   - 순서대로 분, 시, 일, 월, 요일 을 가리킨다
   - '*'은 All을 의마한다
- 참고: https://kubernetes.io/ko/docs/concepts/workloads/controllers/cron-jobs/
