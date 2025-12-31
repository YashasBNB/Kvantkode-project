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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb21tYW5kcy90ZXN0L2NvbW1vbi9jb21tYW5kU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7SUFDdkIsSUFBSSxtQkFBZ0MsQ0FBQTtJQUVwQyxLQUFLLENBQUM7UUFDTCxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLGNBQWEsQ0FBQyxDQUFDLENBQUE7SUFDOUUsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUM7UUFDUixtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsSUFBSSxTQUFpQixDQUFBO1FBRXJCLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUNqQyxJQUFJLG9CQUFvQixFQUFFLEVBQzFCLElBQUksQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO1lBQzdCLGVBQWUs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