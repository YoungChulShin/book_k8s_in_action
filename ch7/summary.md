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
