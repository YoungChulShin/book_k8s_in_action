# 10장. 스테이트풀 셋
여러개의 파드의 레플리카가 실행되면서 개별 스토리지 볼륨을 사용하는 파드를 가지려면 어떻게 해야할까?
- ReplicaSet은 동일한 파드 템플릿을 사용하기 때문에 이 질문에 대응이 어렵다. RS이 파드를 교체하면 새로운 호스트 이름과 IP를 가지는 파드가 생성된다.

StatefulSet(스테이트풀셋)
- 애플리케이션의 인스턴스가 각각 안정적인 이름과 상태를 가지며 개별 취급된다
- 파드가 죽어도 기존 파드의 아이덴티티와 상태를 유지하면서 다시 스케쥴링 된다

그럼 어떻게 아이덴티티를 제공할까?
- 각 파드는 임의의 이름이 아닌 정리된 이름을 갖는다
   - 정리된 이름은 0부터 증가하는 인덱스를 가진다
- 거버닝 헤드리스 서비스를 생성해서 각 파드에서 실제 네트워크 아이덴티티를 제공한다
   - 이 서비스를 통해서 각 파드는 자체 DNS 엔트리를 가진다
   - `'{pod-name}.{service}.{name-space}.svc.cluster.local'` FQDN을 통해서 접근할 수 있다
- 새로 생성된 파드는 기존 노드에 실행된다는 보장은 없다.

스케일링
- 스테이트풀셋을 스케일링하면 다음 서수 인덱스를 갖는 새로운 인스턴스를 생성한다
- 스케일다운되면 가장 높은 인덱스를 먼저 제거한다
   - 레플리카셋은 이 부분을 예측할 수 없다
- 한 시점에 하나의 파드 인스턴스만 스케일 다운한다
   - 예를 들어 각 데이터 엔트리마다 두 개의 복제본을 저장하도록 구생했다면 데이터를 저장한 두개 노드가 동시에 다운되면 데이터를 잃을 수 있다. 스케일 다운이 순차적으로 일어나면 손실된 복사본을 대체하기 위한 데이터 엔트리의 추가 복제본을 다른 곳에 생성할 시간을 갖게 된다
- 인스턴스 하나라도 비정상인 경우 스케일 다운 작업을 허용하지 않는다

전용 스토리지 제공
- 각각의 스테이트풀셋 파드는 별도의 PV을 갖는 PVC을 참조해야한다
- 스테이트풀셋 하나를 스케일업하면 파드와 파드에서 참조하는 PVC이 만들어진다
- 이 때문에 실수로 스케일 다운을 해도 다시 스케일 업으로 되살릴 수 있고, 파드도 동일한 이름으로 실행된다

스테이트풀셋 최대 하나
- 쿠버네티스는 두 개의 스테이트풀 파드 인스턴스가 동일한 아이덴티티로 실행되지 않고 PVC에 바인딩 되지 않는 것을 보장한다

스테이트풀셋 생성 실습
- 스테이트풀셋 매니패스트는 PVC을 정의한다
   ```yaml
    volumeClaimTemplates:
    - metadata:
        name: data
        spec:
        resources:
            requests:
            storage: 1Mi
        accessModes:
        - ReadWriteOnce
   ```
- 스테이트풀셋 생성
   ```
    ❯ k get pods
    NAME      READY   STATUS              RESTARTS   AGE
    kubia-0   0/1     ContainerCreating   0          5s

    ❯ k get pods
    NAME      READY   STATUS    RESTARTS   AGE
    kubia-0   1/1     Running   0          20s
    kubia-1   1/1     Running   0          14s
   ```
   - Replicas 값을 2로 생성하면 2개의 파드가 만들어진다
   - 각 파드는 순차적으로 생성된다
- 데이터를 저장하고 불러오는 실습
   ```
   // 데이터 저장
   ❯ curl -X POST -d "Hey there! This is greeting was submitted to kubia-0" localhost:8001/api/v1/namespaces/default/pods/kubia-0/proxy/
   Data stored on pod kubia-0

   // 불러오기
   ❯ curl localhost:8001/api/v1/namespaces/default/pods/kubia-0/proxy/
   You've hit kubia-0
   Data stored on this pod: Hey there! This is greeting was submitted to kubia-0
   ```
- 파드를 삭제한 뒤에 다시 생성해도 동일한 파드로 생성되고 기존의 PVC에 마운트된다
    ```
    // 파드 삭제
    ❯ k delete pod kubia-0
    pod "kubia-0" deleted

    // 파드가 삭제 중
    ❯ k get pods
    NAME      READY   STATUS        RESTARTS   AGE
    kubia-0   1/1     Terminating   0          8m26s
    kubia-1   1/1     Running       0          8m20s

    // 파드 생성
    ❯ k get pods
    NAME      READY   STATUS    RESTARTS   AGE
    kubia-0   1/1     Running   0          9s
    kubia-1   1/1     Running   0          8m45s

    // 조회를 하면 기존 데이터가 남아있음
    You've hit kubia-0
    Data stored on this pod: Hey there! This is greeting was submitted to kubia-0
    ```

서비스 디스커버리
- 헤드리스 서비스를 통해서 서비스 디스커버리를 지원할 수 있다
- SRV 레코드
   - 특정 서비스를 제공하는 호스트 이름과 포트를 가리키는 데 사용된다
   - 쿠버네티스는 헤드리스 서비스를 뒷받침하는 파드의 호스트 이름을 가리키도록 SRV 레코드를 생성한다
   - `dig SRV {service FQDN}`
        ```
        ;; ANSWER SECTION:
        kubia.default.svc.cluster.local. 30 IN	SRV	0 50 80 kubia-1.kubia.default.svc.cluster.local.
        kubia.default.svc.cluster.local. 30 IN	SRV	0 50 80 kubia-0.kubia.default.svc.cluster.local.

        ;; ADDITIONAL SECTION:
        kubia-1.kubia.default.svc.cluster.local. 30 IN A 10.244.3.3
        kubia-0.kubia.default.svc.cluster.local. 30 IN A 10.244.2.4
        ```
- SRV 통해서 얻은 레코드들을 호출하면 결국 전체 피어를 호출할 수 있다
    ```
    // 데이터 저장 -> 1번 파드에 저장
    ❯ curl -X POST -d "The sun is shining" localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
    Data stored on pod kubia-1
    
    // 데이터 저장 -> 2번 파드에 저장
    ❯ curl -X POST -d "The weather is sweet" localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
    Data stored on pod kubia-0

    // 데이터 조회  -> 1번 파드를 통해 조회 되었지만 데이터 모두 출력
    ❯ curl localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
    You've hit kubia-1
    Data stored in the cluster:
    - kubia-1.kubia.default.svc.cluster.local: The sun is shining
    - kubia-0.kubia.default.svc.cluster.local: The weather is sweet
    - kubia-2.kubia.default.svc.cluster.local: No data posted yet
    
    // 데이터 조회  -> 2번 파드를 통해 조회 되었지만 데이터 모두 출력
    ❯ curl localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
    You've hit kubia-2
    Data stored in the cluster:
    - kubia-2.kubia.default.svc.cluster.local: No data posted yet
    - kubia-0.kubia.default.svc.cluster.local: The weather is sweet
    - kubia-1.kubia.default.svc.cluster.local: The sun is shining
    ```

스테이트풀셋 업데이트
- 스테이트풀셋은 템플릿이 업데이트되면 롤아웃을 수행한다
    ```
    ❯ k edit statefulset kubia
    statefulset.apps/kubia edited

    ❯ k get pods
    NAME      READY   STATUS        RESTARTS   AGE
    kubia-0   1/1     Running       0          40m
    kubia-1   1/1     Terminating   0          48m
    kubia-2   1/1     Running       0          27s

    ❯ k get pods
    NAME      READY   STATUS        RESTARTS   AGE
    kubia-0   1/1     Terminating   0          40m
    kubia-1   1/1     Running       0          10s
    kubia-2   1/1     Running       0          48s

    ❯ k get pods
    NAME      READY   STATUS    RESTARTS   AGE
    kubia-0   1/1     Running   0          9s
    kubia-1   1/1     Running   0          44s
    kubia-2   1/1     Running   0          82s
    ```
   - Replcas에 따라 신규 파드를 먼저 띄우고, 나머지 파드를 롤아웃한다

노드 실패를 처리하는 과정
- 노드가 갑자기 실패했을 때?
   - 쿠버네티스는 노드나 파드의 상태를 알 수 없다.
   - kubelet이 노드의 상태를 보고하는 것을 중지했다는 것만 알 수 있다
   - 쿠버네티스는 파드가 더이상 실행되지 않는 것을 확신할 때까지 대체 파드를 생성할 수 없다. 이 경우 클러스터 관리자가 파드를 삭제하거나 노드를 삭제해야한다
- unknown 상태: 노드의 상태를 알 수 없으면 파드의 상태가 unkown이 된다
   - 노드가 다시 정상으로 돌아오면 파드는 running으로 바뀐다
   - 몇 분(변경 가능)이 지나도 파드의 상태가 unknown이라면?
      - 컨트롤플레인 영역에서 마스터가 파드 리소를 삭제해서 제거한다. 
      - 하지만 kubelet으로 부터 답을 받을 수 없으므로 노드에서 파드는 계속 실행중이다
      - `--force --grace-period 0` 옵션을 사용해서 수동으로 강제삭제한다. 단 노드가 더이상 실행중이 아니거나 연결 불가함을 아는 경우가 아니라면 파드르 강제로 삭제하면 안된다.