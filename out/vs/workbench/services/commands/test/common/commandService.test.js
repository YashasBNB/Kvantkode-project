/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { CommandService } from '../../common/commandService.js';
import { NullExtensionService } from '../../../extensions/common/extensions.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
suite('CommandService', function () {
    let commandRegistration;
    setup(function () {
        commandRegistration = CommandsRegistry.registerCommand('foo', function () { });
    });
    teardown(function () {
        commandRegistration.dispose();
    });
    test('activateOnCommand', () => {
        let lastEvent;
        const service = new CommandService(new InstantiationService(), new (class extends NullExtensionService {
            activateByEvent(activationEvent) {
                lastEvent = activationEvent;
                return super.activateByEvent(activationEvent);
            }
        })(), new NullLogService());
        return service
            .executeCommand('foo')
            .then(() => {
            assert.ok(lastEvent, 'onCommand:foo');
            return service.executeCommand('unknownCommandId');
        })
            .then(() => {
            assert.ok(false);
        }, () => {
            assert.ok(lastEvent, 'onCommand:unknownCommandId');
        });
    });
    test('fwd activation error', async function () {
        const extensionService = new (class extends NullExtensionService {
            activateByEvent(activationEvent) {
                return Promise.reject(new Error('bad_activate'));
            }
        })();
        const service = new CommandService(new InstantiationService(), extensionService, new NullLogService());
        await extensionService.whenInstalledExtensionsRegistered();
        return service.executeCommand('foo').then(() => assert.ok(false), (err) => {
            assert.strictEqual(err.message, 'bad_activate');
        });
    });
    test('!onReady, but executeCommand', function () {
        let callCounter = 0;
        const reg = CommandsRegistry.registerCommand('bar', () => (callCounter += 1));
        const service = new CommandService(new InstantiationService(), new (class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return new Promise((_resolve) => {
                    /*ignore*/
                });
            }
        })(), new NullLogService());
        service.executeCommand('bar');
        assert.strictEqual(callCounter, 1);
        reg.dispose();
    });
    test('issue #34913: !onReady, unknown command', function () {
        let callCounter = 0;
        let resolveFunc;
        const whenInstalledExtensionsRegistered = new Promise((_resolve) => {
            resolveFunc = _resolve;
        });
        const service = new CommandService(new InstantiationService(), new (class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return whenInstalledExtensionsRegistered;
            }
        })(), new NullLogService());
        const r = service.executeCommand('bar');
        assert.strictEqual(callCounter, 0);
        const reg = CommandsRegistry.registerCommand('bar', () => (callCounter += 1));
        resolveFunc(true);
        return r.then(() => {
            reg.dispose();
            assert.strictEqual(callCounter, 1);
        });
    });
    test('Stop waiting for * extensions to activate when trigger is satisfied #62457', function () {
        let callCounter = 0;
        const disposable = new DisposableStore();
        const events = [];
        const service = new CommandService(new InstantiationService(), new (class extends NullExtensionService {
            activateByEvent(event) {
                events.push(event);
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                callCounter += 1;
                            });
                            disposable.add(reg);
                            resolve();
                        }, 0);
                    });
                }
                return Promise.resolve();
            }
        })(), new NullLogService());
        return service
            .executeCommand('farboo')
            .then(() => {
            assert.strictEqual(callCounter, 1);
            assert.deepStrictEqual(events.sort(), ['*', 'onCommand:farboo'].sort());
        })
            .finally(() => {
            disposable.dispose();
        });
    });
    test('issue #71471: wait for onCommand activation even if a command is registered', () => {
        const expectedOrder = [
            'registering command',
            'resolving activation event',
            'executing command',
        ];
        const actualOrder = [];
        const disposables = new DisposableStore();
        const service = new CommandService(new InstantiationService(), new (class extends NullExtensionService {
            activateByEvent(event) {
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            // Register the command after some time
                            actualOrder.push('registering command');
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                actualOrder.push('executing command');
                            });
                            disposables.add(reg);
                            setTimeout(() => {
                                // Resolve the activation event after some more time
                                actualOrder.push('resolving activation event');
                                resolve();
                            }, 10);
                        }, 10);
                    });
                }
                return Promise.resolve();
            }
        })(), new NullLogService());
        return service
            .executeCommand('farboo2')
            .then(() => {
            assert.deepStrictEqual(actualOrder, expectedOrder);
        })
            .finally(() => {
            disposables.dispose();
        });
    });
    test('issue #142155: execute commands synchronously if possible', async () => {
        const actualOrder = [];
        const disposables = new DisposableStore();
        disposables.add(CommandsRegistry.registerCommand(`bizBaz`, () => {
            actualOrder.push('executing command');
        }));
        const extensionService = new (class extends NullExtensionService {
            activationEventIsDone(_activationEvent) {
                return true;
            }
        })();
        const service = new CommandService(new InstantiationService(), extensionService, new NullLogService());
        await extensionService.whenInstalledExtensionsRegistered();
        try {
            actualOrder.push(`before call`);
            const promise = service.executeCommand('bizBaz');
            actualOrder.push(`after call`);
            await promise;
            actualOrder.push(`resolved`);
            assert.deepStrictEqual(actualOrder, [
                'before call',
                'executing command',
                'after call',
                'resolved',
            ]);
        }
        finally {
            disposables.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbW1hbmRzL3Rlc3QvY29tbW9uL2NvbW1hbmRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDM0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTFFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUN2QixJQUFJLG1CQUFnQyxDQUFBO0lBRXBDLEtBQUssQ0FBQztRQUNMLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsY0FBYSxDQUFDLENBQUMsQ0FBQTtJQUM5RSxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQztRQUNSLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixJQUFJLFNBQWlCLENBQUE7UUFFckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQ2pDLElBQUksb0JBQW9CLEVBQUUsRUFDMUIsSUFBSSxDQUFDLEtBQU0sU0FBUSxvQkFBb0I7WUFDN0IsZUFBZSxDQUFDLGVBQXVCO2dCQUMvQyxTQUFTLEdBQUcsZUFBZSxDQUFBO2dCQUMzQixPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDOUMsQ0FBQztTQUNELENBQUMsRUFBRSxFQUNKLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxPQUFPLE9BQU87YUFDWixjQUFjLENBQUMsS0FBSyxDQUFDO2FBQ3JCLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDVixNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNyQyxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNsRCxDQUFDLENBQUM7YUFDRCxJQUFJLENBQ0osR0FBRyxFQUFFO1lBQ0osTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQixDQUFDLEVBQ0QsR0FBRyxFQUFFO1lBQ0osTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQ0QsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUs7UUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLG9CQUFvQjtZQUN0RCxlQUFlLENBQUMsZUFBdUI7Z0JBQy9DLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQ2pELENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FBQTtRQUVKLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUNqQyxJQUFJLG9CQUFvQixFQUFFLEVBQzFCLGdCQUFnQixFQUNoQixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFBO1FBRTFELE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ3hDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQ3RCLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDaEQsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRTtRQUNwQyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUE7UUFDbkIsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTdFLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUNqQyxJQUFJLG9CQUFvQixFQUFFLEVBQzFCLElBQUksQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO1lBQzdCLGlDQUFpQztnQkFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBVSxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUN4QyxVQUFVO2dCQUNYLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztTQUNELENBQUMsRUFBRSxFQUNKLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFO1FBQy9DLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUNuQixJQUFJLFdBQXFCLENBQUE7UUFDekIsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLE9BQU8sQ0FBVSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzNFLFdBQVcsR0FBRyxRQUFRLENBQUE7UUFDdkIsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FDakMsSUFBSSxvQkFBb0IsRUFBRSxFQUMxQixJQUFJLENBQUMsS0FBTSxTQUFRLG9CQUFvQjtZQUM3QixpQ0FBaUM7Z0JBQ3pDLE9BQU8saUNBQWlDLENBQUE7WUFDekMsQ0FBQztTQUNELENBQUMsRUFBRSxFQUNKLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxXQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFbEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNsQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRFQUE0RSxFQUFFO1FBQ2xGLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUNuQixNQUFNLFVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3hDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FDakMsSUFBSSxvQkFBb0IsRUFBRSxFQUMxQixJQUFJLENBQUMsS0FBTSxTQUFRLG9CQUFvQjtZQUM3QixlQUFlLENBQUMsS0FBYTtnQkFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDbEIsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ25CLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxvQkFBb0I7Z0JBQ2xELENBQUM7Z0JBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN2QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7d0JBQzlCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7NEJBQ2YsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUMzQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFDakMsR0FBRyxFQUFFO2dDQUNKLFdBQVcsSUFBSSxDQUFDLENBQUE7NEJBQ2pCLENBQUMsQ0FDRCxDQUFBOzRCQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQ25CLE9BQU8sRUFBRSxDQUFBO3dCQUNWLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLENBQUM7U0FDRCxDQUFDLEVBQUUsRUFDSixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsT0FBTyxPQUFPO2FBQ1osY0FBYyxDQUFDLFFBQVEsQ0FBQzthQUN4QixJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLENBQUMsQ0FBQzthQUNELE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDYixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxHQUFHLEVBQUU7UUFDeEYsTUFBTSxhQUFhLEdBQWE7WUFDL0IscUJBQXFCO1lBQ3JCLDRCQUE0QjtZQUM1QixtQkFBbUI7U0FDbkIsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUNqQyxJQUFJLG9CQUFvQixFQUFFLEVBQzFCLElBQUksQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO1lBQzdCLGVBQWUsQ0FBQyxLQUFhO2dCQUNyQyxJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDbkIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLG9CQUFvQjtnQkFDbEQsQ0FBQztnQkFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTt3QkFDOUIsVUFBVSxDQUFDLEdBQUcsRUFBRTs0QkFDZix1Q0FBdUM7NEJBQ3ZDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTs0QkFDdkMsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUMzQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFDakMsR0FBRyxFQUFFO2dDQUNKLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTs0QkFDdEMsQ0FBQyxDQUNELENBQUE7NEJBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs0QkFFcEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQ0FDZixvREFBb0Q7Z0NBQ3BELFdBQVcsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtnQ0FDOUMsT0FBTyxFQUFFLENBQUE7NEJBQ1YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO3dCQUNQLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtvQkFDUCxDQUFDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLENBQUM7U0FDRCxDQUFDLEVBQUUsRUFDSixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsT0FBTyxPQUFPO2FBQ1osY0FBYyxDQUFDLFNBQVMsQ0FBQzthQUN6QixJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDO2FBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVFLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQTtRQUVoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDL0MsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO1lBQ3RELHFCQUFxQixDQUFDLGdCQUF3QjtnQkFDdEQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7UUFDSixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FDakMsSUFBSSxvQkFBb0IsRUFBRSxFQUMxQixnQkFBZ0IsRUFDaEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLENBQUMsaUNBQWlDLEVBQUUsQ0FBQTtRQUUxRCxJQUFJLENBQUM7WUFDSixXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDaEQsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM5QixNQUFNLE9BQU8sQ0FBQTtZQUNiLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLGFBQWE7Z0JBQ2IsbUJBQW1CO2dCQUNuQixZQUFZO2dCQUNaLFVBQVU7YUFDVixDQUFDLENBQUE7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==