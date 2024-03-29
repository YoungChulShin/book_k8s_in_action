# 7장 컨피그맵과 시크릿
환경 변수를 사용하는 것이 컨테이너에서 널리 사용되는 이유
- 도커 컨테이너 내부에 있는 설정 파일을 사용하는 것이 약간 까다롭다. 설정 파일을 컨테이너 이미지 안에 포함하거나 파일이 포함돼 있는 불륨 컨테이너에 마운트해야하기 때문이다

### 컨테이너 명령줄 인자 전달
도커 명령어와 인자 전달
- 인자 옵션
   - ENTRYPOINT: 컨테이너가 시작될 때 호출할 명령어를 정의한다
   - CMD: ENTRYPOINT에 전달되는 인자를 정의한다
- 올바른 방법은 ENTRYPOINT 명령어로 실행하고, 기본 인자를 정의하려는 경우에 CMD를 지정한다
- shell 형식과 exec 형식
  - shell 형식: `ENTRYPOINT node app.js` 
  - exec 형식: `ENTRYPOINT ["node", "app.js"]` 
  - shell 형식을 사용하면 shell 프로세스가 메인 프로세스가 되기 때문에 exec 형식을 사용한다

도커 파일 샘플 및 실행 방법
- 도커 파일 샘플
  ```
  FROM ubuntu:latest
  RUN apt-get update; apt-get -y install fortune
  ADD fortuneloop.sh /bin/fortuneloop.sh
  ENTRYPOINT [ "/bin/fortuneloop.sh" ]
  CMD [ "10" ]
  ```
- 실행 명령어
   ```
   docker run -it image 15
   ```
- 기본으로 인자가 10으로 들어가지만, 명시적으로 15를 전달해서 실행할 수 있다

쿠버네티스에서 대응
- ENTRYPOINT: command
- CMD: args
- 샘플
   ```yaml
   containers:
   - image: image
     args: ["2"] # 위 예시에서 10이 기본값인데, 2를 전달
   ```
  
### 컨테이너 환경 변수
환경변수를 설정하고 컨테이너 정의에 환경변수를 지정해줄 수 있다. 환경변수는 파드 레벨이 아닌 컨테이너 정의안에서 실행된다. 
- 샘플
   ```yaml
   containers:
   - image: image
     env:
     - name: INTERVAL
       value: "30"
   ```
하드코딩된 환경변수는 환경별로 파드의 정의가 필요할 수 있는데, 파드의 정의에서 설정 값만 분리하면 유연하게 대처 가능하다. 이게 컨피그맵이다. 

### 컨피그맵
개념
- 별도의 컨피그맵 오브젝트를 생성하고, 애플리케이션에서 이 값을 참조하는 방식
- 맵의 내용은 컨테이너의 환경 변수 또는 볼륨 파일로 전달된다.

네임스페이스별로 다른 컨피그맵을 제공해서 동일한 파드에 개발/프로덕션 환경의 분리된 설정 값을 사용할 수 있다. 

예외 케이스
- 파드가 뜰 때 컨피그맵이 없으면 컨테이너가 시작하는데 실패한다. 참조하지 않는 다른 컨테이너는 정상적으로 시작된다. 누락된 컨피그맵을 생성하면 컨테이너는 파드를 다시 만들지 않아도 시작된다. 
- 컨피그맵 이름에 대시(-)가 들어가면 올바른 환경변수 이름이 아니다. 이 경우 쿠버네티스는 이름을 변경하지 않고 건너뛴다.

컨피그맵 볼륨
- 파일 형태로 컨피그맵의 항목을 노출하는 방식. 컨테이너에서 실행 중인 프로세스는 이 파일을 읽어서 각 항목의 값을 얻는다. 
- 샘플 
   ```yaml
   containers:
   - iamge: image
     name: container name
     volumeMounts:
     - name: config
       mountPath: path
       readonly: true
   volumes:
   - name: config
     configMap: # config map을 참조
       name: configmap name
   ```
- 주의 사항
   - 리눅스에서 파일 시스템을 비어있지 않은 디렉토리로 마운트 할 때 기존 파일들에 접근할 수 없게 되는 문제가 있을 수 있다. '/etc' 디렉터리 같은 파일이 많은 경로에 마운트가 된다면 원본 파일이 없어서 컨테이너가 손상될 수 있다. 
- 애플리케이션 설정
   - 컨피그맵을 볼륨으로 노출하면 파드를 다시 만들거나 시작할 필요 없이 설정을 업데이트 할 수 있다
   - 컨피그맵을 업데이트하면 참조하는 볼륨 파일이 업데이트되는데, 이 정보를 다시 로드하는 것은 프로세스에 달려있다. 

### 시크릿
소개
- 암호화 키, 증명서 등 민감한 정보를 관리해야할 때 사용하는 오브젝트
- 1.7 버전부터 etcd가 시크릿을 암호화된 형태로 저장한다

컨피그맵과 시크릿 구분
- 민감하지 않고 일반 설정 데이터는 컨피그맵 사용
- 본질적으로 민감한 데이터는 시크릿 사용
- 설정 파일이 민감한 정보와 그렇지 않은 정보를 모두 가지고 있으면 시크릿 사용

Base64 인코딩
- 시크릿은 데이터를 Base64 인코딩해서 저장한다. 이는 일반 텍스트 뿐 아니라 바이너리 값도 함께 담을 수 있기 때문이다. 
- 'stringData'로 일반 텍스트를 추가할 수 있는데, 생성된 시크릿을 보면 base64 인코딩이 되어 있다. 
   ```yaml
   apiVersion: v1
   kind: Secret
   stringData:
     foo: hihi
   metadata:
     name: secret-plain-text
   ```