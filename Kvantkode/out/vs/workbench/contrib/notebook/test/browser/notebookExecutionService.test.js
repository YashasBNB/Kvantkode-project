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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0V4ZWN1dGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUNBQXVDLEdBQ3ZDLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsd0JBQXdCLEVB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