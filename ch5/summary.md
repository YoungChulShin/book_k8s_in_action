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

