const http = require('http');
const os = require('os');

console.log('Kubia server starting...');

var handler = function(request, response) {

    // 서버의 요청에 대해서
    // 1. 클라이언트 IP를 로깅
    // 2. 200 응답
    // 3. You've hist <host name> 텍스트 응답
    console.log("Received request from " + request.connection.remoateAddress);
    response.writeHead(200);
    response.end("You've hit " + os.hostname() + "\n");
};

var www = http.createServer(handler);
www.listen(8080);   // 8008 포트로 서버를 시작
