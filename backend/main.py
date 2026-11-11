"""Bounded in-memory API. No upload persistence or database.

No external AI calls unless the server owner sets ENABLE_AI_CHAT=1 and GEMMA_API_KEY
(see backend/ai_chat.py). Even then the browser only uses it when the person turns it on.
"""
import os
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from backend import ai_chat
from backend.analysis import MAX_BYTES, analyze, parse_file

app = FastAPI(title='Speculara', version='1.0.0')
origins = os.getenv('ALLOWED_ORIGINS','http://localhost:8443,http://127.0.0.1:8443').split(',')
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in origins], allow_methods=['GET','POST'], allow_headers=['Content-Type','X-Filename'])

@app.middleware('http')
async def no_cache(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

@app.get('/api/health')
def health():
    return {'status':'ok','storage':'none','ai':ai_chat.ai_enabled()}


class AIChat(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    analysis: dict


@app.post('/api/ai/chat')
async def ai_chat_endpoint(body: AIChat):
    if not ai_chat.ai_enabled():
        raise HTTPException(403,'AI answers are not enabled on this server.')
    try:
        return {'answer': await ai_chat.answer(body.message, body.analysis)}
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    except ai_chat.AIUnavailable as exc:
        raise HTTPException(503,str(exc)) from exc

@app.post('/api/analyze')
async def upload(request: Request):
    # Raw binary avoids multipart's disk-spooling behavior.
    data = bytearray()
    async for chunk in request.stream():
        if len(data)+len(chunk)>MAX_BYTES:
            raise HTTPException(413,'File exceeds 5 MB.')
        data.extend(chunk)
    filename = request.headers.get('x-filename','upload.csv')
    try:
        return await run_in_threadpool(lambda: analyze(parse_file(bytes(data),filename)))
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
