"""FastAPI statistical service for ClimaLab — ONA, CFA, Invariance, HLM."""

import logging
import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClimaLab Statistical API",
    version="1.0.0",
    description="ONA, CFA, Measurement Invariance, and HLM analyses for ClimaLab campaigns.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://climalab.rizo.ma", "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

API_SECRET = os.environ.get("STATISTICAL_API_SECRET", "")

if not API_SECRET:
    logger.warning("STATISTICAL_API_SECRET not set — API runs in open-access dev mode")


def verify_auth(authorization: str = Header(default="")):
    """Verify Bearer token against STATISTICAL_API_SECRET."""
    if not API_SECRET:
        return  # No secret configured = open access (dev mode)
    expected = f"Bearer {API_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


class CampaignRequest(BaseModel):
    campaign_id: str

    @field_validator("campaign_id")
    @classmethod
    def campaign_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("campaign_id must be a non-empty string")
        return v.strip()


class InvarianceRequest(BaseModel):
    campaign_id: str
    groups: str = "department,tenure,gender"

    @field_validator("campaign_id")
    @classmethod
    def campaign_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("campaign_id must be a non-empty string")
        return v.strip()


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/ona")
def ona_endpoint(
    body: CampaignRequest,
    authorization: Optional[str] = Header(default=None),
):
    verify_auth(authorization or "")
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
    verify_auth(authorization or "")
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
    verify_auth(authorization or "")
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
    verify_auth(authorization or "")
    try:
        from engine.hlm import run_hlm

        data = run_hlm(body.campaign_id)
        return {"status": "completed", "data": data}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
