/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isEqual } from '../../../../base/common/resources.js';
import { CodeEditorWidget, } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { AbstractTextEditor } from './textEditor.js';
/**
 * A text editor using the code editor widget.
 */
export class AbstractTextCodeEditor extends AbstractTextEditor {
    constructor() {
        super(...arguments);
        this.editorControl = undefined;
    }
    get scopedContextKeyService() {
        return this.editorControl?.invokeWithinContext((accessor) => accessor.get(IContextKeyService));
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('textEditor', 'Text Editor');
    }
    createEditorControl(parent, initialOptions) {
        this.editorControl = this._register(this.instantiationService.createInstance(CodeEditorWidget, parent, initialOptions, this.getCodeEditorWidgetOptions()));
    }
    getCodeEditorWidgetOptions() {
        return Object.create(null);
    }
    updateEditorControlOptions(options) {
        this.editorControl?.updateOptions(options);
    }
    getMainControl() {
        return this.editorControl;
    }
    getControl() {
        return this.editorControl;
    }
    computeEditorViewState(resource) {
        if (!this.editorControl) {
            return undefined;
        }
        const model = this.editorControl.getModel();
        if (!model) {
            return undefined; // view state always needs a model
        }
        const modelUri = model.uri;
        if (!modelUri) {
            return undefined; // model URI is needed to make sure we save the view state correctly
        }
        if (!isEqual(modelUri, resource)) {
            return undefined; // prevent saving view state for a model that is not the expected one
        }
        return this.editorControl.saveViewState() ?? undefined;
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            applyTextEditorOptions(options, assertIsDefined(this.editorControl), 0 /* ScrollType.Smooth */);
        }
    }
    focus() {
        super.focus();
        this.editorControl?.focus();
    }
    hasFocus() {
        return this.editorControl?.hasTextFocus() || super.hasFocus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        if (visible) {
            this.editorControl?.onVisible();
        }
        else {
            this.editorControl?.onHide();
        }
    }
    layout(dimension) {
        this.editorControl?.layout(dimension);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dENvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvdGV4dENvZGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtFQUFrRSxDQUFBO0FBR3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBR3BEOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixzQkFDckIsU0FBUSxrQkFBcUI7SUFEOUI7O1FBSVcsa0JBQWEsR0FBNEIsU0FBUyxDQUFBO0lBOEY3RCxDQUFDO0lBNUZBLElBQWEsdUJBQXVCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVRLFFBQVE7UUFDaEIsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDN0Ms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