/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { prepareCommand } from '../../node/terminals.js';
suite('Debug - prepareCommand', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bash', () => {
        assert.strictEqual(prepareCommand('bash', ['{$} ('], false).trim(), '\\{\\$\\}\\ \\(');
        assert.strictEqual(prepareCommand('bash', ['hello', 'world', '--flag=true'], false).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('bash', [' space arg '], false).trim(), '\\ space\\ arg\\');
        assert.strictEqual(prepareCommand('bash', ['{$} ('], true).trim(), '{$} (');
        assert.strictEqual(prepareCommand('bash', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('bash', [' space arg '], true).trim(), 'space arg');
    });
    test('bash - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('bash', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), 'arg1 > \\>\\ hello.txt < \\<input.in');
    });
    test('cmd', () => {
        assert.strictEqual(prepareCommand('cmd.exe', ['^!< '], false).trim(), '"^^^!^< "');
        assert.strictEqual(prepareCommand('cmd.exe', ['hello', 'world', '--flag=true'], false).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('cmd.exe', [' space arg '], false).trim(), '" space arg "');
        assert.strictEqual(prepareCommand('cmd.exe', ['"A>0"'], false).trim(), '"""A^>0"""');
        assert.strictEqual(prepareCommand('cmd.exe', [''], false).trim(), '""');
        assert.strictEqual(prepareCommand('cmd.exe', ['^!< '], true).trim(), '^!<');
        assert.strictEqual(prepareCommand('cmd.exe', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('cmd.exe', [' space arg '], true).trim(), 'space arg');
        assert.strictEqual(prepareCommand('cmd.exe', ['"A>0"'], true).trim(), '"A>0"');
        assert.strictEqual(prepareCommand('cmd.exe', [''], true).trim(), '');
    });
    test('cmd - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('cmd.exe', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), 'arg1 > "^> hello.txt" < ^<input.in');
    });
    test('powershell', () => {
        assert.strictEqual(prepareCommand('powershell', ['!< '], false).trim(), `& '!< '`);
        assert.strictEqual(prepareCommand('powershell', ['hello', 'world', '--flag=true'], false).trim(), `& 'hello' 'world' '--flag=true'`);
        assert.strictEqual(prepareCommand('powershell', [' space arg '], false).trim(), `& ' space arg '`);
        assert.strictEqual(prepareCommand('powershell', ['"A>0"'], false).trim(), `& '"A>0"'`);
        assert.strictEqual(prepareCommand('powershell', [''], false).trim(), `& ''`);
        assert.strictEqual(prepareCommand('powershell', ['!< '], true).trim(), '!<');
        assert.strictEqual(prepareCommand('powershell', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('powershell', [' space arg '], true).trim(), 'space arg');
        assert.strictEqual(prepareCommand('powershell', ['"A>0"'], true).trim(), '"A>0"');
        assert.strictEqual(prepareCommand('powershell', [''], true).trim(), ``);
    });
    test('powershell - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('powershell', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), `& 'arg1' > '> hello.txt' < '<input.in'`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L25vZGUvdGVybWluYWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUV4RCxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUNqQixjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFDdkUseUJBQXlCLENBQ3pCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRTdGLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNF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