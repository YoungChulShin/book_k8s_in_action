Last State:     Terminated
      Reason:       Error
      Exit Code:    137
      Started:      Mon, 11 Oct 2021 19:54:42 +0900
      Finished:     Mon, 11 Oct 2021 19:56:24 +0900

Liveness:       http-get http://:8080/ delay=0s timeout=1s period=10s #success=1 #failure=3

NAME          DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
ssd-monitor   2         2         2       2            2           disk=ssd        37s