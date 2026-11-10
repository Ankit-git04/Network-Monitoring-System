import unittest
from unittest.mock import patch, MagicMock
import subprocess
from monitor import ping_monitor
import socket
from monitor.ping_monitor import track_tcp_recovery, previous_tcp_status

class TestPingMonitor(unittest.TestCase):

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_up(self, mock_run):
        # Mock successful ping response
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "Received = 4, (0% loss), Average = 10ms"
        mock_run.return_value = mock_result

        result = ping_monitor.check_host("8.8.8.8")
        self.assertEqual(result["status"], "UP")
        self.assertEqual(result["latency"], 10)
        self.assertEqual(result["packet_loss"], 0)
        self.assertEqual(result["received"], 4)
        self.assertEqual(result["fault"], "No Fault")
        mock_run.assert_called_with(["ping", "-n", "4", "8.8.8.8"], capture_output=True, text=True, timeout=10)

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_down(self, mock_run):
        # Mock failed ping response
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ""
        mock_run.return_value = mock_result

        result = ping_monitor.check_host("192.168.1.99")

        self.assertEqual(result["status"], "DOWN")
        self.assertIsNone(result["latency"])
        self.assertEqual(result["packet_loss"], 100)
        self.assertEqual(result["received"], 0)
        self.assertEqual(result["fault"], "Connectivity Fault")

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_timeout(self, mock_run):
        # Mock timeout
        mock_run.side_effect = subprocess.TimeoutExpired(cmd=["ping"], timeout=10)

        result = ping_monitor.check_host("192.168.1.99")

        self.assertEqual(result["status"], "TIMEOUT")
        self.assertIsNone(result["latency"])
        self.assertEqual(result["packet_loss"], 100)
        self.assertEqual(result["received"], 0)
        self.assertEqual(result["fault"], "Timeout Fault")


    def test_detect_fault_no_fault(self):
     self.assertEqual(
        ping_monitor.detect_fault("UP", 50, 0),
        "No Fault"
    )

    def test_detect_fault_high_latency(self):
        self.assertEqual(
            ping_monitor.detect_fault("UP", 250, 0),
            "High Latency"
        )

    def test_detect_fault_high_packet_loss(self):
      self.assertEqual(
        ping_monitor.detect_fault("UP", 50, 30),
        "High Packet Loss"
    )

    def test_detect_fault_down(self):
        self.assertEqual(
        ping_monitor.detect_fault("DOWN"),
        "Connectivity Fault"
    )

    def test_detect_fault_timeout(self):
        self.assertEqual(
        ping_monitor.detect_fault("TIMEOUT"),
        "Timeout Fault"
    )

    @patch('monitor.ping_monitor.socket.create_connection')
    def test_check_tcp_port_open(self, mock_connection):
        mock_connection.return_value.__enter__.return_value = MagicMock()

        result = ping_monitor.check_tcp_port("google.com", 443)

        self.assertEqual(result, "OPEN")

    @patch('monitor.ping_monitor.socket.create_connection')
    def test_check_tcp_port_closed(self, mock_connection):
        mock_connection.side_effect = ConnectionRefusedError

        result = ping_monitor.check_tcp_port("127.0.0.1", 81)

        self.assertEqual(result, "CLOSED")

    @patch('monitor.ping_monitor.socket.create_connection')
    def test_check_tcp_port_timeout(self, mock_connection):
        mock_connection.side_effect = socket.timeout

        result = ping_monitor.check_tcp_port("server", 22)

        self.assertEqual(result, "TIMEOUT")

    @patch('monitor.ping_monitor.socket.create_connection')
    def test_check_tcp_port_unreachable(self, mock_connection):
        mock_connection.side_effect = OSError("Network is unreachable")

        result = ping_monitor.check_tcp_port("192.168.1.99", 443)

        self.assertEqual(result, "UNREACHABLE")

    def test_detect_tcp_fault_closed(self):
        self.assertEqual(
            ping_monitor.detect_tcp_fault("CLOSED"),
            "Service Unavailable"
        )

    def test_detect_tcp_fault_timeout(self):
        self.assertEqual(
            ping_monitor.detect_tcp_fault("TIMEOUT"),
            "Service Timeout"
        )

    def test_detect_tcp_fault_unreachable(self):
        self.assertEqual(
            ping_monitor.detect_tcp_fault("UNREACHABLE"),
            "Network Unreachable"
        )

    def test_tcp_recovery_closed_to_open(self):
        previous_tcp_status.clear()

        track_tcp_recovery("google.com", 443, "CLOSED")
        track_tcp_recovery("google.com", 443, "OPEN")

        self.assertEqual(
            previous_tcp_status["google.com:443"],
            "OPEN"
        )

    def test_tcp_recovery_remains_closed(self):
        previous_tcp_status.clear()

        track_tcp_recovery("google.com", 443, "CLOSED")
        track_tcp_recovery("google.com", 443, "CLOSED")

        self.assertEqual(
            previous_tcp_status["google.com:443"],
            "CLOSED"
        )
    
    def test_load_settings_valid(self):
        settings = ping_monitor.load_settings()

        self.assertEqual(settings["latency_threshold"], 200)
        self.assertEqual(settings["packet_loss_threshold"], 20)

    @patch("monitor.ping_monitor.json.load")
    def test_load_settings_missing_key(self, mock_json_load):
        mock_json_load.return_value = {
            "latency_threshold": 200
        }

        with self.assertRaisesRegex(ValueError, "Missing setting"):
            ping_monitor.load_settings()

    @patch("monitor.ping_monitor.json.load")
    def test_load_settings_invalid_type(self, mock_json_load):
        mock_json_load.return_value = {
            "latency_threshold": "200",
            "packet_loss_threshold": 20
        }

        with self.assertRaisesRegex(ValueError, "must be a number"):
            ping_monitor.load_settings()


    @patch("monitor.ping_monitor.json.load")
    def test_load_settings_invalid_latency(self, mock_json_load):
        mock_json_load.return_value = {
            "latency_threshold": 0,
            "packet_loss_threshold": 20
        }

        with self.assertRaisesRegex(ValueError, "Latency threshold"):
            ping_monitor.load_settings() 

    @patch("monitor.ping_monitor.json.load")
    def test_load_settings_invalid_packet_loss(self, mock_json_load):
        mock_json_load.return_value = {
            "latency_threshold": 200,
            "packet_loss_threshold": 101
        }

        with self.assertRaisesRegex(ValueError, "Packet loss threshold"):
            ping_monitor.load_settings()

    @patch("monitor.ping_monitor.json.load")
    def test_load_settings_invalid_structure(self, mock_json_load):
        mock_json_load.return_value = [200, 20]

        with self.assertRaisesRegex(ValueError, "Settings configuration must be a JSON object"):
            ping_monitor.load_settings()
    
    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_invalid_structure(self, mock_json_load):
        mock_json_load.return_value = {"name": "Google DNS"}

        with self.assertRaisesRegex(ValueError, "Device configuration must be a list"):
            ping_monitor.load_devices() 

    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_missing_field(self, mock_json_load):
        mock_json_load.return_value = [
            {
                "name": "Google DNS",
                "host": "8.8.8.8",
                "type": "DNS Server"
            }
        ]

        with self.assertRaisesRegex(ValueError, "Missing field"):
            ping_monitor.load_devices()

    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_invalid_field_type(self, mock_json_load):
        mock_json_load.return_value = [
            {
                "name": 123,
                "host": "8.8.8.8",
                "type": "DNS Server",
                "tcp_port": 443
            }
        ]

        with self.assertRaisesRegex(ValueError, "name.*non-empty string"):
            ping_monitor.load_devices()

    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_empty_host(self, mock_json_load):
        mock_json_load.return_value = [
            {
                "name": "Google DNS",
                "host": "",
                "type": "DNS Server",
                "tcp_port": 443
            }
        ]

        with self.assertRaisesRegex(ValueError, "host.*non-empty string"):
            ping_monitor.load_devices()

    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_invalid_port(self, mock_json_load):
        mock_json_load.return_value = [
            {
                "name": "Google DNS",
                "host": "8.8.8.8",
                "type": "DNS Server",
                "tcp_port": 70000
            }
        ]

        with self.assertRaisesRegex(ValueError, "TCP port"):
            ping_monitor.load_devices()

    @patch("monitor.ping_monitor.json.load")
    def test_load_devices_boolean_port(self, mock_json_load):
        mock_json_load.return_value = [
            {
                "name": "Google DNS",
                "host": "8.8.8.8",
                "type": "DNS Server",
                "tcp_port": True
            }
        ]

        with self.assertRaisesRegex(ValueError, "TCP port"):
            ping_monitor.load_devices()


    
    @patch("monitor.ping_monitor.check_tcp_port")
    @patch("monitor.ping_monitor.check_host")
    def test_monitor_all_devices(self, mock_check_host, mock_check_tcp_port):

        mock_devices = [
            {
                "name": "Google DNS",
                "host": "8.8.8.8",
                "type": "DNS Server",
                "tcp_port": 443
            },
            {
                "name": "Cloudflare DNS",
                "host": "1.1.1.1",
                "type": "DNS Server",
                "tcp_port": 443
            }
        ]

        mock_check_host.side_effect = [
            {
                "host": "8.8.8.8",
                "status": "UP",
                "latency": 10,
                "packet_loss": 0,
                "received": 4,
                "fault": "No Fault"
            },
            {
                "host": "1.1.1.1",
                "status": "UP",
                "latency": 20,
                "packet_loss": 0,
                "received": 4,
                "fault": "No Fault"
            }
        ]

        mock_check_tcp_port.side_effect = ["OPEN", "CLOSED"]

        with patch.object(ping_monitor, "devices", mock_devices):
            results = ping_monitor.monitor_all_devices()

        self.assertEqual(len(results), 2)

        self.assertEqual(results[0]["name"], "Google DNS")
        self.assertEqual(results[0]["tcp_status"], "OPEN")
        self.assertEqual(results[0]["tcp_fault"], "No Fault")

        self.assertEqual(results[1]["name"], "Cloudflare DNS")
        self.assertEqual(results[1]["tcp_status"], "CLOSED")
        self.assertEqual(results[1]["tcp_fault"], "Service Unavailable")



if __name__ == '__main__':
    unittest.main()
