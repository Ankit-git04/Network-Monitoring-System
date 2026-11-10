
import json
import os
from datetime import datetime


HISTORY_FILE = "data/monitoring_history.jsonl"


def save_monitoring_result(result):
    os.makedirs("data", exist_ok=True)

    record = result.copy()
    record["timestamp"] = datetime.now().isoformat()

    with open(HISTORY_FILE, "a") as file:
        file.write(json.dumps(record) + "\n")


def load_monitoring_history():
    if not os.path.exists(HISTORY_FILE):
        return []

    records = []

    with open(HISTORY_FILE, "r") as file:
        for line in file:
            records.append(json.loads(line))

    return records


def get_device_history(host):
    records = load_monitoring_history()

    device_records = [
        record for record in records
        if record["host"] == host
    ]

    return device_records


def calculate_average_latency(host):
    records = get_device_history(host)

    latencies = [
        record["latency"]
        for record in records
        if record["latency"] is not None
    ]

    if not latencies:
        return None

    return sum(latencies) / len(latencies)


def get_device_status_count(host):
    records = get_device_history(host)

    up_count = 0
    down_count = 0

    for record in records:
        if record["status"] == "UP":
            up_count += 1

        elif record["status"] in ["DOWN", "TIMEOUT"]:
            down_count += 1

    return {
        "UP": up_count,
        "DOWN": down_count
    }



