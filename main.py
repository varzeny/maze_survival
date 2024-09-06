# main.py

# lib
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, staticfiles

# env
load_dotenv()

# module
from app.l1.foreground.routers.common import router as common_router
from app.l1.foreground.routers.content import router as content_router
# from app.l1.background.content

# method
async def statup():
    print()



    return


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
        reload=True
    )