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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvZWxlY3Ryb24tc2FuZGJveC93b3JraW5nQ29weUhpc3RvcnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLGVBQWUsR0FDZixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBT25ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLG9CQUFvQixFQUNwQixlQUFlLEVBQ2Ysc0JBQXNCLEVBQ3RCLHFCQUFxQixHQUNyQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFB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QzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUMxQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3JDLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFD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QyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUNyQyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQSxDQUFDLHdDQUF3QztRQUVoRixNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9