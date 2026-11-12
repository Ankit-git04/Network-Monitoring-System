import subprocess
import re
import time
import socket
import json
import os
import requests
from monitor.history import save_monitoring_result


# Backend API configuration for dynamic device and settings management
BACKEND_URL = os.environ.get("NMS_BACKEND_URL", "http://localhost:5000")
DEVICES_API_URL = f"{BACKEND_URL}/api/devices"
SETTINGS_API_URL = f"{BACKEND_URL}/api/settings"
DEVICE_REFRESH_INTERVAL = int(os.environ.get("NMS_DEVICE_REFRESH_INTERVAL", "30"))


previous_status = {}
previous_tcp_status = {}


def load_devices():
    """
    Load devices from local config/devices.json.
    Preserved for backward-compatibility, fallback, and unit tests.
    """
    config_path = "config/devices.json"

    with open(config_path, "r") as file:
        devices = json.load(file)

    if not isinstance(devices, list):
        raise ValueError("Device configuration must be a list")

    required_fields = ["name", "host", "type", "tcp_port"]

    for device in devices:
        if not isinstance(device, dict):
           raise ValueError("Each device must be a JSON object")

        for field in required_fields:
           if field not in device:
             raise ValueError(f"Missing field '{field}' in device configuration")

        for field in ["name", "host", "type"]:
           if not isinstance(device[field], str) or not device[field].strip():
             raise ValueError(f"'{field}' must be a non-empty string")

        if (not isinstance(device["tcp_port"], int) or isinstance(device["tcp_port"], bool) or not (1 <= device["tcp_port"] <= 65535)):
             raise ValueError("TCP port must be an integer between 1 and 65535")

    return devices


def validate_device(device):
    """
    Validate that a device object has all required fields and valid types.
    Returns True if valid, False otherwise.
    """
    if not isinstance(device, dict):
        return False

    required_fields = ["name", "host", "type", "tcp_port"]
    for field in required_fields:
        if field not in device:
            return False

    for field in ["name", "host", "type"]:
        val = device.get(field)
        if not isinstance(val, str) or not val.strip():
            return False

    port = device.get("tcp_port")
    if not isinstance(port, int) or isinstance(port, bool) or not (1 <= port <= 65535):
        return False

    return True


def fetch_devices_from_api(api_url=None, timeout=5):
    """
    Fetch device list from the backend REST API (MongoDB single source of truth).
    Returns a list of validated, deduplicated device dicts if successful,
    or None if the API call fails (retaining last known device list).
    """
    url = api_url or DEVICES_API_URL
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            raw_devices = data.get("data", []) if isinstance(data, dict) else data
            if isinstance(raw_devices, list):
                valid_devices = []
                seen_keys = set()
                for d in raw_devices:
                    if validate_device(d):
                        key = f"{d['host'].strip()}:{d['tcp_port']}"
                        if key not in seen_keys:
                            seen_keys.add(key)
                            valid_devices.append({
                                "_id": str(d.get("_id", "")),
                                "name": d["name"].strip(),
                                "host": d["host"].strip(),
                                "type": d["type"].strip(),
                                "tcp_port": int(d["tcp_port"]),
                            })
                    else:
                        print(f"Warning: Skipping invalid device from API: {d}")
                return valid_devices
            else:
                print(f"Warning: Unexpected API response format: {type(raw_devices)}")
                return None
        else:
            print(f"Warning: Backend returned status {response.status_code} while fetching devices")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Warning: Could not fetch devices from backend: {e}")
        return None
    except Exception as e:
        print(f"Warning: Unexpected error fetching devices from backend: {e}")
        return None


def update_devices_from_backend():
    """
    Attempt to refresh the global devices list from the backend API (MongoDB).
    If the backend is unreachable or returns None, preserves the current devices list.
    """
    global devices
    api_devices = fetch_devices_from_api()
    if api_devices is not None:
        devices = api_devices
        print(f"[Device Sync] Loaded {len(devices)} active device(s) from MongoDB.")
        return True
    else:
        print(f"[Device Sync] Backend unavailable; retaining current {len(devices)} device(s).")
        return False


def fetch_settings_from_api(api_url=None, timeout=5):
    """
    Fetch monitoring thresholds from the backend REST API.
    Returns dict with latency_threshold and packet_loss_threshold, or None on failure.
    """
    url = api_url or SETTINGS_API_URL
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            raw = data.get("data", {}) if isinstance(data, dict) else data
            if isinstance(raw, dict):
                lat = raw.get("latency_threshold")
                loss = raw.get("packet_loss_threshold")
                if isinstance(lat, (int, float)) and lat > 0 and isinstance(loss, (int, float)) and 0 <= loss <= 100:
                    return {
                        "latency_threshold": lat,
                        "packet_loss_threshold": loss,
                    }
        return None
    except Exception as e:
        print(f"Warning: Could not fetch settings from backend: {e}")
        return None


def update_settings_from_backend():
    """
    Attempt to refresh global threshold settings from backend API.
    """
    global settings
    api_settings = fetch_settings_from_api()
    if api_settings is not None:
        settings.update(api_settings)
        print(f"[Settings Sync] Applied thresholds from MongoDB: Latency={settings['latency_threshold']}ms, Packet Loss={settings['packet_loss_threshold']}%")
        return True
    return False


def load_settings():
    config_path = "config/settings.json"

    with open(config_path, "r") as file:
        settings = json.load(file)

    if not isinstance(settings, dict):
        raise ValueError("Settings configuration must be a JSON object")

    required_fields = ["latency_threshold", "packet_loss_threshold"]

    for field in required_fields:
      if field not in settings:
        raise ValueError(f"Missing setting: {field}")
    
    for field in required_fields:
      if not isinstance(settings[field], (int, float)) or isinstance(settings[field], bool):
        raise ValueError(f"'{field}' must be a number")
    
    if settings["latency_threshold"] <= 0:
        raise ValueError("Latency threshold must be greater than 0")
    
    if not (0 <= settings["packet_loss_threshold"] <= 100):
        raise ValueError("Packet loss threshold must be between 0 and 100")

    return settings


# Initial devices and settings loaded from local config as baseline/fallback
settings = load_settings()
devices = load_devices()


def check_host(host):
    print(f"\nChecking {host}...")
    latency = None
    packet_loss = None
    received = 0
    status = None
    fault = None
    try:
        result = subprocess.run(
            ["ping", "-n", "4", host],
            capture_output=True,
            text=True,
            timeout=10
        )

        if (result.returncode == 0 and "Destination net unreachable" not in result.stdout and "Request timed out" not in result.stdout):
            track_recovery(host, "UP")
            status = "UP"
            received_match = re.search(r"Received = (\d+)", result.stdout)
            loss_match = re.search(r"\((\d+)% loss\)", result.stdout)
            latency_match = re.search(r"Average\s*=\s*(\d+)\s*ms",result.stdout,re.IGNORECASE)

            print(f"Status: {status}")

            if received_match and loss_match:
                received = int(received_match.group(1))
                packet_loss = int(loss_match.group(1))

                print(f"Packets received: {received}/4")
                print(f"Packet loss: {packet_loss}%")

            if latency_match:
                latency = int(latency_match.group(1))
                print(f"Average latency: {latency} ms")
            else:
                print("Average latency: Could not determine")

            fault = detect_fault(
                "UP",
                latency if latency_match else None,
                packet_loss if loss_match else None,
                latency_threshold=settings["latency_threshold"],
                packet_loss_threshold=settings["packet_loss_threshold"]
            )

            print(f"Fault: {fault}")

            return {
                "host": host,
                "status": status,
                "latency": latency,
                "packet_loss": packet_loss,
                "received": received,
                "fault": fault
            }

        else:
            track_recovery(host, "DOWN")

            status = "DOWN"
            packet_loss = 100

            print(f"Status: {status}")
            print(f"Packet loss: {packet_loss}%")            

            fault = detect_fault("DOWN")
            print(f"Fault: {fault}")

            return {
                "host": host,
                "status": status,
                "latency": latency,
                "packet_loss": packet_loss,
                "received": received,
                "fault": fault
            }
                        
    except subprocess.TimeoutExpired:
        track_recovery(host, "TIMEOUT")

        status = "TIMEOUT"
        packet_loss = 100

        print(f"Status: {status}")
        print(f"Packet loss: {packet_loss}%")

        fault = detect_fault("TIMEOUT")
        print(f"Fault: {fault}")

        return {
            "host": host,
            "status": status,
            "latency": latency,
            "packet_loss": packet_loss,
            "received": received,
            "fault": fault
        }


def detect_fault(status, latency=None, packet_loss=None,
                 latency_threshold=200, packet_loss_threshold=20):

    if status == "DOWN":
        return "Connectivity Fault"

    if status == "TIMEOUT":
        return "Timeout Fault"

    if packet_loss is not None and packet_loss > packet_loss_threshold:
       return "High Packet Loss"

    if latency is not None and latency > latency_threshold:
        return "High Latency"

    return "No Fault"  


def track_recovery(host, current_status):
    if host in previous_status:
        old_status = previous_status[host]

        if old_status != "UP" and current_status == "UP":
            print(f"FAULT RECOVERED: {host}")

    previous_status[host] = current_status   


def track_tcp_recovery(host, port, current_status):
    key = f"{host}:{port}"

    if key in previous_tcp_status:
        old_status = previous_tcp_status[key]

        if old_status != "OPEN" and current_status == "OPEN":
            print(f"TCP FAULT RECOVERED: {key}")

    previous_tcp_status[key] = current_status 


def check_tcp_port(host, port):
    try:
        with socket.create_connection((host, port), timeout=3):
            print(f"TCP Port {port}: OPEN")
            track_tcp_recovery(host, port, "OPEN")
            return "OPEN"

    except socket.timeout:
        print(f"TCP Port {port}: TIMEOUT")
        track_tcp_recovery(host, port, "TIMEOUT")
        return "TIMEOUT"

    except ConnectionRefusedError:
        print(f"TCP Port {port}: CLOSED")
        track_tcp_recovery(host, port, "CLOSED")
        return "CLOSED"

    except OSError as error:
        print(f"TCP Port {port}: UNREACHABLE ({error})")
        track_tcp_recovery(host, port, "UNREACHABLE")
        return "UNREACHABLE"


def detect_tcp_fault(tcp_status):
    if tcp_status == "CLOSED":
        return "Service Unavailable"

    if tcp_status == "TIMEOUT":
        return "Service Timeout"

    if tcp_status == "UNREACHABLE":
        return "Network Unreachable"

    return "No Fault"


def monitor_all_devices(target_devices=None):
    device_list = target_devices if target_devices is not None else devices
    results = []

    if not device_list:
        print("\nNo devices configured for monitoring.")
        return results

    for device in device_list:
        name = device["name"]
        host = device["host"]
        device_type = device["type"]
        port = device["tcp_port"]

        print(f"\nDevice: {name}")
        print(f"Type: {device_type}")
        print(f"IP Address: {host}")

        ping_result = check_host(host)

        ping_result["name"] = name
        ping_result["type"] = device_type

        print("\n--- TCP Port Monitoring ---")
        tcp_status = check_tcp_port(host, port)

        tcp_fault = detect_tcp_fault(tcp_status)
        print(f"TCP Fault: {tcp_fault}")

        ping_result["tcp_port"] = port
        ping_result["tcp_status"] = tcp_status
        ping_result["tcp_fault"] = tcp_fault

        save_monitoring_result(ping_result)

        results.append(ping_result)

    return results


def main():
    global devices
    print("\n===== NMS Network Monitoring Engine Started =====")
    print(f"Backend API URL: {DEVICES_API_URL}")
    print(f"Settings API URL: {SETTINGS_API_URL}")
    print(f"Device Refresh Interval: {DEVICE_REFRESH_INTERVAL}s")

    # Initial device & settings synchronization from MongoDB
    update_devices_from_backend()
    update_settings_from_backend()
    last_device_refresh = time.time()

    while True:
        # Check if it is time to refresh device list & settings from MongoDB
        current_time = time.time()
        if current_time - last_device_refresh >= DEVICE_REFRESH_INTERVAL:
            print("\n[Sync Cycle] Refreshing device inventory and settings from MongoDB backend...")
            update_devices_from_backend()
            update_settings_from_backend()
            last_device_refresh = current_time

        print("\n===== Network Monitoring =====")

        results = monitor_all_devices()

        # Send results to backend (lazy import to avoid affecting tests)
        if results:
            try:
                from monitor.reporter import send_all_results
                report = send_all_results(results)
                print(f"Backend sync: {report['sent']} sent, {report['failed']} failed")
            except ImportError:
                pass

        print("\n===== Collected Ping Results =====")
        print(results)

        print("\nWaiting 5 seconds before next check...")
        time.sleep(5)


if __name__ == "__main__":
    main()

