const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.resolve('config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const excludeModules = new Set(config.excludeModules || []);
const pbHooksPath = config.destination || './pb_hooks';
const compileOutput = config.compileOutputName;
const importFilePath = path.resolve(pbHooksPath, '_import.ts');

// Collect all modules in pb_hooks directory
const modulesDir = path.resolve(pbHooksPath);
const distDir = path.resolve(pbHooksPath + compileOutput);

const externalModules = [];
const internalModules = [];


if (fs.existsSync(modulesDir)) {
    const modules = fs.readdirSync(modulesDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        .map(file => path.basename(file, path.extname(file)));

    modules.forEach(mod => {
        if (!excludeModules.has(mod) && mod !== '_import') {
            externalModules.push(mod);
        }
    });

    const external = fs.readdirSync(distDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        .map(file => path.basename(file, path.extname(file)));

    externalModules.concat(external)

}

let generatedStatement = ""
generatedStatement += "// Generated content!!! Do not Modified!"


