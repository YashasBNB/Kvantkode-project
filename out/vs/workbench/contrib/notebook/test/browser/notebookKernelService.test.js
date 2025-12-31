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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tLZXJuZWxTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixzQkFBc0IsR0FFdEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUV2RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtB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YSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckQsYUFBYSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckQsVUFBVTtRQUNWLElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFN0IsY0FBYztRQUNkLElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFN0IsUUFBUTtRQUNSLGFBQWEsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdELElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUZBQXlGLEVBQUU7UUFDL0YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUV4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7UUFDdkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFckQsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQTtRQUVqQyxNQUFNLFlBQVksR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7UUFDN0MsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFM0QsSUFBSSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxhQUFhLENBQUMsNEJBQTRCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxJQUFJLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUVBQXlFLEVBQUU7UUFDL0UsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsQ0FBQTtRQUNyRSxNQUFNLE1BQU0sR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUVsRSxNQUFNLGFBQWEsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sWUFBWSxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDMUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFM0QsYUFBYSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3RCxhQUFhLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRTNELElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXhELElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLO1FBQ3hGLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUE7UUFDckUsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFFbEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUM1RSxNQUFNLFlBQVksR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRTNELGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0QsYUFBYSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUUzRCxNQUFNLGdCQUFnQixHQUFxQjtZQUMxQyxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLHFCQUFxQixFQUFFLEVBQUU7WUFDekIseUJBQXlCLEVBQUUsRUFBRTtZQUM3QixtQkFBbUIsRUFBRSxFQUFFO1NBQ3ZCLENBQUE7UUFFRCxDQUFDO1lBQ0EsZ0NBQWdDO1lBQ2hDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFDLENBQUE7WUFDdEUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDekIsb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxpQkFBaUIsRUFDakIsT0FBTyxDQUFDLFFBQVEsRUFDaEIsT0FBTyxDQUFDLEdBQUcsRUFDWCxFQUFFLEVBQ0YsRUFBRSxFQUNGLGdCQUFnQixDQUNoQixDQUNELENBQUE7WUFDRCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakMsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUE7WUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsQ0FBQztZQUNBLGtDQUFrQztZQUNsQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1lBQ3RFLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsaUJBQWlCLEVBQ2pCLE1BQU0sQ0FBQyxRQUFRLEVBQ2YsTUFBTSxDQUFDLEdBQUcsRUFDVixFQUFFLEVBQ0YsRUFBRSxFQUNGLGdCQUFnQixDQUNoQixDQUNELENBQUE7WUFDRCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakMsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUE7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sa0JBQWtCO0lBWXZCLDJCQUEyQjtRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELDJCQUEyQjtRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELGdCQUFnQixDQUNmLFdBQWdCLEVBQ2hCLFFBQTRCLEVBQzVCLElBQXlCLEVBQ3pCLEtBQWEsRUFDYixLQUF3QjtRQUV4QixPQUFPLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtJQUNqQyxDQUFDO0lBRUQsWUFBWSxJQUFrRTtRQTNCOUUsT0FBRSxHQUFXLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUE7UUFDckMsVUFBSyxHQUFXLFlBQVksQ0FBQTtRQUM1QixhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsZ0JBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3hCLGNBQVMsR0FBd0IsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRSxzQkFBaUIsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRzFDLGdCQUFXLEdBQVUsRUFBRSxDQUFBO1FBQ3ZCLG9CQUFlLEdBQWEsRUFBRSxDQUFBO1FBQzlCLHVCQUFrQixHQUFhLEVBQUUsQ0FBQTtRQWtCaEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksRUFBRSxTQUFTLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxFQUFFLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ2hELENBQUM7Q0FDRCJ9