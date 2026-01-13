/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestContextService, TestStorageService, TestWorkingCopy, } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { CancellationToken, CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { LabelService } from '../../../label/common/labelService.js';
import { TestEnvironmentService, TestLifecycleService, TestPathService, TestRemoteAgentService, TestWillShutdownEvent, } from '../../../../test/browser/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NativeWorkingCopyHistoryService } from '../../common/workingCopyHistoryService.js';
import { joinPath, dirname, basename } from '../../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { join } from '../../../../../base/common/path.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export class TestWorkingCopyHistoryService extends NativeWorkingCopyHistoryService {
    constructor(disposables, fileService) {
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        if (!fileService) {
            fileService = disposables.add(new FileService(logService));
            disposables.add(fileService.registerProvider(Schemas.inMemory, disposables.add(new InMemoryFileSystemProvider())));
            disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new InMemoryFileSystemProvider())));
        }
        const remoteAgentService = new TestRemoteAgentService();
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const lifecycleService = disposables.add(new TestLifecycleService());
        const labelService = disposables.add(new LabelService(environmentService, new TestContextService(), new TestPathService(), new TestRemoteAgentService(), disposables.add(new TestStorageService()), lifecycleService));
        const configurationService = new TestConfigurationService();
        super(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, lifecycleService, logService, configurationService);
        this._fileService = fileService;
        this._configurationService = configurationService;
        this._lifecycleService = lifecycleService;
    }
}
suite('WorkingCopyHistoryService', () => {
    const disposables = new DisposableStore();
    let testDir;
    let historyHome;
    let workHome;
    let service;
    let fileService;
    let testFile1Path;
    let testFile2Path;
    let testFile3Path;
    const testFile1PathContents = 'Hello Foo';
    const testFile2PathContents = [
        'Lorem ipsum ',
        'dolor öäü sit amet ',
        'adipiscing ßß elit',
        'consectetur ',
    ].join('');
    const testFile3PathContents = 'Hello Bar';
    setup(async () => {
        testDir = URI.file(join(generateUuid(), 'vsctests', 'workingcopyhistoryservice')).with({
            scheme: Schemas.inMemory,
        });
        historyHome = joinPath(testDir, 'User', 'History');
        workHome = joinPath(testDir, 'work');
        service = disposables.add(new TestWorkingCopyHistoryService(disposables));
        fileService = service._fileService;
        await fileService.createFolder(historyHome);
        await fileService.createFolder(workHome);
        testFile1Path = joinPath(workHome, 'foo.txt');
        testFile2Path = joinPath(workHome, 'bar.txt');
        testFile3Path = joinPath(workHome, 'foo-bar.txt');
        await fileService.writeFile(testFile1Path, VSBuffer.fromString(testFile1PathContents));
        await fileService.writeFile(testFile2Path, VSBuffer.fromString(testFile2PathContents));
        await fileService.writeFile(testFile3Path, VSBuffer.fromString(testFile3PathContents));
    });
    let increasingTimestampCounter = 1;
    async function addEntry(descriptor, token, expectEntryAdded = true) {
        const entry = await service.addEntry({
            ...descriptor,
            timestamp: increasingTimestampCounter++, // very important to get tests to not be flaky with stable sort order
        }, token);
        if (expectEntryAdded) {
            assert.ok(entry, 'Unexpected undefined local history entry');
            assert.strictEqual(await fileService.exists(entry.location), true, 'Unexpected local history not stored');
        }
        return entry;
    }
    teardown(() => {
        disposables.clear();
    });
    test('addEntry', async () => {
        const addEvents = [];
        disposables.add(service.onDidAddEntry((e) => addEvents.push(e)));
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        // Add Entry works
        const entry1A = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        const entry2A = await addEntry({ resource: workingCopy2.resource, source: 'My Source' }, CancellationToken.None);
        assert.strictEqual((await fileService.readFile(entry1A.location)).value.toString(), testFile1PathContents);
        assert.strictEqual((await fileService.readFile(entry2A.location)).value.toString(), testFile2PathContents);
        assert.strictEqual(addEvents.length, 2);
        assert.strictEqual(addEvents[0].entry.workingCopy.resource.toString(), workingCopy1.resource.toString());
        assert.strictEqual(addEvents[1].entry.workingCopy.resource.toString(), workingCopy2.resource.toString());
        assert.strictEqual(addEvents[1].entry.source, 'My Source');
        const entry1B = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        const entry2B = await addEntry({ resource: workingCopy2.resource }, CancellationToken.None);
        assert.strictEqual((await fileService.readFile(entry1B.location)).value.toString(), testFile1PathContents);
        assert.strictEqual((await fileService.readFile(entry2B.location)).value.toString(), testFile2PathContents);
        assert.strictEqual(addEvents.length, 4);
        assert.strictEqual(addEvents[2].entry.workingCopy.resource.toString(), workingCopy1.resource.toString());
        assert.strictEqual(addEvents[3].entry.workingCopy.resource.toString(), workingCopy2.resource.toString());
        // Cancellation works
        const cts = new CancellationTokenSource();
        const entry1CPromise = addEntry({ resource: workingCopy1.resource }, cts.token, false);
        cts.dispose(true);
        const entry1C = await entry1CPromise;
        assert.ok(!entry1C);
        assert.strictEqual(addEvents.length, 4);
        // Invalid working copies are ignored
        const workingCopy3 = disposables.add(new TestWorkingCopy(testFile2Path.with({ scheme: 'unsupported' })));
        const entry3A = await addEntry({ resource: workingCopy3.resource }, CancellationToken.None, false);
        assert.ok(!entry3A);
        assert.strictEqual(addEvents.length, 4);
    });
    test('renameEntry', async () => {
        const changeEvents = [];
        disposables.add(service.onDidChangeEntry((e) => changeEvents.push(e)));
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource, source: 'My Source' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        await service.updateEntry(entry, { source: 'Hello Rename' }, CancellationToken.None);
        assert.strictEqual(changeEvents.length, 1);
        assert.strictEqual(changeEvents[0].entry, entry);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries[0].source, 'Hello Rename');
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        assert.strictEqual(entries[0].source, 'Hello Rename');
    });
    test('removeEntry', async () => {
        const removeEvents = [];
        disposables.add(service.onDidRemoveEntry((e) => removeEvents.push(e)));
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource, source: 'My Source' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        let removed = await service.removeEntry(entry2, CancellationToken.None);
        assert.strictEqual(removed, true);
        assert.strictEqual(removeEvents.length, 1);
        assert.strictEqual(removeEvents[0].entry, entry2);
        // Cannot remove same entry again
        removed = await service.removeEntry(entry2, CancellationToken.None);
        assert.strictEqual(removed, false);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
    });
    test('removeEntry - deletes history entries folder when last entry removed', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        let entry = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        // Simulate shutdown
        let event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        assert.strictEqual(await fileService.exists(dirname(entry.location)), true);
        entry = (await service.getEntries(workingCopy1.resource, CancellationToken.None)).at(0);
        assert.ok(entry);
        await service.removeEntry(entry, CancellationToken.None);
        // Simulate shutdown
        event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        assert.strictEqual(await fileService.exists(dirname(entry.location)), false);
    });
    test('removeAll', async () => {
        let removed = false;
        disposables.add(service.onDidRemoveEntries(() => (removed = true)));
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy2.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy2.resource, source: 'My Source' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        await service.removeAll(CancellationToken.None);
        assert.strictEqual(removed, true);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
    });
    test('getEntries - simple', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        const entry1 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry1);
        const entry2 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        assertEntryEqual(entries[1], entry2);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        const entry3 = await addEntry({ resource: workingCopy2.resource, source: 'other-test-source' }, CancellationToken.None);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry3);
    });
    test('getEntries - metadata preserved when stored', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        const entry1 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy2.resource }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopy2.resource, source: 'other-source' }, CancellationToken.None);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry1);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        assertEntryEqual(entries[0], entry2);
        assertEntryEqual(entries[1], entry3);
    });
    test('getEntries - corrupt meta.json is no problem', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        const metaFile = joinPath(dirname(entry1.location), 'entries.json');
        assert.ok(await fileService.exists(metaFile));
        await fileService.del(metaFile);
        const entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry1, false /* skip timestamp that is unreliable when entries.json is gone */);
    });
    test('getEntries - missing entries from meta.json is no problem', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        await fileService.del(entry1.location);
        const entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry2);
    });
    test('getEntries - in-memory and on-disk entries are merged', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        const entry3 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry4 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        const entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assertEntryEqual(entries[0], entry1);
        assertEntryEqual(entries[1], entry2);
        assertEntryEqual(entries[2], entry3);
        assertEntryEqual(entries[3], entry4);
    });
    test('getEntries - configured max entries respected', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopy1.resource, source: 'Test source' }, CancellationToken.None);
        const entry4 = await addEntry({ resource: workingCopy1.resource }, CancellationToken.None);
        service._configurationService.setUserConfiguration('workbench.localHistory.maxFileEntries', 2);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        assertEntryEqual(entries[0], entry3);
        assertEntryEqual(entries[1], entry4);
        service._configurationService.setUserConfiguration('workbench.localHistory.maxFileEntries', 4);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        service._configurationService.setUserConfiguration('workbench.localHistory.maxFileEntries', 5);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
    });
    test('getAll', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        let resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 0);
        await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 2);
        for (const resource of resources) {
            if (resource.toString() !== workingCopy1.resource.toString() &&
                resource.toString() !== workingCopy2.resource.toString()) {
                assert.fail(`Unexpected history resource: ${resource.toString()}`);
            }
        }
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        const workingCopy3 = disposables.add(new TestWorkingCopy(testFile3Path));
        await addEntry({ resource: workingCopy3.resource, source: 'test-source' }, CancellationToken.None);
        resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 3);
        for (const resource of resources) {
            if (resource.toString() !== workingCopy1.resource.toString() &&
                resource.toString() !== workingCopy2.resource.toString() &&
                resource.toString() !== workingCopy3.resource.toString()) {
                assert.fail(`Unexpected history resource: ${resource.toString()}`);
            }
        }
    });
    test('getAll - ignores resource when no entries exist', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        let resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 1);
        await service.removeEntry(entry, CancellationToken.None);
        resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 0);
        // Simulate shutdown
        const event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        resources = await service.getAll(CancellationToken.None);
        assert.strictEqual(resources.length, 0);
    });
    function assertEntryEqual(entryA, entryB, assertTimestamp = true) {
        assert.strictEqual(entryA.id, entryB.id);
        assert.strictEqual(entryA.location.toString(), entryB.location.toString());
        if (assertTimestamp) {
            assert.strictEqual(entryA.timestamp, entryB.timestamp);
        }
        assert.strictEqual(entryA.source, entryB.source);
        assert.strictEqual(entryA.workingCopy.name, entryB.workingCopy.name);
        assert.strictEqual(entryA.workingCopy.resource.toString(), entryB.workingCopy.resource.toString());
    }
    test('entries cleaned up on shutdown', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        const entry4 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        service._configurationService.setUserConfiguration('workbench.localHistory.maxFileEntries', 2);
        // Simulate shutdown
        let event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        assert.ok(!(await fileService.exists(entry1.location)));
        assert.ok(!(await fileService.exists(entry2.location)));
        assert.ok(await fileService.exists(entry3.location));
        assert.ok(await fileService.exists(entry4.location));
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 2);
        assertEntryEqual(entries[0], entry3);
        assertEntryEqual(entries[1], entry4);
        service._configurationService.setUserConfiguration('workbench.localHistory.maxFileEntries', 3);
        const entry5 = await addEntry({ resource: workingCopy1.resource, source: 'other-source' }, CancellationToken.None);
        // Simulate shutdown
        event = new TestWillShutdownEvent();
        service._lifecycleService.fireWillShutdown(event);
        await Promise.allSettled(event.value);
        assert.ok(await fileService.exists(entry3.location));
        assert.ok(await fileService.exists(entry4.location));
        assert.ok(await fileService.exists(entry5.location));
        // Resolve from file service fresh and verify again
        service.dispose();
        service = disposables.add(new TestWorkingCopyHistoryService(disposables, fileService));
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        assertEntryEqual(entries[0], entry3);
        assertEntryEqual(entries[1], entry4);
        assertEntryEqual(entries[2], entry5);
    });
    test('entries are merged when source is same', async () => {
        let replaced = undefined;
        disposables.add(service.onDidReplaceEntry((e) => (replaced = e.entry)));
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        service._configurationService.setUserConfiguration('workbench.localHistory.mergeWindow', 1);
        const entry1 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        assert.strictEqual(replaced, undefined);
        const entry2 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        assert.strictEqual(replaced, entry1);
        const entry3 = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        assert.strictEqual(replaced, entry2);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 1);
        assertEntryEqual(entries[0], entry3);
        service._configurationService.setUserConfiguration('workbench.localHistory.mergeWindow', undefined);
        await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
    });
    test('move entries (file rename)', async () => {
        const workingCopy = disposables.add(new TestWorkingCopy(testFile1Path));
        const entry1 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopy.resource, source: 'test-source' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopy.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        const renamedWorkingCopyResource = joinPath(dirname(workingCopy.resource), 'renamed.txt');
        await fileService.move(workingCopy.resource, renamedWorkingCopyResource);
        const result = await service.moveEntries(workingCopy.resource, renamedWorkingCopyResource);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].toString(), renamedWorkingCopyResource.toString());
        entries = await service.getEntries(workingCopy.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(renamedWorkingCopyResource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, entry1.id);
        assert.strictEqual(entries[0].timestamp, entry1.timestamp);
        assert.strictEqual(entries[0].source, entry1.source);
        assert.ok(!entries[0].sourceDescription);
        assert.notStrictEqual(entries[0].location, entry1.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        assert.strictEqual(entries[1].id, entry2.id);
        assert.strictEqual(entries[1].timestamp, entry2.timestamp);
        assert.strictEqual(entries[1].source, entry2.source);
        assert.ok(!entries[1].sourceDescription);
        assert.notStrictEqual(entries[1].location, entry2.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        assert.strictEqual(entries[2].id, entry3.id);
        assert.strictEqual(entries[2].timestamp, entry3.timestamp);
        assert.strictEqual(entries[2].source, entry3.source);
        assert.notStrictEqual(entries[2].location, entry3.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), renamedWorkingCopyResource.toString());
        assert.ok(!entries[2].sourceDescription);
        assert.strictEqual(entries[3].source, 'renamed.source' /* for the move */);
        assert.ok(entries[3].sourceDescription); // contains the source working copy path
        const all = await service.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].toString(), renamedWorkingCopyResource.toString());
    });
    test('entries moved (folder rename)', async () => {
        const workingCopy1 = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopy2 = disposables.add(new TestWorkingCopy(testFile2Path));
        const entry1A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry2A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry3A = await addEntry({ resource: workingCopy1.resource, source: 'test-source' }, CancellationToken.None);
        const entry1B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        const entry2B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        const entry3B = await addEntry({ resource: workingCopy2.resource, source: 'test-source' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        const renamedWorkHome = joinPath(dirname(workHome), 'renamed');
        await fileService.move(workHome, renamedWorkHome);
        const resources = await service.moveEntries(workHome, renamedWorkHome);
        const renamedWorkingCopy1Resource = joinPath(renamedWorkHome, basename(workingCopy1.resource));
        const renamedWorkingCopy2Resource = joinPath(renamedWorkHome, basename(workingCopy2.resource));
        assert.strictEqual(resources.length, 2);
        for (const resource of resources) {
            if (resource.toString() !== renamedWorkingCopy1Resource.toString() &&
                resource.toString() !== renamedWorkingCopy2Resource.toString()) {
                assert.fail(`Unexpected history resource: ${resource.toString()}`);
            }
        }
        entries = await service.getEntries(workingCopy1.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(workingCopy2.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(renamedWorkingCopy1Resource, CancellationToken.None);
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
        entries = await service.getEntries(renamedWorkingCopy2Resource, CancellationToken.None);
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
        assert.strictEqual(entries[3].source, 'moved.source' /* for the move */);
        assert.ok(entries[3].sourceDescription); // contains the source working copy path
        const all = await service.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 2);
        for (const resource of all) {
            if (resource.toString() !== renamedWorkingCopy1Resource.toString() &&
                resource.toString() !== renamedWorkingCopy2Resource.toString()) {
                assert.fail(`Unexpected history resource: ${resource.toString()}`);
            }
        }
    });
    test('move entries (file rename) - preserves previous entries (no new entries)', async () => {
        const workingCopyTarget = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopySource = disposables.add(new TestWorkingCopy(testFile2Path));
        const entry1 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-source1' }, CancellationToken.None);
        const entry2 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-source2' }, CancellationToken.None);
        const entry3 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-source3' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopyTarget.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        entries = await service.getEntries(workingCopySource.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        await fileService.move(workingCopySource.resource, workingCopyTarget.resource, true);
        const result = await service.moveEntries(workingCopySource.resource, workingCopyTarget.resource);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].toString(), workingCopyTarget.resource.toString());
        entries = await service.getEntries(workingCopySource.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(workingCopyTarget.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 4);
        assert.strictEqual(entries[0].id, entry1.id);
        assert.strictEqual(entries[0].timestamp, entry1.timestamp);
        assert.strictEqual(entries[0].source, entry1.source);
        assert.notStrictEqual(entries[0].location, entry1.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[1].id, entry2.id);
        assert.strictEqual(entries[1].timestamp, entry2.timestamp);
        assert.strictEqual(entries[1].source, entry2.source);
        assert.notStrictEqual(entries[1].location, entry2.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[2].id, entry3.id);
        assert.strictEqual(entries[2].timestamp, entry3.timestamp);
        assert.strictEqual(entries[2].source, entry3.source);
        assert.notStrictEqual(entries[2].location, entry3.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[3].source, 'renamed.source' /* for the move */);
        assert.ok(entries[3].sourceDescription); // contains the source working copy path
        const all = await service.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].toString(), workingCopyTarget.resource.toString());
    });
    test('move entries (file rename) - preserves previous entries (new entries)', async () => {
        const workingCopyTarget = disposables.add(new TestWorkingCopy(testFile1Path));
        const workingCopySource = disposables.add(new TestWorkingCopy(testFile2Path));
        const targetEntry1 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-target1' }, CancellationToken.None);
        const targetEntry2 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-target2' }, CancellationToken.None);
        const targetEntry3 = await addEntry({ resource: workingCopyTarget.resource, source: 'test-target3' }, CancellationToken.None);
        const sourceEntry1 = await addEntry({ resource: workingCopySource.resource, source: 'test-source1' }, CancellationToken.None);
        const sourceEntry2 = await addEntry({ resource: workingCopySource.resource, source: 'test-source2' }, CancellationToken.None);
        const sourceEntry3 = await addEntry({ resource: workingCopySource.resource, source: 'test-source3' }, CancellationToken.None);
        let entries = await service.getEntries(workingCopyTarget.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        entries = await service.getEntries(workingCopySource.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 3);
        await fileService.move(workingCopySource.resource, workingCopyTarget.resource, true);
        const result = await service.moveEntries(workingCopySource.resource, workingCopyTarget.resource);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].toString(), workingCopyTarget.resource.toString());
        entries = await service.getEntries(workingCopySource.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 0);
        entries = await service.getEntries(workingCopyTarget.resource, CancellationToken.None);
        assert.strictEqual(entries.length, 7);
        assert.strictEqual(entries[0].id, targetEntry1.id);
        assert.strictEqual(entries[0].timestamp, targetEntry1.timestamp);
        assert.strictEqual(entries[0].source, targetEntry1.source);
        assert.notStrictEqual(entries[0].location, targetEntry1.location);
        assert.strictEqual(entries[0].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[1].id, targetEntry2.id);
        assert.strictEqual(entries[1].timestamp, targetEntry2.timestamp);
        assert.strictEqual(entries[1].source, targetEntry2.source);
        assert.notStrictEqual(entries[1].location, targetEntry2.location);
        assert.strictEqual(entries[1].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[2].id, targetEntry3.id);
        assert.strictEqual(entries[2].timestamp, targetEntry3.timestamp);
        assert.strictEqual(entries[2].source, targetEntry3.source);
        assert.notStrictEqual(entries[2].location, targetEntry3.location);
        assert.strictEqual(entries[2].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[3].id, sourceEntry1.id);
        assert.strictEqual(entries[3].timestamp, sourceEntry1.timestamp);
        assert.strictEqual(entries[3].source, sourceEntry1.source);
        assert.notStrictEqual(entries[3].location, sourceEntry1.location);
        assert.strictEqual(entries[3].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[4].id, sourceEntry2.id);
        assert.strictEqual(entries[4].timestamp, sourceEntry2.timestamp);
        assert.strictEqual(entries[4].source, sourceEntry2.source);
        assert.notStrictEqual(entries[4].location, sourceEntry2.location);
        assert.strictEqual(entries[4].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[5].id, sourceEntry3.id);
        assert.strictEqual(entries[5].timestamp, sourceEntry3.timestamp);
        assert.strictEqual(entries[5].source, sourceEntry3.source);
        assert.notStrictEqual(entries[5].location, sourceEntry3.location);
        assert.strictEqual(entries[5].workingCopy.resource.toString(), workingCopyTarget.resource.toString());
        assert.strictEqual(entries[6].source, 'renamed.source' /* for the move */);
        assert.ok(entries[6].sourceDescription); // contains the source working copy path
        const all = await service.getAll(CancellationToken.None);
        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].toString(), workingCopyTarget.resource.toString());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5SGlzdG9yeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsZUFBZSxHQUNmLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFPbkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixzQkFBc0IsRUFDdEIscUJBQXFCLEdBQ3JCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUFF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QUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FD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LEVBQUUsQ0FDdEMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxDQUN0QyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFR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LENBQUMsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDckMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDckMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUEsQ0FBQyx3Q0FBd0M7UUFFaEYsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUM3RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1RUFBdUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RixNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUU3RSxNQUFNLFlBQVksR0FBRyxNQUFNLFFBQVEsQ0FDbEMsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsRUFDaEUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxRQUFRLENBQ2xDLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLEVBQ2hFLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUNsQyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxFQUNoRSxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLFFBQVEsQ0FDbEMsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsRUFDaEUsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxRQUFRLENBQ2xDLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLEVBQ2hFLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUNsQyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxFQUNoRSxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7UUFFRCxJQUFJLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFL0UsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXJDLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBLENBQUMsd0NBQXdDO1FBRWhGLE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDN0UsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=