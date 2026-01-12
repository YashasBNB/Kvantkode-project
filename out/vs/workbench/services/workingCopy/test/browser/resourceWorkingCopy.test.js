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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VXb3JraW5nQ29weS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3Jlc291cmNlV29ya2luZ0NvcHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0IsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHFCQUFxQixFQUFFO0lBQzVCLE1BQU0sdUJBQXdCLFNBQVEsbUJBQW1CO1FBQXpEOztZQUNDLFNBQUksR0FBRyxVQUFVLENBQUE7WUFDakIsV0FBTSxHQUFHLFlBQVksQ0FBQTtZQUNyQixpQkFBWSx3Q0FBK0I7WUFDM0MscUJBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUM3Qix1QkFBa0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1lBQy9CLGNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBV3ZCLENBQUM7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