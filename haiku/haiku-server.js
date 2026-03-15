const Module = require('module');
const crc32 = require('crc-32');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(path) {
	if (path === '@node-rs/crc32') {
		return { crc32: (buf) => crc32.buf(buf) };
	}
	return originalRequire.apply(this, arguments);
};
