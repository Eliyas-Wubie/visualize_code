"""Capture application print/logging/warning messages while retaining their original output."""
import builtins
import logging
import sys
import time
import traceback
import warnings


def capture_logs(profiler, transport):
    """Install bounded local log capture; return restoration and exception-report functions."""
    original_print = builtins.print
    original_warning = warnings.showwarning
    original_handlers = logging.Logger.callHandlers
    remaining = [500]

    def emit(level, text, filename, line):
        """Send a bounded, source-associated message without retaining application objects."""
        source = profiler.location(filename, line)
        if not source or remaining[0] <= 0:
            return
        remaining[0] -= 1
        transport.send({'type': 'log', 'level': level, 'text': text[:4000],
                        'uri': source[0], 'position': {'line': source[1], 'character': source[2]}, 'time': int(time.time() * 1000)})

    def printed(*args, **kwargs):
        """Preserve print output and report primitive text without repeating custom conversions."""
        result = original_print(*args, **kwargs)
        frame = sys._getframe(1)
        # Avoid invoking user-defined __str__ a second time; objects are represented by type.
        separator = kwargs.get('sep', ' ')
        text = (' ' if separator is None else separator).join(str(arg) if type(arg) in (str, int, float, bool, type(None))
                                             else '<' + type(arg).__name__ + '>' for arg in args)
        emit('error' if kwargs.get('file') is sys.stderr else 'info', text, frame.f_code.co_filename, frame.f_lineno)
        return result

    def handled(logger, record):
        """Preserve logger dispatch and forward its source location and severity."""
        original_handlers(logger, record)
        level = 'error' if record.levelno >= logging.ERROR else 'warning' if record.levelno >= logging.WARNING else 'info'
        emit(level, record.getMessage(), record.pathname, record.lineno)

    def warned(message, category, filename, lineno, file=None, line=None):
        """Keep the original warning display and associate the warning with its source."""
        original_warning(message, category, filename, lineno, file, line)
        emit('warning', str(message), filename, lineno)

    def exception(error):
        """Report an exception at its innermost workspace frame without swallowing it."""
        frames = traceback.extract_tb(error.__traceback__)
        for frame in reversed(frames):
            if profiler.location(frame.filename, frame.lineno):
                emit('error', ''.join(traceback.format_exception(error)), frame.filename, frame.lineno)
                break

    logging.Logger.callHandlers = handled
    builtins.print = printed
    warnings.showwarning = warned

    def restore():
        """Restore the exact logging, print, and warning hooks present before capture."""
        builtins.print = original_print
        warnings.showwarning = original_warning
        logging.Logger.callHandlers = original_handlers
    return restore, exception
