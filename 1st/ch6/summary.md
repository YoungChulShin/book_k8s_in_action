# 6장. 볼륨: 컨테이너에 디스크 스토리지 연결
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

### 깃 리포리터리를 불륨으로 사용하기
gitRepo 볼륨 동작 
- 기본적으로 emptyDir 볼륨
- 파드가 시작되면 컨테이너가 시작되기 전에 깃 리포지터리를 복제하고 특정 리비전을 체크아웃해 데이터로 채운다
- 단점은 gitRepo에 변경을 푸시할 때마다 웹사이트의 새버전을 서비스하기 위해 파드를 삭제해줘야 한다

파드 생성
- yaml 파일에서 볼륨 설정의 차이점 
   ~~~yaml
   volumes:
   - name: html
     gitRepo:  # gitRepo 볼륨을 생성
       repository: ...  # 깃 리포 저장소 주소를 입력
       revision: master # 체크아웃 할 브랜치
       dorectory: .  # 볼륨의 루트 디렉토리에 리포리저티를 복사한다
   ~~~


## 6.3 워커 노드 파일시스템의 파일 접근
배경
- 대부분의 파드는 호스트 노드를 인식하지 못하므로 노드의 파일시스템에 있는 어떤 파일에도 접근하면 안된다
- 특정 시스템 레벨의 파드는 노드의 파일을 읽거나 파일시스템을 통해 노드 디바이스를 접근하기 위해 노드의 파일시스템을 사용해야 한다
- 쿠버네티스는 hostPath 볼륨으로 이를 지원한다

### hostPath 볼륨
hostPath 볼륨
- 노드 파일시스템의 특정 파일이나 디렉터리를 가리킨다
- 파드가 삭제되어도 hostPath 볼륨의 컨텐츠는 삭제되지 않으며, 같은 노드에 파드가 스케쥴링된다는 조건에서는 새로운 파드가 기존 파드의 데이터를 모두 볼 수 있다
- 노드의 시스템파일에 읽기/쓰기를 하는 경우에만 hostPath 볼륨을 사용하고, 여러 파드의 데이터 유지를 위해서는 절대 사용하면 안된다

hostPath 볼륨을 사용하는 시스템 파드 검사하기
1. 'kube-system' 네임스페이스에서 파드 조회
   ~~~
   kubectl get pods --namespace kube-system
   ~~~
2. describe로 파드 세부 정보 보기
   ~~~
   Volumes:
      varrun:
         Type:          HostPath (bare host directory volume)
         Path:          /var/run/google-fluentd
         HostPathType:
      varlog:
         Type:          HostPath (bare host directory volume)
         Path:          /var/log
         HostPathType:
      varlibdockercontainers:
         Type:          HostPath (bare host directory volume)
         Path:          /var/lib/docker/containers
         HostPathType:
   ~~~

## 6.4 퍼시스턴트 스토리지 사용
배경
- 파드에서 실행중인 애플리케이션이 디스크에 데이터를 유지해야 한다면? 다른 노드에 재스케쥴링 된 이후에도 동일한 데이터를 사용해야 한다면? 지금까지 소개한 볼륨으로는 사용할 수 없다
- 이러한 데이터는 어떤 노드에서도 접근이 가능해야 하기 때문에 NAS 유형에 저장돼야 한다

### GCE 퍼시스턴트 디스크를 파드 볼륨으로 사용하기

MondoDB의 데이터를 퍼시스턴트 디스크에 저장해보기
1. GCE 퍼시스턴트 디스크 생성하기
   1. 클러스터 조회(region 확인 목적)
      ~~~
      gcloud container clusters list
      ~~~
   2. 디스크 생성
      ~~~
      // 생성
      gcloud compute disks create --size=1GiB --zone=asia-east2-a mongodb

      // 결과
      NAME     ZONE          SIZE_GB  TYPE         STATUS
      mongodb  asia-east2-a  1        pd-standard  READY
      ~~~
      - mongodb라는 디스크 생성
2. 파드 생성
   1. yaml 파일 생성
      ~~~yaml
      apiVersion: v1
      kind: Pod
      metadata:
         name: mongodb
      spec:
         containers:
         - image: mongo
            name: mongodb
            volumeMounts: 
            - name: mongodb-data
            mountPath: /data/db
            ports:
            - containerPort: 27017
            protocol: TCP
         volumes:
         - name: mongodb-data
            gcePersistentDisk:    # 볼륨의 유형
            pdName: mondodb # Persistance Disk Name이겠지?
            fsType: ext4    # 파일 시스템 유형
      ~~~
   2. 파드 생성
      ~~~
      kubectl create -f mongodb-pod-gcepd.yaml 
      ~~~

### 다른 유형의 볼륨 사용하기
AWS Elastic Block Store
- yaml 정의
   ~~~yaml
   spec:
      volumes:
      - name: mongodb-data
        awsElasticBlockStore: # gcePersistentDisk 대신 EBS 사용
          volumeId: my-Volume # EBS 볼륨의 ID
          fsType: ext4
   ~~~


## 6.5 기반 스토리지 기술과 파드 분리
### 퍼시스턴트볼륨과 퍼시스턴트볼륨클레임
등장 배경
- 인프라스터척처의 세부 사항을 처리하지 않고 애플리케이션이 쿠버네티스 클러스터에 스토리지를 요청할 수 있도록 하기 위한 리소스 도입
- 개발자가 파드에 기술적인 세부 사항을 기재한 볼륨을 추가하는 대신 클러스터 관리자가 기반 스토리지를 설정하고 쿠버네티스 API 서버로 볼륨 리소스를 생성해 쿠버네티스에 등록한다

퍼시스턴트볼륨과 퍼시스턴트볼륨클레임 사용 과정
- ![6-6](/images/6-6.jpg)

퍼시스턴트 볼륨 생성
- yaml 파일 생성 (mongodb-pv-gcepd2.yaml)
   ~~~yaml
   apiVersion: v1
   kind: PersistentVolume
   metadata:
      name: mongodb-pv
   spec:
      capacity:
         storage: 1Gi
      accessModes:
         - ReadWriteOnce
         - ReadOnlyMany
      persistentVolumeReclaimPolicy: Retain   ## 클레임이 해제된 후 PV은 유지되어야 한다
      gcePersistentDisk:
         pdName: mongodb
         fsType: ext4
   ~~~
- 볼륨 조회
   ~~~
   // 명령어
   kubectl get pv

   // 결과
   NAME         CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS
   mongodb-pv   1Gi        RWO,ROX        Retain           Available
   ~~~
- PV과 클러스터터 노드는 파드나 다른 PVC과 달리 특정 네임스페이스에 속하지 않는다
   - ![6-7](/images/6-7.jpg)

퍼시스턴트불륨클레임을 통해서 퍼시스턴트볼륨 요청
- yaml 파일 생성
   - mongodb-pvc.yaml
      ~~~yaml
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
         name: mongodb-pvc
      spec:
         resources:
            requests:
                  storage: 1Gi   # 요청 용량
         accessModes:
            - ReadWriteOnce
         storageClassName: ""
      ~~~
   - 퍼시스턴트볼륨은 클레임의 요청을 수락할 만큼의 용량이 있어야 하고, 접근 모드를 포함해야 한다
- 생성된 PVC 조회
   ~~~
   // 조회
   kubectl get pvc

   // 조회 결과
   NAME          STATUS   VOLUME       CAPACITY   ACCESS MODES   STORAGECLASS   AGE
   mongodb-pvc   Bound    mongodb-pv   1Gi        RWO,ROX                       4m10s
   ~~~
   - 접근 모드 값
      - RWO(ReadWriteOnece): 단일 노드만ㄷ일 읽기/쓰기용 볼륨을 마운트 할 수 있다
      - ROX(ReadOnlyMany): 다수의 노드가 읽기용 볼륨을 마운트 할 수 있다
      - RWX(ReadWriteMany): 다수의 노드가 읽기/쓰기용 불륨을 마운트할 수 있다
- PV 조회해보기
   ~~~
   // 조회
   kubectl get pv

   // 조회 결과
   NAME         CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                 STORAGECLASS   REASON   AGE
   mongodb-pv   1Gi        RWO,ROX        Retain           Bound    default/mongodb-pvc                           6h40m
   ~~~
   - Status가 Avaiable에서 Bound로 변경되어 있다

파드에서 퍼시스턴트볼륨클레임 사용하기
- yaml 파일 생성
   ~~~yaml
   apiVersion: v1
   kind: Pod
   metadata:
      name: mongodb
   spec:
      containers:
      - image: mongo
         name: mongodb
         volumeMounts:
         - name: mongodb-data
         mountPath: /data/db
         ports:
         - containerPort: 27017
         protocol: TCP
      volumes:
      - name: mongodb-data
         persistentVolumeClaim:
         claimName: mongodb-pvc   
   ~~~

PV과 PVC을 사용할 때의 장점
- ![6-8](/images/6-8.jpg)
- 개발자가 조금 더 개발에 집중할 수 있게 한다. 기저에 사용된 실제 스토리지 기술을 알 필요가 없다

PV 재사용
- bound가 되어 있는 상태에서 Pod와 PVC을 삭제하고, 다시 PVC을 생성하면 어떻게 될까?
   - PV이 released 상태로 남아있다
   - 이는 이미 볼륨을 사용했기 때문인데, 관리자가 볼륨을 완전히 비우지 않으면 새로운 클레임에 바인딩할 수 없다

클레임 정책
- Retain: 클레임이 해제돼도 볼륨과 콘텐츠를 유지하도록 한다. 오로지 삭제 후에 재 생성만 가능하다
- Recycle: 볼륨의 콘텐츠를 삭제하고 볼륨이 다시 클레임될 수 있도록 볼륨을 사용가능하도록 만든다 (현재 지원 X)
- Delete: 기반 스토리지를 삭제한다

## 6.6 퍼시스턴트불륨의 동적 프로비저닝
배경
- PV과 PVC을 사용하더라도 클러스터 관리자가 실제 스토리지를 미리 프로비저닝해둬야 하는 문제가 있다
- 쿠버네티스에서는 동적 프로비저닝을 통해서 이를 자동으로 수행할 수 있도록 지원한다

방법
- 퍼시스턴트볼륨을 생성하는 대신 퍼시스턴트볼륨 프로비저너를 배포하고, 사용자가 선택가능한 PV의 타입을 하나 이상의 스토리지클래스 오브젝트로 정의할 수 있다
- 쿠버네티스는 대부분 인기 있는 클라우드 공급자의 프로비저너를 포함한다

### 스토리지클래스 사용해보기
스토리지클래스 정의
- yaml 파일
   ~~~yaml
   apiVersion: storage.k8s.io/v1
   kind: StorageClass
   metadata:
      name: fast
   provisioner: kubernetes.io/gce-pd   # GCE의 PD(Persistent Disk)르를 프로비저너로 사용
   parameters:
      type: pd-ssd
      zone: asia-east2-a
   ~~~

PVC 정의 생성하기
- yaml 파일
   ~~~yaml
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
      name: mongodb-pvc
   spec:
      storageClassName: fast  # 사용자 정의 스토리지 클래스 요청
      resources:
         requests:
               storage: 100Mi   # 요청 용량
         accessModes:
               - ReadWriteOnce
   ~~~

스토리지 클래스 사용
- 클러스터 관리자는 성능이나 기타 특성이 다른 여러 스토리지 클래스를 생성할 수 있다.<br>
개발자는 생성할 각 클레임에 가장 적합한 스토리지 클래스를 결정한다
   - _PD -> PVC -> Storeage Class -> Provisioner 이렇게 이어지겠구나_
- 스토리지 클래스의 좋은점은 클레임 이름으로 이를 참조한다는 점이다.<br>
-> 다른 클러스터간 스토리지클래스 이름을 동일하게 사용한다면 PVC정의를 다른 클러스터로 이식 가능하다

### 스토리지 클래스를 지정하지 않은 동적 프로비저닝
스토리지클래스 조회
- 스토리지클래스 조회
   ~~~
   kubectl get sc
   ~~~
- 기본 스토리지클래스 정보
   ~~~yaml
   allowVolumeExpansion: true
   apiVersion: storage.k8s.io/v1
   kind: StorageClass
   metadata:
   annotations:
      storageclass.kubernetes.io/is-default-class: "true"   # 기본값 표시
   creationTimestamp: "2020-06-13T00:06:23Z"
   labels:
      addonmanager.kubernetes.io/mode: EnsureExists
      kubernetes.io/cluster-service: "true"
   name: standard
   resourceVersion: "305"
   selfLink: /apis/storage.k8s.io/v1/storageclasses/standard
   uid: b762466b-ad09-11ea-80b9-42010aaa00da
   parameters:
   type: pd-standard # 프로비저너가 어떤 유형의 GCE PD를 생성할지 알려준다
   provisioner: kubernetes.io/gce-pd   # 프로비저너 정보
   reclaimPolicy: Delete
   volumeBindingMode: Immediate   
   ~~~

스토리지클래스를 지정하지 않고 PVC을 생성하면 `pd-standard` 유형의 PD가 프로비저닝된다

빈 문자열을 스토리지클래스 이름으로 지정하면 PVC가 새로운 PV를 동적 프로비저닝하는 대신 미리 프로비저닝되나 PV에 바인딩된다

![6-10](/images/6-10.jpg)