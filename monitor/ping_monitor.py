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

    if received_match and loss_match:
        received = int(received_match.group(1))
        packet_loss = int(loss_match.group(1))

        print(f"{host} is UP")
        print(f"Packets received: {received}/4")
        print(f"Packet loss: {packet_loss}%")
    else:
        print(f"{host} is UP")
        print("Packet loss: Could not determine")
else:
    print(f"{host} is DOWN")
    print("Packet loss: 100%")