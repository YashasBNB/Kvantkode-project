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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2NvZGVlZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV4RCxPQUFPLEVBS04sWUFBWSxFQUNaLGlCQUFpQixHQUNqQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBWTdHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsbUJBQW1CLEdBQ25CLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFRcEUsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVOztJQVF4RCxZQUE0QixhQUE4QztRQUN6RSxLQUFLLEVBQUUsQ0FBQTtRQURxQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFQekQsd0JBQW1CLEdBQUcs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