```
❯ k get pods
NAME      READY   STATUS              RESTARTS   AGE
kubia-0   0/1     ContainerCreating   0          5s

❯ k get pods
NAME      READY   STATUS    RESTARTS   AGE
kubia-0   1/1     Running   0          20s
kubia-1   1/1     Running   0          14s

```
```
spec:
  containers:
  - image: luksa/kubia-pet
    imagePullPolicy: Always
    name: kubia
    ports:
    - containerPort: 8080
      name: http
      protocol: TCP
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/data
      name: data
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-bbcb6
      readOnly: true

volumes:
  - name: data
    persistentVolumeClaim:
      claimName: data-kubia-1
```
```
❯ curl -X POST -d "Hey there! This is greeting was submitted to kubia-0" localhost:8001/api/v1/namespaces/default/pods/kubia-0/proxy/
Data stored on pod kubia-0
~/Programs/02.PrivateRepo/book_k8s_in_action/2nd/ch10/source master ?1 ···························································································  2.6.6 03:25:03 PM
❯ curl localhost:8001/api/v1/namespaces/default/pods/kubia-0/proxy/
You've hit kubia-0
Data stored on this pod: Hey there! This is greeting was submitted to kubia-0

 ❯ k delete pod kubia-0
pod "kubia-0" deleted

❯ k get pods
NAME      READY   STATUS        RESTARTS   AGE
kubia-0   1/1     Terminating   0          8m26s
kubia-1   1/1     Running       0          8m20s

❯ k get pods
NAME      READY   STATUS    RESTARTS   AGE
kubia-0   1/1     Running   0          9s
kubia-1   1/1     Running   0          8m45s

You've hit kubia-0
Data stored on this pod: Hey there! This is greeting was submitted to kubia-0

```

```
❯ k run -it srvlookup --image=tutum/dnsutils --rm --restart=Never -- dig SRV kubia.default.svc.cluster.local

; <<>> DiG 9.9.5-3ubuntu0.2-Ubuntu <<>> SRV kubia.default.svc.cluster.local
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 46676
;; flags: qr aa rd; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 3
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;kubia.default.svc.cluster.local. IN	SRV

;; ANSWER SECTION:
kubia.default.svc.cluster.local. 30 IN	SRV	0 50 80 kubia-1.kubia.default.svc.cluster.local.
kubia.default.svc.cluster.local. 30 IN	SRV	0 50 80 kubia-0.kubia.default.svc.cluster.local.

;; ADDITIONAL SECTION:
kubia-1.kubia.default.svc.cluster.local. 30 IN A 10.244.3.3
kubia-0.kubia.default.svc.cluster.local. 30 IN A 10.244.2.4

;; Query time: 26 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: Sun Nov 21 06:53:23 UTC 2021
;; MSG SIZE  rcvd: 350

pod "srvlookup" deleted
```

```
❯ k edit statefulset kubia
statefulset.apps/kubia edited

❯ k get pods
NAME      READY   STATUS        RESTARTS   AGE
kubia-0   1/1     Running       0          40m
kubia-1   1/1     Terminating   0          48m
kubia-2   1/1     Running       0          27s

❯ k get pods
NAME      READY   STATUS        RESTARTS   AGE
kubia-0   1/1     Terminating   0          40m
kubia-1   1/1     Running       0          10s
kubia-2   1/1     Running       0          48s

❯ k get pods
NAME      READY   STATUS    RESTARTS   AGE
kubia-0   1/1     Running   0          9s
kubia-1   1/1     Running   0          44s
kubia-2   1/1     Running   0          82s

❯ curl -X POST -d "The sun is shining" localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
Data stored on pod kubia-1
~/Programs/02.PrivateRepo/book_k8s_in_action/2nd/ch10/source master !1 ?1 ························································································  2.6.6 04:09:32 PM
❯ curl -X POST -d "The weather is sweet" localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
Data stored on pod kubia-0

❯ curl localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
You've hit kubia-1
Data stored in the cluster:
- kubia-1.kubia.default.svc.cluster.local: The sun is shining
- kubia-0.kubia.default.svc.cluster.local: The weather is sweet
- kubia-2.kubia.default.svc.cluster.local: No data posted yet
~/Programs/02.PrivateRepo/book_k8s_in_action/2nd/ch10/source master !1 ?1 ························································································  2.6.6 04:10:05 PM
❯ curl localhost:8001/api/v1/namespaces/default/services/kubia-public/proxy/
You've hit kubia-2
Data stored in the cluster:
- kubia-2.kubia.default.svc.cluster.local: No data posted yet
- kubia-0.kubia.default.svc.cluster.local: The weather is sweet
- kubia-1.kubia.default.svc.cluster.local: The sun is shining
```




