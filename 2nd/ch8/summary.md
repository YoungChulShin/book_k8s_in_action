# 8장 애플리케이션에서 파드 메타데이터와 그 외의 리소스에 엑세스 하기
### Downward API로 메타데이터 전달
이미 값이 정해진 환경변수나 설정 값 등은 컨피그맵이나 시크릿 볼륨으로 가져올 수 있지만, 파드의 IP, 호스트 노드 등 실행 시점에 정해지는 데이터는 처리할 수 없다. 

Downward API
- 파드의 메타데이터를 마스터 노드의 API Server에서 가져와서 환경변수 또는 볼륨에 노출될 수 있도록한다
- 대상
   - https://kubernetes.io/ko/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/#%EB%8B%A4%EC%9A%B4%EC%9B%8C%EB%93%9C-api%EC%9D%98-%EA%B8%B0%EB%8A%A5


환경 변수로 노출하기
- field 또는 resource의 정보를 아래와 같이 가져올 수 있다
- 샘플 코드
   ```
   env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    - name: CONTAINER_CPU_REQUEST_MILLICORES
      valueFrom:
        resourceFieldRef:
          resource: requests.cpu
          divisor: 1m
    - name: CONTAINER_MEMORY_LIMIT_KIBIBYTES
      valueFrom:
        resourceFieldRef:
          resource: limits.memory
          divisor: 1Ki
   ```
- `k exec downward env` 로 조회 가능


볼륨에 노출하기
- 볼륨을 만들어서 컨테이너에 마운트하는 방법
- 파드의 레이블이나 어노테이션은 이 값이 변경되면 쿠버네티스가 항상 최신의 데이터를 볼 수 있도록 하기 때문에 (환경변숫값은 나중에 업데이트 할 수 없기 때문에) 환경변수로는 노출할 수 없다. 
- 샘플 코드: 전체 파일은 `/source/downward-api-volume.yaml` 파일을 참고
   ```
    containers:
    - name: main
      image: busybox
      command: ["sleep", "9999999"]
      volumeMounts:
      - name: downward
        mountPath: /etc/downward
    volumes:
    - name: downward
      downwardAPI:
        items:
        - path: "podName"
          fieldRef:
            fieldPath: metadata.name
        - path: "containerMemoryLimitBytes"
          resourceFieldRef:
            containerName: main
            resource: limits.memory
            divisor: 1Ki
   ```
    - resourceFieldRef는 볼륨이 파드 레벨에서 만들어기지 때문에 컨테이너 이름을 명시해준다
    - 'etc/downward' 경로에서 파일을 확인할 수 있다
- 샘플 생성 결과
    - volumn 폴더 조회
      ```
      ❯ k exec downward -- ls -lL /etc/downward
      total 24
      -rw-r--r--    1 root     root           134 Nov  6 14:35 annotations
      -rw-r--r--    1 root     root             2 Nov  6 14:35 containerCpuRequestMillicores
      -rw-r--r--    1 root     root             5 Nov  6 14:35 containerMemoryLimitBytes
      -rw-r--r--    1 root     root             9 Nov  6 14:35 labels
      -rw-r--r--    1 root     root             8 Nov  6 14:35 podName
      -rw-r--r--    1 root     root             7 Nov  6 14:35 podNamespace
      ```
    - 파일 조회
      ```
      ❯ k exec downward -- cat /etc/downward/annotations
      key1="value1"
      key2="multi\nline\nvalue\n"
      kubernetes.io/config.seen="2021-11-06T14:35:08.315813400Z"
      kubernetes.io/config.source="api"%   
      ```
   
### 쿠버네티스 API 서버와 통신
Downard API의 제한
- Downward API를 사용하면 별도의 쉘 스크립트 없이도 쿠버네티스의 데이터를 애플리케이션에 노출할 수 있지만, 사용할 수 있는 메타데이터가 상당히 제한적이다

쿠버네티스 REST API
- `kubectl cluster-info` 를 통해서 URL 확인 가능하다. https를 사용하고 있어서 인증이 필요하다. 
- 프록시 서버를 이용한 접속
   - 인증을 처리해주는 proxy서버를 로컬에 띄워서 이를 통해서 접속할 수 있다
   - `kubectxl proxy` 로 실행
      ```
      ❯ curl localhost:8001
      {
        "paths": [
          "/.well-known/openid-configuration",
          "/api",
          "/api/v1",
          "/apis",
          "/apis/",
          "/apis/admissionregistration.k8s.io",
          "/apis/admissionregistration.k8s.io/v1",
          "/apis/apiextensions.k8s.io",
          "/apis/apiextensions.k8s.io/v1",
          "/apis/apiregistration.k8s.io",
          "/apis/apiregistration.k8s.io/v1",
          "/apis/apps",
          "/apis/apps/v1",
          "/apis/authentication.k8s.io",
      ```
   - 계층구조로 API 설계가 되어 있기 때문에 REST API를 이용해서 리소스를 탐색할 수 있다.
       ```
      ❯ curl localhost:8001/apis/batch/v1
      ❯ curl localhost:8001/apis/batch/v1/jobs
      ❯ curl localhost:8001/apis/batch/v1/namespaces/default/jobs
      ❯ curl localhost:8001/apis/batch/v1/namespaces/default/jobs/my-job
      ```
- 파드 내에서 API 서버 접속
   - `kubernetes` 서비스를 이용해서 조회할 수 있다.
   - 접속을 위해서는 인증서, 토큰, 네임스페이스 정보가 필요한데, `/var/run/secrets/kubernetes.io/serviceaccount` 경로에서 확인할 수 있다
     ```
     ca.crt: 인증서 정보. --cacert ca.crt 로 전달한다
     namespace: 파드가 실행중인 네임스페이스 정보. 파드 정보를 조회할 때 네임스페이스 값으로 사용할 수 있다
     token: 인증 토큰 정보. -H "Authorization: Bearer $Token"
     ```

앰배서더 컨테이너
- 매번 인증서, 토큰을 다르는 방법은 복잡하기 때문에 이 역할을 하는 컨테이너
- 앰배서더 컨테이너는 서비스가 동작하는 파드에 같이 컨테이너로 구동되며, 내부적으로 'kubectl proxy'를 실행한다
- 서비스의 컨테이너는 localhost의 포트로(같은 네트워크 인퍼페이스이기 때문에) 앰배서터 컨테이너를 호출하고, API 서버로 요청을 전달할 수 있다