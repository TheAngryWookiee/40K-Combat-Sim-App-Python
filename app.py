from fastapi import FastAPI

from api import app as api_app


app = FastAPI(title=api_app.title, version=api_app.version)
app.mount("/api", api_app)
