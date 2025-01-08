import fs from 'fs';
import { getOutputPath, config, getDestinationFolder } from "../helpers/utils";
import path from "path";


export const TRACKING_MODULE = getOutputPath()
export const TRACKING_FILE = path.join(getOutputPath(), `${config["compileOutputName"]}.split-files.json`);
export const BASE_DESTINATION = getDestinationFolder()

export const _META_CACHE = {
    outputExist: fs.existsSync(TRACKING_MODULE)
}
