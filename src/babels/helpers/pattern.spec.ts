
// src/kmp.test.ts

import { describe, it, expect } from 'vitest';
import { findSubarrayKMP, findAllSubarraysKMP } from './pattern-sub-matcher';

describe('KMP Algorithm Tests', () => {
    const mainArray = [
        'home',
        'lusamreth',
        'developments',
        'pocketbase_extender_project',
        'base-booster-toolchains',
        'testings',
        'src',
    ];

    const pattern = ["testings", "src"];

    it('should find the first occurrence of the pattern', () => {
        const index = findSubarrayKMP(mainArray, pattern);
        expect(index).toBe(5);
    });

    it('should find all occurrences of the pattern', () => {
        const indices = findAllSubarraysKMP(mainArray.concat(
            [
                'testings',
                'src'
            ]

        ), pattern);
        console.log('in', indices)
        expect(indices).toEqual([5, 7]);
    });

    it('should return -1 when the pattern is not found', () => {
        const nonExistentPattern = ["nonexistent", "pattern"];
        const index = findSubarrayKMP(mainArray, nonExistentPattern);
        expect(index).toBe(-1);

        const indices = findAllSubarraysKMP(mainArray, nonExistentPattern);
        expect(indices).toEqual([]);
    });

    it('should return 0 for an empty pattern in findSubarrayKMP', () => {
        const emptyPattern: string[] = [];
        const index = findSubarrayKMP(mainArray, emptyPattern);
        expect(index).toBe(0);
    });

    it('should return all possible indices for an empty pattern in findAllSubarraysKMP', () => {
        const emptyPattern: string[] = [];
        const indices = findAllSubarraysKMP(mainArray, emptyPattern);
        expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('should return -1 when pattern length is greater than main array length', () => {
        const longPattern = ['home', 'lusamreth', 'developments', 'pocketbase_extender_project', 'base-booster-toolchains', 'testings', 'src', 'extra'];
        const index = findSubarrayKMP(mainArray, longPattern);
        expect(index).toBe(-1);

        const indices = findAllSubarraysKMP(mainArray, longPattern);
        expect(indices).toEqual([]);
    });

    it('should handle patterns at the beginning of the main array', () => {
        const beginningPattern = ['home', 'lusamreth'];
        const index = findSubarrayKMP(mainArray, beginningPattern);
        expect(index).toBe(0);

        const indices = findAllSubarraysKMP(mainArray, beginningPattern);
        expect(indices).toEqual([0]);
    });

    it('should handle patterns at the end of the main array', () => {
        const endingPattern = ['testings', 'src'];
        const index = findSubarrayKMP(mainArray, endingPattern);
        expect(index).toBe(5);

        const indices = findAllSubarraysKMP(mainArray, endingPattern);
        expect(indices).toEqual([5]);
    });

    it('should handle multiple occurrences of the pattern', () => {
        const extendedMainArray = [
            'testings', 'src', 'home', 'testings', 'src', 'developments', 'testings', 'src'
        ];
        const multiPattern = ['testings', 'src'];

        const firstIndex = findSubarrayKMP(extendedMainArray, multiPattern);
        expect(firstIndex).toBe(0);

        const allIndices = findAllSubarraysKMP(extendedMainArray, multiPattern);
        expect(allIndices).toEqual([0, 3, 6]);
    });

    it('should handle overlapping patterns', () => {
        const overlappingMainArray = ['a', 'a', 'a', 'a'];
        const overlappingPattern = ['a', 'a'];

        const firstIndex = findSubarrayKMP(overlappingMainArray, overlappingPattern);
        expect(firstIndex).toBe(0);

        const allIndices = findAllSubarraysKMP(overlappingMainArray, overlappingPattern);
        expect(allIndices).toEqual([0, 1, 2]);
    });

    it('should be case-sensitive', () => {
        const caseSensitivePattern = ['Testings', 'Src'];
        const index = findSubarrayKMP(mainArray, caseSensitivePattern);
        expect(index).toBe(-1);

        const indices = findAllSubarraysKMP(mainArray, caseSensitivePattern);
        expect(indices).toEqual([]);
    });

    it('should handle single-element patterns', () => {
        const singleElementPattern = ['developments'];
        const index = findSubarrayKMP(mainArray, singleElementPattern);
        expect(index).toBe(2);

        const indices = findAllSubarraysKMP(mainArray, singleElementPattern);
        expect(indices).toEqual([2]);
    });

    it('should handle patterns with all identical elements', () => {
        const identicalMainArray = ['a', 'a', 'a', 'a', 'a'];
        const identicalPattern = ['a', 'a', 'a'];

        const firstIndex = findSubarrayKMP(identicalMainArray, identicalPattern);
        expect(firstIndex).toBe(0);

        const allIndices = findAllSubarraysKMP(identicalMainArray, identicalPattern);
        expect(allIndices).toEqual([0, 1, 2]);
    });
});
