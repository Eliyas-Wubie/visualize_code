"""Run a selected Python program/module with local profiling, preserving its arguments and errors."""
import os
import pathlib
import runpy
import sys
from visualize_logs import capture_logs
from visualize_profiler import Profiler
from visualize_transport import Transport


def main():
    """Execute the requested entry point; user exceptions keep their normal exit behavior."""
    mode, target = sys.argv[1:3]
    arguments = sys.argv[4:] if len(sys.argv) > 3 and sys.argv[3] == '--' else sys.argv[3:]
    sys.argv = [target, *arguments]
    sys.path[0] = str(pathlib.Path(target).resolve().parent) if mode == '--program' else os.getcwd()
    transport = Transport()
    profiler = Profiler(os.environ.get('VISUALIZE_ROOT', os.getcwd()), transport)
    restore, report_exception = capture_logs(profiler, transport)
    profiler.start()
    try:
        if mode == '--module':
            runpy.run_module(target, run_name='__main__', alter_sys=True)
        else:
            runpy.run_path(target, run_name='__main__')
    except BaseException as error:
        if not isinstance(error, (SystemExit, KeyboardInterrupt)):
            report_exception(error)
        raise
    finally:
        profiler.stop()
        restore()
        transport.close()


if __name__ == '__main__':
    main()
