/** Correlate bounded debugger requests/events for real inspector and DAP integration checks; callers own the transport. */
function debugPeer(sendPacket, dap = false) {
  let sequence = 0;
  const requests = new Map();
  const events = [];
  const waiting = [];
  return {
    receive(packet) {
      const id = dap ? packet.request_seq : packet.id;
      if (id && requests.has(id)) {
        const pending = requests.get(id);
        requests.delete(id);
        clearTimeout(pending.timer);
        if (packet.error || packet.success === false)
          pending.reject(new Error(JSON.stringify(packet.error || packet.message)));
        else pending.resolve(dap ? packet.body : packet.result);
        return;
      }
      const name = dap ? packet.event : packet.method;
      if (!name) return;
      const value = dap ? packet.body : packet.params;
      const index = waiting.findIndex((entry) => entry.name === name);
      if (index >= 0) {
        const [entry] = waiting.splice(index, 1);
        clearTimeout(entry.timer);
        entry.resolve(value);
      } else {
        events.push({ name, value });
        if (events.length > 500) events.shift();
      }
    },
    request(command, args = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          requests.delete(id);
          reject(new Error(`Debugger request timed out: ${command}`));
        }, 10000);
        requests.set(id, { resolve, reject, timer });
        sendPacket(
          dap
            ? { seq: id, type: 'request', command, arguments: args }
            : { id, method: command, params: args },
        );
      });
    },
    event(name) {
      const index = events.findIndex((entry) => entry.name === name);
      if (index >= 0) return Promise.resolve(events.splice(index, 1)[0].value);
      return new Promise((resolve, reject) => {
        const entry = { name, resolve };
        entry.timer = setTimeout(() => {
          waiting.splice(waiting.indexOf(entry), 1);
          reject(new Error(`Debugger event timed out: ${name}`));
        }, 10000);
        waiting.push(entry);
      });
    },
    dispose() {
      for (const entry of [...requests.values(), ...waiting]) clearTimeout(entry.timer);
    },
  };
}

module.exports = { debugPeer };
