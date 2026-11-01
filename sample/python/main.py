"""A standalone Python sample for the application explorer and live profiler."""
import logging
import time


class Calculator:
    """Perform repeatable synthetic work."""

    def calculate(self, count):
        """Sum squares for the supplied number of items."""
        return sum(index * index for index in range(count))

    def tick(self):
        """Call the calculation once and log its completion."""
        result = self.calculate(1000)
        print('Python tick completed')
        return result


def main():
    """Run five ticks with time for the live viewer to update."""
    worker = Calculator()
    logging.warning('Synthetic Python demonstration warning')
    for _ in range(5):
        worker.tick()
        time.sleep(0.2)


if __name__ == '__main__':
    main()
