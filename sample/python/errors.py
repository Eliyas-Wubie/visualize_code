"""Demonstrate preserved Python arguments and a captured, fatal runtime error."""
import sys


def fail():
    """Raise a synthetic error for the live viewer's node details."""
    raise ValueError('Synthetic Python failure')


def main():
    """Print supplied arguments, then fail with the normal nonzero exit status."""
    print('Arguments:', ','.join(sys.argv[1:]))
    fail()


if __name__ == '__main__':
    main()


def test():
    """Describe test."""
    print("hello")
