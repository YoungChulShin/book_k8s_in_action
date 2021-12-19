# 쿠버네티스 API 서버 보안
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

