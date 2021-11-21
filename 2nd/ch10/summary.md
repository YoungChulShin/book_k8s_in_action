
헤드리스 서비스
- https://kubernetes.io/ko/docs/concepts/services-networking/service/

stateful set
```
❯ k get pods
NAME      READY   STATUS    RESTARTS   AGE
kubia-0   1/1     Running   0          54s
kubia-1   1/1     Running   0          47s
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
```