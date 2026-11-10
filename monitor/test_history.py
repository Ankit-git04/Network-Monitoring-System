
import json
import os
import tempfile
import unittest
from unittest.mock import patch

from monitor import history


class TestMonitoringHistory(unittest.TestCase):

    def setUp(self):
        # Create a temporary directory for test history
        self.temp_dir = tempfile.TemporaryDirectory()
        self.history_file = os.path.join(
            self.temp_dir.name, "monitoring_history.jsonl"
        )

        # Redirect history operations to the temporary file
        self.file_patcher = patch.object(
            history, "HISTORY_FILE", self.history_file
        )
        self.file_patcher.start()

    def tearDown(self):
        self.file_patcher.stop()
        self.temp_dir.cleanup()

    # Test 1: Save monitoring result
    def test_save_monitoring_result(self):
        result = {
            "host": "8.8.8.8",
            "status": "UP",
            "latency": 50,
            "packet_loss": 0
        }

        history.save_monitoring_result(result)

        self.assertTrue(os.path.exists(self.history_file))

        with open(self.history_file, "r") as file:
            saved_record = json.loads(file.readline())

        self.assertEqual(saved_record["host"], "8.8.8.8")
        self.assertEqual(saved_record["status"], "UP")
        self.assertEqual(saved_record["latency"], 50)
        self.assertIn("timestamp", saved_record)

    # Test 2: Load monitoring history
    def test_load_monitoring_history(self):
        sample_records = [
            {
                "host": "8.8.8.8",
                "status": "UP",
                "latency": 50
            },
            {
                "host": "1.1.1.1",
                "status": "UP",
                "latency": 40
            }
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        records = history.load_monitoring_history()

        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["host"], "8.8.8.8")
        self.assertEqual(records[1]["host"], "1.1.1.1")

    # Test 3: Load history when file does not exist
    def test_load_monitoring_history_file_missing(self):
        records = history.load_monitoring_history()

        self.assertEqual(records, [])

    # Test 4: Filter history by device
    def test_get_device_history(self):
        sample_records = [
            {"host": "8.8.8.8", "status": "UP"},
            {"host": "1.1.1.1", "status": "UP"},
            {"host": "8.8.8.8", "status": "DOWN"}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        records = history.get_device_history("8.8.8.8")

        self.assertEqual(len(records), 2)

        for record in records:
            self.assertEqual(record["host"], "8.8.8.8")

    # Test 5: Calculate average latency
    def test_calculate_average_latency(self):
        sample_records = [
            {"host": "8.8.8.8", "latency": 50},
            {"host": "8.8.8.8", "latency": 30},
            {"host": "8.8.8.8", "latency": 40}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_latency("8.8.8.8")

        self.assertEqual(average, 40)

    # Test 6: Ignore missing latency values
    def test_average_latency_ignores_none(self):
        sample_records = [
            {"host": "8.8.8.8", "latency": 50},
            {"host": "8.8.8.8", "latency": None},
            {"host": "8.8.8.8", "latency": 30}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_latency("8.8.8.8")

        self.assertEqual(average, 40)

    # Test 7: Average latency when no valid values exist
    def test_average_latency_no_values(self):
        sample_records = [
            {"host": "8.8.8.8", "latency": None},
            {"host": "8.8.8.8", "latency": None}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_latency("8.8.8.8")

        self.assertIsNone(average)

    # Test 8: Count UP and DOWN events
    def test_get_device_status_count(self):
        sample_records = [
            {"host": "8.8.8.8", "status": "UP"},
            {"host": "8.8.8.8", "status": "UP"},
            {"host": "8.8.8.8", "status": "DOWN"},
            {"host": "8.8.8.8", "status": "TIMEOUT"}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        counts = history.get_device_status_count("8.8.8.8")

        self.assertEqual(counts["UP"], 2)
        self.assertEqual(counts["DOWN"], 2)

    # Test 9: Status count when no records exist
    def test_get_device_status_count_empty(self):
        counts = history.get_device_status_count("8.8.8.8")

        self.assertEqual(counts["UP"], 0)
        self.assertEqual(counts["DOWN"], 0)




    def test_calculate_device_availability(self):
     sample_records = [
        {"host": "8.8.8.8", "status": "UP"},
        {"host": "8.8.8.8", "status": "UP"},
        {"host": "8.8.8.8", "status": "UP"},
        {"host": "8.8.8.8", "status": "DOWN"}
     ]

     with open(self.history_file, "w") as file:
        for record in sample_records:
            file.write(json.dumps(record) + "\n")

     availability = history.calculate_device_availability("8.8.8.8")

     self.assertEqual(availability, 75.0)


    def test_calculate_device_availability_empty(self):
     availability = history.calculate_device_availability("10.0.0.1")

     self.assertEqual(availability, 0)


    def test_calculate_average_packet_loss(self):
        sample_records = [
            {"host": "8.8.8.8", "packet_loss": 0},
            {"host": "8.8.8.8", "packet_loss": 20},
            {"host": "8.8.8.8", "packet_loss": 10}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_packet_loss("8.8.8.8")

        self.assertEqual(average, 10.0)


    def test_average_packet_loss_ignores_none(self):
        sample_records = [
            {"host": "8.8.8.8", "packet_loss": 20},
            {"host": "8.8.8.8", "packet_loss": None},
            {"host": "8.8.8.8", "packet_loss": 40}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_packet_loss("8.8.8.8")

        self.assertEqual(average, 30.0)

    def test_average_packet_loss_no_values(self):
        sample_records = [
            {"host": "8.8.8.8", "packet_loss": None},
            {"host": "8.8.8.8", "packet_loss": None}
        ]

        with open(self.history_file, "w") as file:
            for record in sample_records:
                file.write(json.dumps(record) + "\n")

        average = history.calculate_average_packet_loss("8.8.8.8")

        self.assertIsNone(average)

        


if __name__ == "__main__":
    unittest.main()
