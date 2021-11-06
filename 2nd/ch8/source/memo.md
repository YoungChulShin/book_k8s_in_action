volumn 폴더 조회
```
❯ k exec downward -- ls -lL /etc/downward
total 24
-rw-r--r--    1 root     root           134 Nov  6 14:35 annotations
-rw-r--r--    1 root     root             2 Nov  6 14:35 containerCpuRequestMillicores
-rw-r--r--    1 root     root             5 Nov  6 14:35 containerMemoryLimitBytes
-rw-r--r--    1 root     root             9 Nov  6 14:35 labels
-rw-r--r--    1 root     root             8 Nov  6 14:35 podName
-rw-r--r--    1 root     root             7 Nov  6 14:35 podNamespace
```
파일 조회
```
❯ k exec downward -- cat /etc/downward/annotations
key1="value1"
key2="multi\nline\nvalue\n"
kubernetes.io/config.seen="2021-11-06T14:35:08.315813400Z"
kubernetes.io/config.source="api"%   
```

k proxy
```
❯ curl localhost:8001
{
  "paths": [
    "/.well-known/openid-configuration",
    "/api",
    "/api/v1",
    "/apis",
    "/apis/",
    "/apis/admissionregistration.k8s.io",
    "/apis/admissionregistration.k8s.io/v1",
    "/apis/apiextensions.k8s.io",
    "/apis/apiextensions.k8s.io/v1",
    "/apis/apiregistration.k8s.io",
    "/apis/apiregistration.k8s.io/v1",
    "/apis/apps",
    "/apis/apps/v1",
    "/apis/authentication.k8s.io",
```

계층적 리소스 탐색
```
❯ curl localhost:8001/apis/batch/v1
❯ curl localhost:8001/apis/batch/v1/jobs
❯ curl localhost:8001/apis/batch/v1/namespaces/default/jobs
❯ curl localhost:8001/apis/batch/v1/namespaces/default/jobs/my-job
```