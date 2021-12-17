# 파드에서 실행중인 애플리케이션 업데이트
파드를 만든 이후에는 기존 파드의 이미지를 교체할 수는 없기 때문에 아래 2개의 방법을 고민해야한다
1. 기존 파드를 모두 삭제하고 새 파드를 다시 시작한다
2. 새로운 파드를 시작하고, 가동하면 기존 파드를 삭제한다. 

블루-그린 배포
- 레플리카셋을 하나 더 만들고, 서비스에서 파드의 레이블 샐렉터를 신규 레플리카셋 파드로 변경하면 가능하다

롤링 업데이트
- 롤링 업데이트는 수기로 진행하기에는 어려운 점이 있다.
- 레플리케이션 컨트롤러는 rolling update를 지원하지만 아래의 이유로 사용하지는 않는다
   - kubectl로 명령을 내리는 것이기 때문에 진행 과정에서 연결이 끊어지면 프로세스가 중단된다
   - 쿠버네티스는 시스템의 상태를 선언하고 쿠버네티스가 그 상태에 도달할 수 있게끔 하는 방식이 중요한다, kubectl을 사용하면 실제 명령을 내리는 것이 된다. 

# 디플로이먼트 사용
디플로이먼트
- 낮은 수준의 개념으로 간주되는 레플리카셋을 대신해서 애플리케이션을 배포하고 선언적으로 업데이트하기 위한 높은 수준의 리소스
- 디플로이먼트 <-> 레플리카셋 <-> 파드

디플로이먼트 생성
- source폴더의 `kubia-deployment-v1.yaml` 파일을 참고하자
- 생성할 때에는 `--record` 옵션을 붙여준다. 이 값이 있어야 나중에 rollout 이력을 조회할 때 `CHANGE-CAUSE` 값을 알 수 있다
   ```
   k create -f kubia-deployment-v1.yaml --record
   ```

디플로이먼트 상태 확인
- 롤아웃 중인 상태 조회
   ```
   k rollout status deployment 'deployment name'
   ```
- 롤아웃 이력 조회
   ```
   ❯ k rollout history deployment kubia
   deployment.apps/kubia
   REVISION  CHANGE-CAUSE
   1         kubectl create --filename=kubia-deployment-v1.yaml --record=true
   2         kubectl create --filename=kubia-deployment-v1.yaml --record=true
   3         kubectl create --filename=kubia-deployment-v1.yaml --record=true
   ```

파트 템플릿
- deployment로 생성된 파드에는 중간에 모두 같은 숫자가 존재한다. 이는 파드 템플릿의 해시값을 의미하는데, 레플리카셋이 이러한 파드를 관리하는 것을 뜻한다
   - 정확하게는 `deployment name - replicaset hash - pod hash`
   ```
   NAME                     READY   STATUS    RESTARTS   AGE
   kubia-74967b5695-clbkh   1/1     Running   0          85m
   kubia-74967b5695-v6gxp   1/1     Running   0          85m
   kubia-74967b5695-vkg9j   1/1     Running   0          85m
   ```
- 레플리카셋을 보면 같은 숫자 정보가 있다
   ```
   NAME               DESIRED   CURRENT   READY   AGE
   kubia-74967b5695   3         3         3       87m
   ```
- deployment는 파드 템플릿의 각 버전마다 하나씩 여러개의 레플리카셋을 만든다. 


업데이트
- 디플로이먼트의 파드 템플릿을 수정하면 쿠버네티스가 시스템 상태를 리소스에 정의된 상태로 만드는 모든 단계를 실행한다. 
- 전략
   - RollingUpdate: 롤링 업데이트. 이전 파드를 제거하고 새로운 파드를 추가해서 다운타임없이 서비스 제공. 기본 값
   - Recreate: 새 파드를 만들기 전에 파드를 모두 삭제한다. 
- 커맨드
   ```
   ❯ k set image deployment kubia nodejs=luksa/kubia:v2
   deployment.apps/kubia image updated
   ```
   ```
   // 기존 파드는 Terminate 되고 신규 파드가 생성된다
   NAME                     READY   STATUS              RESTARTS   AGE
   kubia-74967b5695-clbkh   1/1     Running             0          93m
   kubia-74967b5695-v6gxp   1/1     Running             0          93m
   kubia-74967b5695-vkg9j   1/1     Running             0          93m
   kubia-bcf9bb974-mhjnj    0/1     ContainerCreating   0          4s

   NAME                     READY   STATUS        RESTARTS   AGE
   kubia-74967b5695-clbkh   1/1     Running       0          93m
   kubia-74967b5695-v6gxp   1/1     Running       0          93m
   kubia-74967b5695-vkg9j   1/1     Terminating   0          93m
   kubia-bcf9bb974-mhjnj    1/1     Running       0          23s
   kubia-bcf9bb974-nfr9r    1/1     Running       0          7s

   // 레플리카셋이 새로 하나 생성된다
   NAME               DESIRED   CURRENT   READY   AGE
   kubia-74967b5695   0         0         0       94m
   kubia-bcf9bb974    3         3         3       106s
   ```

롤백
- 디플로이먼트는 개정 이력을 가지고 있기 때문에(=레플리카셋), 롤백 가능하다
   ```
   k rollout undo deployment kubia
   ```

롤아웃시 인스턴스 수 조절
- maxSurge
   - 디플로이먼트가 의도하는 레플리카 수 보다 얼마나 많은 파드 인스턴스를 허용할 지 결정한다
   - 기본은 25%. 의도하는 레플리카 수가 4개라면, 총 5개를 초과하는 파드는 동시에 실행되지 않는다. (백분율 기준으로 반올림)
- maxUnavailable
   - 업데이트 도중 의도하는 레플리카 수를 기준으로 사용할 수 없는 파드 수를 결정한다
   - 기본은 25%. 의도하는 레플리카 수 보다 75% 보다 떨어지면 안된다. (백분율 기준으로 내림)
   ```
   예시. 레플리카수 = 3, maxSurge = 1, maxUnavailable = 1
   - 총 4개의 파드가 동시에 실행될 수 있다. 이 중에 2개만 제대로 동작하면 된다. 
   - 1. 현대 버전이 v1이라고 할 때 처음 업데이트가 될 때, 2개의 v1이 실행 중이고 2개의 v2가 생성 준비중으로 된다. (v1 1개는 삭제)
   - 2. 총 4개의 파드가 동시에 실행된다. (v1 = 2개, v2 = 2개)
   - 3. v1 2개가 삭제되고, v2 1개가 생성 준비된다
   - 4. v2 3개가 실행된다
   ```

롤아웃 일시 중지를 통한 카나리 배포 구현
- 롤아웃 시작 이후에 바로 일시중지하면 일정 시간 동안 2개 버전이 파드 템플릿이 실행된다
- 롤아웃 일시 중지
   ```
   k rollout pause deployment kubia
   ```
- 롤아웃 재실행
   ```
   k rollout resume deployment kubia
   ```

minReadySeconds와 readinessProbe를 이용한 잘못된 배포 방지
- minReadySeconds를 지정하면 해당 시간 동안 롤아웃 되는 것을 막아준다
- readinessProbe와 조합하면 minReadySeconds가 지나기전에 readinessProbe가 실패하면 새 버전의 롤아웃이 차단되도록 막을 수 있다

쿠버네티스에서 리소스 수정 방법
- k edit
   - 기본 편집기로 오프젝트의 매니페스트를 오픈한다. 편집 후 파일을 저장하고 종료하면 업데이트된다
- k patch
   - 오브젝트의 개별 속성을 편집한다
   ```
   k patch deployment kubia -p '{"spec": {"minReadySeconds": 10}}'
   ```
- k apply
   - 전체 yaml/json 파일의 속성 값을 적용해 오브젝트를 수정한다. 지정한 오브젝트가 없으면 생성된다. 
- k replace
   - 전체 yaml/json 파일의 속성 값을 이용해서 오브젝트를 새것으로 교체한다. 오브젝트가 있어야한다. 
- k set image
   - 파드, 레플리카셋, 디플로이먼트 등의 정의된 이미지를 변경한다
   ```
   k set image deployment kubia nodejs=luksa/kubia:v2
   ```
