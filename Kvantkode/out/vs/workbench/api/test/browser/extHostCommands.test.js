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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RDb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsaUJBQWlCLEVBQUU7SUFDeEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsSUFBSSxjQUFzQixDQUFBO1FBRTFCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUEyQjtZQUN0RCxnQkFBZ0IsQ0FBQyxFQUFVO2dCQUNuQyxFQUFFO1lBQ0gsQ0FBQztZQUNRLGtCQUFrQixDQUFDLEVBQVU7Z0JBQ3JDLGNBQWMsR0FBRyxFQUFFLENBQUE7WUFDcEIsQ0FBQztTQUNELENBQUMsRUFBRSxDQUFBO1FBRUosTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLENBQ25DLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUM3QixJQUFJLGNBQWMsRUFBRSxFQUNwQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBcUI7WUFDbEMsZ0JBQWdCO2dCQUN4QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBQ0QsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQVEsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBZSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFO1FBQ2pDLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1FBRXpCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUEyQjtZQUN0RCxnQkFBZ0IsQ0FBQyxFQUFVO2dCQUNuQyxFQUFFO1lBQ0gsQ0FBQztZQUNRLGtCQUFrQixDQUFDLEVBQVU7Z0JBQ3JDLGlCQUFpQixJQUFJLENBQUMsQ0FBQTtZQUN2QixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7UUFFSixNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsQ0FDbkMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEVBQzdCLElBQUksY0FBYyxFQUFFLEVBQ3BCLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFxQjtZQUNsQyxnQkFBZ0I7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7UUFDRCxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBUSxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLO1FBQy9CLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUViLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUEyQjtZQUN0RCxnQkFBZ0IsQ0FBQyxFQUFVO2dCQUNuQyxFQUFFO1lBQ0gsQ0FBQztZQUNRLEtBQUssQ0FBQyxlQUFlLENBQzdCLEVBQVUsRUFDVixJQUFXLEVBQ1gsS0FBYztnQkFFZCxLQUFLLEVBQUUsQ0FBQTtnQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO2dCQUN6QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ2hDLE9BQVksRUFBRSxDQUFBO2dCQUNmLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7UUFFSixNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsQ0FDbkMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEVBQzdCLElBQUksY0FBYyxFQUFFLEVBQ3BCLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFxQjtZQUNsQyxnQkFBZ0I7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBVyxNQUFNLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkpBQTJKLEVBQUUsS0FBSztRQUN0SyxNQUFNLGdCQUFnQixHQUFhLEVBQUUsQ0FBQTtRQUVyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBMkI7WUFDdEQsZ0JBQWdCLENBQUMsRUFBVTtnQkFDbkMsRUFBRTtZQUNILENBQUM7WUFDUSwyQkFBMkIsQ0FBQyxFQUFVO2dCQUM5QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUIsQ0FBQztTQUNELENBQUMsRUFBRSxDQUFBO1FBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLENBQ25DLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUM3QixJQUFJLGNBQWMsRUFBRSxFQUNwQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBcUI7WUFDbEMsZ0JBQWdCO2dCQUN4QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBRUQsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsSUFBUyxFQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVsRSxNQUFNLE1BQU0sR0FBWSxNQUFNLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==