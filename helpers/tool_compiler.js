const fs = require("fs")
const { config, getOutputPath, getToolingPath } = require("./utils")

const moduleName = config.compileOutputName
const output = getOutputPath()

const injectCode = `
const local_import = (mod) => require(\`\${__hooks}/\${mod}.js\`);
DEBUG_LOG = true;

const external_import = (mod, pack) => {
    if (DEBUG_LOG)
        console.log(\`Mod Imported externally -> \${mod}\`);

    return require(\`\${__hooks}/${moduleName}/\${mod}.js\`);
};

exports.local_import = local_import;
exports.external_import = external_import;
`;

module.exports = {
    compileTools: () => fs.writeFileSync(`${getToolingPath()}`, injectCode)
}
