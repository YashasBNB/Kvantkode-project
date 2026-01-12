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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2NvbXBhcmVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIsNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQixnQkFBZ0IsRUFDaEIsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIscUJBQXFCLEdBQ3JCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFNUUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xFLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FDckQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7QUFFakQsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixFQUFFO1FBQ0YsK0RBQStEO1FBQy9ELEVBQUU7UUFFRix3QkFBd0I7UUFDeEIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtB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QUMzRCxvREFBb0QsQ0FDcEQsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUN6RCw0RkFBNEYsQ0FDNUYsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUN6RCwwREFBMEQsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUMzRCwyRUFBMkUsQ0FDM0UsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUN6RCwwREFBMEQsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUNwRCxpR0FBaUcsQ0FDakcsQ0FBQTtRQUNELE1BQU0sQ0FDTCw0QkFBNEIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUNwRCxpR0FBaUcsQ0FDakcsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9