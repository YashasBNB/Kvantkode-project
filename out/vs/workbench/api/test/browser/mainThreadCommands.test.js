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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkQ29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFtQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXJFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsb0JBQW9CLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsdUJBQXVCLEVBQUU7UUFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxrQkFBa0IsQ0FDdEMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQzVCLFNBQVUsRUFDVixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBcUI7U0FBRyxDQUFDLEVBQUUsQ0FDbEQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRWpFLFdBQVc7UUFDWCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUU3QyxhQUFhO1FBQ2Is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