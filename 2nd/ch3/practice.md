# 실습
## 실습 환경 구성
```
// 미니쿠베 시작
minikube start --nodes 4 -p multinode-demo

// 노드 확인
k get nodes -o wide          
```
## 파드 생성
```
// yaml 사전 정의 확인
kubia-manual.yaml 파일

// 파드 생성
k create -f kubia-manual.yaml

// 생성된 파드 확인
k get pods
k get pods -o wide

// yaml 형식으로 파드 정보 확인
k get pod kubia-manual -o yaml
k get pod kubia-manual -o json
```

## 애플리케이션 로그 보기
컨테이너 런타임(도커)은 출력 스트림을 파일로 전달하고, 조회할 수 있는 기능을 제공한다.

파드가 삭제되면 로그도 같이 삭제되기 때문에, 중앙집중된 로깅 시스템을 구축해서 파드가 삭제되어도 로그를 볼 수 있도록 구성해야한다.

```
// 파드의 로그
k logs kubia-manual 

// 파드에 2개 이상의 컨테이너가 있을 때, 개별 컨테이너 로그 보기
k logs kubia-manual -c kubia
```

## 포트 포워딩을 통한 파드 테스트
파드는 서비스를 이용해서 접속하는 것이 일반적인 방법이나, 테스트 또는 디버깅 목적으로 포트 포워딩을 이용해서 파드로 서비스 없이 요청을 보낼 수 있다

```
// 포트 포워딩 설정
k port-forward kubia-manual 8888:8080 
```

## 레이블을 가지는 파드 생성, 조회
```
// yaml 파일 설명

// 파드 생성
k create -f kubia-manual-with-labels.yaml   

// 레이블을 볼 수 있도록 파드 조회
k get pods --show-labels

// 레이블을 칼럼으로 보면서 파드 조회
k get pods -L creation_method,env

// 레이블 수정
k label pods kubia-manual creation_method=manual

// 레이블 수정 - 덮어쓰기
k label pods kubia-manual-v2 env=debug --overwrite
```

## 레이블 셀렉터
```
// 키-밸류를 이용한 조회
k get pods -l creation_method=manual --show-labels

// 밸류와 상관없이 특정 키를 포함하는 파드 조회
k get pods -l creation_method --show-labels 
k get pods -l creation_method,env --show-labels

// 밸류와 상관없이 특정 키를 포함하지 않는 파드 조회
k get pods -l '!env' --show-labels

// 키와 특정 밸류 리스트를 포함하는 조회
k get pods -l 'creation_method in (manual, auto)' --show-labels

// 2개의 레이블 조건을 검색
k get pods -l creation_method=manual,env=debug --show-labels
```

## 레이블 셀렉터를 이용한 파드 스케쥴링 제한
```
// 워커 노드 조회
k get nodes -L gpu

// 워커 노드에 레이블 설정
k label node multinode-demo-m02 gpu=true 

// kubia-gpu yaml 설명

// 특정 노드에 파드 스케쥴링
k create -f kubia-gpu.yaml   

// 결과 조회
k get pods -o wide
```

## 어노테이션
```
// 어노테이션 추가
k annotate pod kubia-manual mycompany.com/testannotation="hello world"

// 어노테이션 조회
k describe pod kubia-manual

// 어노테이션 덮어쓰기
k annotate pod kubia-manual mycompany.com/testannotation="exit" --overwrite
```

## 네임스페이스
```
// 네임스페이스 조회
k get ns

// 네임스페이스의 리소스 조회
k get pods -n kube-system -o wide
k get pods -namespace kube-system -o wide

// 네임스페이스 생성

// 1. custom-namespace yaml 을 통해서 생성
k create -f custom-namesapce.yaml 

// 2. 명령어를 통해서 생성
k create namespace custom-namespace2

// 생성된 다른 네임스페이스에 파드를 생성하기

// 1. meta-data로 생성
k create -f kubia-manual-ns.yaml 

// 2. 명령어를 통해서 생성
k create -f kubia-manual.yaml -n custom-namespace2

// meta-data와 명령어를 함께 사용할 때 2개의 값이 다르면 에러가 발생
the namespace from the provided object "custom-namespace" does not match the namespace "custom-namespace2"

// 생성된 다른 네임스페이스에 파드를 조회하기
k get pods -n custom-namespace
k get pods -n custom-namespace2
```

## kubectl context
```
// context 정보 조회
k config get-contexts

// context 설정 정보 조회
vi ~/.kube/config 

// context 변경

// 1. kubectl 로 변경
k config use-context dev1

// 2. kubectx 로 변경
kubectx multinode-demo
```

## 파드 삭제
```
// 이름으로 삭제
k delete pod kubia-gpu

// 레이블 셀렉터를 이용한 삭제
k delete pods -l creation_method=manual

// 네임스페이스를 이용한 삭제
k delete ns custom-namespace

// 전체 파드 삭제
k delete pods --all -n custom-namespace2

// 전체 리소스 삭제
k delete all --all
```

## 실습 환경 종료
```
// 미니쿠베 종료
minikube stop --profile multinode-demo
```