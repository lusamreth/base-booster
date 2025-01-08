
import { describe, it, expect } from 'vitest';
import * as pathUtils from 'path';
import { joinPathsAtIntersectionWithSuffix } from './path-combinator';

/**
 * Utility function to normalize paths for comparison.
 */
const normalizePath = (p: string) => pathUtils.normalize(p).replace(/\\/g, '/');

describe('joinPathsAtIntersectionWithSuffix', () => {
    // Example Paths
    const basePath = '/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/src';
    const relativePath = '/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/pb_hooks/';
    const root = '/testings/src';

    it('should correctly join paths with a specified root', () => {
        const expectedPath = '/testings/src/base-booster-toolchains/testings/src';
        const result = joinPathsAtIntersectionWithSuffix(basePath, relativePath, root);
        expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    });

    // it('should throw an error if the specified root is not found in basePath', () => {
    //     const invalidRoot = '/nonexistent/root';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(basePath, relativePath, invalidRoot);
    //     }).toThrowError("Specified root not found in basePath.");
    // });

    // it('should throw an error if the specified root is not found in relativePath', () => {
    //     const invalidRoot = '/nonexistent/root';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(basePath, relativePath, invalidRoot);
    //     }).toThrowError("Specified root not found in basePath.");
    // });

    // it('should correctly join paths without a specified root', () => {
    //     const expectedPath = '/testings/src/utils/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePath, relativePath);
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should throw an error when there is no common intersection without root', () => {
    //     const unrelatedRelativePath = '/var/www/project/unique/utils';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(basePath, unrelatedRelativePath);
    //     }).toThrowError("No common intersection found between the paths.");
    // });

    // it('should handle multiple common directories and choose the first one', () => {
    //     const extendedBasePath = '/home/lusamreth/developments/testings/pocketbase_extender_project/testings/base-booster-toolchains/testings/src';
    //     const extendedRelativePath = '/var/www/testings/project/testings/src/utils';
    //     const expectedPath = '/testings/base-booster-toolchains/testings/src';
    //     const result = joinPathsAtIntersectionWithSuffix(extendedBasePath, extendedRelativePath, '/testings');
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should handle case sensitivity correctly', () => {
    //     const caseSensitiveBasePath = '/Home/Lusamreth/Developments/Testings/Src';
    //     const caseSensitiveRelativePath = '/home/lusamreth/developments/testings/src/utils';
    //     const caseSensitiveRoot = '/testings/src';
    //     // Assuming the function is case-sensitive
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(caseSensitiveBasePath, caseSensitiveRelativePath, caseSensitiveRoot);
    //     }).toThrowError("Specified root not found in basePath.");
    // });

    // it('should handle paths with trailing slashes', () => {
    //     const basePathWithTrailingSlash = '/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/src/';
    //     const relativePathWithTrailingSlash = '/var/www/project/testings/src/utils/';
    //     const expectedPath = '/testings/src/base-booster-toolchains/testings/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePathWithTrailingSlash, relativePathWithTrailingSlash, root);
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should handle empty root as equivalent to not specifying a root', () => {
    //     const expectedPath = '/testings/src/utils/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePath, relativePath, '');
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should handle empty basePath', () => {
    //     const emptyBasePath = '';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(emptyBasePath, relativePath);
    //     }).toThrowError("No common intersection found between the paths.");
    // });

    // it('should handle empty relativePath', () => {
    //     const emptyRelativePath = '';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(basePath, emptyRelativePath);
    //     }).toThrowError("No common intersection found between the paths.");
    // });

    // it('should handle both basePath and relativePath as empty', () => {
    //     const emptyBasePath = '';
    //     const emptyRelativePath = '';
    //     expect(() => {
    //         joinPathsAtIntersectionWithSuffix(emptyBasePath, emptyRelativePath);
    //     }).toThrowError("No common intersection found between the paths.");
    // });

    // it('should handle root being the entire basePath', () => {
    //     const fullRoot = basePath;
    //     const newRelativePath = '/testings/src/utils';
    //     const expectedPath = '/testings/src/base-booster-toolchains/testings/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePath, newRelativePath, fullRoot);
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should handle relativePath being entirely within basePath', () => {
    //     const nestedRelativePath = '/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/src/utils';
    //     const expectedPath = '/testings/src/base-booster-toolchains/testings/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePath, nestedRelativePath, root);
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });

    // it('should handle basePath being entirely within relativePath', () => {
    //     const extendedRelativePath = '/var/www/project/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/src/utils';
    //     const expectedPath = '/testings/src/base-booster-toolchains/testings/src';
    //     const result = joinPathsAtIntersectionWithSuffix(basePath, extendedRelativePath, root);
    //     expect(normalizePath(result)).toBe(normalizePath(expectedPath));
    // });
});
