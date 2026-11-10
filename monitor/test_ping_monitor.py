import unittest
from unittest.mock import patch, MagicMock
import subprocess
from monitor import ping_monitor
import socket

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

    

if __name__ == '__main__':
    unittest.main()
