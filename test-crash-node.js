const ivm = require('isolated-vm');

async function test() {
    console.log("Ready, instantiating Isolate...");
    try {
        const isolate = new ivm.Isolate({ memoryLimit: 8 });
        console.log("Isolate created.");
        const context = await isolate.createContext();
        console.log("Context created.");
        const jail = context.global;
        await jail.set('global', jail.derefInto());
        const script = await isolate.compileScript('1 + 2');
        const result = await script.run(context);
        console.log("Result:", result);
    } catch (e) {
        console.error(e);
    }
}

test();
