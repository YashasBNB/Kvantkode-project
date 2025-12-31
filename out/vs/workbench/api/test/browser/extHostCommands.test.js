/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostCommands', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose calls unregister', function () {
        let lastUnregister;
        const shape = new (class extends mock() {
            $registerCommand(id) {
                //
            }
            $unregisterCommand(id) {
                lastUnregister = id;
            }
        })();
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        commands.registerCommand(true, 'foo', () => { }).dispose();
        assert.strictEqual(lastUnregister, 'foo');
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
    });
    test('dispose bubbles only once', function () {
        let unregisterCounter = 0;
        const shape = new (class extends mock() {
            $registerCommand(id) {
                //
            }
            $unregisterCommand(id) {
                unregisterCounter += 1;
            }
        })();
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        const reg = commands.registerCommand(true, 'foo', () => { });
        reg.dispose();
        reg.dispose();
        reg.dispose();
        assert.strictEqual(unregisterCounter, 1);
    });
    test('execute with retry', async function () {
        let count = 0;
        const shape = new (class extends mock() {
            $registerCommand(id) {
                //
            }
            async $executeCommand(id, args, retry) {
                count++;
                assert.strictEqual(retry, count === 1);
                if (count === 1) {
                    assert.strictEqual(retry, true);
                    throw new Error('$executeCommand:retry');
                }
                else {
                    assert.strictEqual(retry, false);
                    return 17;
                }
            }
        })();
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        const result = await commands.executeCommand('fooo', [this, true]);
        assert.strictEqual(result, 17);
        assert.strictEqual(count, 2);
    });
    test('onCommand:abc activates extensions when executed from command palette, but not when executed programmatically with vscode.commands.executeCommand #150293', async function () {
        const activationEvents = [];
        const shape = new (class extends mock() {
            $registerCommand(id) {
                //
            }
            $fireCommandActivationEvent(id) {
                activationEvents.push(id);
            }
        })();
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new (class extends mock() {
            onExtensionError() {
                return true;
            }
        })());
        commands.registerCommand(true, 'extCmd', (args) => args);
        const result = await commands.executeCommand('extCmd', this);
        assert.strictEqual(result, this);
        assert.deepStrictEqual(activationEvents, ['extCmd']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0Q29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLGlCQUFpQixFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1FBQ2hDLElBQUksY0FBc0IsQ0FBQTtRQUUxQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBMkI7WUFDdEQsZ0JBQWdCLENBQUMsRUFBVTtnQkFDbkMsRUFBRTtZQUNILENBQUM7WUFDUSxrQkFBa0IsQ0FBQyxFQUFVO2dCQUNyQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FBQTtRQUVKLE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxDQUNuQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsRUFDN0IsSUFBSSxjQUFjLEVBQUUsRUFDcEIsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQXFC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