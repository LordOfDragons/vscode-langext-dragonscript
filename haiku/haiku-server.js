const Module = require('module');
const crc32 = require('crc-32');
const crc32c = require('crc-32/crc32c');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(path) {
	if (path === '@node-rs/crc32') {
		return {
			crc32: function(input, seed) {
				const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
				return crc32.buf(buf, seed) >>> 0
			},
			crc32c: function(input, seed) {
				const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
				return crc32c.buf(buf, seed) >>> 0
			}
		}
	}
	return originalRequire.apply(this, arguments);
};
