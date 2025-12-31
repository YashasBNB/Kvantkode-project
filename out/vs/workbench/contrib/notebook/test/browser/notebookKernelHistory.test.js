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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tLZXJuZWxIaXN0b3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixzQkFBc0IsR0FFdEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBR04sZUFBZSxHQUtmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFD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