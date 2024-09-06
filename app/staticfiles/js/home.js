// home.js

document.addEventListener("DOMContentLoaded", init);

async function init() {
    // event
    document.getElementById("btn-start").addEventListener("click", async()=>{

        try{
            const name = document.getElementById("input-name").value
            
            // 이름의 길이 제한
            if (name.length < 3 || name.length > 10) {
                alert("이름은 3자 이상 10자 이하로 입력해주세요.");
                return; // 요청을 중지
            }

            const reqData = {
                name:name
            }
    
            const resp = await fetch("/start", {
                method:"POST",
                headers:{"Content-Type": "application/json"},
                body:JSON.stringify(reqData)
            });
            if(resp.ok){
                window.location.href="/game";
            }else{
                throw new Error("ERROR from fetch");
            }
        }catch(err){
            console.error("ERROR from btn-start :", err);
        }

    });
}