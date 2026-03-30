"""FastAPI statistical service for ClimaLab — ONA, CFA, Invariance, HLM."""

import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="ClimaLab Statistical API",
    version="1.0.0",
    description="ONA, CFA, Measurement Invariance, and HLM analyses for ClimaLab campaigns.",
)

API_SECRET = os.environ.get("STATISTICAL_API_SECRET", "")


def verify_auth(authorization: Optional[str]) -> None:
    """Verify Bearer token against STATISTICAL_API_SECRET."""
    if not API_SECRET:
        raise HTTPException(
            status_code=500,
            detail="STATISTICAL_API_SECRET not configured on server",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if token != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API secret")


class CampaignRequest(BaseModel):
    campaign_id: str


class InvarianceRequest(BaseModel):
    campaign_id: str
    groups: str = "department,tenure,gender"


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/ona")
def ona_endpoint(
    body: CampaignRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization)
    try:
        from engine.ona import run_ona

        data = run_ona(body.campaign_id)
        return {"status": "completed", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/cfa")
def cfa_endpoint(
    body: CampaignRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization)
    try:
        from engine.cfa import run_cfa

        data = run_cfa(body.campaign_id)
        return {"status": "completed", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/invariance")
def invariance_endpoint(
    body: InvarianceRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization)
    try:
        from engine.invariance import run_invariance

        data = run_invariance(body.campaign_id, body.groups)
        return {"status": "completed", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/hlm")
def hlm_endpoint(
    body: CampaignRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization)
    try:
        from engine.hlm import run_hlm

        data = run_hlm(body.campaign_id)
        return {"status": "completed", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
