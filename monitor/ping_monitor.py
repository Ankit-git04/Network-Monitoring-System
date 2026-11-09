import subprocess
import re
import time

hosts = [
    "8.8.8.8",
    "1.1.1.1"
]
previous_status = {}

def check_host(host):
    print(f"\nChecking {host}...")
    try:
        result = subprocess.run(
            ["ping", "-n", "4", host],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            track_recovery(host, "UP")
            received_match = re.search(r"Received = (\d+)", result.stdout)
            loss_match = re.search(r"\((\d+)% loss\)", result.stdout)
            latency_match = re.search(r"Average = (\d+)ms", result.stdout)

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
            packet_loss if loss_match else None
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

def detect_fault(status, latency=None, packet_loss=None):
    if status == "DOWN":
        return "Connectivity Fault"

    if status == "TIMEOUT":
        return "Timeout Fault"

    if packet_loss is not None and packet_loss > 20:
        return "High Packet Loss"

    if latency is not None and latency > 200:
        return "High Latency"

    return "No Fault"  

def track_recovery(host, current_status):
    if host in previous_status:
        old_status = previous_status[host]

        if old_status != "UP" and current_status == "UP":
            print(f"FAULT RECOVERED: {host}")

    previous_status[host] = current_status     

def main():
    while True:
        print("\n===== Network Monitoring =====")
        for host in hosts:
            check_host(host)

        print("\nWaiting 5 seconds before next check...")
        time.sleep(5)

if __name__ == "__main__":
    main()