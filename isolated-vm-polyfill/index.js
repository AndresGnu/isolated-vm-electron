const vm = require('node:vm');

class Script {
    constructor(code) {
        this.code = code;
    }

    runSync(context, options = {}) {
        return context._run(this.code, options);
    }

    run(context, options = {}) {
        return Promise.resolve(this.runSync(context, options));
    }
}

class Isolate {
    constructor() {
        this.contexts = new Set();
    }

    createContextSync() {
        const context = new Context();
        this.contexts.add(context);
        return context;
    }

    createContext() {
        return Promise.resolve(this.createContextSync());
    }

    compileScriptSync(code) {
        return new Script(code);
    }

    compileScript(code) {
        return Promise.resolve(this.compileScriptSync(code));
    }

    dispose() {
        this.contexts.clear();
    }
}

class Context {
    constructor() {
        this.sandbox = {
            global: null // Will be set by derefInto
        };
        this.vmContext = vm.createContext(this.sandbox);
        this.global = new Jail(this.sandbox);
    }

    evalClosureSync(code, args = [], options = {}) {
        this._injectArgs(args);
        return this._run(code, options);
    }

    evalClosure(code, args = [], options = {}) {
        return Promise.resolve(this.evalClosureSync(code, args, options));
    }

    release() {
        // GC handles it
    }

    _injectArgs(args) {
        // Create an arguments array in the sandbox exactly like evalClosure does
        // where $0, $1 etc are the arguments passed
        const proxyArgs = args.map((arg, i) => {
            if (arg instanceof Reference) {
                // Expose a wrapper function that calls the original reference
                const refName = `__ivm_ref_${i}`;
                this.sandbox[refName] = arg.value;
                return refName;
            }
            return arg;
        });

        // We build the arguments array so `apply` can work if they use $0.apply(...)
        this.sandbox.__args = proxyArgs;

        // Bind specific `$0`, `$1` etc.
        proxyArgs.forEach((arg, i) => {
            if (args[i] instanceof Reference) {
                // Provide a wrapper object that matches `$0.apply(undefined, args, ...)`
                this.sandbox[`$${i}`] = {
                    apply: (thisArg, callArgs, opts) => {
                        return this.sandbox[arg](...callArgs);
                    }
                };
            } else {
                this.sandbox[`$${i}`] = arg;
            }
        });
    }

    _run(code, options) {
        const timeout = options.timeout || 10000;

        // Compile and run the code safely
        return vm.runInContext(code, this.vmContext, { timeout });
    }
}

class Jail {
    constructor(sandbox) {
        this._sandbox = sandbox;
    }

    setSync(key, value) {
        this._sandbox[key] = value;
    }

    set(key, value) {
        this.setSync(key, value);
        return Promise.resolve();
    }

    derefInto() {
        // Points back to the global object/sandbox
        return this._sandbox;
    }
}

class ExternalCopy {
    constructor(value) {
        this.value = value;
    }

    copyInto() {
        // In node:vm we don't need strict cross-isolate transferring,
        if (this.value === undefined) return undefined;
        try {
            return JSON.parse(JSON.stringify(this.value));
        } catch {
            return this.value;
        }
    }
}

class Reference {
    constructor(value) {
        this.value = value;
    }
}

module.exports = {
    Isolate,
    Context,
    Script,
    ExternalCopy,
    Reference
};
