/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadCommands', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose on unregister', function () {
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), undefined, new (class extends mock() {
        })());
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        // register
        commands.$registerCommand('foo');
        assert.ok(CommandsRegistry.getCommand('foo'));
        // unregister
        commands.$unregisterCommand('foo');
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        commands.dispose();
    });
    test('unregister all on dispose', function () {
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), undefined, new (class extends mock() {
        })());
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        commands.$registerCommand('foo');
        commands.$registerCommand('bar');
        assert.ok(CommandsRegistry.getCommand('foo'));
        assert.ok(CommandsRegistry.getCommand('bar'));
        commands.dispose();
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        assert.strictEqual(CommandsRegistry.getCommand('bar'), undefined);
    });
    test('activate and throw when needed', async function () {
        const activations = [];
        const runs = [];
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), new (class extends mock() {
            executeCommand(id) {
                runs.push(id);
                return Promise.resolve(undefined);
            }
        })(), new (class extends mock() {
            activateByEvent(id) {
                activations.push(id);
                return Promise.resolve();
            }
        })());
        // case 1: arguments and retry
        try {
            activations.length = 0;
            await commands.$executeCommand('bazz', [1, 2, { n: 3 }], true);
            assert.ok(false);
        }
        catch (e) {
            assert.deepStrictEqual(activations, ['onCommand:bazz']);
            assert.strictEqual(e.message, '$executeCommand:retry');
        }
        // case 2: no arguments and retry
        runs.length = 0;
        await commands.$executeCommand('bazz', [], true);
        assert.deepStrictEqual(runs, ['bazz']);
        // case 3: arguments and no retry
        runs.length = 0;
        await commands.$executeCommand('bazz', [1, 2, true], false);
        assert.deepStrictEqual(runs, ['bazz']);
        commands.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRDb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQW1CLE1BQU0sa0RBQWtELENBQUE7QUFDcEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxvQkFBb0IsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFrQixDQUN0QyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFDNUIsU0FBVSxFQUNWLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFxQjtTQUFHLENBQUMsRUFBRSxDQUNsRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFakUsV0FBVztRQUNYLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FB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