/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadMessageService } from '../../browser/mainThreadMessageService.js';
import { NoOpNotification, } from '../../../../platform/notification/common/notification.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
const emptyCommandService = {
    _serviceBrand: undefined,
    onWillExecuteCommand: () => Disposable.None,
    onDidExecuteCommand: () => Disposable.None,
    executeCommand: (commandId, ...args) => {
        return Promise.resolve(undefined);
    },
};
const emptyNotificationService = new (class {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    notify(...args) {
        throw new Error('not implemented');
    }
    info(...args) {
        throw new Error('not implemented');
    }
    warn(...args) {
        throw new Error('not implemented');
    }
    error(...args) {
        throw new Error('not implemented');
    }
    prompt(severity, message, choices, options) {
        throw new Error('not implemented');
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() {
        throw new Error('not implemented');
    }
    getFilter(source) {
        throw new Error('not implemented');
    }
    getFilters() {
        throw new Error('not implemented');
    }
    removeFilter(sourceId) {
        throw new Error('not implemented');
    }
})();
class EmptyNotificationService {
    constructor(withNotify) {
        this.withNotify = withNotify;
        this.filter = false;
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    notify(notification) {
        this.withNotify(notification);
        return new NoOpNotification();
    }
    info(message) {
        throw new Error('Method not implemented.');
    }
    warn(message) {
        throw new Error('Method not implemented.');
    }
    error(message) {
        throw new Error('Method not implemented.');
    }
    prompt(severity, message, choices, options) {
        throw new Error('Method not implemented');
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter() {
        throw new Error('Method not implemented.');
    }
    getFilter(source) {
        throw new Error('Method not implemented.');
    }
    getFilters() {
        throw new Error('Method not implemented.');
    }
    removeFilter(sourceId) {
        throw new Error('Method not implemented.');
    }
}
suite('ExtHostMessageService', function () {
    test('propagte handle on select', async function () {
        const service = new MainThreadMessageService(null, new EmptyNotificationService((notification) => {
            assert.strictEqual(notification.actions.primary.length, 1);
            queueMicrotask(() => notification.actions.primary[0].run());
        }), emptyCommandService, new TestDialogService(), new TestExtensionService());
        const handle = await service.$showMessage(1, 'h', {}, [
            { handle: 42, title: 'a thing', isCloseAffordance: true },
        ]);
        assert.strictEqual(handle, 42);
        service.dispose();
    });
    suite('modal', () => {
        test('calls dialog service', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new (class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(type, 1);
                    assert.strictEqual(message, 'h');
                    assert.strictEqual(buttons.length, 1);
                    assert.strictEqual(cancelButton.label, 'Cancel');
                    return Promise.resolve({ result: buttons[0].run({ checkboxChecked: false }) });
                }
            })(), new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [
                { handle: 42, title: 'a thing', isCloseAffordance: false },
            ]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
        test('returns undefined when cancelled', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new (class extends mock() {
                prompt(prompt) {
                    return Promise.resolve({
                        result: prompt.cancelButton.run({
                            checkboxChecked: false,
                        }),
                    });
                }
            })(), new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [
                { handle: 42, title: 'a thing', isCloseAffordance: false },
            ]);
            assert.strictEqual(handle, undefined);
            service.dispose();
        });
        test('hides Cancel button when not needed', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new (class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(buttons.length, 0);
                    assert.ok(cancelButton);
                    return Promise.resolve({
                        result: cancelButton.run({ checkboxChecked: false }),
                    });
                }
            })(), new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [
                { handle: 42, title: 'a thing', isCloseAffordance: true },
            ]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQU1wRixPQUFPLEVBR04sZ0JBQWdCLEdBU2hCLE1BQU0sMERBQTBELENBQUE7QUFFakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDakcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFcEYsTUFBTSxtQkFBbUIsR0FBb0I7SUFDNUMsYUFBYSxFQUFFLFNBQVM7SUFDeEIsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7SUFDM0MsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7SUFDMUMsY0FBYyxFQUFFLENBQUMsU0FBaUIsRUFBRSxHQUFHLElBQVcsRUFBZ0IsRUFBRTtRQUNuRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztDQUNELENBQUE7QUFFRCxNQUFNLHdCQUF3QixHQUFHLElBQUks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