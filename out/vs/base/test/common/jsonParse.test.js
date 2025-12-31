/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { parse, stripComments } from '../../common/jsonc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON Parse', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Line comment', () => {
        const content = ['{', '  "prop": 10 // a comment', '}'].join('\n');
        const expected = ['{', '  "prop": 10 ', '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF', () => {
        const content = ['{', '}', '// a comment'].join('\n');
        const expected = ['{', '}', ''].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - \\r\\n', () => {
        const content = ['{', '  "prop": 10 // a comment', '}'].join('\r\n');
        const expected = ['{', '  "prop": 10 ', '}'].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Line comment - EOF - \\r\\n', () => {
        const content = ['{', '}', '// a comment'].join('\r\n');
        const expected = ['{', '}', ''].join('\r\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - single line', () => {
        const content = ['{', '  /* before */"prop": 10/* after */', '}'].join('\n');
        const expected = ['{', '  "prop": 10', '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - multi line', () => {
        const content = ['{', '  /**', '   * Some comment', '   */', '  "prop": 10', '}'].join('\n');
        const expected = ['{', '  ', '  "prop": 10', '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Block comment - shortest match', () => {
        const content = '/* abc */ */';
        const expected = ' */';
        assert.strictEqual(stripComments(content), expected);
    });
    test('No strings - double quote', () => {
        const content = ['{', '  "/* */": 10', '}'].join('\n');
        const expected = ['{', '  "/* */": 10', '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('No strings - single quote', () => {
        const content = ['{', "  '/* */': 10", '}'].join('\n');
        const expected = ['{', "  '/* */': 10", '}'].join('\n');
        assert.strictEqual(stripComments(content), expected);
    });
    test('Trailing comma in object', () => {
        const content = ['{', `  "a": 10,`, '}'].join('\n');
        const expected = ['{', `  "a": 10`, '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma in array', () => {
        const content = [`[ "a", "b", "c", ]`].join('\n');
        const expected = [`[ "a", "b", "c" ]`].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma', () => {
        const content = [
            '{',
            '  "propA": 10, // a comment',
            '  "propB": false, // a trailing comma',
            '}',
        ].join('\n');
        const expected = ['{', '  "propA": 10,', '  "propB": false', '}'].join('\n');
        assert.deepEqual(parse(content), JSON.parse(expected));
    });
    test('Trailing comma - EOF', () => {
        const content = `
// This configuration file allows you to pass permanent command line arguments to VS Code.
// Only a subset of arguments is currently supported to reduce the likelihood of breaking
// the installation.
//
// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT
//
// NOTE: Changing this file requires a restart of VS Code.
{
	// Use software rendering instead of hardware accelerated rendering.
	// This can help in cases where you see rendering issues in VS Code.
	// "disable-hardware-acceleration": true,
	// Allows to disable crash reporting.
	// Should restart the app if the value is changed.
	"enable-crash-reporter": true,
	// Unique id used for correlating crash reports sent from this instance.
	// Do not edit this value.
	"crash-reporter-id": "aaaaab31-7453-4506-97d0-93411b2c21c7",
	"locale": "en",
	// "log-level": "trace"
}
`;
        assert.deepEqual(parse(content), {
            'enable-crash-reporter': true,
            'crash-reporter-id': 'aaaaab31-7453-4506-97d0-93411b2c21c7',
            locale: 'en',
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblBhcnNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb25QYXJzZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sT0FBTyxHQUFXLENBQUMsR0FBRyxFQUFFLDJCQUEyQixFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxRSxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxPQUFPLEdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FB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