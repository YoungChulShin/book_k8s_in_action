# link
- pod spec: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#pod-v1-core

# check
- apiVersion의 정의


# 스크립트
# 파드를 정의하는 간단한 yaml 작성하기
```
k port-forward kubia-manual 8888:8080
Forwarding from 127.0.0.1:8888 -> 8080
Forwarding from [::1]:8888 -> 8080
Handling connection for 8888
❯ curl localhost:8888
You've hit kubia-manual
```

## 파드를 생성할 때 레이블 지정
```
❯ k get pods --show-labels        
NAME              READY   STATUS    RESTARTS   AGE     LABELS
kubia-manual      1/1     Running   0          37m     <none>
kubia-manual-v2   1/1     Running   0          2m39s   creation_method=manual,env=prod

❯ k get pods -L  creation_method,env 
NAME              READY   STATUS    RESTARTS   AGE     CREATION_METHOD   ENV
kubia-manual      1/1     Running   0          38m                       
kubia-manual-v2   1/1     Running   0          3m39s   manual            prod

❯ k label pods kubia-manual creation_method=manual
pod/kubia-manual labeled

❯ k label pods kubia-manual creation_method-      
pod/kubia-manual labeled

❯ k label pods kubia-manual-v2 env=debug --overwrite
pod/kubia-manual-v2 labeled
❯ k get pods -L  creation_method,env                
NAME              READY   STATUS    RESTARTS   AGE   CREATION_METHOD   ENV
kubia-manual      1/1     Running   0          45m   manual            
kubia-manual-v2   1/1     Running   0          10m   manual            debug


❯ k get pods -o wide --show-labels
NAME              READY   STATUS    RESTARTS   AGE    IP           NODE                 NOMINATED NODE   READINESS GATES   LABELS
kubia-manual      1/1     Running   0          80s    10.244.3.2   multinode-demo-m04   <none>           <none>            <none>
kubia-manual-v2   1/1     Running   0          2m9s   10.244.2.2   multinode-demo-m03   <none>           <none>            creation_method=manual,env=prod
❯ k get pod -l creation_method=manual
NAME              READY   STATUS    RESTARTS   AGE
kubia-manual-v2   1/1     Running   0          2m27s
❯ k get pod -l creation_method=manual -o wide --show-labels
NAME              READY   STATUS    RESTARTS   AGE     IP           NODE                 NOMINATED NODE   READINESS GATES   LABELS
kubia-manual-v2   1/1     Running   0          2m51s   10.244.2.2   multinode-demo-m03   <none>           <none>            creation_method=manual,env=prod

❯ k get pod -l '!creation_method' --show-labels
NAME           READY   STATUS    RESTARTS   AGE     LABELS
kubia-manual   1/1     Running   0          3m42s   <none>

❯ k get pod -l creation_method=manual,env=prod 
NAME              READY   STATUS    RESTARTS   AGE
kubia-manual-v2   1/1     Running   0          8m6s

❯ k label node multinode-demo-m02 gpu=true          
node/multinode-demo-m02 labeled
❯ k get nodes --show-labels | grep gpu
multinode-demo-m02   Ready    <none>                 12m   v1.22.1   beta.kubernetes.io/arch=amd64,beta.kubernetes.io/os=linux,gpu=true,kubernetes.io/arch=amd64,kubernetes.io/hostname=multinode-demo-m02,kubernetes.io/os=linux
❯ k get nodes -l gpu=true             
NAME                 STATUS   ROLES    AGE   VERSION
multinode-demo-m02   Ready    <none>   13m   v1.22.1
❯ k get nodes -L gpu
NAME                 STATUS   ROLES                  AGE   VERSION   GPU
multinode-demo       Ready    control-plane,master   18d   v1.22.1   
multinode-demo-m02   Ready    <none>                 14m   v1.22.1   true
multinode-demo-m03   Ready    <none>                 14m   v1.22.1   
multinode-demo-m04   Ready    <none>                 13m   v1.22.1 


❯ k annotate pod kubia-manual mycompany.com/testannotation="hello world"
❯ k get pods kubia-manual -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    mycompany.com/testannotation: hello world

❯ k annotate pod kubia-manual mycompany.com/testannotation="hello world2" --overwrite

```

## 네임스페이스
```
❯ k get ns                       
NAME                   STATUS   AGE
default                Active   18d
kube-node-lease        Active   18d
kube-public            Active   18d
kube-system            Active   18d
kubernetes-dashboard   Active   16d

❯ k get pods --namespace kube-system -o wide
NAME                                     READY   STATUS    RESTARTS       AGE   IP             NODE                 NOMINATED NODE   READINESS GATES
coredns-78fcd69978-z45rr                 1/1     Running   7 (35h ago)    18d   10.244.0.2     multinode-demo       <none>           <none>
etcd-multinode-demo                      1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
kindnet-75ps4                            1/1     Running   7 (35h ago)    18d   192.168.49.5   multinode-demo-m04   <none>           <none>
kindnet-dlbzf                            1/1     Running   11 (35h ago)   18d   192.168.49.3   multinode-demo-m02   <none>           <none>
kindnet-j8j6l                            1/1     Running   7 (35h ago)    18d   192.168.49.4   multinode-demo-m03   <none>           <none>
kindnet-vwszg                            1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
kube-apiserver-multinode-demo            1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
kube-controller-manager-multinode-demo   1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
kube-proxy-2xzrd                         1/1     Running   7 (35h ago)    18d   192.168.49.5   multinode-demo-m04   <none>           <none>
kube-proxy-g4sdl                         1/1     Running   7 (35h ago)    18d   192.168.49.4   multinode-demo-m03   <none>           <none>
kube-proxy-wfwn9                         1/1     Running   10 (35h ago)   18d   192.168.49.3   multinode-demo-m02   <none>           <none>
kube-proxy-wp5rf                         1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
kube-scheduler-multinode-demo            1/1     Running   7 (35h ago)    18d   192.168.49.2   multinode-demo       <none>           <none>
storage-provisioner                      1/1     Running   12 (47m ago)   18d   192.168.49.2   multinode-demo       <none>           <none>

❯ k create -f custom-namesapce.yaml
namespace/custom-namespace created
❯ k get ns                         
NAME                   STATUS   AGE
custom-namespace       Active   8s
default                Active   18d
kube-node-lease        Active   18d
kube-public            Active   18d
kube-system            Active   18d
kubernetes-dashboard   Active   16d
❯ k create ns custom-namespace-2    

❯ k config get-contexts   
CURRENT   NAME                                                    CLUSTER                                                            AUTHINFO                                                NAMESPACE
          dev1                                                    arn:aws:eks:ap-northeast-2:540137478950:cluster/dev-eks-cluster    eks-dev-developer                                       vroong-dev1
          docker-desktop                                          docker-desktop                                                     docker-desktop                                          
          gke_cosmic-anthem-311109_asia-northeast3-a_yc-cluster   gke_cosmic-anthem-311109_asia-northeast3-a_yc-cluster              gke_cosmic-anthem-311109_asia-northeast3-a_yc-cluster   
*         multinode-demo                                          multinode-demo                                                     multinode-demo                                          default
          prod                                                    arn:aws:eks:ap-northeast-2:510676036070:cluster/prod-eks-cluster   eks-prod-viewer                                         vroong
          prod-rw                                                 arn:aws:eks:ap-northeast-2:510676036070:cluster/prod-eks-cluster   eks-prod-developer                                      vroong
          qa1                                                     arn:aws:eks:ap-northeast-2:540137478950:cluster/qa-eks-cluster     eks-qa-developer                                        vroong-qa1
          qa2                                                     arn:aws:eks:ap-northeast-2:540137478950:cluster/qa-eks-cluster     eks-qa-developer                                        vroong-qa2
          qa3                                                     arn:aws:eks:ap-northeast-2:540137478950:cluster/qa-eks-cluster     eks-qa-developer                                        vroong-qa3


❯ k create -f kubia-manual.yaml -n custom-namespace
pod/kubia-manual created
❯ k get pods -n custom-namespace                
NAME           READY   STATUS    RESTARTS   AGE
kubia-manual   1/1     Running   0          17s
```

### 파드 삭제
```
❯ k delete pods -l creation_method=manual 
pod "kubia-manual-v2" deleted

❯ k delete ns custom-namespace  
namespace "custom-namespace" deleted

❯ k delete all --all          
pod "kubia-manual" deleted
service "kubernetes" deleted
service "kubia-http" deleted

```