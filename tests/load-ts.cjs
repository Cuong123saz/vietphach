const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function createLoader(globals = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    vm.runInNewContext(code, { ...globals, exports: mod.exports, module: mod,
      structuredClone, crypto: require('node:crypto').webcrypto,
      require: name => {
        if (!name.startsWith('.')) throw new Error('Domain must not load runtime dependency: ' + name);
        return load(path.resolve(path.dirname(filename), name + '.ts'));
      }
    }, { filename });
    return mod.exports;
  }
  return load;
};
