# 5장. 서비스: 클라이언트가 파드를 검색하고 통신을 가능하게 함

## 5.1 서비스 소개
서비스란
- 동일한 서비스를 제공하는 파드 그룹에 지속적인 단일 접점을 만들려고 할 때 생성하는 리소스
- 각 서비스는 서비스가 존재하는 동안 절대 바뀌지 않는 IP주소와 포트가 있다

### 서비스 생성
서비스가 파드를 찾는 방법
- 레이블 셀렉터를 이용한다
   ![5-2](/images/5-2.jpg)

YAML 디스크립터를 통한 서비스 생성
1. yaml 파일 생성: [Link](/ch5/kubia-svc/kubia-svc.yaml)
   ~~~yml
    apiVersion: v1
    kind: Service
    metadata:
        name: kubia
    spec:
        ports: 
        - port: 80  # 서비스가 사용할 포트
        targetPort: 8080  # 서비스가 포워딩 할 포트
        selector:
            app: kubia  # 레이블 셀렉터 설정
   ~~~
2. 생성된 서비스 검사하기
   ~~~
   // 커맨드 실행
   kubectl get svc

   // 실행 결과 확인
   NAME         TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
   kubernetes   ClusterIP   10.7.240.1   <none>        443/TCP   10d
   kubia        ClusterIP   10.7.246.6   <none>        80/TCP    8s

   // 컨테이너에 원격명령으로 서비스 테스트
   kubectl exec kubia-7szjl -- curl -s http://10.7.246.6

   // 실행 결과 확인
   You've hit kubia-bpvdq
   ~~~
   - 더블 대시(--) 옵션
      - 더블대시는 kubectl 명령줄 옵션의 끝을 의미한다
      - 더블 대쉬 뒤의 모든 것은 파드 내에서 실행돼야 하는 명령어이다
   - 컨테이너 원격명령 테스트 동작 과정
   ![5-2](/images/5-2.jpg)

동일한 포트에서 여러개의 포트 노출
- yaml 설정에서 포트를 2개 설정해준다
   ~~~yml
    spec:
        ports:
        - name: http
          port: 80  # 서비스가 사용할 포트
          targetPort: 8080  # 서비스가 포워딩 할 포트
        - name: https
          port: 443  # 서비스가 사용할 포트
          targetPort: 8443  # 서비스가 포워딩 할 포트
      
        selector:
            app: kubia  # 레이블 셀렉터 설정
   ~~~

이름이 자정된 포트를 사용
- 방법
   1. 파드 정의에서 `ports`를 정의할 때 `port`에 `name`을 정의해준다
   2. 서비스에서 정의한 파드의 포트 이름을 매핑한다
- 이름이 지정된 포트를 사용하면 포트 이름을 변경하지 않고 파드 스펙에서 포트를 변경하면 되는 장점이 있다

### 서비스 검색 (클라이언트 파드가 서비스의 IP와 포트를 검색할 수 있는 방법)
환경 변수를 통한 서비스 검색
1. 모든 파드를 삭제하고 새로운 파드를 생성한다 
2. 새로 만들어진 파드에 exec 명령으로 환경 변수 값을 조회한다
   ~~~
   // 조회
   kubectl exec kubia-cl8ht env

   // 결과
   PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
   HOSTNAME=kubia-cl8ht
   KUBERNETES_PORT_443_TCP=tcp://10.7.240.1:443
   KUBERNETES_PORT_443_TCP_PROTO=tcp
   KUBERNETES_PORT_443_TCP_PORT=443
   KUBIA_SERVICE_HOST=10.7.246.6
   KUBERNETES_SERVICE_HOST=10.7.240.1
   KUBIA_PORT_80_TCP=tcp://10.7.246.6:80
   KUBERNETES_SERVICE_PORT_HTTPS=443
   KUBIA_PORT_80_TCP_PORT=80
   KUBIA_PORT=tcp://10.7.246.6:80
   KUBIA_PORT_80_TCP_PROTO=tcp
   KUBIA_PORT_80_TCP_ADDR=10.7.246.6
   KUBERNETES_SERVICE_PORT=443
   KUBERNETES_PORT=tcp://10.7.240.1:443
   KUBERNETES_PORT_443_TCP_ADDR=10.7.240.1
   KUBIA_SERVICE_PORT=80
   NPM_CONFIG_LOGLEVEL=info
   NODE_VERSION=7.9.0
   YARN_VERSION=0.22.0
   HOME=/root
   ~~~
   - 여기서 `KUBERNETES_SERVICE_HOST` 와 `KUBIA_SERVICE_PORT` 를 확인하면 된다
3. 클라이언트 파드에서는 위 값을 사용해서 서비스의 IP와 포트를 찾을 수 있다

DNS를 통한 서비스 검색
- 쿠버네티스에 자체 DNS 서버가 있다
   - kube-system 네임스페이스에 kube-dns 파드
- 파드에서 실행중인 프로세스에서 수행된 모든 DNS 쿼리는 자체 DNS 서버로 처리된다

FQDN을 통한 서비스 연결
- FQDN: Full Qualified Domain Name
- 예: backend-database.default.svc.cluster.local
   - backend-database: 서비스 이름
   - default: 서비스가 정의된 네임스페이스 (같은 네임스페이스면 생략 가능)
   - svc.cluster.local: 로컬 서비스 이름에 사용되는 클러스터의 도메인 접미사 (같은 네임스페이스면 생략 가능)

## 5.2 클러스터 외부에 있는 서비스 연결
### 서비스 엔드포인트
서비스
- 서비스는 파드에 직접 연결되지 않고 엔드포인트 리소스가 그 사이에 있다
- `kubectl describe svc <<서비스명>>` 으로 엔드포인트를 확인 가능하다
   ~~~
   Name:              kubia
   Namespace:         default
   Labels:            <none>
   Annotations:       <none>
   Selector:          app=kubia  # 엔드포인트 목록 생성에 사용
   Type:              ClusterIP
   IP:                10.7.246.6
   Port:              <unset>  80/TCP
   TargetPort:        8080/TCP
   Endpoints:         10.4.0.24:8080,10.4.1.15:8080,10.4.2.15:8080   # 엔드포인트
   Session Affinity:  None
   Events:            <none>
   ~~~

엔드포인트
- 서비스로 노출되는 파드의 IP주소와 포트 목록

엔드포인트 리소스 조회
- 조회
   ~~~
   // 조회 실행
   kubectl get endpoints kubia

   // 결과
   NAME    ENDPOINTS                                      AGE
   kubia   10.4.0.24:8080,10.4.1.15:8080,10.4.2.15:8080   4d6h
   ~~~
- 파드 셀렉터는 IP와 포트 목록을 작성하는데 사용되며, 엔드포인트 리소스에 저장된다

### 서비스 엔드포인트 수동 구성
서비스를 생성할 때 셀렉터를 없이 구성하면, 서비스를 위한 엔드포인트 목록을 수정으로 만들어서 관리해줘야 한다

엔드포인트 리소스 생성
- 리소스 생성
   ~~~yml
   apiVersion: v1
   kind: Endpoints
   metadata:
      name: external-service  # 서비스의 이름과 일치해야 한다
   subsets:
      - addresses:   # 서비스가 연결을 전달할 엔드포인트의 IP
         - ip: 11.11.11.11 
         - ip: 22.22.22.22
         ports:
         - port: 80  # 엔드포인트의 대상 포트
   ~~~

### 외부 서비스를 위한 별칭 생성
서비스의 엔드포인트를 수동으로 구성해 외부 서비스를 노출하는 대신, 좀 더 간단하게 FQDN으로 외부 서비스를 참조할 수 있다

ExternalName 서비스 생성
- 서비스 생성
   ~~~yml
   apiVersion: v1
   kind: Service
   metadata:
      name: external-service
   spec:
      type: ExternalName   # 서비스 유형
      externalName: someapi.somecompany.com # FQDN
      ports:
      - port: 80
   ~~~
   - 서비스를 사용하는 파드에서는 (호출하는)서비스의 FQDN을 사용하는대신, external-service.default.svc.cluster.local로 외부서비스에 연결할 수 있다

## 5.3 외부 클라이언트에 서비스 노출
외부에서 클라이언트가 클러스터에 엑세스 하고 싶을 경우
1. 노드포트로 서비스 유형을 설정
2. 서비스 유형을 로드밸런서로 설정
3. 단일 IP주소로 여러 서비스를 노출하는 인그레스 리소스 만들기

### 노트 포트 서비스 사용
노드포트 서비스
- 쿠버네티스는 모든 노드에 특정 포트를 할당하고 서비스를 구성하는 파드로 들어오는 연결을 전달한다

노트포트 서비스 생성
- 서비스 생성
   ~~~yml
   spec:
      type: NodePort
      ports:
      - port: 80
        targetPort: 8080
        nodePort: 30123 # 각 클러스터 노드의 포트 30123으로 서비스에 엑세스 할 수 있다
   ~~~

노드포트 서비스 접속 주소
1. 서비스의 클러스터 IP와 포트
2. 워커노드 IP와 nodePort

노드포트에 연결하는 외부 클라이언트 그림
- ![5-6](/images/5-6.JPG)
- 첫번째 노드를 통해서 수신된 연결이라 할지라도 두번째 노드에 실행중인 파드로 전달될 수 있다


### 외부 로드 밸랜서로 서비스 노출
로드 밸랜서
- 클라우드 공급자에서 실행되는 쿠버네티스 클러스터는 일반적으로 클라우드 인프라에서 로드밸런서를 자동으로 프로비저닝하는 기능을 제공한다
- 로드밸런서는 공개적으로 액세스 가능한 고유한 IP주소를 가지며 모든 연결을 서비스로 전달한다. 따라서 로드밸런서의 IP주소로 서비스에 연결할 수 있다

로드 밸런서 생성
- 서비스 생성
   ~~~yml
   spec:
      type: LoadBalancer
      ports:
      - port: 80
        targetPort: 8080
   ~~~

로드밸런서 접속 주소
1. 로드밸런서의 External-IP로 접속

로드밸런서에 연결하는 외부 클라이언트 그림
- ![5-7](/images/5-7.jpg)

## 5.4 인그레스 리소스로 서비스 외부 노출
인그레스가 필요한 이유
- 로드 밸런서는 자신의 공용 IP주소를 가진 로드밸런서가 필요하다
- 인그레스는 한개의 IP 주소로 수십개의 서비스에 접근이 가능하도록 지원해준다
- 클라이언트가 HTTP 요청을 인그레이스에 보낼 때, 요청한 호스트와 경로에 따라 요청을 전달할 서비스가 결정된다
- ![5-9](/images/5-9.jpg)

공식 홈페이지에 인그레스 페이지: [Link](https://kubernetes.io/ko/docs/concepts/services-networking/ingress/)

### 인그레스 리소스 생성 및 접속
인그레스 리스소 생성
- 생성
   ~~~yml
   apiVersion: extensions/v1beta1
   kind: Ingress
   metadata:
      name: kubia
   spec: 
      rules:
      - host: kubia.example.com
      http: 
         paths:
         - path: /
            backend:
               serviceName: kubia-nodeport
               servicePort: 80
   ~~~

인그레스 서비스 접속
- IP 주소 확인
   ~~~
   // 조회
   kubectl get ingress

   // 조회 결과
   NAME    HOSTS               ADDRESS          PORTS   AGE
   kubia   kubia.example.com   34.107.157.156   80      78s
   ~~~
   - ADDRESS열에 표시되는 값이 IP 주소
- DNS로 접속할 수 있도록 IP를 등록
   - 파일: /etc/hosts
   - 추가 내용
      ~~~
      kubia.example.com 34.107.157.156 
      ~~~ 
- 엑세스 확인
   ~~~
   curl http://kubia.example.com
   ~~~

인그레스 동작방식
- ![5-10](/images/5-10.jpg)
- 인그레스 컨트롤러는 요청을 파드를 선택하는데에만 사용하고 서비스로 전달하지 않는다

### 하나의 인그레스로 여러 서비스 노출
동일 호스트의 다른 경로로 서비스 매핑
- path 옵션을 이용해서 분리 처리
   ~~~yml
   spec: 
      rules:
      - host: kubia.example.com
         http: 
            paths:
            - path: /kubia # kubia.example.com/kubia 로 라우팅
               backend:
                  serviceName: kubia
                  servicePort: 80
            - path: /bar # kubia.example.com/bar 로 라우팅
               backend:
                  serviceName: bar
                  servicePort: 80
   ~~~

다른 호스트로 다른 서비스 매핑
- host 옵션을 이용해서 분리 처리
   ~~~yml
   spec: 
      rules:
      - host: foo.example.com
         http: 
            paths:
            - path: / 
               backend:
                  serviceName: kubia
                  servicePort: 80
      - host: bar.example.com
         http: 
            paths:
            - path: / 
               backend:
                  serviceName: bar
                  servicePort: 80
   ~~~

### TLS 트래픽 처리
인그레스를 위한 TLS 인증서 생성
- 개인키와 인증서 만들기
   ~~~
   openssl genrsa -out tls.key 2048
   openssl req -new -x509 -key tls.key -out tls.cert -days 360 -subj CN=kubia.example.com
   ~~~
- 시크릿 만들기
   ~~~
   kubectl create secret tls tls-secret --cert=tls.cert --key=tls.key
   ~~~

TLS 인그레스 생성
- spec에 TLS 속성을 추가해준다
   ~~~yml
   spec:
      tls:
      - hosts:
         - kubia.example.com  # 해당 이름의 TLS 연결이 허용된다
         secretName: tls-secret  
   ~~~

## 5.5 파드가 연결을 수락할 준비가 됐을 때 신호 보내기
### 레디니스 프로브(readiness probe)
정의
- 주기적으로 호출되며 특정 파드가 클라이언트 요청을 수신할 수 있는지를 결정한다
- 컨테이너의 레디니스 프로브가 성공을 반환하면 컨테이너가 요청을 수락할 준비가 됐다는 신호다

레디니스 프로브 유형
- exec 프로브: 컨테이너 상태를 프로세스의 종료 상태 코드로 결정
- http get 프로브: http get 요청을 보내고 응답의 상태 코드를 보고 결정
- tcp socket 프로브: tcp 연결을 열어서 소켓이 연결되면 준비된 것으로 결정

레디니스 프로브 동작
- ![5-11](/images/5-11.jpg)

라이브니스 프로브와 레디니스 프로브 차이
- 라이브니스 프로브: 상태가 좋지 않은 컨테이너를 제거하고 새롭고 건강한 컨테이너로 교체에 파드의 상태를 정상으로 유지한다
- 레디니스 프로브: 요청을 처리할 준비가 된 파드의 컨테이너만 요청을 수신하도록 한다

### 파드에 레디니스 프로브 추가
파드 템플릿에 레디니스 프로브 추가
- spec 설정에 readiinessProbe 추가
   ~~~yml
   spec:
      containers:
      - image: luksa/kubia
        imagePullPolicy: Always
        name: kubia
        readinessProbe:
          exec:
            command:
            - ls
            - /var/ready
   ~~~

### 실제 호나경에서 레디니스 프로브가 수행해야 하는 기능
레디니스 프로브를 항상 정의하라
- 레디니스 프로브를 정의하지 않으면 파드가 시작하는 즉시 서비스 엔드포인트가 된다
- 애플리케이션이 수신 연결을 시작하는데 시간이 오래 걸릴 경우 클라이언트의 서비스 요청은 시작 준비가 안된 파드로 전달된다

레디니스 프로브에 파드의 종료 코드를 포함하지 마라

## 5.6 헤드리스 서비스로 개별 파드 찾기
_이장은 좀 잘 이해가 안되었음_

클라이언트가 모든 파드에 연결하려면?
- 일반적으로는 각 파드의 IP를 알아야 한다
- 쿠버네티스는 클라이언트가 DNS 조회로 파드 IP를 찾을 수 있도록 한다
   - 서비스 스펙에서 ClsuterIP를 None으로 설정하면 DNS 서버는 하나의 서비스 IP 대신 파드 IP들을 반환한다

헤드리스 서비스 생성
- yaml 파일 생성
   ~~~yml
   apiVersion: v1
   kind: Service
   metadata:
      name: kubia-headless
   spec:
      clusterIP: None   # 이 부분이 서비스를 헤드리스로 만든다
      ports:
      - port: 80
        targetPort: 8080
      selector:
        app: kubia
   ~~~

DNS로 파드 찾기
- 도커 허브에서 nslookup 및 dig 바이너리를 모두 포함하는 tutum/dnsutils 컨테이너 이미지를 이용하면 된다

모든 파드 검색  - 준비되지 않은 파드도 포함
- 어노테이션을 추가
   ~~~yml
   kind: Service
   metadata:
      annotaions:
         service.alpha.kubernetes.io/tolerate-unready-endpoints: "true"
   ~~~

## 5.7 서비스 문제 해결
서비스로 파드를 엑세스 할 수 없는 경우 아래 내용을 확인해보자
- 클러스터 내에서 서비스의 클러스터 IP에 연결되는지 확인한다
- 서비스에 엑세스할 수 있는지 확인하려고 서비스 IP로 핑을 할 필요가 없다
- 레디니스 프로브를 정의했다면 성공하는지 확인하자
- 파드가 서비스의 일부인지 확인하려면 엔드포인트를 조회해서 오브젝트를 확인하자
- FQDN이나 그 일부로 서비스에 액세스하려고 하는데 작동하지 않는 경우, 클러스터 IP를 사용해서 액세스 할 수 있는지 확인하자
- 대상 포트가 아닌 서비스로 노출된 포트에 연결하고 있는지 확인하자
- 파드 IP에 직접 연결된 파드가 올바른 포트에 연결돼 있는지 확인하자
- 파드 IP로 애플리케이션에 엑세스 할 수 없는 경우 애플리케이션이 로컬호스트에만 바인딩하고 있는지 확인하자