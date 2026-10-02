import subprocess
import re
import time

hosts = [
    "8.8.8.8",
    "1.1.1.1"
]

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
            
            return True

        else:
            print("Status: DOWN")
            print("Packet loss: 100%")
            return False
            
    except subprocess.TimeoutExpired:
        print("Status: TIMEOUT")
        print("Packet loss: 100%")
        return False

def main():
    while True:
        print("\n===== Network Monitoring =====")
        for host in hosts:
            check_host(host)

        print("\nWaiting 5 seconds before next check...")
        time.sleep(5)

if __name__ == "__main__":
    main()