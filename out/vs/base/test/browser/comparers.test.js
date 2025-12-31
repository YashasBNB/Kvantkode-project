/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { compareFileExtensions, compareFileExtensionsDefault, compareFileExtensionsLower, compareFileExtensionsUnicode, compareFileExtensionsUpper, compareFileNames, compareFileNamesDefault, compareFileNamesLower, compareFileNamesUnicode, compareFileNamesUpper, } from '../../common/comparers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
const compareLocale = (a, b) => a.localeCompare(b);
const compareLocaleNumeric = (a, b) => a.localeCompare(b, undefined, { numeric: true });
suite('Comparers', () => {
    test('compareFileNames', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNames(null, null) === 0, 'null should be equal');
        assert(compareFileNames(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNames('', '') === 0, 'empty should be equal');
        assert(compareFileNames('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNames('z', 'A') > 0, 'z comes after A');
        assert(compareFileNames('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNames('bbb.aaa', 'aaa.bbb') > 0, 'compares the whole name all at once by locale');
        assert(compareFileNames('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole name all at once by locale');
        // dotfile comparisons
        assert(compareFileNames('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNames('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNames('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNames('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNames('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNames(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNames('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNames('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNames('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNames('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNames('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNames('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNames('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNames('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNames('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNames('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNames('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted in name order');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNames), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNames('a', 'A') !== compareLocale('a', 'A'), 'the same letter sorts in unicode order, not by locale');
        assert(compareFileNames('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter sorts in unicode order, not by locale');
        assert.notDeepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNames), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
        assert.notDeepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNames), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same base characters with different case or accents do not sort in locale order');
        // numeric comparisons
        assert(compareFileNames('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileNames('abc.txt1', 'abc.txt01') > 0, 'same name plus extensions with equal numbers sort in unicode order');
        assert(compareFileNames('art01', 'Art01') !==
            'art01'.localeCompare('Art01', undefined, { numeric: true }), 'a numerically equivalent word of a different case does not compare numerically based on locale');
        assert(compareFileNames('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in full filename unicode order');
    });
    test('compareFileExtensions', () => {
        //
        // Comparisons with the same results as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensions(null, null) === 0, 'null should be equal');
        assert(compareFileExtensions(null, 'abc') < 0, 'null should come before real files without extension');
        assert(compareFileExtensions('', '') === 0, 'empty should be equal');
        assert(compareFileExtensions('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensions('z', 'A') > 0, 'z comes after A');
        assert(compareFileExtensions('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensions('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileExtensions('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensions('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensions('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extensions even if filenames compare differently');
        // dotfile comparisons
        assert(compareFileExtensions('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensions('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensions(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensions('.env', 'aaa.env') < 0, 'if equal extensions, filenames should be compared, empty filename should come before others');
        assert(compareFileExtensions('.MD', 'a.md') < 0, 'if extensions differ in case, files sort by extension in unicode order');
        // numeric comparisons
        assert(compareFileExtensions('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensions('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensions('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensions('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensions('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensions('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensions('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensions('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensions('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, names should be compared');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensions), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results from compareFileExtensionsDefault
        //
        // name-only comparisions
        assert(compareFileExtensions('a', 'A') !== compareLocale('a', 'A'), 'the same letter of different case does not sort by locale');
        assert(compareFileExtensions('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter of different case does not sort by locale');
        assert.notDeepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensions), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
        assert.notDeepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensions), ['email', 'Email', 'émail', 'Émail'].sort((a, b) => a.localeCompare(b)), 'the same base characters with different case or accents do not sort in locale order');
        // name plus extension comparisons
        assert(compareFileExtensions('a.MD', 'a.md') < 0, 'case differences in extensions sort in unicode order');
        assert(compareFileExtensions('a.md', 'A.md') > 0, 'case differences in names sort in unicode order');
        assert(compareFileExtensions('a.md', 'b.MD') > 0, 'when extensions are the same except for case, the files sort by extension');
        assert(compareFileExtensions('aggregate.go', 'aggregate_repo.go') < 0, 'when extensions are equal, names sort in dictionary order');
        // dotfile comparisons
        assert(compareFileExtensions('.env', '.aaa.env') < 0, 'a dotfile with an extension is treated as a name plus an extension - equal extensions');
        assert(compareFileExtensions('.env', '.env.aaa') > 0, 'a dotfile with an extension is treated as a name plus an extension - unequal extensions');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensions('.env', 'aaa') > 0, 'filenames without extensions come before dotfiles');
        assert(compareFileExtensions('.md', 'A.MD') > 0, 'a file with an uppercase extension sorts before a dotfile of the same lowercase extension');
        // numeric comparisons
        assert(compareFileExtensions('abc.txt01', 'abc.txt1') < 0, 'extensions with equal numbers sort in unicode order');
        assert(compareFileExtensions('art01', 'Art01') !== compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case does not compare by locale');
        assert(compareFileExtensions('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileExtensions('txt.abc01', 'txt.abc1') < 0, 'extensions with equivalent numbers sort in unicode order');
        assert(compareFileExtensions('a.ext1', 'b.Ext1') > 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted in extension unicode order');
        assert(compareFileExtensions('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in extension unicode order');
    });
    test('compareFileNamesDefault', () => {
        //
        // Comparisons with the same results as compareFileNames
        //
        // name-only comparisons
        assert(compareFileNamesDefault(null, null) === 0, 'null should be equal');
        assert(compareFileNamesDefault(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesDefault('', '') === 0, 'empty should be equal');
        assert(compareFileNamesDefault('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesDefault('z', 'A') > 0, 'z comes after A');
        assert(compareFileNamesDefault('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNamesDefault('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesDefault('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesDefault('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesDefault('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesDefault('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole filename in locale order');
        // dotfile comparisons
        assert(compareFileNamesDefault('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesDefault('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesDefault('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesDefault(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesDefault('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesDefault('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesDefault('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesDefault('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesDefault('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesDefault('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesDefault('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesDefault('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesDefault('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesDefault('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesDefault('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are compared by full filename');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesDefault), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileNames
        //
        // name-only comparisons
        assert(compareFileNamesDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter sorts by locale');
        assert(compareFileNamesDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter sorts by locale');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesDefault), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same base characters with different case or accents sort in locale order');
        // numeric comparisons
        assert(compareFileNamesDefault('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesDefault('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically based on locale');
        assert(compareFileNamesDefault('a.ext1', 'a.Ext1') === compareLocale('ext1', 'Ext1'), 'if names are equal and extensions with numbers are equal except for case, filenames are sorted in extension locale order');
    });
    test('compareFileExtensionsDefault', () => {
        //
        // Comparisons with the same result as compareFileExtensions
        //
        // name-only comparisons
        assert(compareFileExtensionsDefault(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsDefault(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsDefault('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsDefault('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsDefault('z', 'A') > 0, 'z comes after A');
        assert(compareFileExtensionsDefault('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensionsDefault('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsDefault('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsDefault('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsDefault('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        // dotfile comparisons
        assert(compareFileExtensionsDefault('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsDefault('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsDefault(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsDefault('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsDefault('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileExtensionsDefault('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsDefault('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsDefault('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsDefault('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsDefault('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsDefault('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsDefault('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsDefault('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsDefault('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsDefault), ['A2.txt', 'a10.txt', 'a20.txt', 'A100.txt'], 'filenames with number and case differences compare numerically');
        //
        // Comparisons with different results than compareFileExtensions
        //
        // name-only comparisons
        assert(compareFileExtensionsDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter of different case sorts by locale');
        assert(compareFileExtensionsDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter of different case sorts by locale');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsDefault), ['email', 'Email', 'émail', 'Émail'].sort((a, b) => a.localeCompare(b)), 'the same base characters with different case or accents sort in locale order');
        // name plus extension comparisons
        assert(compareFileExtensionsDefault('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        assert(compareFileExtensionsDefault('a.md', 'A.md') === compareLocale('a', 'A'), 'case differences in names sort by locale');
        assert(compareFileExtensionsDefault('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsDefault('aggregate.go', 'aggregate_repo.go') > 0, 'names with the same extension sort in full filename locale order');
        // dotfile comparisons
        assert(compareFileExtensionsDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsDefault('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsDefault('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsDefault('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically based on locale');
        assert(compareFileExtensionsDefault('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsDefault('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsDefault('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, full filenames should be compared');
        assert(compareFileExtensionsDefault('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'if extensions with numbers are equal except for case, full filenames are compared in locale order');
    });
    test('compareFileNamesUpper', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUpper(null, null) === 0, 'null should be equal');
        assert(compareFileNamesUpper(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesUpper('', '') === 0, 'empty should be equal');
        assert(compareFileNamesUpper('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesUpper('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileNamesUpper('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesUpper('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesUpper('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesUpper('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesUpper('aggregate.go', 'aggregate_repo.go') > 0, 'compares the full filename in locale order');
        // dotfile comparisons
        assert(compareFileNamesUpper('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesUpper('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesUpper('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesUpper('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesUpper('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesUpper(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesUpper('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesUpper('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesUpper('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesUpper('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesUpper('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesUpper('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesUpper('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesUpper('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesUpper('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesUpper('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesUpper('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesUpper('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesUpper('a.ext1', 'b.Ext1') < 0, 'different names with the equal extensions except for case are sorted by full filename');
        assert(compareFileNamesUpper('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'same names with equal and extensions except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUpper('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileNamesUpper('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileNamesUpper('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesUpper), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesUpper), ['Email', 'Émail', 'email', 'émail'], 'the same base characters with different case or accents sort uppercase first');
        // numeric comparisons
        assert(compareFileNamesUpper('art01', 'Art01') > 0, 'a numerically equivalent name of a different case compares uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesUpper), ['A2.txt', 'A100.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences group by case then compare by number');
    });
    test('compareFileExtensionsUpper', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUpper(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsUpper(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsUpper('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsUpper('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsUpper('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileExtensionsUpper('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsUpper('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsUpper('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsUpper('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsUpper('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsUpper('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        assert(compareFileExtensionsUpper('aggregate.go', 'aggregate_repo.go') > 0, 'when extensions are equal, compares the full filename');
        // dotfile comparisons
        assert(compareFileExtensionsUpper('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsUpper('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsUpper('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsUpper('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsUpper(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsUpper('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsUpper('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsUpper('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsUpper('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsUpper('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsUpper('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsUpper('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsUpper('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsUpper('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsUpper('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsUpper('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUpper('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsUpper('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert(compareFileExtensionsUpper('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsUpper('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsUpper('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsUpper('a.ext1', 'b.Ext1') < 0, 'different names and extensions that are equal except for case are sorted in full filename order');
        assert(compareFileExtensionsUpper('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'b.Ext1'), 'same names and extensions that are equal except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUpper('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileExtensionsUpper('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileExtensionsUpper('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsUpper), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsUpper), ['Email', 'Émail', 'email', 'émail'], 'the same base characters with different case or accents sort uppercase names first');
        // name plus extension comparisons
        assert(compareFileExtensionsUpper('a.md', 'A.md') > 0, 'case differences in names sort uppercase first');
        assert(compareFileExtensionsUpper('art01', 'Art01') > 0, 'a numerically equivalent word of a different case sorts uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsUpper), ['A2.txt', 'A100.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences group by case then sort by number');
    });
    test('compareFileNamesLower', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesLower(null, null) === 0, 'null should be equal');
        assert(compareFileNamesLower(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesLower('', '') === 0, 'empty should be equal');
        assert(compareFileNamesLower('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesLower('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileNamesLower('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesLower('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesLower('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesLower('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        assert(compareFileNamesLower('aggregate.go', 'aggregate_repo.go') > 0, 'compares full filenames');
        // dotfile comparisons
        assert(compareFileNamesLower('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesLower('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesLower('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesLower('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        assert(compareFileNamesLower('.aaa_env', '.aaa.env') < 0, 'an underscore in a dotfile name will sort before a dot');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesLower(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesLower('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesLower('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesLower('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesLower('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesLower('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesLower('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesLower('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesLower('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileNamesLower('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileNamesLower('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileNamesLower('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest number first');
        assert(compareFileNamesLower('abc.txt1', 'abc.txt01') < 0, 'same name plus extensions with equal numbers sort shortest number first');
        assert(compareFileNamesLower('a.ext1', 'b.Ext1') < 0, 'different names and extensions that are equal except for case are sorted in full filename order');
        assert(compareFileNamesLower('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'b.Ext1'), 'same names and extensions that are equal except for case are sorted in full filename locale order');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesLower('z', 'A') < 0, 'z comes before A');
        assert(compareFileNamesLower('a', 'A') < 0, 'the same letter sorts lowercase first');
        assert(compareFileNamesLower('â', 'Â') < 0, 'the same accented letter sorts lowercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesLower), ['art', 'artichoke', 'Art', 'Artichoke'], 'names with the same root and different cases sort lowercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesLower), ['email', 'émail', 'Email', 'Émail'], 'the same base characters with different case or accents sort lowercase first');
        // numeric comparisons
        assert(compareFileNamesLower('art01', 'Art01') < 0, 'a numerically equivalent name of a different case compares lowercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesLower), ['a10.txt', 'a20.txt', 'A2.txt', 'A100.txt'], 'filenames with number and case differences group by case then compare by number');
    });
    test('compareFileExtensionsLower', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsLower(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsLower(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsLower('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsLower('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsLower('Z', 'a') > 0, 'Z comes after a');
        // name plus extension comparisons
        assert(compareFileExtensionsLower('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsLower('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsLower('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsLower('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsLower('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsLower('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort by locale');
        // dotfile comparisons
        assert(compareFileExtensionsLower('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsLower('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsLower('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsLower('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsLower(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsLower('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsLower('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsLower('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsLower('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsLower('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsLower('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsLower('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('abc2.txt', 'abc10.txt') < 0, 'filenames with numbers should be in numerical order');
        assert(compareFileExtensionsLower('abc02.txt', 'abc010.txt') < 0, 'filenames with numbers that have leading zeros sort numerically');
        assert(compareFileExtensionsLower('abc1.10.txt', 'abc1.2.txt') > 0, 'numbers with dots between them are treated as two separate numbers, not one decimal number');
        assert(compareFileExtensionsLower('abc2.txt2', 'abc1.txt10') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsLower('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsLower('txt.abc2', 'txt.abc10') < 0, 'extensions with numbers should be in numerical order even when they are multiple digits long');
        assert(compareFileExtensionsLower('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        assert(compareFileExtensionsLower('abc.txt01', 'abc.txt1') > 0, 'extensions with equal numbers should be in shortest-first order');
        assert(compareFileExtensionsLower('abc02.txt', 'abc002.txt') < 0, 'filenames with equivalent numbers and leading zeros sort shortest string first');
        assert(compareFileExtensionsLower('txt.abc01', 'txt.abc1') > 0, 'extensions with equivalent numbers sort shortest extension first');
        assert(compareFileExtensionsLower('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, full filenames should be compared');
        assert(compareFileExtensionsLower('a.ext1', 'a.Ext1') === compareLocale('a.ext1', 'a.Ext1'), 'if extensions with numbers are equal except for case, filenames are sorted in locale order');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsLower('z', 'A') < 0, 'z comes before A');
        assert(compareFileExtensionsLower('a', 'A') < 0, 'the same letter sorts lowercase first');
        assert(compareFileExtensionsLower('â', 'Â') < 0, 'the same accented letter sorts lowercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsLower), ['art', 'artichoke', 'Art', 'Artichoke'], 'names with the same root and different cases sort lowercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsLower), ['email', 'émail', 'Email', 'Émail'], 'the same base characters with different case or accents sort lowercase names first');
        // name plus extension comparisons
        assert(compareFileExtensionsLower('a.md', 'A.md') < 0, 'case differences in names sort lowercase first');
        assert(compareFileExtensionsLower('art01', 'Art01') < 0, 'a numerically equivalent word of a different case sorts lowercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsLower), ['a10.txt', 'a20.txt', 'A2.txt', 'A100.txt'], 'filenames with number and case differences group by case then sort by number');
        assert(compareFileExtensionsLower('aggregate.go', 'aggregate_repo.go') > 0, 'when extensions are equal, compares full filenames');
    });
    test('compareFileNamesUnicode', () => {
        //
        // Comparisons with the same results as compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUnicode(null, null) === 0, 'null should be equal');
        assert(compareFileNamesUnicode(null, 'abc') < 0, 'null should be come before real values');
        assert(compareFileNamesUnicode('', '') === 0, 'empty should be equal');
        assert(compareFileNamesUnicode('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileNamesUnicode('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileNamesUnicode('file.ext', 'file.ext') === 0, 'equal full names should be equal');
        assert(compareFileNamesUnicode('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileNamesUnicode('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileNamesUnicode('bbb.aaa', 'aaa.bbb') > 0, 'files should be compared by names even if extensions compare differently');
        // dotfile comparisons
        assert(compareFileNamesUnicode('.abc', '.abc') === 0, 'equal dotfile names should be equal');
        assert(compareFileNamesUnicode('.env.', '.gitattributes') < 0, 'filenames starting with dots and with extensions should still sort properly');
        assert(compareFileNamesUnicode('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileNamesUnicode('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileNamesUnicode(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileNamesUnicode('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileNamesUnicode('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileNamesUnicode('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        assert(compareFileNamesUnicode('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        // numeric comparisons
        assert(compareFileNamesUnicode('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileNamesUnicode('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileNamesUnicode('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileNamesUnicode('a.ext1', 'b.Ext1') < 0, 'if names are different and extensions with numbers are equal except for case, filenames are sorted by unicode full filename');
        assert(compareFileNamesUnicode('a.ext1', 'a.Ext1') > 0, 'if names are equal and extensions with numbers are equal except for case, filenames are sorted by unicode full filename');
        //
        // Comparisons with different results than compareFileNamesDefault
        //
        // name-only comparisons
        assert(compareFileNamesUnicode('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileNamesUnicode('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileNamesUnicode('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesUnicode), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesUnicode), ['Email', 'email', 'Émail', 'émail'], 'the same base characters with different case or accents sort in unicode order');
        // name plus extension comparisons
        assert(compareFileNamesUnicode('aggregate.go', 'aggregate_repo.go') < 0, 'compares the whole name in unicode order, but dot comes before underscore');
        // dotfile comparisons
        assert(compareFileNamesUnicode('.aaa_env', '.aaa.env') > 0, 'an underscore in a dotfile name will sort after a dot');
        // numeric comparisons
        assert(compareFileNamesUnicode('abc2.txt', 'abc10.txt') > 0, 'filenames with numbers should be in unicode order even when they are multiple digits long');
        assert(compareFileNamesUnicode('abc02.txt', 'abc010.txt') > 0, 'filenames with numbers that have leading zeros sort in unicode order');
        assert(compareFileNamesUnicode('abc1.10.txt', 'abc1.2.txt') < 0, 'numbers with dots between them are sorted in unicode order');
        assert(compareFileNamesUnicode('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileNamesUnicode('abc.txt1', 'abc.txt01') > 0, 'same name plus extensions with equal numbers sort in unicode order');
        assert(compareFileNamesUnicode('art01', 'Art01') > 0, 'a numerically equivalent name of a different case compares uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileNamesUnicode), ['A100.txt', 'A2.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences sort in unicode order');
    });
    test('compareFileExtensionsUnicode', () => {
        //
        // Comparisons with the same result as compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUnicode(null, null) === 0, 'null should be equal');
        assert(compareFileExtensionsUnicode(null, 'abc') < 0, 'null should come before real files without extensions');
        assert(compareFileExtensionsUnicode('', '') === 0, 'empty should be equal');
        assert(compareFileExtensionsUnicode('abc', 'abc') === 0, 'equal names should be equal');
        assert(compareFileExtensionsUnicode('z', 'A') > 0, 'z comes after A');
        // name plus extension comparisons
        assert(compareFileExtensionsUnicode('file.ext', 'file.ext') === 0, 'equal full filenames should be equal');
        assert(compareFileExtensionsUnicode('a.ext', 'b.ext') < 0, 'if equal extensions, filenames should be compared');
        assert(compareFileExtensionsUnicode('file.aaa', 'file.bbb') < 0, 'files with equal names should be compared by extensions');
        assert(compareFileExtensionsUnicode('bbb.aaa', 'aaa.bbb') < 0, 'files should be compared by extension first');
        assert(compareFileExtensionsUnicode('a.md', 'b.MD') < 0, 'when extensions are the same except for case, the files sort by name');
        assert(compareFileExtensionsUnicode('a.MD', 'a.md') < 0, 'case differences in extensions sort in unicode order');
        // dotfile comparisons
        assert(compareFileExtensionsUnicode('.abc', '.abc') === 0, 'equal dotfiles should be equal');
        assert(compareFileExtensionsUnicode('.md', '.Gitattributes') > 0, 'dotfiles sort alphabetically regardless of case');
        assert(compareFileExtensionsUnicode('.env', '.aaa.env') > 0, 'dotfiles sort alphabetically when they contain multiple dots');
        assert(compareFileExtensionsUnicode('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
        // dotfile vs non-dotfile comparisons
        assert(compareFileExtensionsUnicode(null, '.abc') < 0, 'null should come before dotfiles');
        assert(compareFileExtensionsUnicode('.env', 'aaa.env') < 0, 'dotfiles come before filenames with extensions');
        assert(compareFileExtensionsUnicode('.MD', 'a.md') < 0, 'dotfiles sort before lowercase files');
        assert(compareFileExtensionsUnicode('.env', 'aaa') < 0, 'dotfiles come before filenames without extensions');
        assert(compareFileExtensionsUnicode('.md', 'A.MD') < 0, 'dotfiles sort before uppercase files');
        // numeric comparisons
        assert(compareFileExtensionsUnicode('1', '1') === 0, 'numerically equal full names should be equal');
        assert(compareFileExtensionsUnicode('abc1.txt', 'abc1.txt') === 0, 'equal filenames with numbers should be equal');
        assert(compareFileExtensionsUnicode('abc1.txt', 'abc2.txt') < 0, 'filenames with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUnicode('txt.abc1', 'txt.abc1') === 0, 'equal extensions with numbers should be equal');
        assert(compareFileExtensionsUnicode('txt.abc1', 'txt.abc2') < 0, 'extensions with numbers should be in numerical order, not alphabetical order');
        assert(compareFileExtensionsUnicode('a.ext1', 'b.ext1') < 0, 'if equal extensions with numbers, full filenames should be compared');
        //
        // Comparisons with different results than compareFileExtensionsDefault
        //
        // name-only comparisons
        assert(compareFileExtensionsUnicode('Z', 'a') < 0, 'Z comes before a');
        assert(compareFileExtensionsUnicode('a', 'A') > 0, 'the same letter sorts uppercase first');
        assert(compareFileExtensionsUnicode('â', 'Â') > 0, 'the same accented letter sorts uppercase first');
        assert.deepStrictEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsUnicode), ['Art', 'Artichoke', 'art', 'artichoke'], 'names with the same root and different cases sort uppercase names first');
        assert.deepStrictEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsUnicode), ['Email', 'email', 'Émail', 'émail'], 'the same base characters with different case or accents sort in unicode order');
        // name plus extension comparisons
        assert(compareFileExtensionsUnicode('a.MD', 'a.md') < 0, 'case differences in extensions sort by uppercase extension first');
        assert(compareFileExtensionsUnicode('a.md', 'A.md') > 0, 'case differences in names sort uppercase first');
        assert(compareFileExtensionsUnicode('art01', 'Art01') > 0, 'a numerically equivalent name of a different case sorts uppercase first');
        assert.deepStrictEqual(['a10.txt', 'A2.txt', 'A100.txt', 'a20.txt'].sort(compareFileExtensionsUnicode), ['A100.txt', 'A2.txt', 'a10.txt', 'a20.txt'], 'filenames with number and case differences sort in unicode order');
        assert(compareFileExtensionsUnicode('aggregate.go', 'aggregate_repo.go') < 0, 'when extensions are equal, compares full filenames in unicode order');
        // numeric comparisons
        assert(compareFileExtensionsUnicode('abc2.txt', 'abc10.txt') > 0, 'filenames with numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('abc02.txt', 'abc010.txt') > 0, 'filenames with numbers that have leading zeros sort in unicode order');
        assert(compareFileExtensionsUnicode('abc1.10.txt', 'abc1.2.txt') < 0, 'numbers with dots between them sort in unicode order');
        assert(compareFileExtensionsUnicode('abc2.txt2', 'abc1.txt10') > 0, 'extensions with numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('txt.abc2', 'txt.abc10') > 0, 'extensions with numbers should be in unicode order even when they are multiple digits long');
        assert(compareFileExtensionsUnicode('abc.txt01', 'abc.txt1') < 0, 'extensions with equal numbers should be in unicode order');
        assert(compareFileExtensionsUnicode('abc02.txt', 'abc002.txt') > 0, 'filenames with equivalent numbers and leading zeros sort in unicode order');
        assert(compareFileExtensionsUnicode('txt.abc01', 'txt.abc1') < 0, 'extensions with equivalent numbers sort in unicode order');
        assert(compareFileExtensionsUnicode('a.ext1', 'b.Ext1') < 0, 'if extensions with numbers are equal except for case, unicode full filenames should be compared');
        assert(compareFileExtensionsUnicode('a.ext1', 'a.Ext1') > 0, 'if extensions with numbers are equal except for case, unicode full filenames should be compared');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci9jb21wYXJlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIsZ0JBQWdCLEVBQ2hCLHVCQUF1QixFQUN2QixxQkFBcUIsRUFDckIsdUJBQXVCLEVBQ3ZCLHFCQUFxQixHQUNyQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNsRSxNQUFNLG9CQUFvQixHQUFHLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxFQUFFLENBQ3JELENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBRWpELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsRUFBRTtRQUNGLCtEQUErRDtRQUMvRCxFQUFFO1FBRUYsd0JBQXdCO1FBQ3hCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxLQUFLLENB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