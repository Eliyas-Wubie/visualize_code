const host = acquireVsCodeApi();

/** Send a structured request to the extension host; this module owns the webview's single VS Code API instance. */
export function postMessage(message) {
  host.postMessage(message);
}
