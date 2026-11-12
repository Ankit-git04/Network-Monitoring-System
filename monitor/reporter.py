"""
reporter.py - HTTP reporter for sending monitoring results to the NMS backend.
Integrates with the existing Python monitoring engine without modifying core logic.
"""
import os
import logging
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] reporter: %(message)s"
)

# Backend URL from environment variable or default
BACKEND_URL = os.environ.get("NMS_BACKEND_URL", "http://localhost:5000")
MONITORING_ENDPOINT = f"{BACKEND_URL}/api/monitoring"
REQUEST_TIMEOUT = 5  # seconds


def send_monitoring_result(result: dict) -> bool:
    """
    Send a single monitoring result to the NMS backend via HTTP POST.
    Returns True on success, False on failure.
    Does not raise exceptions — backend failures are handled gracefully.
    """
    try:
        payload = {
            "name": result.get("name"),
            "host": result.get("host"),
            "status": result.get("status"),
            "latency": result.get("latency"),
            "packet_loss": result.get("packet_loss"),
            "received": result.get("received", 0),
            "tcp_status": result.get("tcp_status"),
            "tcp_port": result.get("tcp_port"),
            "fault": result.get("fault", "No Fault"),
            "tcp_fault": result.get("tcp_fault", "No Fault"),
            # Use UTC ISO-8601 with explicit 'Z' suffix so MongoDB stores
            # the timestamp correctly regardless of server timezone.
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        response = requests.post(
            MONITORING_ENDPOINT,
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        logging.info(f"Sent monitoring result for {result.get('host')} → HTTP {response.status_code}")
        return True

    except requests.exceptions.ConnectionError:
        logging.warning(f"Backend unavailable — could not send result for {result.get('host')}")
        return False
    except requests.exceptions.Timeout:
        logging.warning(f"Backend request timed out for {result.get('host')}")
        return False
    except requests.exceptions.HTTPError as e:
        logging.error(f"Backend returned error for {result.get('host')}: {e}")
        return False
    except Exception as e:
        logging.error(f"Unexpected error sending result for {result.get('host')}: {e}")
        return False


def send_all_results(results: list) -> dict:
    """
    Send multiple monitoring results to the backend.
    Returns a summary dict: {sent: int, failed: int}
    """
    sent = 0
    failed = 0
    for result in results:
        success = send_monitoring_result(result)
        if success:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}
