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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0TWVzc2FnZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBTXBGLE9BQU8sRUFHTixnQkFBZ0IsR0FTaEIsTUFBTSwwREFBMEQsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVwRixNQUFNLG1CQUFtQixHQUFvQjtJQUM1QyxhQUFhLEVBQUUsU0FBUztJQUN4QixvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUMzQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUMxQyxjQUFjLEVBQUUsQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBVyxFQUFnQixFQUFFO1FBQ25FLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0NBQ0QsQ0FBQTtBQUVE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