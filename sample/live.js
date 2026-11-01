class Workload {
  /** Perform synthetic CPU work so sampled timing is visible on the map. */
  calculate(size) {
    let result = 0;
    for (let i = 0; i < size; i++) result += Math.sqrt(i);
    return result;
  }

  /** Execute one demonstration tick and return the computed result. */
  tick() {
    return this.calculate(1000000);
  }
}

/** Run ten timed ticks, giving the live viewer time to receive multiple updates. */
function main() {
  const work = new Workload();
  let remaining = 10;
  const timer = setInterval(() => {
    work.tick();
    if (--remaining === 0) clearInterval(timer);
  }, 200);
}

if (require.main === module) main();

module.exports = { Workload, main };
