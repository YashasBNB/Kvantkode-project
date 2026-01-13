/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { NotificationsModel, NotificationViewItem, } from '../../common/notifications.js';
import { Action } from '../../../base/common/actions.js';
import { Severity, NotificationsFilter, NotificationPriority, } from '../../../platform/notification/common/notification.js';
import { createErrorWithActions } from '../../../base/common/errorMessage.js';
import { NotificationService } from '../../services/notification/common/notificationService.js';
import { TestStorageService } from './workbenchTestServices.js';
import { timeout } from '../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
suite('Notifications', () => {
    const disposables = new DisposableStore();
    const noFilter = { global: NotificationsFilter.OFF, sources: new Map() };
    teardown(() => {
        disposables.clear();
    });
    test('Items', () => {
        // Invalid
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: '' }, noFilter));
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: null }, noFilter));
        // Duplicates
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item2 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item3 = NotificationViewItem.create({ severity: Severity.Info, message: 'Info Message' }, noFilter);
        const item4 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', source: 'Source' }, noFilter);
        const item5 = NotificationViewItem.create({
            severity: Severity.Error,
            message: 'Error Message',
            actions: { primary: [disposables.add(new Action('id', 'label'))] },
        }, noFilter);
        const item6 = NotificationViewItem.create({
            severity: Severity.Error,
            message: 'Error Message',
            actions: { primary: [disposables.add(new Action('id', 'label'))] },
            progress: { infinite: true },
        }, noFilter);
        assert.strictEqual(item1.equals(item1), true);
        assert.strictEqual(item2.equals(item2), true);
        assert.strictEqual(item3.equals(item3), true);
        assert.strictEqual(item4.equals(item4), true);
        assert.strictEqual(item5.equals(item5), true);
        assert.strictEqual(item1.equals(item2), true);
        assert.strictEqual(item1.equals(item3), false);
        assert.strictEqual(item1.equals(item4), false);
        assert.strictEqual(item1.equals(item5), false);
        const itemId1 = NotificationViewItem.create({ id: 'same', message: 'Info Message', severity: Severity.Info }, noFilter);
        const itemId2 = NotificationViewItem.create({ id: 'same', message: 'Error Message', severity: Severity.Error }, noFilter);
        assert.strictEqual(itemId1.equals(itemId2), true);
        assert.strictEqual(itemId1.equals(item3), false);
        // Progress
        assert.strictEqual(item1.hasProgress, false);
        assert.strictEqual(item6.hasProgress, true);
        // Message Box
        assert.strictEqual(item5.canCollapse, false);
        assert.strictEqual(item5.expanded, true);
        // Events
        let called = 0;
        disposables.add(item1.onDidChangeExpansion(() => {
            called++;
        }));
        item1.expand();
        item1.expand();
        item1.collapse();
        item1.collapse();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent((e) => {
            if (e.kind === 3 /* NotificationViewItemContentChangeKind.PROGRESS */) {
                called++;
            }
        }));
        item1.progress.infinite();
        item1.progress.done();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent((e) => {
            if (e.kind === 1 /* NotificationViewItemContentChangeKind.MESSAGE */) {
                called++;
            }
        }));
        item1.updateMessage('message update');
        called = 0;
        disposables.add(item1.onDidChangeContent((e) => {
            if (e.kind === 0 /* NotificationViewItemContentChangeKind.SEVERITY */) {
                called++;
            }
        }));
        item1.updateSeverity(Severity.Error);
        called = 0;
        disposables.add(item1.onDidChangeContent((e) => {
            if (e.kind === 2 /* NotificationViewItemContentChangeKind.ACTIONS */) {
                called++;
            }
        }));
        item1.updateActions({ primary: [disposables.add(new Action('id2', 'label'))] });
        assert.strictEqual(called, 1);
        called = 0;
        disposables.add(item1.onDidChangeVisibility((e) => {
            called++;
        }));
        item1.updateVisibility(true);
        item1.updateVisibility(false);
        item1.updateVisibility(false);
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidClose(() => {
            called++;
        }));
        item1.close();
        assert.strictEqual(called, 1);
        // Error with Action
        const item7 = NotificationViewItem.create({
            severity: Severity.Error,
            message: createErrorWithActions('Hello Error', [
                disposables.add(new Action('id', 'label')),
            ]),
        }, noFilter);
        assert.strictEqual(item7.actions.primary.length, 1);
        // Filter
        const item8 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.OFF, sources: new Map() });
        assert.strictEqual(item8.priority, NotificationPriority.DEFAULT);
        const item9 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item9.priority, NotificationPriority.DEFAULT);
        const item10 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item10.priority, NotificationPriority.SILENT);
        const sources = new Map();
        sources.set('test.source', NotificationsFilter.ERROR);
        const item11 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: 'test.source' }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item11.priority, NotificationPriority.DEFAULT);
        const item12 = NotificationViewItem.create({
            severity: Severity.Warning,
            message: 'Error Message',
            source: { id: 'test.source', label: 'foo' },
        }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item12.priority, NotificationPriority.SILENT);
        const item13 = NotificationViewItem.create({
            severity: Severity.Warning,
            message: 'Error Message',
            source: { id: 'test.source2', label: 'foo' },
        }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item13.priority, NotificationPriority.DEFAULT);
        for (const item of [
            item1,
            item2,
            item3,
            item4,
            item5,
            item6,
            itemId1,
            itemId2,
            item7,
            item8,
            item9,
            item10,
            item11,
            item12,
            item13,
        ]) {
            item.close();
        }
    });
    test('Items - does not fire changed when message did not change (content, severity)', async () => {
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        let fired = false;
        disposables.add(item1.onDidChangeContent(() => {
            fired = true;
        }));
        item1.updateMessage('Error Message');
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        item1.updateSeverity(Severity.Error);
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        for (const item of [item1]) {
            item.close();
        }
    });
    test('Model', () => {
        const model = disposables.add(new NotificationsModel());
        let lastNotificationEvent;
        disposables.add(model.onDidChangeNotification((e) => {
            lastNotificationEvent = e;
        }));
        let lastStatusMessageEvent;
        disposables.add(model.onDidChangeStatusMessage((e) => {
            lastStatusMessageEvent = e;
        }));
        const item1 = {
            severity: Severity.Error,
            message: 'Error Message',
            actions: { primary: [disposables.add(new Action('id', 'label'))] },
        };
        const item2 = {
            severity: Severity.Warning,
            message: 'Warning Message',
            source: 'Some Source',
        };
        const item2Duplicate = {
            severity: Severity.Warning,
            message: 'Warning Message',
            source: 'Some Source',
        };
        const item3 = { severity: Severity.Info, message: 'Info Message' };
        const item1Handle = model.addNotification(item1);
        assert.strictEqual(lastNotificationEvent.item.severity, item1.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item1.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item1Handle.updateMessage('Different Error Message');
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 1 /* NotificationViewItemContentChangeKind.MESSAGE */);
        item1Handle.updateSeverity(Severity.Warning);
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 0 /* NotificationViewItemContentChangeKind.SEVERITY */);
        item1Handle.updateActions({ primary: [], secondary: [] });
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 2 /* NotificationViewItemContentChangeKind.ACTIONS */);
        item1Handle.progress.infinite();
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 3 /* NotificationViewItemContentChangeKind.PROGRESS */);
        const item2Handle = model.addNotification(item2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        const item3Handle = model.addNotification(item3);
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        assert.strictEqual(model.notifications.length, 3);
        let called = 0;
        disposables.add(item1Handle.onDidClose(() => {
            called++;
        }));
        item1Handle.close();
        assert.strictEqual(called, 1);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, Severity.Warning);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), 'Different Error Message');
        assert.strictEqual(lastNotificationEvent.index, 2);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        const item2DuplicateHandle = model.addNotification(item2Duplicate);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item2Handle.close();
        assert.strictEqual(model.notifications.length, 1);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        model.notifications[0].expand();
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 2 /* NotificationChangeType.EXPAND_COLLAPSE */);
        const disposable = model.showStatusMessage('Hello World');
        assert.strictEqual(model.statusMessage.message, 'Hello World');
        assert.strictEqual(lastStatusMessageEvent.item.message, model.statusMessage.message);
        assert.strictEqual(lastStatusMessageEvent.kind, 0 /* StatusMessageChangeType.ADD */);
        disposable.dispose();
        assert.ok(!model.statusMessage);
        assert.strictEqual(lastStatusMessageEvent.kind, 1 /* StatusMessageChangeType.REMOVE */);
        const disposable2 = model.showStatusMessage('Hello World 2');
        const disposable3 = model.showStatusMessage('Hello World 3');
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable2.dispose();
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable3.dispose();
        assert.ok(!model.statusMessage);
        item2DuplicateHandle.close();
        item3Handle.close();
    });
    test('Service', async () => {
        const service = disposables.add(new NotificationService(disposables.add(new TestStorageService())));
        let addNotificationCount = 0;
        let notification;
        disposables.add(service.onDidAddNotification((n) => {
            addNotificationCount++;
            notification = n;
        }));
        service.info('hello there');
        assert.strictEqual(addNotificationCount, 1);
        assert.strictEqual(notification.message, 'hello there');
        assert.strictEqual(notification.priority, NotificationPriority.DEFAULT);
        assert.strictEqual(notification.source, undefined);
        service.model.notifications[0].close();
        let notificationHandle = service.notify({
            message: 'important message',
            severity: Severity.Warning,
        });
        assert.strictEqual(addNotificationCount, 2);
        assert.strictEqual(notification.message, 'important message');
        assert.strictEqual(notification.severity, Severity.Warning);
        let removeNotificationCount = 0;
        disposables.add(service.onDidRemoveNotification((n) => {
            removeNotificationCount++;
            notification = n;
        }));
        notificationHandle.close();
        assert.strictEqual(removeNotificationCount, 1);
        assert.strictEqual(notification.message, 'important message');
        notificationHandle = service.notify({
            priority: NotificationPriority.SILENT,
            message: 'test',
            severity: Severity.Ignore,
        });
        assert.strictEqual(addNotificationCount, 3);
        assert.strictEqual(notification.message, 'test');
        assert.strictEqual(notification.priority, NotificationPriority.SILENT);
        notificationHandle.close();
        assert.strictEqual(removeNotificationCount, 2);
        notificationHandle.close();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9jb21tb24vbm90aWZpY2F0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG9CQUFvQixHQU9wQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sUUFBUSxFQUNSLG1CQUFtQixFQUNuQixvQkFBb0IsR0FDcEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsTUFBTSxRQUFRLEdBQXlCLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFBO0lBRTlGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFX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