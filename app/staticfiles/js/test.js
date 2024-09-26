// test.js


document.addEventListener("DOMContentLoaded", init);

const MAP = {
    CANVAS:{
        map:null,
        ctxMap:null
    },
    IMAGES:{
        floor1:new Image(),
        floor2:new Image(),
        floor3:new Image(),
    },
    init:function(){
        this.CANVAS.map = document.getElementById("map");
        this.CANVAS.map.width = 950;
        this.CANVAS.map.height = 900;
        this.CANVAS.ctxMap = this.CANVAS.map.getContext("2d");
        this.IMAGES.floor1.src = "static/image/test/f1.jpg";
        this.IMAGES.floor2.src = "static/image/test/f2.jpg";
        this.IMAGES.floor3.src = "static/image/test/f3.jpg";
    },
    showMap:function(){
        // 첫 번째 층
        this.drawFloor(MAP.IMAGES.floor1, 0);

        // 두 번째 층
        this.drawFloor(MAP.IMAGES.floor2, 250);  // 약간 위에 올라가게끔 좌표 변경

        // 세 번째 층
        this.drawFloor(MAP.IMAGES.floor3, 500);  // 더 위에 올라가게끔 좌표 변경
    },
    drawFloor:function(img, yoffset){
        const scaleX = 1;
        const skewY = 0;
        const skewX = -0.3;
        const scaleY = 0.5;
        const translateX = 0;
        const translateY = yoffset;
    
        // 변환 행렬 설정 (기울임 + 축소 + 이동)
        this.CANVAS.ctxMap.setTransform(scaleX, skewY, skewX, scaleY, translateX, translateY);
    
        // 층 이미지 그리기
        this.CANVAS.ctxMap.drawImage(img, 200, 100, 600, 400);
    
        // 원래 상태로 변환 복원
        this.CANVAS.ctxMap.setTransform(1, 0, 0, 1, 0, 0);  // 원상 복구
    }
}

function init() {
    MAP.init();
    setTimeout(()=>{
        MAP.showMap();
    }, 1000);
}
