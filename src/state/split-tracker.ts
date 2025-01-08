import fs from 'fs';
import { _META_CACHE, TRACKING_FILE, TRACKING_MODULE } from './constants';

interface FileMapping {
    originalFile: string;
    splitFile: string;
    hash: string;
}

type FileMappings = Record<string, FileMapping>;
const _MAP_CACHE = {
    map: null,
    init: false
}
const loadMappings = (): FileMappings => {
    try {
        const _existed = !_MAP_CACHE["init"] ? fs.existsSync(TRACKING_FILE) : true
        if (_MAP_CACHE["map"] !== null)
            return _MAP_CACHE["map"]

        if (_existed) {
            _MAP_CACHE["init"] = true
            const mapped = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'))
            if (_MAP_CACHE["map"] === null)
                _MAP_CACHE["map"] = mapped

            return mapped
        } else {
            return {}
        }
    } catch (e) {
        return {}
    }
};

const saveMappings = (mappings: FileMappings): void => {
    if (!_META_CACHE.outputExist) {
        fs.mkdirSync(TRACKING_MODULE)
        _META_CACHE.outputExist = true
    }

    fs.writeFileSync(TRACKING_FILE, JSON.stringify(mappings));
};

export const trackFile = (originalFile: string, splitFile: string, hash: string): void => {
    const mappings = loadMappings();
    mappings[originalFile] = { originalFile, splitFile, hash };
    saveMappings(mappings);
};

export const getMapping = (file: string): FileMapping | undefined => {
    const mappings = loadMappings();
    return mappings[file];
};
