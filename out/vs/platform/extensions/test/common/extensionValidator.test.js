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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVmFsaWRhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL3Rlc3QvY29tbW9uL2V4dGVuc2lvblZhbGlkYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQ04seUJBQXlCLEVBR3pCLHVCQUF1QixFQUN2QixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixZQUFZLEdBQ1osTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxjQUFjLEdBQUcsMEJBQTBCLENBQUE7SUFFakQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixTQUFTLGtCQUFrQixDQUMxQixPQUFlLEVBQ2YsUUFBaUIsRUFDakIsZ0JBQXlCLEVBQ3pCLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFNBQWlCLEVBQ2pCLGNBQXVCLEVBQ3ZCLFVBQXlCO1lBRXpCLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQyxNQUFNLFFBQVEsR0FBbUI7Z0JBQ2hDLFFBQVE7Z0JBQ1IsZ0JBQWdCO2dCQUNoQixTQUFTO2dCQUNULGNBQWM7Z0JBQ2QsU0FBUztnQkFDVCxjQUFjO2dCQUNkLFNBQVM7Z0JBQ1QsY0FBYztnQkFDZCxVQUFVO2FBQ1YsQ0FBQTtZQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBRUQsa0JBQWtCLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEYsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEYsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFNUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Usa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Usa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekUsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Usa0JBQWtCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLFNBQVMsc0JBQXNCLENBQzlCLE9BQWUsRUFDZixTQUFpQixFQUNqQixjQUF1QixFQUN2QixTQUFpQixFQUNqQixjQUF1QixFQUN2QixTQUFpQixFQUNqQixjQUF1QixFQUN2QixTQUFrQixFQUNsQixTQUFTLEdBQUcsQ0FBQztZQUViLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ3RELE1BQU0sUUFBUSxHQUF1QjtnQkFDcEMsU0FBUztnQkFDVCxjQUFjO2dCQUNkLFNBQVM7Z0JBQ1QsY0FBYztnQkFDZCxTQUFTO2dCQUNULGNBQWM7Z0JBQ2QsU0FBUztnQkFDVCxTQUFTO2FBQ1QsQ0FBQTtZQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBRUQsc0JBQXNCLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxzQkFBc0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsc0JBQXNCLENBQ3JCLGlCQUFpQixFQUNqQixDQUFDLEVBQ0QsSUFBSSxFQUNKLEVBQUUsRUFDRixJQUFJLEVBQ0osQ0FBQyxFQUNELElBQUksRUFDSixLQUFLLEVBQ0wsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FDMUMsQ0FBQTtRQUVELHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbkUsc0JBQXNCLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZFLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEUsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25FLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckUsc0JBQXNCLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFD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QVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUU3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV4QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0Msa0JBQWtCLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNoRCxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpELGtCQUFrQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLFNBQVMsb0JBQW9CLENBQzVCLE9BQWUsRUFDZixjQUFzQixFQUN0QixTQUFrQixFQUNsQixPQUFnQixFQUNoQixjQUF1QjtZQUV2QixNQUFNLFFBQVEsR0FBdUI7Z0JBQ3BDLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixPQUFPLEVBQUUsT0FBTztnQkFDaEIsT0FBTyxFQUFFO29CQUNSLE1BQU0sRUFBRSxjQUFjO2lCQUN0QjtnQkFDRCxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDdkMsQ0FBQTtZQUNELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtZQUM1QixNQUFNLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFN0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxFQUNOLGNBQWMsRUFDZCxXQUFXO2dCQUNWLE9BQU87Z0JBQ1Asb0JBQW9CO2dCQUNwQixjQUFjO2dCQUNkLFVBQVU7Z0JBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7Z0JBQ3hCLGFBQWE7Z0JBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FDeEIsQ0FBQTtRQUNGLENBQUM7UUFFRCxTQUFTLDZCQUE2QixDQUNyQyxPQUFlLEVBQ2YsY0FBc0IsRUFDdEIsU0FBa0IsRUFDbEIsT0FBZ0I7WUFFaEIsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFFRCxTQUFTLDJCQUEyQixDQUNuQyxPQUFlLEVBQ2YsY0FBc0IsRUFDdEIsU0FBa0IsRUFDbEIsT0FBZ0I7WUFFaEIsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxTQUFTLGtCQUFrQixDQUMxQixPQUFlLEVBQ2YsY0FBc0IsRUFDdEIsY0FBdUI7WUFFdkIsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFFRCx3Q0FBd0M7UUFDeEMsMkJBQTJCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUQsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUQsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUQsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUQsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsMkJBQTJCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFaEUsNEVBQTRFO1FBQzVFLDZCQUE2QixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELDZCQUE2QixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLDZCQUE2QixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9ELDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzVELDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hFLDJCQUEyQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpFLGlEQUFpRDtRQUNqRCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoRSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVqRSw4QkFB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