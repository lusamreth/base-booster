import fs from "fs";
import path from "path";
import { config, getOutputPath, getToolingPath } from "./utils";

const moduleName: string = config.compileOutputName;
const injectCode = `
    const local_import = (mod) => require(\`\${__hooks}/\${mod}.js\`);
    const DEBUG_LOG = true;

    const external_import = (mod, pack) => {
        if (DEBUG_LOG){
            console.log(\`Mod Imported externally -> \${mod}\`);
        }
        const packPath = pack ? \`\${pack}/\`: ""
        return require(\`\${__hooks}/${moduleName}/\${packPath}\${mod}.js\`);
    };

    exports.local_import = local_import;
    exports.external_import = external_import;
`;

const buildImportTemplate = (
    __hooks: string,
    modulePath: string,
    isDebug: boolean = false
) => {
    return (mod: string, pack?: string) => {
        if (isDebug) {
            const pwd = process.cwd();
            console.log(`[[ ${pwd} ]] Mod Imported externally -> ${mod}`);
        }

        const filePath = `${pack ?? ""}/${mod}.js`;
        return require(`${__hooks}/${modulePath}/${filePath}`);
    };
};

export const compileTools = (): void => {
    fs.writeFileSync(`${getToolingPath()}`, injectCode);
};
