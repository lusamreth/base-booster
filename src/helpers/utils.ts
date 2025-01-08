import fs from "fs";
import path from "path";
import crypto from "crypto"

const currentPath = process.cwd()

const parentDirectory = path.join(currentPath);
const fullCfgPath = path.join(parentDirectory, "config.json")
const configContent = fs.readFileSync(fullCfgPath, 'utf8')

export const config = JSON.parse(configContent);
const outputFolder = config.compileOutputName;

export const TOOLING_FILE_NAME = `${config.compileOutputName}-tooling.js`
export const TOOLING_DIR = `${config.compileOutputName}`

export const getOutputPath = (destination?: string) => `${destination ?? config.destination}${outputFolder}`
export const getToolingPath = (destination?: string) => path.join(destination ?? config.destination, TOOLING_FILE_NAME)
export const getEntryFile = (destination?: string) => path.join(destination ?? config.destination, config.entryPoint)
export const getPBHookPathStr = (pathstr: string) => path.join("${__hooks}", pathstr)
export const getSourceDir = (destination?: string) => path.resolve(config.sourceDir)
export const getDestinationFolder = () => config.destination


export const identifySplitFile = (pathstr: string): { id: string, originalFile: string } => {
    const pattern = /^[a-zA-Z0-9]{6}\.\w+\.js$/;
    // Match the pattern and extract the ID and word
    const match = pathstr.match(pattern);

    // If there's a match, return the extracted values, otherwise return null for both
    if (match) {
        const id = match[1]; // The first capture group (6 random characters)
        const word = match[2]; // The second capture group (word between the dots)
        return { id, originalFile: word };
    }
};

export const generateSplitFile = (currentFile: string, existingId?: string) => {

    const filename = path.parse(currentFile).name
    const uniqueId = existingId ?? crypto.randomBytes(6).toString('hex')
    const uniqueFile = uniqueId + `.${path.basename(filename)}.js`;

    return {
        id: uniqueId,
        filename: uniqueFile
    }
}
