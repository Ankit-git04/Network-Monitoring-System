import subprocess
import re

host = "8.8.8.8"

result = subprocess.run(
    ["ping", "-n", "4", host],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    received_match = re.search(r"Received = (\d+)", result.stdout)
    loss_match = re.search(r"\((\d+)% loss\)", result.stdout)
    latency_match = re.search(r"Average = (\d+)ms", result.stdout)

    print(f"{host} is UP")

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

else:
    print(f"{host} is DOWN")
    print("Packet loss: 100%")