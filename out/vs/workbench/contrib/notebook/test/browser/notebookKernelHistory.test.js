/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { setupInstantiationService } from './testNotebookEditor.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { INotebookKernelService, } from '../../common/notebookKernelService.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { INotebookService } from '../../common/notebookService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { NotebookKernelHistoryService } from '../../browser/services/notebookKernelHistoryServiceImpl.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
suite('NotebookKernelHistoryService', () => {
    let disposables;
    let instantiationService;
    let kernelService;
    let onDidAddNotebookDocument;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        disposables = new DisposableStore();
        onDidAddNotebookDocument = new Emitter();
        disposables.add(onDidAddNotebookDocument);
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(INotebookService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookDocument = onDidAddNotebookDocument.event;
                this.onWillRemoveNotebookDocument = Event.None;
            }
            getNotebookTextModels() {
                return [];
            }
        })());
        instantiationService.stub(IMenuService, new (class extends mock() {
            createMenu() {
                return new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() {
                        return [];
                    }
                    dispose() { }
                })();
            }
        })());
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
    });
    test('notebook kernel empty history', function () {
        const u1 = URI.parse('foo:///one');
        const k1 = new TestNotebookKernel({ label: 'z', notebookType: 'foo' });
        const k2 = new TestNotebookKernel({ label: 'a', notebookType: 'foo' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        instantiationService.stub(IStorageService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillSaveState = Event.None;
            }
            onDidChangeValue(scope, key, disposable) {
                return Event.None;
            }
            get(key, scope, fallbackValue) {
                if (key === 'notebook.kernelHistory') {
                    return JSON.stringify({
                        foo: {
                            entries: [],
                        },
                    });
                }
                return undefined;
            }
        })());
        instantiationService.stub(INotebookLoggingService, new (class extends mock() {
            info() { }
            debug() { }
        })());
        const kernelHistoryService = disposables.add(instantiationService.createInstance(NotebookKernelHistoryService));
        let info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 0);
        assert.ok(!info.selected);
        // update priorities for u1 notebook
        kernelService.updateKernelNotebookAffinity(k2, u1, 2);
        info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 0);
        // MRU only auto selects kernel if there is only one
        assert.deepStrictEqual(info.selected, undefined);
    });
    test('notebook kernel history restore', function () {
        const u1 = URI.parse('foo:///one');
        const k1 = new TestNotebookKernel({ label: 'z', notebookType: 'foo' });
        const k2 = new TestNotebookKernel({ label: 'a', notebookType: 'foo' });
        const k3 = new TestNotebookKernel({ label: 'b', notebookType: 'foo' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        disposables.add(kernelService.registerKernel(k3));
        instantiationService.stub(IStorageService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillSaveState = Event.None;
            }
            onDidChangeValue(scope, key, disposable) {
                return Event.None;
            }
            get(key, scope, fallbackValue) {
                if (key === 'notebook.kernelHistory') {
                    return JSON.stringify({
                        foo: {
                            entries: [k2.id],
                        },
                    });
                }
                return undefined;
            }
        })());
        instantiationService.stub(INotebookLoggingService, new (class extends mock() {
            info() { }
            debug() { }
        })());
        const kernelHistoryService = disposables.add(instantiationService.createInstance(NotebookKernelHistoryService));
        let info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.equal(info.all.length, 1);
        assert.deepStrictEqual(info.selected, undefined);
        kernelHistoryService.addMostRecentKernel(k3);
        info = kernelHistoryService.getKernels({ uri: u1, notebookType: 'foo' });
        assert.deepStrictEqual(info.all, [k3, k2]);
    });
});
class TestNotebookKernel {
    executeNotebookCellsRequest() {
        throw new Error('Method not implemented.');
    }
    cancelNotebookCellExecution() {
        throw new Error('Method not implemented.');
    }
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    constructor(opts) {
        this.id = Math.random() + 'kernel';
        this.label = 'test-label';
        this.viewType = '*';
        this.onDidChange = Event.None;
        this.extension = new ExtensionIdentifier('test');
        this.localResourceRoot = URI.file('/test');
        this.preloadUris = [];
        this.preloadProvides = [];
        this.supportedLanguages = [];
        this.supportedLanguages = opts?.languages ?? [PLAINTEXT_LANGUAGE_ID];
        this.label = opts?.label ?? this.label;
        this.viewType = opts?.notebookType ?? this.viewType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0tlcm5lbEhpc3RvcnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFHTixlQUFlLEdBS2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVB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