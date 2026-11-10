import subprocess
import re
import time
import socket
import json


previous_status = {}
previous_tcp_status = {}


def load_devices():
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



settings = load_settings()
devices = load_devices()



def check_host(host):
    print(f"\nChecking {host}...")
    try:
        result = subprocess.run(
            ["ping", "-n", "4", host],
            capture_output=True,
            text=True,
            timeout=10
        )

        if (result.returncode == 0 and "Destination net unreachable" not in result.stdout and "Request timed out" not in result.stdout):
            track_recovery(host, "UP")
            received_match = re.search(r"Received = (\d+)", result.stdout)
            loss_match = re.search(r"\((\d+)% loss\)", result.stdout)
            latency_match = re.search(r"Average\s*=\s*(\d+)\s*ms",result.stdout,re.IGNORECASE)

            print("Status: UP")
            

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
            
            return True

        else:
            track_recovery(host, "DOWN")

            print("Status: DOWN")            
            print("Packet loss: 100%")            

            fault = detect_fault("DOWN")
            print(f"Fault: {fault}")

            return False
            
    except subprocess.TimeoutExpired:
        track_recovery(host, "TIMEOUT")

        print("Status: TIMEOUT")
        print("Packet loss: 100%")

        fault = detect_fault("TIMEOUT")
        print(f"Fault: {fault}")

        return False

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

def main():
    while True:
        print("\n===== Network Monitoring =====")

        for device in devices:
            name = device["name"]
            host = device["host"]
            device_type = device["type"]
            port = device["tcp_port"]

            print(f"\nDevice: {name}")    
            print(f"Type: {device_type}")
            print(f"IP Address: {host}")    

            check_host(host)

            print("\n--- TCP Port Monitoring ---")
            tcp_status = check_tcp_port(host, port)

            tcp_fault = detect_tcp_fault(tcp_status)
            print(f"TCP Fault: {tcp_fault}")

        print("\nWaiting 5 seconds before next check...")
        time.sleep(5)


if __name__ == "__main__":
    main()