# 쿠버네티스 API 서버 보안
인증
- API 서버가 요청을 받으면 인증 플러그인 목록을 거치면서 요청이 처리되고, 인증 플러그인은 보낸 사람이 누구인지를 확인하려고한다. 
- 이 정보를 확인한 플러그인은 사용자 이름, 사용자 ID, 클라이언트가 속한 그룹을 API 서버 코어에 반환하고, API 서버는 인증을 종료하고 인가를 처리힌다. 
- 인증 플러그인
   - 클라이언트 인증서
   - HTTP 헤더로 전달된 인증 토큰
   - 기본 HTTP 인증 등

서비스 어카운트
- 클라이언트는 API 서버에서 작업을 수행하기 전에 자신을 인증해야하는데, `var/run/secrets/kubernetes.io/serviceaccount/token` 파일의 내용을 전송해서 파드를 인증한다
- 모든 파드는 파드에서 실행중인 애플리케이션의 아이덴티티를 나타내는 서비스어카운트와 연결되어 있는데, 토큰 파일은 서비스어카운트의 인증 토큰을 가지고 있다
- 각 네임스페이스마다 default 서비스어카운트가 있고, 파드 생성시 명시하지 않으면 이 값이 할당된다
- 파드는 한개의 서비스어카운트와 연결되지만, 서비스어카운트는 여러개의 파드에 연결될 수 있다.



## 인증
서비스 어카운트 생성
```
// 생성
k create serviceaccount foo

// 조회
❯ k get sa
NAME      SECRETS   AGE
default   1         96d
foo       1         6s

// 정보
❯ k describe sa foo
Name:                foo
Namespace:           default
Labels:              <none>
Annotations:         <none>
Image pull secrets:  <none>
Mountable secrets:   foo-token-b9zlm    // 이 이름으로 secret이 생성되고, 여기에서 ca인증서, namespace, token을 조회할 수 있다
Tokens:              foo-token-b9zlm
Events:              <none>
```

