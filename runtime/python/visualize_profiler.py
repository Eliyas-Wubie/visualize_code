"""Collect Python frame-entry counts and approximate workspace self elapsed time."""
import pathlib
import linecache
import sys
import threading
import time


class Profiler:
    """Profile source under the workspace; preserve any existing profiling callback."""

    def __init__(self, root, transport):
        """Store the workspace boundary and sender; do not install hooks until start is called."""
        self.root = pathlib.Path(root).resolve()
        self.internal = pathlib.Path(__file__).parent.resolve()
        self.transport = transport
        self.rows = {}
        self.stacks = {}
        self.locations = {}
        self.lock = threading.RLock()
        self.done = threading.Event()
        self.previous = sys.getprofile()
        self.thread_previous = threading.getprofile()
        self.main_thread = threading.get_ident()

    def location(self, filename, line):
        """Return a workspace source location, excluding the profiler and synthetic files."""
        key = (filename, line)
        if key not in self.locations:
            path = pathlib.Path(filename).resolve()
            text = linecache.getline(filename, line)
            column = len(text) - len(text.lstrip())
            self.locations[key] = (path.as_uri(), line - 1, column) if path.is_relative_to(self.root) and not path.is_relative_to(self.internal) else None
        return self.locations[key]

    def profile(self, frame, event, arg):
        """Count Python call entries and subtract child frame duration on returns."""
        previous = self.previous if threading.get_ident() == self.main_thread else self.thread_previous
        if previous:
            previous(frame, event, arg)
        if self.done.is_set() or event not in ('call', 'return') or frame.f_code.co_name.startswith('<'):
            return
        source = self.location(frame.f_code.co_filename, frame.f_code.co_firstlineno)
        if not source:
            return
        now = time.perf_counter_ns()
        thread = threading.get_ident()
        with self.lock:
            stack = self.stacks.setdefault(thread, [])
            if event == 'call':
                if source not in self.rows and len(self.rows) >= 10000:
                    return
                row = self.rows.setdefault(source, [0, 0.0])
                row[0] += 1
                stack.append([frame, source, now, 0])
            elif stack and stack[-1][0] is frame:
                _, key, started, child = stack.pop()
                elapsed = now - started
                self.rows[key][1] += max(0, elapsed - child) / 1000000
                if stack:
                    stack[-1][3] += elapsed

    def flush(self):
        """Send metric deltas without retaining application frames in the host."""
        with self.lock:
            records = [{'uri': uri, 'position': {'line': line, 'character': column}, 'calls': row[0], 'cpuMs': row[1]}
                       for (uri, line, column), row in self.rows.items() if row[0] or row[1]]
            for row in self.rows.values():
                row[:] = [0, 0.0]
        self.transport.send({'type': 'metrics', 'records': records})

    def start(self):
        """Install profiling and a daemon sender; coroutine resumes count as entries."""
        def pump():
            """Publish deltas until shutdown without extending the application's lifetime."""
            while not self.done.wait(0.5):
                self.flush()
        threading.Thread(target=pump, daemon=True).start()
        threading.setprofile(self.profile)
        sys.setprofile(self.profile)

    def stop(self):
        """Restore profiling hooks and publish final metrics without keeping the app running."""
        sys.setprofile(self.previous)
        threading.setprofile(self.thread_previous)
        self.done.set()
        self.flush()
        self.stacks.clear()
