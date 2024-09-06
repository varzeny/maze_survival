// home.js

document.addEventListener("DOMContentLoaded", init);

let ws;


async function init() {

    // definition
    ws = new WebSocket("wss://test.varzeny.com/ws-game")

    // 이벤트
    ws.addEventListener("open", function(ev){
        console.log("ws is connected !");
        ws.send("hello !")
    })
    ws.addEventListener("close", function(ev){
        console.log("ws is disconnected !");

    })
    ws.addEventListener("message", function(ev){
        console.log("server's msg : ", ev.data);
    })
    ws.addEventListener("error", function(ev){
        console.error("ws error : ", ev);
    })


    document.addEventListener("keydown",keyDown);
    

    console.log("home.js 로드 완료");
}


function keyDown(ev) {
    console.log(ev.key);
    // WebSocket 연결이 열려 있는 경우에만 메시지 전송
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(ev.key);
    } else {
        console.log("WebSocket 연결이 열려 있지 않음");
    }
}

