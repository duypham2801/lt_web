from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from .config import settings
from .database import create_db_and_tables
from .routers import auth, tasks

app = FastAPI(title="IT4409 Task Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"message": "Invalid input", "detail": jsonable_encoder(exc.errors())})


@app.get("/")
def root():
    return {"message": "IT4409 Task Manager API is running"}


app.include_router(auth.router)
app.include_router(tasks.router)
