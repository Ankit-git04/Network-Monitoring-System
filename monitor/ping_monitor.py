import subprocess
import re

host = "8.8.8.8"

result = subprocess.run(
    ["ping", "-n", "1", host],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    match = re.search(r"time[=<](\d+)ms", result.stdout)

    if match:
        latency = int(match.group(1))
        print(f"{host} is UP")
        print(f"Latency: {latency} ms")
    else:
        print(f"{host} is UP")
        print("Latency: Could not determine")
else:
    print(f"{host} is DOWN")