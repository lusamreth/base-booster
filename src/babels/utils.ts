import path from "path";

/**
 * Processes the input path based on its prefix, current working directory (cwd), and stop directories.
 *
 * Rules:
 * - If the path starts with "./":
 *    - Extract the last directory name from the cwd.
 *    - If this directory name is in `stopDirs`, return "".
 *    - Otherwise, return the directory name.
 * - If the path starts with "../":
 *    - Return the path as is.
 * - For other paths:
 *    - Return them unchanged.
 *
 * @param inputPath - The path to process (e.g., "../payment/aba" or "./schema").
 * @param cwd - The absolute path of the file being processed 
 *   (e.g., "/home/user/project/src/subscription/schema.js").
 * @param stopDirs - An array of directory names considered top-level (e.g., ["src"]).
 * @returns An object indicating if the path was changed and the resulting path.
 */
export function processPath(
    inputPath: string,
    cwd: string,
    stopDirs: string[] = ["src"]
): { changed: boolean; path: string; external?: boolean } {
    if (inputPath.startsWith("./")) {
        const dirName = path.dirname(cwd);
        const lastDir = path.basename(dirName);

        // Check if the last directory is in the stopDirs array
        if (stopDirs.includes(lastDir)) {
            return { changed: true, path: "" };
        } else {
            return { changed: true, path: lastDir };
        }
    } else if (inputPath.startsWith("../")) {
        return { changed: false, path: inputPath };
    } else {
        // Path does not start with './' or '../', no change
        return { changed: false, path: inputPath, external: true };
    }
}

/**
 * Extracts packPath and mod from a given file path.
 * - Handles paths with or without '.js' extension.
 * - Removes all leading './' and '../' from packPath.
 * - Strips out JavaScript-style comments from the path string.
 *
 * @param filePath - The file path to parse (e.g., '../payment/aba.js').
 * @returns An object containing packPath and mod.
 * @throws {Error} If the file path format is invalid.
 */
export function extractTSModule(filePath: string): { modulePath: string; mod: string } {
    if (typeof filePath !== "string") {
        throw new Error("Invalid input: filePath must be a string");
    }

    // Step 1: Remove comments from the file path string
    const cleanedPath = filePath;

    if (cleanedPath === "") {
        throw new Error("Invalid file path format");
    }

    // Step 2: Remove the file extension if present (e.g., '.js')
    const ext = path.extname(cleanedPath); // e.g., '.js' or ''
    const pathWithoutExt = ext ? cleanedPath.slice(0, -ext.length) : cleanedPath;

    // Step 3: Extract dirname and mod
    const dirname = path.dirname(pathWithoutExt); // e.g., '../payment' or './utils/helpers'
    const mod = path.basename(pathWithoutExt); // e.g., 'aba' or 'format'

    // Step 4: Normalize packPath and replace backslashes with forward slashes
    let packPath = path.normalize(dirname).replace(/\\/g, "/") + "/"; // ensure trailing '/'

    // Step 5: Remove all leading './' and '../' sequences
    packPath = packPath.replace(/^(\.\.\/|\.\/)+/, "");
    packPath = packPath.replace(/\/$/, "");

    // Step 6: If packPath is only a path separator or empty, set it to empty string
    if (packPath === "/" || packPath === "") {
        packPath = "";
    }

    return { modulePath: packPath, mod };
}

