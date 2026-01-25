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
var RangeHighlightDecorations_1;
import { Emitter } from '../../base/common/event.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { isEqual } from '../../base/common/resources.js';
import { isCodeEditor, isCompositeEditor, } from '../../editor/browser/editorBrowser.js';
import { EmbeddedCodeEditorWidget } from '../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ModelDecorationOptions } from '../../editor/common/model/textModel.js';
import { AbstractFloatingClickMenu, FloatingClickWidget, } from '../../platform/actions/browser/floatingMenu.js';
import { IMenuService, MenuId } from '../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../platform/keybinding/common/keybinding.js';
import { IEditorService } from '../services/editor/common/editorService.js';
let RangeHighlightDecorations = class RangeHighlightDecorations extends Disposable {
    static { RangeHighlightDecorations_1 = this; }
    constructor(editorService) {
        super();
        this.editorService = editorService;
        this._onHighlightRemoved = this._register(new Emitter());
        this.onHighlightRemoved = this._onHighlightRemoved.event;
        this.rangeHighlightDecorationId = null;
        this.editor = null;
        this.editorDisposables = this._register(new DisposableStore());
    }
    removeHighlightRange() {
        if (this.editor && this.rangeHighlightDecorationId) {
            const decorationId = this.rangeHighlightDecorationId;
            this.editor.changeDecorations((accessor) => {
                accessor.removeDecoration(decorationId);
            });
            this._onHighlightRemoved.fire();
        }
        this.rangeHighlightDecorationId = null;
    }
    highlightRange(range, editor) {
        editor = editor ?? this.getEditor(range);
        if (isCodeEditor(editor)) {
            this.doHighlightRange(editor, range);
        }
        else if (isCompositeEditor(editor) && isCodeEditor(editor.activeCodeEditor)) {
            this.doHighlightRange(editor.activeCodeEditor, range);
        }
    }
    doHighlightRange(editor, selectionRange) {
        this.removeHighlightRange();
        editor.changeDecorations((changeAccessor) => {
            this.rangeHighlightDecorationId = changeAccessor.addDecoration(selectionRange.range, this.createRangeHighlightDecoration(selectionRange.isWholeLine));
        });
        this.setEditor(editor);
    }
    getEditor(resourceRange) {
        const resource = this.editorService.activeEditor?.resource;
        if (resource &&
            isEqual(resource, resourceRange.resource) &&
            isCodeEditor(this.editorService.activeTextEditorControl)) {
            return this.editorService.activeTextEditorControl;
        }
        return undefined;
    }
    setEditor(editor) {
        if (this.editor !== editor) {
            this.editorDisposables.clear();
            this.editor = editor;
            this.editorDisposables.add(this.editor.onDidChangeCursorPosition((e) => {
                if (e.reason === 0 /* CursorChangeReason.NotSet */ ||
                    e.reason === 3 /* CursorChangeReason.Explicit */ ||
                    e.reason === 5 /* CursorChangeReason.Undo */ ||
                    e.reason === 6 /* CursorChangeReason.Redo */) {
                    this.removeHighlightRange();
                }
            }));
            this.editorDisposables.add(this.editor.onDidChangeModel(() => {
                this.removeHighlightRange();
            }));
            this.editorDisposables.add(this.editor.onDidDispose(() => {
                this.removeHighlightRange();
                this.editor = null;
            }));
        }
    }
    static { this._WHOLE_LINE_RANGE_HIGHLIGHT = ModelDecorationOptions.register({
        description: 'codeeditor-range-highlight-whole',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'rangeHighlight',
        isWholeLine: true,
    }); }
    static { this._RANGE_HIGHLIGHT = ModelDecorationOptions.register({
        description: 'codeeditor-range-highlight',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'rangeHighlight',
    }); }
    createRangeHighlightDecoration(isWholeLine = true) {
        return isWholeLine
            ? RangeHighlightDecorations_1._WHOLE_LINE_RANGE_HIGHLIGHT
            : RangeHighlightDecorations_1._RANGE_HIGHLIGHT;
    }
    dispose() {
        super.dispose();
        if (this.editor?.getModel()) {
            this.removeHighlightRange();
            this.editor = null;
        }
    }
};
RangeHighlightDecorations = RangeHighlightDecorations_1 = __decorate([
    __param(0, IEditorService)
], RangeHighlightDecorations);
export { RangeHighlightDecorations };
let FloatingEditorClickWidget = class FloatingEditorClickWidget extends FloatingClickWidget {
    constructor(editor, label, keyBindingAction, keybindingService) {
        super(keyBindingAction && keybindingService.lookupKeybinding(keyBindingAction)
            ? `${label} (${keybindingService.lookupKeybinding(keyBindingAction).getLabel()})`
            : label);
        this.editor = editor;
    }
    getId() {
        return 'editor.overlayWidget.floatingClickWidget';
    }
    getPosition() {
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */,
        };
    }
    render() {
        super.render();
        this.editor.addOverlayWidget(this);
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
};
FloatingEditorClickWidget = __decorate([
    __param(3, IKeybindingService)
], FloatingEditorClickWidget);
export { FloatingEditorClickWidget };
let FloatingEditorClickMenu = class FloatingEditorClickMenu extends AbstractFloatingClickMenu {
    static { this.ID = 'editor.contrib.floatingClickMenu'; }
    constructor(editor, instantiationService, menuService, contextKeyService) {
        super(MenuId.EditorContent, menuService, contextKeyService);
        this.editor = editor;
        this.instantiationService = instantiationService;
        this.render();
    }
    createWidget(action) {
        return this.instantiationService.createInstance(FloatingEditorClickWidget, this.editor, action.label, action.id);
    }
    isVisible() {
        return (!(this.editor instanceof EmbeddedCodeEditorWidget) &&
            this.editor?.hasModel() &&
            !this.editor.getOption(63 /* EditorOption.inDiffEditor */));
    }
    getActionArg() {
        return this.editor.getModel()?.uri;
    }
};
FloatingEditorClickMenu = __decorate([
    __param(1, IInstantiationService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], FloatingEditorClickMenu);
export { FloatingEditorClickMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvY29kZWVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE9BQU8sRUFLTixZQUFZLEVBQ1osaUJBQWlCLEdBQ2pCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFZN0csT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0UsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQVFwRSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7O0lBUXhELFlBQTRCLGFBQThDO1FBQ3pFLEtBQUssRUFBRSxDQUFBO1FBRHFDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQVB6RCx3QkFBbUIs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