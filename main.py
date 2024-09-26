# main.py

# lib
import os
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, staticfiles

# env
load_dotenv()

# module
from app.l1.foreground.routers.common import router as common_router
from app.l1.foreground.routers.content import router as content_router
import app.l2.content as CONT

# method
async def statup():
    print()

    # content
    CONT.Game.setup(
        size_r = int( os.getenv("GAME_ROWS") ),
        size_c = int( os.getenv("GAME_COLS") ),
        max_u = int( os.getenv("GAME_MAX_U") ),
        near_r = int( os.getenv("GAME_NEAR_RANGE") ),
        cooldown = int( os.getenv("GAME_COLLDOWN") )
    )


async def shutdown():
    return

# attribute
application = FastAPI(
    on_startup=[ statup ],
    on_shutdown=[ shutdown ]
)

# mount
application.mount(
    path="/static",
    app=staticfiles.StaticFiles(directory="app/staticfiles"),
    name="static_files"
)


# 미들웨어
# application.add_middleware()


# router
application.include_router( common_router )
application.include_router( content_router )








if __name__=="__main__":
    import uvicorn

    uvicorn.run(
        app="main:application",
        host="127.0.0.1",
        port=9000,
        reload=False
    )