/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite, } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { insertCellAtIndex } from '../../browser/controller/cellOperations.js';
import { NotebookExecutionService } from '../../browser/services/notebookExecutionServiceImpl.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { INotebookService } from '../../common/notebookService.js';
import { setupInstantiationService, withTestNotebook as _withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookExecutionService', () => {
    let instantiationService;
    let contextKeyService;
    let kernelService;
    let disposables;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(INotebookService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookDocument = Event.None;
                this.onWillRemoveNotebookDocument = Event.None;
            }
            getNotebookTextModels() {
                return [];
            }
        })());
        instantiationService.stub(INotebookLoggingService, new (class extends mock() {
            debug(category, output) {
                //
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
        instantiationService.stub(INotebookKernelHistoryService, new (class extends mock() {
            getKernels(notebook) {
                return kernelService.getMatchingKernel(notebook);
            }
            addMostRecentKernel(kernel) { }
        })());
        instantiationService.stub(ICommandService, new (class extends mock() {
            executeCommand(_commandId, ..._args) {
                return Promise.resolve(undefined);
            }
        })());
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
        contextKeyService = instantiationService.get(IContextKeyService);
    });
    async function withTestNotebook(cells, callback) {
        return _withTestNotebook(cells, (editor, viewModel, disposables) => callback(viewModel, viewModel.notebookDocument, disposables));
    }
    // test('ctor', () => {
    // 	instantiationService.createInstance(NotebookEditorKernelManager, { activeKernel: undefined, viewModel: undefined });
    // 	const contextKeyService = instantiationService.get(IContextKeyService);
    // 	assert.strictEqual(contextKeyService.getContextKeyValue(NOTEBOOK_KERNEL_COUNT.key), 0);
    // });
    test('cell is not runnable when no kernel is selected', async () => {
        await withTestNotebook([], async (viewModel, textModel, disposables) => {
            const executionService = instantiationService.createInstance(NotebookExecutionService);
            const cell = insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true);
            await assertThrowsAsync(async () => await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService));
        });
    });
    test('cell is not runnable when kernel does not support the language', async () => {
        await withTestNotebook([], async (viewModel, textModel) => {
            disposables.add(kernelService.registerKernel(new TestNotebookKernel({ languages: ['testlang'] })));
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const cell = disposables.add(insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await assertThrowsAsync(async () => await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService));
        });
    });
    test('cell is runnable when kernel does support the language', async () => {
        await withTestNotebook([], async (viewModel, textModel) => {
            const kernel = new TestNotebookKernel({ languages: ['javascript'] });
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, textModel);
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const executeSpy = sinon.spy();
            kernel.executeNotebookCellsRequest = executeSpy;
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await executionService.executeNotebookCells(viewModel.notebookDocument, [cell.model], contextKeyService);
            assert.strictEqual(executeSpy.calledOnce, true);
        });
    });
    test('Completes unconfirmed executions', async function () {
        return withTestNotebook([], async (viewModel, textModel) => {
            let didExecute = false;
            const kernel = new (class extends TestNotebookKernel {
                constructor() {
                    super({ languages: ['javascript'] });
                    this.id = 'mySpecialId';
                }
                async executeNotebookCellsRequest() {
                    didExecute = true;
                    return;
                }
            })();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, textModel);
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const exeStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService);
            assert.strictEqual(didExecute, true);
            assert.strictEqual(exeStateService.getCellExecution(cell.uri), undefined);
        });
    });
});
class TestNotebookKernel {
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    executeNotebookCellsRequest() {
        throw new Error('Method not implemented.');
    }
    cancelNotebookCellExecution() {
        throw new Error('Method not implemented.');
    }
    constructor(opts) {
        this.id = 'test';
        this.label = '';
        this.viewType = '*';
        this.onDidChange = Event.None;
        this.extension = new ExtensionIdentifier('test');
        this.localResourceRoot = URI.file('/test');
        this.preloadUris = [];
        this.preloadProvides = [];
        this.supportedLanguages = [];
        this.supportedLanguages = opts?.languages ?? [PLAINTEXT_LANGUAGE_ID];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVDQUF1QyxHQUN2QyxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFD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