sadf# 6장. 볼륨: 컨테이너에 디스크 스토리지 연결
배경
- 파드 내부의 각 컨테이너는 고유하게 분리된 파일 시스템을 가진다
- 새로 시작한 컨테이너는 같은 파드라도 할 지라도 이전에 실행했던 컨테이너에 쓰여진 파일 시스템의 어떤 것도 볼 수 없다
- `스토리지 볼륨`을 이용해서 이 기능을 제공한다
   - 파드와 같은 라이프사이클을 가진다
   - 컨테이너를 다시 시작해도 지속된다

## 6.1 볼륨 소개
볼륨
- 파드의 구성요소로 컨테이너와 동일하게 파드 스펙에서 정의된다
- 독립적인 오브젝트가 아니므로 자체적으로 생성, 삭제될 수 없다
- 파드의 모든 컨테이너에서 사용 가능하지만 접근하려는 컨테이너에서 각각 마운트 돼야 한다

### 볼륨 유형 소개
유형
- emptyDir: 일시적인 데이터를 저장하는데 사용되는 간단한 빈 디렉터리
- hostPath: 워커 노드의 파일시스템을 파드의 디렉터리로 마운트하는데 사용
- gitRepo: 깃 리포지터이의 컨텐츠를 체크아웃해 초기화한 볼륨
- nfs: NFS 공유를 파드에 마운트
- gcePersistentDisk, awsElasticBlockStore, azureDisk: 클라우드 제공자의 전용 스토리지를 마운트

## 6.2 볼륨을 사용한 컨테이너 간 데이터 공유 
### emtpyDir 볼륨 사용
사용 용도
- 파드에서 실행중인 컨테이너간 파일을 공유할 때 유용
- 단일 컨테이너라도 메모리에 넣기에 큰 데이터 세트의 정렬 작업을 수행할 때 임시적으로 사용할 수 있다

파드 생성하기
- yaml 파일 작성
   ~~~yaml
   apiVersion: v1
   kind: Pod
   metadata:
      name: fortune
   spec:
      containers:
      - image: luksa/fortune
         name: html-generator
         volumeMounts:
         - name: html
            mountPath: /var/htdocs
      - image: nginx:alpine
         name: web-server
         volumeMounts:
         - name: html
            mountPath: /usr/share/nginx/html
            readOnly: true
         ports: 
         - containerPort: 80
         protocol: TCP
      volumes:
      - name: html
         emptyDir: {}
   ~~~

실행 중인 파드 보기
- 포트 포워딩 설정
   ~~~
   // 설정
   kubectl port-forward fortune 8080:80

   // 결과
   Forwarding from 127.0.0.1:8080 -> 80
   Forwarding from [::1]:8080 -> 80
   ~~~
- 접속 테스트
   ~~~
   // 테스트
   curl http://localhost:8080

   // 결과
   "Life, loathe it or ignore it, you can't like it."
		-- Marvin, "Hitchhiker's Guide to the Galaxy"
   ~~~

emtpyDir을 사용하기 위한 매체 지정하기
- 기본적으로 emtpyDir은 파드를 호스팅하는 워커 노드의 실제 디스크에 생성되므로 노드 디스크가 어떤 유형인지에 따라 성능이 결정된다 
- 디스크가 아닌 메모리를 사용하는 tmpfs 파일 시스템으로 생성하도록 요구할 수도 있다
   ~~~yaml
   volumns:
      - name: html
        emptyDir:
          medium: Memory   # 메모리에 저장하도록 설정
   ~~~
   

## 6.3 워커 노드 파일시스템의 파일 접근

## 6.4 퍼시스턴트 스토리지 사용

## 6.5 기반 스토리지 기술과 파드 분리

## 6.6 퍼시스턴트불륨의 동적 프로비저닝
