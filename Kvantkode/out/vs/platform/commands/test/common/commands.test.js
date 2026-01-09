/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { combinedDisposable } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CommandsRegistry } from '../../common/commands.js';
suite('Command Tests', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('register command - no handler', function () {
        assert.throws(() => CommandsRegistry.registerCommand('foo', null));
    });
    test('register/dispose', () => {
        const command = function () { };
        const reg = CommandsRegistry.registerCommand('foo', command);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command);
        reg.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
    });
    test('register/register/dispose', () => {
        const command1 = function () { };
        const command2 = function () { };
        // dispose overriding command
        let reg1 = CommandsRegistry.registerCommand('foo', command1);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command1);
        let reg2 = CommandsRegistry.registerCommand('foo', command2);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg2.dispose();
        assert.ok(CommandsRegistry.getCommand('foo').handler === command1);
        reg1.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
        // dispose override command first
        reg1 = CommandsRegistry.registerCommand('foo', command1);
        reg2 = CommandsRegistry.registerCommand('foo', command2);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg1.dispose();
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg2.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
    });
    test('command with description', function () {
        const r1 = CommandsRegistry.registerCommand('test', function (accessor, args) {
            assert.ok(typeof args === 'string');
        });
        const r2 = CommandsRegistry.registerCommand('test2', function (accessor, args) {
            assert.ok(typeof args === 'string');
        });
        const r3 = CommandsRegistry.registerCommand({
            id: 'test3',
            handler: function (accessor, args) {
                return true;
            },
            metadata: {
                description: 'a command',
                args: [{ name: 'value', constraint: Number }],
            },
        });
        CommandsRegistry.getCommands().get('test').handler.apply(undefined, [undefined, 'string']);
        CommandsRegistry.getCommands().get('test2').handler.apply(undefined, [undefined, 'string']);
        assert.throws(() => CommandsRegistry.getCommands().get('test3').handler.apply(undefined, [undefined, 'string']));
        assert.strictEqual(CommandsRegistry.getCommands().get('test3').handler.apply(undefined, [undefined, 1]), true);
        combinedDisposable(r1, r2, r3).dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29tbWFuZHMvdGVzdC9jb21tb24vY29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFM0QsS0FBSyxDQUFDLGVBQWUsRUFBRTtJQUN0Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsY0FBYSxDQUFDLENBQUE7UUFDOUIsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUUsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7UUFDbEUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtB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