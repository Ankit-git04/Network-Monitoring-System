import unittest
from unittest.mock import patch, MagicMock
import requests
from monitor import ping_monitor


class TestDeviceSync(unittest.TestCase):

    def test_validate_device_valid(self):
        dev = {"name": "Google DNS", "host": "8.8.8.8", "type": "DNS Server", "tcp_port": 443}
        self.assertTrue(ping_monitor.validate_device(dev))

    def test_validate_device_missing_field(self):
        dev = {"name": "Google DNS", "host": "8.8.8.8", "type": "DNS Server"}
        self.assertFalse(ping_monitor.validate_device(dev))

    def test_validate_device_empty_string(self):
        dev = {"name": "", "host": "8.8.8.8", "type": "DNS Server", "tcp_port": 443}
        self.assertFalse(ping_monitor.validate_device(dev))

    def test_validate_device_invalid_port_range(self):
        dev_low = {"name": "Test", "host": "1.1.1.1", "type": "DNS", "tcp_port": 0}
        dev_high = {"name": "Test", "host": "1.1.1.1", "type": "DNS", "tcp_port": 70000}
        dev_bool = {"name": "Test", "host": "1.1.1.1", "type": "DNS", "tcp_port": True}
        self.assertFalse(ping_monitor.validate_device(dev_low))
        self.assertFalse(ping_monitor.validate_device(dev_high))
        self.assertFalse(ping_monitor.validate_device(dev_bool))

    @patch("monitor.ping_monitor.requests.get")
    def test_fetch_devices_from_api_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": True,
            "data": [
                {"name": "Google DNS", "host": "8.8.8.8", "type": "DNS Server", "tcp_port": 443},
                {"name": "Cloudflare DNS", "host": "1.1.1.1", "type": "DNS Server", "tcp_port": 443},
                # Duplicate host:port should be deduplicated
                {"name": "Google Duplicate", "host": "8.8.8.8", "type": "DNS Server", "tcp_port": 443},
                # Invalid device should be skipped
                {"name": "Invalid", "host": "", "type": "Server", "tcp_port": 80}
            ]
        }
        mock_get.return_value = mock_response

        devices = ping_monitor.fetch_devices_from_api()
        self.assertIsNotNone(devices)
        self.assertEqual(len(devices), 2)
        self.assertEqual(devices[0]["host"], "8.8.8.8")
        self.assertEqual(devices[1]["host"], "1.1.1.1")

    @patch("monitor.ping_monitor.requests.get")
    def test_fetch_devices_from_api_http_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        devices = ping_monitor.fetch_devices_from_api()
        self.assertIsNone(devices)

    @patch("monitor.ping_monitor.requests.get")
    def test_fetch_devices_from_api_connection_error(self, mock_get):
        mock_get.side_effect = requests.exceptions.ConnectionError("Backend down")
        devices = ping_monitor.fetch_devices_from_api()
        self.assertIsNone(devices)

    @patch("monitor.ping_monitor.requests.get")
    def test_fetch_devices_from_api_timeout(self, mock_get):
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
        devices = ping_monitor.fetch_devices_from_api()
        self.assertIsNone(devices)

    @patch("monitor.ping_monitor.fetch_devices_from_api")
    def test_update_devices_from_backend_retains_on_failure(self, mock_fetch):
        mock_fetch.return_value = None  # simulate backend failure
        initial_devices = [{"name": "Fallback", "host": "127.0.0.1", "type": "Host", "tcp_port": 80}]
        
        with patch.object(ping_monitor, "devices", initial_devices):
            success = ping_monitor.update_devices_from_backend()
            self.assertFalse(success)
            self.assertEqual(ping_monitor.devices, initial_devices)

    @patch("monitor.ping_monitor.fetch_devices_from_api")
    def test_update_devices_from_backend_updates_on_success(self, mock_fetch):
        new_devices = [{"name": "New Server", "host": "10.0.0.1", "type": "Server", "tcp_port": 8080}]
        mock_fetch.return_value = new_devices

        with patch.object(ping_monitor, "devices", []):
            success = ping_monitor.update_devices_from_backend()
            self.assertTrue(success)
            self.assertEqual(ping_monitor.devices, new_devices)

    def test_monitor_all_devices_empty_list(self):
        results = ping_monitor.monitor_all_devices(target_devices=[])
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()

