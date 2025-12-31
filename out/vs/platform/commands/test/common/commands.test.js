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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbW1hbmRzL3Rlc3QvY29tbW9uL2NvbW1hbmRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTNELEtBQUssQ0FBQyxlQUFlLEVBQUU7SUFDdEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLElBQUssQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sT0FBTyxHQUFHLGNBQWEsQ0FBQyxDQUFBO1FBQzlCLE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFFLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFBO1FBQ2xFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNiLE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFBO0lBQzVE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