import unittest
from unittest.mock import patch, MagicMock
import subprocess
from monitor import ping_monitor

class TestPingMonitor(unittest.TestCase):

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_up(self, mock_run):
        # Mock successful ping response
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "Received = 4, (0% loss), Average = 10ms"
        mock_run.return_value = mock_result

        result = ping_monitor.check_host("8.8.8.8")
        self.assertTrue(result)
        mock_run.assert_called_with(["ping", "-n", "4", "8.8.8.8"], capture_output=True, text=True, timeout=10)

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_down(self, mock_run):
        # Mock failed ping response
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_run.return_value = mock_result

        result = ping_monitor.check_host("192.168.1.99")
        self.assertFalse(result)

    @patch('monitor.ping_monitor.subprocess.run')
    def test_check_host_timeout(self, mock_run):
        # Mock timeout
        mock_run.side_effect = subprocess.TimeoutExpired(cmd=["ping"], timeout=10)

        result = ping_monitor.check_host("192.168.1.99")
        self.assertFalse(result)

if __name__ == '__main__':
    unittest.main()
