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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvY29tbW9uL25vdGlmaWNhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixvQkFBb0IsR0FPcEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxFQUVOLFFBQVEsRUFDUixtQkFBbUIsRUFDbkIsb0JBQW9CLEdBQ3BCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLE1BQU0sUUFBUSxHQUF5QixFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQTtJQUU5RixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lB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