
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


def calculate_device_availability(host):
    counts = get_device_status_count(host)

    total_checks = counts["UP"] + counts["DOWN"]

    if total_checks == 0:
        return 0

    availability = (counts["UP"] / total_checks) * 100

    return round(availability, 2)


def calculate_average_packet_loss(host):
    records = get_device_history(host)

    packet_losses = [
        record["packet_loss"]
        for record in records
        if record.get("packet_loss") is not None
    ]

    if not packet_losses:
        return None

    return round(sum(packet_losses) / len(packet_losses), 2)

def generate_device_report(host):
    records = get_device_history(host)

    if not records:
        return None

    counts = get_device_status_count(host)

    report = {
        "host": host,
        "total_checks": len(records),
        "up_count": counts["UP"],
        "down_count": counts["DOWN"],
        "availability": calculate_device_availability(host),
        "average_latency": calculate_average_latency(host),
        "average_packet_loss": calculate_average_packet_loss(host)
    }

    return report


