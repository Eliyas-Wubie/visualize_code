const { AuthoringError } = require('./authoring-error');
const { createEditTargets } = require('./edit-targets');
const { createEditOperations } = require('./edit-operations');

/** Validate and serialize explicit panel authoring actions; all target and source authority stays in the host. */
function createEditing(vscode, state, refresh, post) {
  const targets = createEditTargets(vscode, state);
  const operations = createEditOperations(vscode, state, targets);
  let applying = false;
  const handle = async (message) => {
    if (message?.type !== 'editorRequest') return false;
    if (typeof message.requestId !== 'string' || message.requestId.length > 64) return true;
    let ownsMutation = false;
    try {
      if (!vscode.workspace.isTrusted || !['functions', 'oop', 'files'].includes(message.mode))
        throw new AuthoringError(
          'Authoring is available in non-architecture views of trusted workspaces.',
        );
      if (applying) throw new AuthoringError('An authoring operation is already running.');
      if (vscode.debug?.activeDebugSession)
        throw new AuthoringError('Stop the active debug session before authoring.');
      if (state().busy)
        throw new AuthoringError('Wait for call discovery to finish before authoring.');
      let result;
      if (message.action === 'catalog') result = await targets.catalog();
      else if (message.action === 'classes') result = await targets.classOptions(message.target);
      else if (message.action === 'load') result = await operations.load(message.id);
      else {
        applying = true;
        ownsMutation = true;
        const changed = await operations.apply(message);
        try {
          await targets.catalog();
          await refresh(changed.kind === 'file' ? [changed.uri] : [], false);
          result = { applied: true, saved: changed.saved, warning: changed.warning };
        } catch {
          result = {
            applied: true,
            saved: changed.saved,
            warning: [
              changed.warning,
              'Source changed, but the map refresh failed. Use Refresh map after language support is ready.',
            ]
              .filter(Boolean)
              .join(' '),
          };
        }
      }
      post({ type: 'editorResult', requestId: message.requestId, result });
    } catch (error) {
      post({
        type: 'editorResult',
        requestId: message.requestId,
        error:
          error instanceof AuthoringError
            ? error.message
            : 'Could not complete authoring. Check language support and workspace permissions.',
      });
    } finally {
      if (ownsMutation) applying = false;
    }
    return true;
  };
  return {
    handle,
    catalog: targets.catalog,
    get applying() {
      return applying;
    },
    resolve: (id) => targets.entries.get(id),
    resources: targets.resources,
    get limited() {
      return targets.limited;
    },
  };
}

module.exports = { createEditing };
