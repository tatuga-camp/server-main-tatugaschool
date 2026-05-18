// Polyfill SlowBuffer which was removed in Node.js v22+.
// passport-jwt's deep dependency (buffer-equal-constant-time) references
// SlowBuffer at module load time, causing a crash on modern Node.
const bufModule = require('buffer');
if (!bufModule.SlowBuffer) {
  bufModule.SlowBuffer = bufModule.Buffer;
}
