
/**
 * Builds the Longest Prefix Suffix (LPS) array for the KMP algorithm.
 *
 * @param pattern - The subarray pattern to search for.
 * @returns The LPS array.
 */
export function buildLPSArray(pattern: string[]): number[] {
    const lps: number[] = Array(pattern.length).fill(0);
    let length = 0; // length of the previous longest prefix suffix
    let i = 1;

    while (i < pattern.length) {
        if (pattern[i] === pattern[length]) {
            length++;
            lps[i] = length;
            i++;
        } else {
            if (length !== 0) {
                length = lps[length - 1];
                // Note: We do not increment i here
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }

    return lps;
}

/**
 * Finds the starting index of the first occurrence of the pattern in the mainArray using the KMP algorithm.
 *
 * @param mainArray - The main array to search within.
 * @param pattern - The subarray pattern to search for.
 * @returns The starting index if the pattern is found; otherwise, -1.
 */
export function findSubarrayKMP(mainArray: string[], pattern: string[]): number {
    const n = mainArray.length;
    const m = pattern.length;

    if (m === 0) return 0; // Empty pattern matches at index 0
    if (m > n) return -1;  // Pattern longer than main array cannot be found

    const lps = buildLPSArray(pattern);
    let i = 0; // index for mainArray
    let j = 0; // index for pattern

    while (i < n) {
        if (mainArray[i] === pattern[j]) {
            i++;
            j++;
            if (j === m) {
                return i - j; // Match found
            }
        } else {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }

    return -1; // No match found
}

/**
 * Finds all starting indices of occurrences of the pattern in the mainArray using the KMP algorithm.
 *
 * @param mainArray - The main array to search within.
 * @param pattern - The subarray pattern to search for.
 * @returns An array of starting indices where the pattern is found.
 */
export function findAllSubarraysKMP(mainArray: string[], pattern: string[]): number[] {
    const indices: number[] = [];
    const n = mainArray.length;
    const m = pattern.length;

    if (m === 0) {
        // All positions are valid for an empty pattern
        for (let i = 0; i <= n; i++) {
            indices.push(i);
        }
        return indices;
    }
    if (m > n) {
        return indices; // Empty list
    }

    const lps = buildLPSArray(pattern);
    let i = 0; // index for mainArray
    let j = 0; // index for pattern

    while (i < n) {
        if (mainArray[i] === pattern[j]) {
            i++;
            j++;
            if (j === m) {
                indices.push(i - j);
                j = lps[j - 1]; // Continue searching for next possible match
            }
        } else {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }

    return indices;
}
