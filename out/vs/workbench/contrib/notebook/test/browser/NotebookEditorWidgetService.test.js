/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidgetService } from '../../browser/services/notebookEditorServiceImpl.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { setupInstantiationService } from './testNotebookEditor.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
let TestNotebookEditorWidgetService = class TestNotebookEditorWidgetService extends NotebookEditorWidgetService {
    constructor(editorGroupService, editorService, contextKeyService, instantiationService) {
        super(editorGroupService, editorService, contextKeyService, instantiationService);
    }
    createWidget() {
        return new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillHide = () => { };
                this.getDomNode = () => {
                    return { remove: () => { } };
                };
                this.dispose = () => { };
            }
        })();
    }
};
TestNotebookEditorWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], TestNotebookEditorWidgetService);
function createNotebookInput(path, editorType) {
    return new (class extends mock() {
        constructor() {
            super(...arguments);
            this.resource = URI.parse(path);
        }
        get typeId() {
            return editorType;
        }
    })();
}
suite('NotebookEditorWidgetService', () => {
    let disposables;
    let instantiationService;
    let editorGroup1;
    let editorGroup2;
    let ondidRemoveGroup;
    let onDidCloseEditor;
    let onWillMoveEditor;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        ondidRemoveGroup = new Emitter();
        onDidCloseEditor = new Emitter();
        onWillMoveEditor = new Emitter();
        editorGroup1 = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.id = 1;
                this.onDidCloseEditor = onDidCloseEditor.event;
                this.onWillMoveEditor = onWillMoveEditor.event;
            }
        })();
        editorGroup2 = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.id = 2;
                this.onDidCloseEditor = Event.None;
                this.onWillMoveEditor = Event.None;
            }
        })();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(IEditorGroupsService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRemoveGroup = ondidRemoveGroup.event;
                this.onDidAddGroup = Event.None;
                this.whenReady = Promise.resolve();
                this.groups = [editorGroup1, editorGroup2];
            }
            getPart(container) {
                return { windowId: 0 };
            }
        })());
        instantiationService.stub(IEditorService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidEditorsChange = Event.None;
            }
        })());
    });
    test('Retrieve widget within group', async function () {
        const notebookEditorInput = createNotebookInput('/test.np', 'type1');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, notebookEditorInput);
        const value = widget.value;
        const widget2 = notebookEditorService.retrieveWidget(instantiationService, 1, notebookEditorInput);
        assert.notStrictEqual(widget2.value, undefined, 'should create a widget');
        assert.strictEqual(value, widget2.value, 'should return the same widget');
        assert.strictEqual(widget.value, undefined, 'initial borrow should no longer have widget');
    });
    test('Retrieve independent widgets', async function () {
        const inputType1 = createNotebookInput('/test.np', 'type1');
        const inputType2 = createNotebookInput('/test.np', 'type2');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        const widgetDiffType = notebookEditorService.retrieveWidget(instantiationService, 1, inputType2);
        assert.notStrictEqual(widget.value, undefined, 'should create a widget');
        assert.notStrictEqual(widgetDiffGroup.value, undefined, 'should create a widget');
        assert.notStrictEqual(widgetDiffType.value, undefined, 'should create a widget');
        assert.notStrictEqual(widget.value, widgetDiffGroup.value, 'should return a different widget');
        assert.notStrictEqual(widget.value, widgetDiffType.value, 'should return a different widget');
    });
    test('Only relevant widgets get disposed', async function () {
        const inputType1 = createNotebookInput('/test.np', 'type1');
        const inputType2 = createNotebookInput('/test.np', 'type2');
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const widget = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        const widgetDiffType = notebookEditorService.retrieveWidget(instantiationService, 1, inputType2);
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        ondidRemoveGroup.fire(editorGroup1);
        assert.strictEqual(widget.value, undefined, 'widgets in group should get disposed');
        assert.strictEqual(widgetDiffType.value, undefined, 'widgets in group should get disposed');
        assert.notStrictEqual(widgetDiffGroup.value, undefined, 'other group should not be disposed');
        notebookEditorService.dispose();
    });
    test('Widget should move between groups when editor is moved', async function () {
        const inputType1 = createNotebookInput('/test.np', NotebookEditorInput.ID);
        const notebookEditorService = disposables.add(instantiationService.createInstance(TestNotebookEditorWidgetService));
        const initialValue = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1).value;
        await new Promise((resolve) => setTimeout(resolve, 0));
        onWillMoveEditor.fire({
            editor: inputType1,
            groupId: 1,
            target: 2,
        });
        const widgetDiffGroup = notebookEditorService.retrieveWidget(instantiationService, 2, inputType1);
        const widgetFirstGroup = notebookEditorService.retrieveWidget(instantiationService, 1, inputType1);
        assert.notStrictEqual(initialValue, undefined, 'valid widget');
        assert.strictEqual(widgetDiffGroup.value, initialValue, 'widget should be reused in new group');
        assert.notStrictEqual(widgetFirstGroup.value, initialValue, 'should create a new widget in the first group');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90ZWJvb2tFZGl0b3JXaWRnZXRTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9Ob3RlYm9va0VkaXRvcldpZGdldFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQVFyRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sb0JBQW9CLEdBRXBCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsMkJBQTJCO0lBQ3hFLFlBQ3VCLGtCQUF3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