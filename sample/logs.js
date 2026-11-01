class ExampleService {
  /** Emit a normal message and warning, then demonstrate a handled application error. */
  run() {
    console.log('Example service started');
    console.warn('Sample warning: using demonstration data');
    throw new Error('Sample failure: demonstration only');
  }
}

/** Run the service and log its handled error without failing the process. */
function main() {
  const service = new ExampleService();
  try {
    service.run();
  } catch (error) {
    console.error(error);
  }
}

if (require.main === module) main();

module.exports = { ExampleService, main };
