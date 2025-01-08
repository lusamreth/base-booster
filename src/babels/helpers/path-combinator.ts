import * as pathUtils from "path";
import { findSubarrayKMP } from "./pattern-sub-matcher";


export function joinPathsAtIntersectionWithSuffix(
    basePath: string,
    relativePath: string,
    root?: string
): string {
    const splitPath = (path: string) => path.split('/').filter(part => part);

    const baseParts = splitPath(basePath);
    const relativeParts = splitPath(pathUtils.resolve(relativePath));
    const rootParts = root ? splitPath(root) : [];
    const primary = rootParts.length > relativeParts.length ? rootParts : relativeParts
    const others = rootParts.length > relativeParts.length ? relativeParts : rootParts
    const srcFolder = pathUtils.basename(root)

    // const 
    const common = primary.findIndex((part, i) => {
        const cp = others[i]
        if (cp !== part) {
            return i
        }
    })
    const intersect = [rootParts[common - 1]]
    console.log('cc', common, srcFolder, rootParts[common], intersect)
    console.log('roo', rootParts, baseParts)

    console.log("RP", relativeParts[relativeParts.length - 1])
    const findSubarrayIndex = findSubarrayKMP

    if (root) {
        // Find the root in basePath
        const baseRootIndex = findSubarrayIndex(baseParts, intersect);
        if (baseRootIndex === -1) {
            throw new Error("Specified root not found in basePath.");
        }

        // Find the root in relativePath
        const relativeRootIndex = findSubarrayIndex(relativeParts, intersect);

        console.log("FFA", relativeRootIndex, relativeParts, rootParts)
        if (relativeRootIndex === -1) {
            throw new Error("Specified root not found in relativePath.");
        }


        // if (root === relativePath) {

        // }

        // Paths after root
        const baseAfterRoot = baseParts.slice(baseRootIndex + rootParts.length);
        const relativeAfterRoot = relativeParts.slice(relativeRootIndex + rootParts.length);

        // Suffix is the last part of the basePath
        let suffix = baseParts[baseParts.length - 1];
        if (suffix === srcFolder) {
            suffix = ""
        }

        // Construct new path
        const newPathParts = [
            ...relativeParts.slice(0, relativeRootIndex + rootParts.length),
            ...baseAfterRoot,
            suffix
        ];

        // if (newPathParts[newPathParts.length - 1] === srcFolder) {
        //     newPathParts.splice(0, 1)
        // }
        // console.log("PP", newPathParts, srcFolder, newPathParts[newPathParts.length - 1])
        return '/' + newPathParts.join('/');
    } else {
        // Original behavior without root
        let commonDir = '';
        let baseIndex = -1;
        let relativeIndex = -1;

        for (let i = 0; i < baseParts.length; i++) {
            if (relativeParts.includes(baseParts[i])) {
                commonDir = baseParts[i];
                baseIndex = i;
                relativeIndex = relativeParts.indexOf(commonDir);
                break;
            }
        }

        if (!commonDir) {
            throw new Error("No common intersection found between the paths.");
        }

        const baseUpToCommon = baseParts.slice(0, baseIndex + 1);
        const relativeAfterCommon = relativeParts.slice(relativeIndex + 1);
        const suffix = baseParts[baseParts.length - 1];

        const newPathParts = baseUpToCommon.concat(relativeAfterCommon).concat(suffix);

        return '/' + newPathParts.join('/');
    }
}
