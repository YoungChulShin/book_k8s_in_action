### resolve.conf
root@kubia-59kxt:/etc# cat resolv.conf
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5