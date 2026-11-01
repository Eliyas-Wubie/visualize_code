"""Send bounded local profiling messages without changing application stdout or stderr."""
import json
import os
import socket
import threading


class Transport:
    """Connect to the extension's authenticated local pipe or Unix socket."""

    def __init__(self):
        """Open the configured local endpoint; missing configuration or connection failure raises."""
        self.token = os.environ['VISUALIZE_TOKEN']
        self.lock = threading.Lock()
        self.closed = False
        endpoint = os.environ['VISUALIZE_ENDPOINT']
        if os.name == 'nt':
            self.connection = open(endpoint, 'wb', buffering=0)
            self.write = self.connection.write
        else:
            self.connection = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.connection.connect(endpoint)
            self.write = self.connection.sendall

    def send(self, message):
        """Transmit one record; disconnects disable telemetry without stopping user code."""
        message['token'] = self.token
        data = (json.dumps(message, ensure_ascii=True) + '\n').encode('utf8')
        with self.lock:
            if not self.closed:
                try:
                    self.write(data)
                except (OSError, ValueError):
                    self.closed = True

    def close(self):
        """Close the local transport at application exit."""
        with self.lock:
            self.closed = True
            self.connection.close()
