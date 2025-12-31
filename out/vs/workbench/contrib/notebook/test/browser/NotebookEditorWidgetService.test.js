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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTm90ZWJvb2tFZGl0b3JXaWRnZXRTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvTm90ZWJvb2tFZGl0b3JXaWRnZXRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFRckcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkUsT0FBTyxFQUVOLG9CQUFvQixHQUVwQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLDJCQUEyQjtJQUN4RSxZQUN1QixrQkFBd0MsRUFD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