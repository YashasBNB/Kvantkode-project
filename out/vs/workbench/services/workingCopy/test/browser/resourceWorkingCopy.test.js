/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { FileChangesEvent } from '../../../../../platform/files/common/files.js';
import { ResourceWorkingCopy } from '../../common/resourceWorkingCopy.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('ResourceWorkingCopy', function () {
    class TestResourceWorkingCopy extends ResourceWorkingCopy {
        constructor() {
            super(...arguments);
            this.name = 'testName';
            this.typeId = 'testTypeId';
            this.capabilities = 0 /* WorkingCopyCapabilities.None */;
            this.onDidChangeDirty = Event.None;
            this.onDidChangeContent = Event.None;
            this.onDidSave = Event.None;
        }
        isDirty() {
            return false;
        }
        async backup(token) {
            throw new Error('Method not implemented.');
        }
        async save(options) {
            return false;
        }
        async revert(options) { }
    }
    const disposables = new DisposableStore();
    const resource = URI.file('test/resource');
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource) {
        return new TestResourceWorkingCopy(uri, accessor.fileService);
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        disposables.clear();
    });
    test('orphaned tracking', async () => {
        return runWithFakedTimers({}, async () => {
            assert.strictEqual(workingCopy.isOrphaned(), false);
            let onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.isOrphaned(), true);
            onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.delete(resource);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 1 /* FileChangeType.ADDED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.isOrphaned(), false);
        });
    });
    test('dispose, isDisposed', async () => {
        assert.strictEqual(workingCopy.isDisposed(), false);
        let disposedEvent = false;
        disposables.add(workingCopy.onWillDispose(() => {
            disposedEvent = true;
        }));
        workingCopy.dispose();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(disposedEvent, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VXb3JraW5nQ29weS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci9yZXNvdXJjZVdvcmtpbmdDb3B5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWtCLE1BQU0sK0NBQStDLENBQUE7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRTtJQUM1QixNQUFNLHVCQUF3QixTQUFRLG1CQUFtQjtRQUF6RDs7WUFDQyxTQUFJLEdBQUcsVUFBVSxDQUFBO1lBQ2pCLFdBQU0sR0FBRyxZQUFZLENBQUE7WUFDckIsaUJBQVksd0NBQStCO1lBQzNDLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFDN0IsdUJBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUMvQixjQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQVd2QixDQUFDO1FBVkEs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