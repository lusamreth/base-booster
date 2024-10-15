const fs = require("fs");
const { homedir } = require("os");
const path = require("path");

const currentPath = process.cwd()
const parentDirectory = currentPath;
const fullCfgPath = path.join(parentDirectory, "config.json")
// console.log("B", fb)
const configContent = fs.readFileSync(fullCfgPath, 'utf8')

console.log(fullCfgPath, configContent)

const config = JSON.parse(configContent);
const outputFolder = config.compileOutputName;

const TOOLING_FILE_NAME = `${config.compileOutputName}-tooling.js`
const TOOLING_DIR = `${config.compileOutputName}`


const getOutputPath = (destination) => `${destination ?? config.destination}${outputFolder}`
const getToolingPath = (destination) => path.join(destination ?? config.destination, TOOLING_FILE_NAME)
const getPBHookPathStr = (pathstr) => path.join("${__hooks}", pathstr)


module.exports = {
    config,
    getOutputPath: getOutputPath,
    getToolingPath: getToolingPath,
    getPBHookPathStr,
    TOOLING_FILE_NAME,
    TOOLING_DIR
};
