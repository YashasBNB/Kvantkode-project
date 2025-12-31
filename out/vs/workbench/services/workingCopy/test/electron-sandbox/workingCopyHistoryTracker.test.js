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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5VHJhY2tlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvZWxlY3Ryb24tc2FuZGJveC93b3JraW5nQ29weUhpc3RvcnlUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsR0FDZixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0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LEVBQUUsQ0FDdEMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxDQUN0QyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFR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