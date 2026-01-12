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
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
suite('NotebookKernelService', () => {
    let instantiationService;
    let kernelService;
    let disposables;
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
    test('notebook priorities', function () {
        const u1 = URI.parse('foo:///one');
        const u2 = URI.parse('foo:///two');
        const k1 = new TestNotebookKernel({ label: 'z' });
        const k2 = new TestNotebookKernel({ label: 'a' });
        disposables.add(kernelService.registerKernel(k1));
        disposables.add(kernelService.registerKernel(k2));
        // equal priorities -> sort by name
        let info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // update priorities for u1 notebook
        kernelService.updateKernelNotebookAffinity(k2, u1, 2);
        kernelService.updateKernelNotebookAffinity(k2, u2, 1);
        // updated
        info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // NOT updated
        info = kernelService.getMatchingKernel({ uri: u2, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
        // reset
        kernelService.updateKernelNotebookAffinity(k2, u1, undefined);
        info = kernelService.getMatchingKernel({ uri: u1, notebookType: 'foo' });
        assert.ok(info.all[0] === k2);
        assert.ok(info.all[1] === k1);
    });
    test('new kernel with higher affinity wins, https://github.com/microsoft/vscode/issues/122028', function () {
        const notebook = URI.parse('foo:///one');
        const kernel = new TestNotebookKernel();
        disposables.add(kernelService.registerKernel(kernel));
        let info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 1);
        assert.ok(info.all[0] === kernel);
        const betterKernel = new TestNotebookKernel();
        disposables.add(kernelService.registerKernel(betterKernel));
        info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 2);
        kernelService.updateKernelNotebookAffinity(betterKernel, notebook, 2);
        info = kernelService.getMatchingKernel({ uri: notebook, notebookType: 'foo' });
        assert.strictEqual(info.all.length, 2);
        assert.ok(info.all[0] === betterKernel);
        assert.ok(info.all[1] === kernel);
    });
    test('onDidChangeSelectedNotebooks not fired on initial notebook open #121904', function () {
        const uri = URI.parse('foo:///one');
        const jupyter = { uri, viewType: 'jupyter', notebookType: 'jupyter' };
        const dotnet = { uri, viewType: 'dotnet', notebookType: 'dotnet' };
        const jupyterKernel = new TestNotebookKernel({ viewType: jupyter.viewType });
        const dotnetKernel = new TestNotebookKernel({ viewType: dotnet.viewType });
        disposables.add(kernelService.registerKernel(jupyterKernel));
        disposables.add(kernelService.registerKernel(dotnetKernel));
        kernelService.selectKernelForNotebook(jupyterKernel, jupyter);
        kernelService.selectKernelForNotebook(dotnetKernel, dotnet);
        let info = kernelService.getMatchingKernel(dotnet);
        assert.strictEqual(info.selected === dotnetKernel, true);
        info = kernelService.getMatchingKernel(jupyter);
        assert.strictEqual(info.selected === jupyterKernel, true);
    });
    test('onDidChangeSelectedNotebooks not fired on initial notebook open #121904, p2', async function () {
        const uri = URI.parse('foo:///one');
        const jupyter = { uri, viewType: 'jupyter', notebookType: 'jupyter' };
        const dotnet = { uri, viewType: 'dotnet', notebookType: 'dotnet' };
        const jupyterKernel = new TestNotebookKernel({ viewType: jupyter.viewType });
        const dotnetKernel = new TestNotebookKernel({ viewType: dotnet.viewType });
        disposables.add(kernelService.registerKernel(jupyterKernel));
        disposables.add(kernelService.registerKernel(dotnetKernel));
        kernelService.selectKernelForNotebook(jupyterKernel, jupyter);
        kernelService.selectKernelForNotebook(dotnetKernel, dotnet);
        const transientOptions = {
            transientOutputs: false,
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            cellContentMetadata: {},
        };
        {
            // open as jupyter -> bind event
            const p1 = Event.toPromise(kernelService.onDidChangeSelectedNotebooks);
            const d1 = disposables.add(instantiationService.createInstance(NotebookTextModel, jupyter.viewType, jupyter.uri, [], {}, transientOptions));
            onDidAddNotebookDocument.fire(d1);
            const event = await p1;
            assert.strictEqual(event.newKernel, jupyterKernel.id);
        }
        {
            // RE-open as dotnet -> bind event
            const p2 = Event.toPromise(kernelService.onDidChangeSelectedNotebooks);
            const d2 = disposables.add(instantiationService.createInstance(NotebookTextModel, dotnet.viewType, dotnet.uri, [], {}, transientOptions));
            onDidAddNotebookDocument.fire(d2);
            const event2 = await p2;
            assert.strictEqual(event2.newKernel, dotnetKernel.id);
        }
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
        this.viewType = opts?.viewType ?? this.viewType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0tlcm5lbFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUVOLHNCQUFzQixHQUV0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXZGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxD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