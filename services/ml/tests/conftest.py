from __future__ import annotations

import os
import tempfile

os.environ.setdefault("MODEL_BACKEND", "mock")
os.environ.setdefault("ML_INTERNAL_TOKEN", "test-internal-token-0123456789abcdef")
os.environ.setdefault("HF_HOME", tempfile.mkdtemp(prefix="hf-test-"))
os.environ.setdefault("S3_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("S3_BUCKET", "deepfake")
os.environ.setdefault("SAMPLE_FPS", "1")
os.environ.setdefault("MAX_FRAMES", "12")
os.environ.setdefault("NODE_ENV", "test")
