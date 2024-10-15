const fs = require('fs');

try {
    const buildInfo = JSON.parse(fs.readFileSync('build_info.json', 'utf8'));
    console.log('Available Modules:');
    buildInfo.availableModules.forEach(mod => {
        const status = buildInfo.excludedModules.includes(mod) ? 'Disabled' : 'Enabled';
        console.log(`- ${mod}: ${status}`);
    });

    console.log('\nDetected Routes:');
    buildInfo.detectedRoutes.forEach(route => {
        console.log(`- ${route.method}:${route.path}`);
    });
} catch (error) {
    console.error('Error reading build information:', error);
}
