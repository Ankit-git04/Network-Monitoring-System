"""
reporter_config.py - Configuration for the NMS HTTP reporter.
Values can be overridden via environment variables.
"""
import os

BACKEND_URL = os.environ.get("NMS_BACKEND_URL", "http://localhost:5000")
REQUEST_TIMEOUT = int(os.environ.get("NMS_REQUEST_TIMEOUT", "5"))
