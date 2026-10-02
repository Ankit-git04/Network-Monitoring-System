import subprocess

host = "8.8.8.8"

result = subprocess.run(
    ["ping", "-n", "1", host],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print(f"{host} is UP")
else:
    print(f"{host} is DOWN")