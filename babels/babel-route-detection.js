const fs = require('fs');
const path = require('path');

module.exports = function({ types: t }) {
    // Load configuration
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const excludeModules = new Set(config.babel.excludeModules || []);
    const pbHooksPath = config.destination || './pb_hooks';

    // To store detected routes and modules
    const detectedRoutes = [];
    const availableModules = new Set();
    const enabledModules = new Set();

    return {
        visitor: {
            Program(programPath) {
                // Collect all modules in pb_hooks directory
                const modulesDir = path.resolve(pbHooksPath);
                const mainEntry = modulesDir + "main.pb.ts";

                if (fs.existsSync(modulesDir)) {
                    const modules = fs.readdirSync(modulesDir)
                        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
                        .map(file => path.basename(file, path.extname(file)));

                    modules.forEach(mod => availableModules.add(mod));
                }

                // Traverse the AST to find routerAdd calls and module imports
                programPath.traverse({
                    CallExpression(callPath) {
                        const callee = callPath.get('callee');

                        // Detect routerAdd calls
                        if (t.isIdentifier(callee.node, { name: 'routerAdd' })) {
                            const args = callPath.get('arguments');
                            if (args.length > 0) {
                                const routePath = args[1];
                                const routeMethod = args[0];

                                if (t.isStringLiteral(routePath.node)) {
                                    const route = routePath.node.value;
                                    const routeMethodValue = routeMethod.node.value
                                    detectedRoutes.push({ method: routeMethodValue, path: route });
                                }
                            }
                        }
                    },

                });

                // At the end of the traversal, write the collected data to a file
                const outputData = {
                    detectedRoutes,
                    availableModules: Array.from(availableModules),
                    enabledModules: Array.from(enabledModules),
                    excludedModules: Array.from(excludeModules),
                };

                fs.writeFileSync('build_info.json', JSON.stringify(outputData, null, 2));
            }
        }
    };
};
