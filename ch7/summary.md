# 7장. 컴피그맵과 시크릿 : 애플리케이션 설정
## 7.1 컨테이너화된 애플리케이션 설정
애플리케이션에 설정 값을 전달하는 방법
1. 명령줄 인수로 애플리케이션에 필요한 설정을 넘겨주는 방법
2. 설정 옵션 목록이 커지면 설정을 파일에 저장하고 사용
3. 환경변수를 사용 (컨테이너에서 널리 사용된다)

컨피그맵
- 설정 데이터를 최상위 레벨의 쿠버네티스 리소스에 저장하고 이를 기타 다른 리소스 정의와 마찬가지로 깃 저장소 혹은 파일 기반 스토리지에 저장할 수 있다
- 제공 방법
   - 컨테이너에 명령줄 인수 전달
   - 각 컨테이너를 위한 사용자 정의 환경변수 지정
   - 특수한 유형의 볼륨을 통해 설정 파일을 컨테이너에 마운트

## 7.2 컨테이너에 명령줄 인자 전달
쿠버네티스는 파드 컨테이너 정의에 지정된 실행명령 대신 다른 실행파일을 실행하거나 다른 명령줄 인자를 사용해 실행하는 것이 가능하다. 

### 도커에서 명령어와 인자 정의
ENTRYPOINT 와 CMD 이해
- ENTRYPOINT: 컨테이너가 시작될 때 호출될 명령어를 정의
- CMD: ENTRYPOINT에 전달되는 인자를 정의한다

fortune 이미지에서 간격을 설정해서 실행해보기
- 스크립트 파일
   ~~~sh
    trap "exit" SIGNINT
    INTERVAL=$1 # 첫번째 명령줄 인자의 값을 실행 간격을 설정한다
    echo Configured to generate new fortune every $INTERVAL seconds
    mkdir -p /var/htdocs
    while :
    do
        echo $(date) Writing fortune to /var/htdocs/index.html
        /usr/games/fortune > /var/htdocs/index.html
        sleep $INTERVAL
    done
   ~~~
- 도커 파일
   ~~~
    FROM ubuntu:latest
    RUN apt-get update; apt-get -y install fortune
    ADD fortuneloop.sh /bin/fortuneloop.sh
    ENTRYPOINT [ "/bin/fortuneloop.sh" ]
    CMD [ "10" ]
   ~~~
- 도커 실행 (_스크립트에 오타가 있는 것 같다.._)
   ~~~bash
   docker run -it go1323/fortune:args 15
   ~~~

### 쿠버네티스에서 명령어 인자 재정의
도커와 쿠버네티스의 인자 저장 방법
|도커|쿠버네티스|설명|
|---|-------|---|
|ENTRYPOINT|command|컨테이너 안에서 실행되는 실행파일|
|CMD|args|실행파일에 전달되는 인자

fortune 파드에 사용자 정의 주기 추가
- yaml 파일
   ~~~yaml
   containers: 
   - image: luksa/fortune:args
     args: ["2"] # 스크립트가 매 2초마다 실행되도록 인자를 지정
   ~~~

## 7.3 컨테이너의 환경 변수 설정
### 컴테이너 정의에 환경 변수 지정
컨테이너에 환경변수를 지정
- yaml 파일
   ~~~yaml
   containers: 
   - image: luksa/fortune:env
     env:
     - name: INTERVAL   # 컨테이너 레벨에 정의
       value: "30"
   ~~~

### 변숫값에서 다른 환경변수 참조
다른 환경변숫값 참조
- yaml 파일
   ~~~yaml
   env:
   - name: FIRST_VAR
     value: "foo"
   - name: SECOND_VAR
     value: "$(FIRST_VAR)bar"   # 이 경우 foobar가 된다
   ~~~

### 하드코딩된 환경 변수의 단점
하드 코딩된 값을 사용하면 효율적이지만, 프로덕션과 개발을 위해 서로 분리된 파드 정의가 필요하다는 것을 의미한다. 

여러 환경에서 동일한 파드 정의를 재 사용하려면 파드 정의에서 설정을 분리하는 것이 좋다. 

## 7.4 컨피그맵으로 설정 분리
### 컨패그맵 소개
컨피그맵
- 쿠베네티스에서는 설정 옵션을 컨피그맵이라 부르는 별도 오브젝트로 분리할 수 있다
- 키/값 쌍으로 구성된 맵
- 애플리케이션은 필요한 경우 쿠버네티스 REST API를 통해서 컨피그맵 내용을 읽을 수 있지만, 반드시 필요한 경우가 아니라 쿠버네티스와 무관하도록 유지해야 한다

![7-2](/images/7-2.jpg)

### 컨피그맵 생성
kubectl create configmap 명령 사용
- 커맨드
   ~~~
   kubectl create configmap fortune-config --from-literal=sleep-interval=25
   ~~~
   - `sleep-interval=25` 라는 단일 항목을 가진 컨피그 맵 생성
   - 여러 항목을 정의하려면 `--from-literal` 인자를 추가하면 된다
- 생성된 컨피그맵 보기
   ~~~
   // 실행
   kubectl get configmap fortune-config -o yaml

   // 결과
    apiVersion: v1
    data:
    sleep-interval: "25"
    kind: ConfigMap
    metadata:
    creationTimestamp: "2020-07-20T20:39:02Z"
    name: fortune-config
    namespace: default
    resourceVersion: "11398854"
    selfLink: /api/v1/namespaces/default/configmaps/fortune-config
    uid: 0b9de3f6-cac9-11ea-95af-42010aaa002a
   ~~~
- 생성된 파일을 쿠버네티스 API에 개시
   ~~~
   kubectl create -f fortune-config.yaml
   ~~~

직접 명령어를 사용하는 것 외에도 '파일', '디렉터리' 에서 컨피그맵을 생성하거나 각 옵션을 조합해서 생성할 수 있다
- ![7-5](/images/7-5.jpg)

### 컨피그맵 항목을 환경 변수로 컨테이너에 전달
파드 정의에서 선언
- yaml 파일
   ~~~yaml
   containers:
   - image: luksa/fortune:env
     env:
     - name: INTERVAL
       valueFrom: 
          configMapKeyRef:
             name: fortune-config   # 참조하는 컨피그맵 이름
             key: sleep-interval    # 컨피그맵에서 해당 키 아래에 지정된 값으로 변경
   ~~~

파드에 존재하지 않는 컨피그맵 참조
- 컨테이너가 존재하지 않는 컨피그맵을 참조하려고 하면 컨테이너는 시작하는데 실패한다. 참조하지 않는 다른 컨테이너는 정상 시작된다
- 누락된 컨피그맵을 생성하면 실패했던 컨테이너는 파드를 다시 만들지 않아도 시작한다

### 컨피그맵의 모든 항목을 한번에 환경 변수로 전달
파드 정의에서 선언
- yaml 파일
   ~~~yaml
   containers:
   - image: some-image
     envFrom:
     - prefix: CONFIG_  # 모든 환경변수는 COFNG_ 접두사를 가진다
       configMapRef:
        name: my-config-map # 이 이름의 컨피개맵 참조
   ~~~

### 컨피그맵 항목을 명령줄 인자로 전달
파드 정의에서 선언
- yaml 파일
   ~~~yaml
   containers:
   - image: luksa/fortune:args
     env:
     - name: INTERVAL   # 컨피그맵에서 INTERVAL 환경 변수를 정의
       valueFrom:
         configMapKeyRef:
            name: fortune-config
            key: sleep-interval
     args: ["$(INTERVAL)"]  # 정의된 환경변수를 명령줄 인자로 지정
   ~~~

### 컨피그맵 볼륨을 사용해 컨피그맵 항목을 파일로 노출 (이 장은 실습은 안하고 정리만 진행)
개념
- 환경변수 또는 명령줄 인자로 설정 옵션을 전달하는 것은 일반적으로 짧은 변숫값에서 사용된다
- 컨피그맵 볼륨을 사용해서 파일을 읽어 항목의 값을 설정할 수 있다

컨피그맵 생성
- 디렉토리에 있는 config file들을 컨피그 맵으로 정의
   ~~~
   kubectl create configmap fortune-config --from-file={디렉토리 경로}
   ~~~
- 생성된 컨패그맵은 디렉토리 하위에 있는 파일 이름을 key로 가지는 데이터가 생성된다

볼륨안에 있는 컨패그맵 항목 사용
- config 정보를 참조하는 볼륨을 만들고, 이 볼륨을 컨테이너에 마운트하는 방식
   - ![7-9](/images/7-9.jpg)
- yaml 파일
   ~~~yaml
   containers: 
   - image: nginx:alpine
     name: web-server
     volumeMounts:
     - name: config
       mountPath: /etc/nginx/conf.d
       readonly: true
   volumes:
   - name: config
     configMap:
       name: fortune-config # ortune-config 컨피그 맵을 참조하는 볼륨 생성
   ~~~   

볼륨에 특정 컨피그맵 항목만 노출
- yaml 파일
   ~~~yaml
   volumes:
   - name: config
     configMap:
       name: fortune-config # ortune-config 컨피그 맵을 참조하는 볼륨 생성
       items: 
       - key: my-nginx-config.conf  # 해당 키 아래의 항목을 포함한다
         path: gzip.conf   # 항목이 지정된 파일에 저장된다
   ~~~   

디렉터리를 마운트할 때 디렉터리의 기존 파일을 숨기는 것 이해
- 위의 예제에서 볼륨을 디렉터리에 마운트할 때, 컨테이너 이미지 자체에 있던 /etc/nginx/conf.d 디렉터리안에 파일들이 숨겨졌음을 의미한다
- 리눅스에서 파일시스템을 비어있지 않은 디렉터리에 마운트할 때, 마운트한 파일시스템에 있는 파일만 포함하고, 원래 있던 파일은 마운트되어 있는 동안 접근할 수 없게 된다
- 이 방법은 해당 디렉터리에 컨테이너에 영향을 주는 파일이라면 컨테이너가 손상될 수 있다

기존 파일을 숨기지 않고 마운트
- subPath 속성을 사용해서 개별 파일에 컨피그맵 파일을 마운트하는 방법
   ~~~yaml
   containers:
   - image: some/image
     volumeMounts:
     - name: myvolume
       mountPath: /etc/someconfig.conf  # 디렉터리가 아닌 파일에 마운트
       subPath: myconfig.conf  # 전체 볼륨 대신 해당 파일을 마운트
   ~~~

컨피그맵 볼륨 안에 있는 파일의 권한 설정
- 파드의 볼륨을 설정할 때 컨피그맵에 권한을 할당해준다
   ~~~yaml
   volumes:
   - name: config
     configMap:
       name: fortune-config
       defaultMode: "6600" ## 모든 파일 권한을 -rw-rw----로 설정
   ~~~

### 애플리케이션을 재시작하지 않고 설정 업데이트
배경
- 환경변수 또는 명령줄 인수를 설정 소스로 사용할 때의 단점은 프로세스가 실행되고 있는 동안에는 업데이트를 할 수 없다는 것이다
- 컨피그맵을 사용해 볼륨으로 노출하면 파드를 다시 만들거나 컨테이너를 다시 시작할 필요 없이 설정을 업데이트할 수 있다

업데이트 방법
1. 컨피그맵을 수정
   ~~~
   kubectl edit configmap fortune-config
   ~~~
2. 컨피그맵을 수정하면 볼륨의 실제 파일도 업데이트 된다
   - Nginx는 파일의 변경을 감시하지 않기 때문에 영향이 없다
3. Nginx를 reload 한다

컨피그맵 업데이트 정리
- 볼륨 전체 대신 단일 파일을 컨테이너에 마운트한 경우 파일 업데이트가 되지 않는다
- 애플리케이션이 다시 읽는 기능을 가지고 있지 않다면 컨피그맵을 수정하는 것은 좋은 방법이 아니다
- 애플리케이션이 다시 읽기 기능을 지원한는 경우, 컨피그맵 볼륨의 파일이 실행중인 인스턴스에 동기적으로 업데이트되는 것은 아니기 때문에 개별 파드의 파일이 최대 1분 동안 동기화되지 않은 상태로 있을 수 있음을 알아야 한다

## 7.5 시크릿으로 민감한 데이터를 컨테이너에 전달
배경
- 설정 안에는 보안이 유지돼애 하는 자격증명과 개인 암호화 키 같은 민감한 정보가 포함되어 있을 수 있다

### 시크릿 소개
시크릿
- 위 배경같은 상황을 위해서 쿠버네티스에서는 시크릿이라는 별도 오브젝트를 제공한다
- 키-값 쌍을 가진 맵으로 컨피그맵과 매우 유사하다
- 다음 상황에서 사용할 수 있따
   - 환경변수로 시크릿항목을 컨테이너에 전달
   - 시크릿항목을 볼륨 파일로 노출

시크릿과 컨피그맵 사용 경우
- 민감하지 않고 일반 설정 데이터는 컨피그맵을 사용한다
- 본질적으로 민감한 데이터는 시크릿을 사용해 키 아래에 보관하는 것이 필요하다. 만약 설정파일이 민감한 데이터와 그렇지 않은 데이터를 모두 가지고 있다면 해당 파일은 시크릿안에 저장해야 한다

### 기본 토큰 시크릿 소개
default-token 시크릿
- 모든 컨테이너에 마운트 된다
- 조회 해보기
   ~~~
   // 조회 (시크릿 리소스 조회)
   kubectl get secret

   // 결과
   NAME                  TYPE                                  DATA   AGE
   default-token-9528m   kubernetes.io/service-account-token   3      37d
   ~~~
- `kubectl describe secrets` 명령어로 더 자세히 조회 가능하다
- ![7-11](/images/7-11.jpg)

### 시크릿 생성
시크릿 생성
- 키 생성
   ~~~
   openssl genrsa -out http.key 2048
   openssl req -new -x509 -key http.key -out https.cert -days 3650 -subj /CN=www.kubia-example.com
   ~~~
- 시크릿 생성
   ~~~
   kubectl create secret generic fortune-https --from-file=http.key --from-file=https.cert --from-file=foo
   ~~~
   -  generic: Create a secret from a local file, directory or literal value

### 컨피그맵과 비교
시크릿 정보 보기
- 정보 조회
   ~~~
   kubectl get secret fortune-https -o yaml
   ~~~
- 조회 결과
   ~~~yaml
   apiVersion: v1
   data:
      foo: YmFyCg==
      http.key: LS0tLS1...=
      https.cert: LS0tLS1CR...0tCg==
   kind: Secret
   metadata:
      creationTimestamp: "2020-07-20T23:33:52Z"
      name: fortune-https
      namespace: default
      resourceVersion: "11435409"
      selfLink: /api/v1/namespaces/default/secrets/fortune-https
      uid: 7822fcec-cae1-11ea-95af-42010aaa002a
   type: Opaque
   ~~~
   - 컨피그맵과 달리 Base64로 인코딩되어 표시된다
   - Base64 인코딩을 사용하는 이유는 시크릿 항목에 일반 텍스트 뿐 아니라 바이너리 값도 담을 수 있기 때문이다
   - 각 항목을 설정하고 읽을 때 마다 인코딩과 디코딩을 해야 한다

stringData 필드
- stringData 필드는 Base64로 인코딩되지 않는다
- 쓰기 전용

파드에서 시크릿 항목 읽기
- secret 볼륨을 통해서 시크릿을 컨테이너에 노출하면 실제 형식으로 디코딩돼 파일에 기록된다

### 파드에서 시크릿 사용 (_실습 해보지 않았음_)
컨피그맵과 시크릿을 결합해서 파드 실행
- ![7-12](/images/7-12.jpg)

시크릿 볼륨의 경우 디스크에 저장하면 민감한 정보가 노출될 수 있기 때문에 메모리에 저장한다([tmpfs](https://ko.wikipedia.org/wiki/Tmpfs))

환경변수로 시크릿 항목 노출
- yaml 파일
   ~~~yaml
   env:
   - name: FOO_SECRET
     valueFrom:
       secretKeyRef:
         name: fortune-https # 키를 갖고 있는 시크릿 이름
         key: foo # 노출할 시크릿 키 이름
   ~~~
- 애플리케이션이 오류 보고서에 환경변수를 기록하면서 의도치 않게 이 정보가 노출될 수 있으므로 가장 좋은 방법은 아니다

### 이미지를 가져올 때 사용하는 시크릿 이해
배경
- 파드를 배포할 때 컨테이너 이미지가 Private 레지스트리 안에 있다면 쿠버네티스는 이미지를 가져오기 위해 필요한 자격증명을 알아야 한다

도커 허브에서 프라이빗 이미지 사용
- 도커 레지스트리 자격 증명을 가진 시크릿 생성
- 파드 매니페스트 안에 imagePullSecrets 필드에 해당 시크릿 참조

도커 레지스트리 자격 증명을 가진 시크릿 생성 방법
- 커맨드
   ~~~
   kubectl create secret docker-registry mydockerhubsecret \
   --docker-username=myusername \
   --docker-password=mypassword \
   --docker-email=myemail
   ~~~
   - `docker-registry` 형식을 가진 `mydockerhubsecret` 시크릿을 만든다

파드 정의에서 도커 레지스트리 시크릿 사용
- yaml 파일
   ~~~yaml
   spec: 
      imagePullSecrets:
      - name: mydockerhubsecret # 생성한 시크릿 사용
      containers:
      - image: myimage
        name: name
   ~~~

모든 파드에서 이미지를 가져올 때 사용할 시크릿을 모두 지정할 필요는 없다
- 모든 파드에 이밎를 가져올 때 사용할 시크릿을 지정하지는 않아도 된다
- 12장에서 시크릿을 서비스어카운트에 추가해 관리하는 법을 배운다