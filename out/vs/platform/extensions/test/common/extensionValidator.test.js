/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { areApiProposalsCompatible, isValidExtensionVersion, isValidVersion, isValidVersionStr, normalizeVersion, parseVersion, } from '../../common/extensionValidator.js';
suite('Extension Version Validator', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const productVersion = '2021-05-11T21:54:30.577Z';
    test('isValidVersionStr', () => {
        assert.strictEqual(isValidVersionStr('0.10.0-dev'), true);
        assert.strictEqual(isValidVersionStr('0.10.0'), true);
        assert.strictEqual(isValidVersionStr('0.10.1'), true);
        assert.strictEqual(isValidVersionStr('0.10.100'), true);
        assert.strictEqual(isValidVersionStr('0.11.0'), true);
        assert.strictEqual(isValidVersionStr('x.x.x'), true);
        assert.strictEqual(isValidVersionStr('0.x.x'), true);
        assert.strictEqual(isValidVersionStr('0.10.0'), true);
        assert.strictEqual(isValidVersionStr('0.10.x'), true);
        assert.strictEqual(isValidVersionStr('^0.10.0'), true);
        assert.strictEqual(isValidVersionStr('*'), true);
        assert.strictEqual(isValidVersionStr('0.x.x.x'), false);
        assert.strictEqual(isValidVersionStr('0.10'), false);
        assert.strictEqual(isValidVersionStr('0.10.'), false);
    });
    test('parseVersion', () => {
        function assertParseVersion(version, hasCaret, hasGreaterEquals, majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, preRelease) {
            const actual = parseVersion(version);
            const expected = {
                hasCaret,
                hasGreaterEquals,
                majorBase,
                majorMustEqual,
                minorBase,
                minorMustEqual,
                patchBase,
                patchMustEqual,
                preRelease,
            };
            assert.deepStrictEqual(actual, expected, 'parseVersion for ' + version);
        }
        assertParseVersion('0.10.0-dev', false, false, 0, true, 10, true, 0, true, '-dev');
        assertParseVersion('0.10.0', false, false, 0, true, 10, true, 0, true, null);
        assertParseVersion('0.10.1', false, false, 0, true, 10, true, 1, true, null);
        assertParseVersion('0.10.100', false, false, 0, true, 10, true, 100, true, null);
        assertParseVersion('0.11.0', false, false, 0, true, 11, true, 0, true, null);
        assertParseVersion('x.x.x', false, false, 0, false, 0, false, 0, false, null);
        assertParseVersion('0.x.x', false, false, 0, true, 0, false, 0, false, null);
        assertParseVersion('0.10.x', false, false, 0, true, 10, true, 0, false, null);
        assertParseVersion('^0.10.0', true, false, 0, true, 10, true, 0, true, null);
        assertParseVersion('^0.10.2', true, false, 0, true, 10, true, 2, true, null);
        assertParseVersion('^1.10.2', true, false, 1, true, 10, true, 2, true, null);
        assertParseVersion('*', false, false, 0, false, 0, false, 0, false, null);
        assertParseVersion('>=0.0.1', false, true, 0, true, 0, true, 1, true, null);
        assertParseVersion('>=2.4.3', false, true, 2, true, 4, true, 3, true, null);
    });
    test('normalizeVersion', () => {
        function assertNormalizeVersion(version, majorBase, majorMustEqual, minorBase, minorMustEqual, patchBase, patchMustEqual, isMinimum, notBefore = 0) {
            const actual = normalizeVersion(parseVersion(version));
            const expected = {
                majorBase,
                majorMustEqual,
                minorBase,
                minorMustEqual,
                patchBase,
                patchMustEqual,
                isMinimum,
                notBefore,
            };
            assert.deepStrictEqual(actual, expected, 'parseVersion for ' + version);
        }
        assertNormalizeVersion('0.10.0-dev', 0, true, 10, true, 0, true, false, 0);
        assertNormalizeVersion('0.10.0-222222222', 0, true, 10, true, 0, true, false, 0);
        assertNormalizeVersion('0.10.0-20210511', 0, true, 10, true, 0, true, false, new Date('2021-05-11T00:00:00Z').getTime());
        assertNormalizeVersion('0.10.0', 0, true, 10, true, 0, true, false);
        assertNormalizeVersion('0.10.1', 0, true, 10, true, 1, true, false);
        assertNormalizeVersion('0.10.100', 0, true, 10, true, 100, true, false);
        assertNormalizeVersion('0.11.0', 0, true, 11, true, 0, true, false);
        assertNormalizeVersion('x.x.x', 0, false, 0, false, 0, false, false);
        assertNormalizeVersion('0.x.x', 0, true, 0, false, 0, false, false);
        assertNormalizeVersion('0.10.x', 0, true, 10, true, 0, false, false);
        assertNormalizeVersion('^0.10.0', 0, true, 10, true, 0, false, false);
        assertNormalizeVersion('^0.10.2', 0, true, 10, true, 2, false, false);
        assertNormalizeVersion('^1.10.2', 1, true, 10, false, 2, false, false);
        assertNormalizeVersion('*', 0, false, 0, false, 0, false, false);
        assertNormalizeVersion('>=0.0.1', 0, true, 0, true, 1, true, true);
        assertNormalizeVersion('>=2.4.3', 2, true, 4, true, 3, true, true);
        assertNormalizeVersion('>=2.4.3', 2, true, 4, true, 3, true, true);
    });
    test('isValidVersion', () => {
        function testIsValidVersion(version, desiredVersion, expectedResult) {
            const actual = isValidVersion(version, productVersion, desiredVersion);
            assert.strictEqual(actual, expectedResult, 'extension - vscode: ' +
                version +
                ', desiredVersion: ' +
                desiredVersion +
                ' should be ' +
                expectedResult);
        }
        testIsValidVersion('0.10.0-dev', 'x.x.x', true);
        testIsValidVersion('0.10.0-dev', '0.x.x', true);
        testIsValidVersion('0.10.0-dev', '0.10.0', true);
        testIsValidVersion('0.10.0-dev', '0.10.2', false);
        testIsValidVersion('0.10.0-dev', '^0.10.2', false);
        testIsValidVersion('0.10.0-dev', '0.10.x', true);
        testIsValidVersion('0.10.0-dev', '^0.10.0', true);
        testIsValidVersion('0.10.0-dev', '*', true);
        testIsValidVersion('0.10.0-dev', '>=0.0.1', true);
        testIsValidVersion('0.10.0-dev', '>=0.0.10', true);
        testIsValidVersion('0.10.0-dev', '>=0.10.0', true);
        testIsValidVersion('0.10.0-dev', '>=0.10.1', false);
        testIsValidVersion('0.10.0-dev', '>=1.0.0', false);
        testIsValidVersion('0.10.0', 'x.x.x', true);
        testIsValidVersion('0.10.0', '0.x.x', true);
        testIsValidVersion('0.10.0', '0.10.0', true);
        testIsValidVersion('0.10.0', '0.10.2', false);
        testIsValidVersion('0.10.0', '^0.10.2', false);
        testIsValidVersion('0.10.0', '0.10.x', true);
        testIsValidVersion('0.10.0', '^0.10.0', true);
        testIsValidVersion('0.10.0', '*', true);
        testIsValidVersion('0.10.1', 'x.x.x', true);
        testIsValidVersion('0.10.1', '0.x.x', true);
        testIsValidVersion('0.10.1', '0.10.0', false);
        testIsValidVersion('0.10.1', '0.10.2', false);
        testIsValidVersion('0.10.1', '^0.10.2', false);
        testIsValidVersion('0.10.1', '0.10.x', true);
        testIsValidVersion('0.10.1', '^0.10.0', true);
        testIsValidVersion('0.10.1', '*', true);
        testIsValidVersion('0.10.100', 'x.x.x', true);
        testIsValidVersion('0.10.100', '0.x.x', true);
        testIsValidVersion('0.10.100', '0.10.0', false);
        testIsValidVersion('0.10.100', '0.10.2', false);
        testIsValidVersion('0.10.100', '^0.10.2', true);
        testIsValidVersion('0.10.100', '0.10.x', true);
        testIsValidVersion('0.10.100', '^0.10.0', true);
        testIsValidVersion('0.10.100', '*', true);
        testIsValidVersion('0.11.0', 'x.x.x', true);
        testIsValidVersion('0.11.0', '0.x.x', true);
        testIsValidVersion('0.11.0', '0.10.0', false);
        testIsValidVersion('0.11.0', '0.10.2', false);
        testIsValidVersion('0.11.0', '^0.10.2', false);
        testIsValidVersion('0.11.0', '0.10.x', false);
        testIsValidVersion('0.11.0', '^0.10.0', false);
        testIsValidVersion('0.11.0', '*', true);
        // Anything < 1.0.0 is compatible
        testIsValidVersion('1.0.0', 'x.x.x', true);
        testIsValidVersion('1.0.0', '0.x.x', true);
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '1.0.0', true);
        testIsValidVersion('1.0.0', '^1.0.0', true);
        testIsValidVersion('1.0.0', '^2.0.0', false);
        testIsValidVersion('1.0.0', '*', true);
        testIsValidVersion('1.0.0', '>=0.0.1', true);
        testIsValidVersion('1.0.0', '>=0.0.10', true);
        testIsValidVersion('1.0.0', '>=0.10.0', true);
        testIsValidVersion('1.0.0', '>=0.10.1', true);
        testIsValidVersion('1.0.0', '>=1.0.0', true);
        testIsValidVersion('1.0.0', '>=1.1.0', false);
        testIsValidVersion('1.0.0', '>=1.0.1', false);
        testIsValidVersion('1.0.0', '>=2.0.0', false);
        testIsValidVersion('1.0.100', 'x.x.x', true);
        testIsValidVersion('1.0.100', '0.x.x', true);
        testIsValidVersion('1.0.100', '0.10.0', false);
        testIsValidVersion('1.0.100', '0.10.2', false);
        testIsValidVersion('1.0.100', '^0.10.2', true);
        testIsValidVersion('1.0.100', '0.10.x', true);
        testIsValidVersion('1.0.100', '^0.10.0', true);
        testIsValidVersion('1.0.100', '1.0.0', false);
        testIsValidVersion('1.0.100', '^1.0.0', true);
        testIsValidVersion('1.0.100', '^1.0.1', true);
        testIsValidVersion('1.0.100', '^2.0.0', false);
        testIsValidVersion('1.0.100', '*', true);
        testIsValidVersion('1.100.0', 'x.x.x', true);
        testIsValidVersion('1.100.0', '0.x.x', true);
        testIsValidVersion('1.100.0', '0.10.0', false);
        testIsValidVersion('1.100.0', '0.10.2', false);
        testIsValidVersion('1.100.0', '^0.10.2', true);
        testIsValidVersion('1.100.0', '0.10.x', true);
        testIsValidVersion('1.100.0', '^0.10.0', true);
        testIsValidVersion('1.100.0', '1.0.0', false);
        testIsValidVersion('1.100.0', '^1.0.0', true);
        testIsValidVersion('1.100.0', '^1.1.0', true);
        testIsValidVersion('1.100.0', '^1.100.0', true);
        testIsValidVersion('1.100.0', '^2.0.0', false);
        testIsValidVersion('1.100.0', '*', true);
        testIsValidVersion('1.100.0', '>=1.99.0', true);
        testIsValidVersion('1.100.0', '>=1.100.0', true);
        testIsValidVersion('1.100.0', '>=1.101.0', false);
        testIsValidVersion('2.0.0', 'x.x.x', true);
        testIsValidVersion('2.0.0', '0.x.x', false);
        testIsValidVersion('2.0.0', '0.10.0', false);
        testIsValidVersion('2.0.0', '0.10.2', false);
        testIsValidVersion('2.0.0', '^0.10.2', false);
        testIsValidVersion('2.0.0', '0.10.x', false);
        testIsValidVersion('2.0.0', '^0.10.0', false);
        testIsValidVersion('2.0.0', '1.0.0', false);
        testIsValidVersion('2.0.0', '^1.0.0', false);
        testIsValidVersion('2.0.0', '^1.1.0', false);
        testIsValidVersion('2.0.0', '^1.100.0', false);
        testIsValidVersion('2.0.0', '^2.0.0', true);
        testIsValidVersion('2.0.0', '*', true);
    });
    test('isValidExtensionVersion', () => {
        function testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, expectedResult) {
            const manifest = {
                name: 'test',
                publisher: 'test',
                version: '0.0.0',
                engines: {
                    vscode: desiredVersion,
                },
                main: hasMain ? 'something' : undefined,
            };
            const reasons = [];
            const actual = isValidExtensionVersion(version, productVersion, manifest, isBuiltin, reasons);
            assert.strictEqual(actual, expectedResult, 'version: ' +
                version +
                ', desiredVersion: ' +
                desiredVersion +
                ', desc: ' +
                JSON.stringify(manifest) +
                ', reasons: ' +
                JSON.stringify(reasons));
        }
        function testIsInvalidExtensionVersion(version, desiredVersion, isBuiltin, hasMain) {
            testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, false);
        }
        function testIsValidExtensionVersion(version, desiredVersion, isBuiltin, hasMain) {
            testExtensionVersion(version, desiredVersion, isBuiltin, hasMain, true);
        }
        function testIsValidVersion(version, desiredVersion, expectedResult) {
            testExtensionVersion(version, desiredVersion, false, true, expectedResult);
        }
        // builtin are allowed to use * or x.x.x
        testIsValidExtensionVersion('0.10.0-dev', '*', true, true);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', true, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', true, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', true, true);
        testIsValidExtensionVersion('0.10.0-dev', '*', true, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', true, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', true, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', true, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', true, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', true, false);
        // normal extensions are allowed to use * or x.x.x only if they have no main
        testIsInvalidExtensionVersion('0.10.0-dev', '*', false, true);
        testIsInvalidExtensionVersion('0.10.0-dev', 'x.x.x', false, true);
        testIsInvalidExtensionVersion('0.10.0-dev', '0.x.x', false, true);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, true);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, true);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        // extensions without "main" get no version check
        testIsValidExtensionVersion('0.10.0-dev', '>=0.9.1-pre.1', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '*', false, false);
        testIsValidExtensionVersion('0.10.0-dev', 'x.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.x.x', false, false);
        testIsValidExtensionVersion('0.10.0-dev', '0.10.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.x.x', false, false);
        testIsValidExtensionVersion('1.10.0-dev', '1.10.x', false, false);
        // normal extensions with code
        testIsValidVersion('0.10.0-dev', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0-dev', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0-dev', '0.10.0', true);
        testIsValidVersion('0.10.0-dev', '0.10.2', false);
        testIsValidVersion('0.10.0-dev', '^0.10.2', false);
        testIsValidVersion('0.10.0-dev', '0.10.x', true);
        testIsValidVersion('0.10.0-dev', '^0.10.0', true);
        testIsValidVersion('0.10.0-dev', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.0', '0.10.0', true);
        testIsValidVersion('0.10.0', '0.10.2', false);
        testIsValidVersion('0.10.0', '^0.10.2', false);
        testIsValidVersion('0.10.0', '0.10.x', true);
        testIsValidVersion('0.10.0', '^0.10.0', true);
        testIsValidVersion('0.10.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.1', '0.10.0', false);
        testIsValidVersion('0.10.1', '0.10.2', false);
        testIsValidVersion('0.10.1', '^0.10.2', false);
        testIsValidVersion('0.10.1', '0.10.x', true);
        testIsValidVersion('0.10.1', '^0.10.0', true);
        testIsValidVersion('0.10.1', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.10.100', '0.10.0', false);
        testIsValidVersion('0.10.100', '0.10.2', false);
        testIsValidVersion('0.10.100', '^0.10.2', true);
        testIsValidVersion('0.10.100', '0.10.x', true);
        testIsValidVersion('0.10.100', '^0.10.0', true);
        testIsValidVersion('0.10.100', '*', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('0.11.0', '0.10.0', false);
        testIsValidVersion('0.11.0', '0.10.2', false);
        testIsValidVersion('0.11.0', '^0.10.2', false);
        testIsValidVersion('0.11.0', '0.10.x', false);
        testIsValidVersion('0.11.0', '^0.10.0', false);
        testIsValidVersion('0.11.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.10.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.10.0', '1.x.x', true);
        testIsValidVersion('1.10.0', '1.10.0', true);
        testIsValidVersion('1.10.0', '1.10.2', false);
        testIsValidVersion('1.10.0', '^1.10.2', false);
        testIsValidVersion('1.10.0', '1.10.x', true);
        testIsValidVersion('1.10.0', '^1.10.0', true);
        testIsValidVersion('1.10.0', '*', false); // fails due to lack of specificity
        // Anything < 1.0.0 is compatible
        testIsValidVersion('1.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.0', '0.10.0', false);
        testIsValidVersion('1.0.0', '0.10.2', false);
        testIsValidVersion('1.0.0', '^0.10.2', true);
        testIsValidVersion('1.0.0', '0.10.x', true);
        testIsValidVersion('1.0.0', '^0.10.0', true);
        testIsValidVersion('1.0.0', '1.0.0', true);
        testIsValidVersion('1.0.0', '^1.0.0', true);
        testIsValidVersion('1.0.0', '^2.0.0', false);
        testIsValidVersion('1.0.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.0.100', '0.10.0', false);
        testIsValidVersion('1.0.100', '0.10.2', false);
        testIsValidVersion('1.0.100', '^0.10.2', true);
        testIsValidVersion('1.0.100', '0.10.x', true);
        testIsValidVersion('1.0.100', '^0.10.0', true);
        testIsValidVersion('1.0.100', '1.0.0', false);
        testIsValidVersion('1.0.100', '^1.0.0', true);
        testIsValidVersion('1.0.100', '^1.0.1', true);
        testIsValidVersion('1.0.100', '^2.0.0', false);
        testIsValidVersion('1.0.100', '*', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('1.100.0', '0.10.0', false);
        testIsValidVersion('1.100.0', '0.10.2', false);
        testIsValidVersion('1.100.0', '^0.10.2', true);
        testIsValidVersion('1.100.0', '0.10.x', true);
        testIsValidVersion('1.100.0', '^0.10.0', true);
        testIsValidVersion('1.100.0', '1.0.0', false);
        testIsValidVersion('1.100.0', '^1.0.0', true);
        testIsValidVersion('1.100.0', '^1.1.0', true);
        testIsValidVersion('1.100.0', '^1.100.0', true);
        testIsValidVersion('1.100.0', '^2.0.0', false);
        testIsValidVersion('1.100.0', '*', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', 'x.x.x', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', '0.x.x', false); // fails due to lack of specificity
        testIsValidVersion('2.0.0', '0.10.0', false);
        testIsValidVersion('2.0.0', '0.10.2', false);
        testIsValidVersion('2.0.0', '^0.10.2', false);
        testIsValidVersion('2.0.0', '0.10.x', false);
        testIsValidVersion('2.0.0', '^0.10.0', false);
        testIsValidVersion('2.0.0', '1.0.0', false);
        testIsValidVersion('2.0.0', '^1.0.0', false);
        testIsValidVersion('2.0.0', '^1.1.0', false);
        testIsValidVersion('2.0.0', '^1.100.0', false);
        testIsValidVersion('2.0.0', '^2.0.0', true);
        testIsValidVersion('2.0.0', '*', false); // fails due to lack of specificity
        // date tags
        testIsValidVersion('1.10.0', '^1.10.0-20210511', true); // current date
        testIsValidVersion('1.10.0', '^1.10.0-20210510', true); // before date
        testIsValidVersion('1.10.0', '^1.10.0-20210512', false); // future date
        testIsValidVersion('1.10.1', '^1.10.0-20200101', true); // before date, but ahead version
        testIsValidVersion('1.11.0', '^1.10.0-20200101', true);
    });
    test('isValidExtensionVersion checks browser only extensions', () => {
        const manifest = {
            name: 'test',
            publisher: 'test',
            version: '0.0.0',
            engines: {
                vscode: '^1.45.0',
            },
            browser: 'something',
        };
        assert.strictEqual(isValidExtensionVersion('1.44.0', undefined, manifest, false, []), false);
    });
    test('areApiProposalsCompatible', () => {
        assert.strictEqual(areApiProposalsCompatible([]), true);
        assert.strictEqual(areApiProposalsCompatible([], ['hello']), true);
        assert.strictEqual(areApiProposalsCompatible([], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { proposal1: { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { proposal1: { proposal: '', version: 1 } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { proposal1: { proposal: '', version: 1 } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1'], { proposal2: { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1', 'proposal2'], {}), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal1', 'proposal2'], { proposal1: { proposal: '' } }), true);
        assert.strictEqual(areApiProposalsCompatible(['proposal2@1'], { proposal1: { proposal: '' } }), false);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { proposal1: { proposal: '', version: 2 } }), false);
        assert.strictEqual(areApiProposalsCompatible(['proposal1@1'], { proposal1: { proposal: '' } }), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbnMvdGVzdC9jb21tb24vZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFDTix5QkFBeUIsRUFHekIsdUJBQXVCLEVBQ3ZCLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLGNBQWMsR0FBRywwQkFBMEIsQ0FBQTtJQUVqRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtR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Q0FBQTtRQUM3RSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV6RSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsU0FBUyxzQkFBc0IsQ0FDOUIsT0FBZSxFQUNmLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFNBQWtCLEVBQ2xCLFNBQVMsR0FBRyxDQUFDO1lBRWIsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDdEQsTUFBTSxRQUFRLEdBQXVCO2dCQUNwQyxTQUFTO2dCQUNULGNBQWM7Z0JBQ2QsU0FBUztnQkFDVCxjQUFjO2dCQUNkLFNBQVM7Z0JBQ1QsY0FBYztnQkFDZCxTQUFTO2dCQUNULFNBQVM7YUFDVCxDQUFBO1lBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLHNCQUFzQixDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRixzQkFBc0IsQ0FDckIsaUJBQWlCLEVBQ2pCLENBQUMsRUFDRCxJQUFJLEVBQ0osRUFBRSxFQUNGLElBQUksRUFDSixDQUFDLEVBQ0QsSUFBSSxFQUNKLEtBQUssRUFDTCxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUMxQyxDQUFBO1FBRUQsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25FLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRSxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5FLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckUsc0JBQXNCLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RFLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVoRSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEUsc0JBQXNCLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xFLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsU0FBUyxrQkFBa0IsQ0FDMUIsT0FBZSxFQUNmLGNBQXNCLEVBQ3RCLGNBQXVCO1lBRXZCLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sRUFDTixjQUFjLEVBQ2Qsc0JBQXNCO2dCQUNyQixPQUFPO2dCQUNQLG9CQUFvQjtnQkFDcEIsY0FBYztnQkFDZCxhQUFhO2dCQUNiLGNBQWMsQ0FDZixDQUFBO1FBQ0YsQ0FBQztRQUVELGtCQUFrQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0Msa0JBQWtCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELGtCQUFrQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsa0JBQWtCLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELGtCQUFrQixDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsa0JBQWtCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELGtCQUFrQixDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsa0JBQWtCLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELGtCQUFrQixDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFbEQsa0JBQWtCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXZDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Msa0JBQWtCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV2QyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0Msa0JBQWtCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9DLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXZDLGlDQUFpQztRQUVqQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMs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QUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVoRSw0RUFBNEU7UUFDNUUsNkJBQTZCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsNkJBQTZCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakUsNkJBQTZCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakUsaURBQWlEO1FBQ2pELDJCQUEyQixDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtB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