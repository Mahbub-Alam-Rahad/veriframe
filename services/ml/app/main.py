from __future__ import annotations

import logging

from fastapi import FastAPI

from .api.routes import get_settings, router


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    settings.ensure_directories()

    app = FastAPI(
        title="VeriFrame inference service",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.include_router(router)
    return app


app = create_app()
