"""Bounded in-memory API. No upload persistence or database.

No external AI calls unless the server owner sets ENABLE_AI_CHAT=1 and GEMMA_API_KEY
(see backend/ai_chat.py). Even then the browser only uses it when the person turns it on.
"""
import os
from pathlib import Path
from pydantic import BaseModel, Field


def _load_local_env():
    """Read backend/.env (git-ignored) into the environment without overriding real settings."""
    path = Path(__file__).with_name('.env')
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, _, value = line.partition('=')
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))


_load_local_env()
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from backend import ai_chat, profile_import
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
    return {'status':'ok','storage':'none','ai':ai_chat.ai_enabled(),'profile':profile_import.collector_enabled()}


# ---- Optional profile link analysis (off by default, this computer only) ----
class ProfileUrl(BaseModel):
    url: str = Field(min_length=3, max_length=500)


class ProfileLogin(BaseModel):
    network: str = Field(pattern='^(instagram|facebook)$')


def _collector(request: Request):
    """Return the collector module only when enabled and the request comes from this computer."""
    if not profile_import.collector_enabled():
        raise HTTPException(403,'Profile link analysis is not enabled on this server.')
    if not profile_import.is_local_request(request.client.host if request.client else None, request.headers.get('origin'), [x.strip() for x in origins]):
        raise HTTPException(403,'Profile link analysis works only from the computer that runs Speculara.')
    from backend.app import collector
    return collector


@app.get('/api/profile/status')
def profile_status(request: Request):
    return _collector(request).status()


@app.post('/api/profile/login')
async def profile_login(body: ProfileLogin, request: Request):
    collector = _collector(request)
    try:
        return await collector.start_login(body.network)
    except collector.CollectorError as exc:
        raise HTTPException(exc.status_code,str(exc)) from exc
    except (TimeoutError, ValueError):
        raise HTTPException(503,'The sign-in browser did not open. Check the collector setup and try again.')


@app.post('/api/profile/login/finish')
async def profile_login_finish(request: Request):
    return await _collector(request).finish_login()


@app.post('/api/profile/cancel')
async def profile_cancel(request: Request):
    return await _collector(request).cancel_collection()


@app.post('/api/profile/analyze')
async def profile_analyze(body: ProfileUrl, request: Request):
    collector = _collector(request)
    try:
        url, _network, _handle = collector.profile_url(body.url)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    if collector.status()['login_open']:
        raise HTTPException(409,'Finish signing in, then click Done signing in before analyzing.')
    try:
        profile, posts = await collector.collect_profile(url)
    except collector.CollectorError as exc:
        raise HTTPException(exc.status_code,str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502,'Could not collect that profile. Check the collector setup and try again.') from exc
    try:
        result = await run_in_threadpool(lambda: analyze(profile_import.posts_to_frame(posts)))
    except ValueError as exc:
        raise HTTPException(422,f'{exc} {profile.notes}'.strip()) from exc
    result['warnings'] = [f'Collected from a public {profile.platform} profile (@{profile.handle}). {profile.notes}'.strip(), *result.get('warnings',[])]
    return result


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
