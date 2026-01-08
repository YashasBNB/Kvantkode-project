/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { TestContextService, TestWorkingCopy, } from '../../../../test/common/workbenchTestServices.js';
import { randomPath } from '../../../../../base/common/extpath.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { WorkingCopyHistoryTracker } from '../../common/workingCopyHistoryTracker.js';
import { WorkingCopyService } from '../../common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { TestFileService, TestPathService } from '../../../../test/browser/workbenchTestServices.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, dirname, isEqual, joinPath } from '../../../../../base/common/resources.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestWorkingCopyHistoryService } from './workingCopyHistoryService.test.js';
suite('WorkingCopyHistoryTracker', () => {
    let testDir;
    let historyHome;
    let workHome;
    let workingCopyHistoryService;
    let workingCopyService;
    let fileService;
    let configurationService;
    let tracker;
    let testFile1Path;
    let testFile2Path;
    const disposables = new DisposableStore();
    const testFile1PathContents = 'Hello Foo';
    const testFile2PathContents = [
        'Lorem ipsum ',
        'dolor öäü sit amet ',
        'adipiscing ßß elit',
        'consectetur ',
    ]
        .join('')
        .repeat(1000);
    let increasingTimestampCounter = 1;
    async function addEntry(descriptor, token) {
        const entry = await workingCopyHistoryService.addEntry({
            ...descriptor,
            timestamp: increasingTimestampCounter++, // very important to get tests to not be flaky with stable sort order
        }, token);
        return assertIsDefined(entry);
    }
    setup(async () => {
        testDir = URI.file(randomPath(join('vsctests', 'workingcopyhistorytracker'))).with({
            scheme: Schemas.inMemory,
        });
        historyHome = joinPath(testDir, 'User', 'History');
        workHome = joinPath(testDir, 'work');
        workingCopyHistoryService = disposables.add(new TestWorkingCopyHistoryService(disposables));
        workingCopyService = disposables.add(new WorkingCopyService());
        fileService = workingCopyHistoryService._fileService;
        configurationService = workingCopyHistoryService._configurationService;
        tracker = disposables.add(createTracker());
        await fileService.createFolder(historyHome);
        await fileService.createFolder(workHome);
        testFile1Path = joinPath(workHome, 'foo.txt');
        testFile2Path = joinPath(workHome, 'bar.txt');
        await fileService.writeFile(testFile1Path, VSBuffer.fromString(testFile1PathContents));
        await fileService.writeFile(testFile2Path, VSBuffer.fromString(testFile2PathContents));
    });
    function createTracker() {
        return new WorkingCopyHistoryTracker(workingCopyService, workingCopyHistoryService, disposables.add(new UriIdentityService(disposables.add(new TestFileService()))), new TestPathService(undefined, Schemas.file), configurationService, new UndoRedoService(new TestDialogService(), new TestNotificationService()), new TestContextService(), workingCopyHistoryService._fileService);
    }
    teardown(async () => {
        await fileService.del(testDir, { recursive: true });
        disposables.clear();
    });
    test('history entry added on save', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        const stat1 = await fileService.resolve(workingCopy1.resource, { resolveMetadata: true });
        const stat2 = await fileService.resolve(workingCopy2.resource, { resolveMetadata: true });
        disposables.add(workingCopyService.registerWorkingCopy(workingCopy1));
        disposables.add(workingCopyService.registerWorkingCopy(workingCopy2));
        const saveResult = new DeferredPromise();
        let addedCounter = 0;
        disposables.add(workingCopyHistoryService.onDidAddEntry((e) => {
            if (isEqual(e.entry.workingCopy.resource, workingCopy1.resource) ||
                isEqual(e.entry.workingCopy.resource, workingCopy2.resource)) {
                addedCounter++;
                if (addedCounter === 2) {
                    saveResult.complete();
                }
            }
        }));
        await workingCopy1.save(undefined, stat1);
        await workingCopy2.save(undefined, stat2);
        await saveResult.p;
    });
    test('history entry skipped when setting disabled (globally)', async () => {
        configurationService.setUserConfiguration('workbench.localHistory.enabled', false, testFile1Path);
        return assertNoLocalHistoryEntryAddedWithSettingsConfigured();
    });
    test('history entry skipped when setting disabled (exclude)', () => {
        configurationService.setUserConfiguration('workbench.localHistory.exclude', {
            '**/foo.txt': true,
        });
        // Recreate to apply settings
        tracker.dispose();
        tracker = disposables.add(createTracker());
        return assertNoLocalHistoryEntryAddedWithSettingsConfigured();
    });
    test('history entry skipped when too large', async () => {
        configurationService.setUserConfiguration('workbench.localHistory.maxFileSize', 0, testFile1Path);
        return assertNoLocalHistoryEntryAddedWithSettingsConfigured();
    });
    async function assertNoLocalHistoryEntryAddedWithSettingsConfigured() {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        const stat1 = await fileService.resolve(workingCopy1.resource, { resolveMetadata: true });
        const stat2 = await fileService.resolve(workingCopy2.resource, { resolveMetadata: true });
        disposables.add(workingCopyService.registerWorkingCopy(workingCopy1));
        disposables.add(workingCopyService.registerWorkingCopy(workingCopy2));
        const saveResult = new DeferredPromise();
        disposables.add(workingCopyHistoryService.onDidAddEntry((e) => {
            if (isEqual(e.entry.workingCopy.resource, workingCopy1.resource)) {
                assert.fail('Unexpected working copy history entry: ' + e.entry.workingCopy.resource.toString());
            }
            if (isEqual(e.entry.workingCopy.resource, workingCopy2.resource)) {
                saveResult.complete();
            }
        }));
        await workingCopy1.save(undefined, stat1);
        await workingCopy2.save(undefined, stat2);
        await saveResult.p;
    }
    test('entries moved (file rename)', async () => {
        const entriesMoved = Event.toPromise(workingCopyHistoryService.onDidMoveEntries);
        const workingCopy = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        let entries = await workingCopyHistoryService.getEntries(workingCopy.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        const renamedWorkingCopyResource = joinPath(dirname(workingCopy.resource), 'renamed.txt');
        await workingCopyHistoryService._fileService.move(workingCopy.resource, renamedWorkingCopyResource);
        await entriesMoved;
        entries = await workingCopyHistoryService.getEntries(workingCopy.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await workingCopyHistoryService.getEntries(renamedWorkingCopyResource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, entry1.id);
        assert.strictEqual(entries[0].timestamp, entry1.timestamp);
        assert.strictEqual(entries[0].source, entry1.source);
        assert.notStrictEqual(entries[0].location, entry1.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        assert.strictEqual(entries[1].id, entry2.id);
        assert.strictEqual(entries[1].timestamp, entry2.timestamp);
        assert.strictEqual(entries[1].source, entry2.source);
        assert.notStrictEqual(entries[1].location, entry2.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        assert.strictEqual(entries[2].id, entry3.id);
        assert.strictEqual(entries[2].timestamp, entry3.timestamp);
        assert.strictEqual(entries[2].source, entry3.source);
        assert.notStrictEqual(entries[2].location, entry3.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        const all = await workingCopyHistoryService.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].toString(), renamedWorkingCopyResource.toString());
    });
    test('entries moved (folder rename)', async () => {
        const entriesMoved = Event.toPromise(workingCopyHistoryService.onDidMoveEntries);
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        const entry1A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry2A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry3A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry1B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        const entry2B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        const entry3B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        let entries = await workingCopyHistoryService.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        entries = await workingCopyHistoryService.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        const renamedWorkHome = joinPath(dirname(testDir), 'renamed');
        await workingCopyHistoryService._fileService.move(workHome, renamedWorkHome);
        const renamedWorkingCopy1Resource = joinPath(renamedWorkHome, basename(workingCopy1.resource));
        const renamedWorkingCopy2Resource = joinPath(renamedWorkHome, basename(workingCopy2.resource));
        await entriesMoved;
        entries = await workingCopyHistoryService.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await workingCopyHistoryService.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await workingCopyHistoryService.getEntries(renamedWorkingCopy1Resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, entry1A.id);
        assert.strictEqual(entries[0].timestamp, entry1A.timestamp);
        assert.strictEqual(entries[0].source, entry1A.source);
        assert.notStrictEqual(entries[0].location, entry1A.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), renamedWorkingCopy1Resource.toString());
        assert.strictEqual(entries[1].id, entry2A.id);
        assert.strictEqual(entries[1].timestamp, entry2A.timestamp);
        assert.strictEqual(entries[1].source, entry2A.source);
        assert.notStrictEqual(entries[1].location, entry2A.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), renamedWorkingCopy1Resource.toString());
        assert.strictEqual(entries[2].id, entry3A.id);
        assert.strictEqual(entries[2].timestamp, entry3A.timestamp);
        assert.strictEqual(entries[2].source, entry3A.source);
        assert.notStrictEqual(entries[2].location, entry3A.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), renamedWorkingCopy1Resource.toString());
        entries = await workingCopyHistoryService.getEntries(renamedWorkingCopy2Resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, entry1B.id);
        assert.strictEqual(entries[0].timestamp, entry1B.timestamp);
        assert.strictEqual(entries[0].source, entry1B.source);
        assert.notStrictEqual(entries[0].location, entry1B.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), renamedWorkingCopy2Resource.toString());
        assert.strictEqual(entries[1].id, entry2B.id);
        assert.strictEqual(entries[1].timestamp, entry2B.timestamp);
        assert.strictEqual(entries[1].source, entry2B.source);
        assert.notStrictEqual(entries[1].location, entry2B.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), renamedWorkingCopy2Resource.toString());
        assert.strictEqual(entries[2].id, entry3B.id);
        assert.strictEqual(entries[2].timestamp, entry3B.timestamp);
        assert.strictEqual(entries[2].source, entry3B.source);
        assert.notStrictEqual(entries[2].location, entry3B.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), renamedWorkingCopy2Resource.toString());
        const all = await workingCopyHistoryService.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 2);
        for (const resource of all) {
            if (resource.toString() !== renamedWorkingCopy1Resource.toString() &&
                resource.toString() !== renamedWorkingCopy2Resource.toString()) {
                assert.fail(`Unexpected history resource: ${resource.toString()}`);
            }
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5VHJhY2tlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5SGlzdG9yeVRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxHQUNmLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0s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LFFBQVEsRUFBRSxDQUN0QyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLENBQ3RDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFD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