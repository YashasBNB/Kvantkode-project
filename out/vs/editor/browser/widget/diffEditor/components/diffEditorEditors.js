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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunHandleChanges, derived, derivedOpts, observableFromEvent, } from '../../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../observableCodeEditor.js';
import { OverviewRulerFeature } from '../features/overviewRulerFeature.js';
import { EditorOptions } from '../../../../common/config/editorOptions.js';
import { Position } from '../../../../common/core/position.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
let DiffEditorEditors = class DiffEditorEditors extends Disposable {
    get onDidContentSizeChange() {
        return this._onDidContentSizeChange.event;
    }
    constructor(originalEditorElement, modifiedEditorElement, _options, _argCodeEditorWidgetOptions, _createInnerEditor, _contextKeyService, _instantiationService, _keybindingService) {
        super();
        this.originalEditorElement = originalEditorElement;
        this.modifiedEditorElement = modifiedEditorElement;
        this._options = _options;
        this._argCodeEditorWidgetOptions = _argCodeEditorWidgetOptions;
        this._createInnerEditor = _createInnerEditor;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this.original = this._register(this._createLeftHandSideEditor(this._options.editorOptions.get(), this._argCodeEditorWidgetOptions.originalEditor || {}));
        this.modified = this._register(this._createRightHandSideEditor(this._options.editorOptions.get(), this._argCodeEditorWidgetOptions.modifiedEditor || {}));
        this._onDidContentSizeChange = this._register(new Emitter());
        this.modifiedScrollTop = observableFromEvent(this, this.modified.onDidScrollChange, () => /** @description modified.getScrollTop */ this.modified.getScrollTop());
        this.modifiedScrollHeight = observableFromEvent(this, this.modified.onDidScrollChange, () => /** @description modified.getScrollHeight */ this.modified.getScrollHeight());
        this.modifiedObs = observableCodeEditor(this.modified);
        this.originalObs = observableCodeEditor(this.original);
        this.modifiedModel = this.modifiedObs.model;
        this.modifiedSelections = observableFromEvent(this, this.modified.onDidChangeCursorSelection, () => this.modified.getSelections() ?? []);
        this.modifiedCursor = derivedOpts({ owner: this, equalsFn: Position.equals }, (reader) => this.modifiedSelections.read(reader)[0]?.getPosition() ?? new Position(1, 1));
        this.originalCursor = observableFromEvent(this, this.original.onDidChangeCursorPosition, () => this.original.getPosition() ?? new Position(1, 1));
        this.isOriginalFocused = observableCodeEditor(this.original).isFocused;
        this.isModifiedFocused = observableCodeEditor(this.modified).isFocused;
        this.isFocused = derived(this, (reader) => this.isOriginalFocused.read(reader) || this.isModifiedFocused.read(reader));
        this._argCodeEditorWidgetOptions = null;
        this._register(autorunHandleChanges({
            createEmptyChangeSummary: () => ({}),
            handleChange: (ctx, changeSummary) => {
                if (ctx.didChange(_options.editorOptions)) {
                    Object.assign(changeSummary, ctx.change.changedOptions);
                }
                return true;
            },
        }, (reader, changeSummary) => {
            /** @description update editor options */
            _options.editorOptions.read(reader);
            this._options.renderSideBySide.read(reader);
            this.modified.updateOptions(this._adjustOptionsForRightHandSide(reader, changeSummary));
            this.original.updateOptions(this._adjustOptionsForLeftHandSide(reader, changeSummary));
        }));
    }
    _createLeftHandSideEditor(options, codeEditorWidgetOptions) {
        const leftHandSideOptions = this._adjustOptionsForLeftHandSide(undefined, options);
        const editor = this._constructInnerEditor(this._instantiationService, this.originalEditorElement, leftHandSideOptions, codeEditorWidgetOptions);
        const isInDiffLeftEditorKey = this._contextKeyService.createKey('isInDiffLeftEditor', editor.hasWidgetFocus());
        this._register(editor.onDidFocusEditorWidget(() => isInDiffLeftEditorKey.set(true)));
        this._register(editor.onDidBlurEditorWidget(() => isInDiffLeftEditorKey.set(false)));
        return editor;
    }
    _createRightHandSideEditor(options, codeEditorWidgetOptions) {
        const rightHandSideOptions = this._adjustOptionsForRightHandSide(undefined, options);
        const editor = this._constructInnerEditor(this._instantiationService, this.modifiedEditorElement, rightHandSideOptions, codeEditorWidgetOptions);
        const isInDiffRightEditorKey = this._contextKeyService.createKey('isInDiffRightEditor', editor.hasWidgetFocus());
        this._register(editor.onDidFocusEditorWidget(() => isInDiffRightEditorKey.set(true)));
        this._register(editor.onDidBlurEditorWidget(() => isInDiffRightEditorKey.set(false)));
        return editor;
    }
    _constructInnerEditor(instantiationService, container, options, editorWidgetOptions) {
        const editor = this._createInnerEditor(instantiationService, container, options, editorWidgetOptions);
        this._register(editor.onDidContentSizeChange((e) => {
            const width = this.original.getContentWidth() +
                this.modified.getContentWidth() +
                OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH;
            const height = Math.max(this.modified.getContentHeight(), this.original.getContentHeight());
            this._onDidContentSizeChange.fire({
                contentHeight: height,
                contentWidth: width,
                contentHeightChanged: e.contentHeightChanged,
                contentWidthChanged: e.contentWidthChanged,
            });
        }));
        return editor;
    }
    _adjustOptionsForLeftHandSide(_reader, changedOptions) {
        const result = this._adjustOptionsForSubEditor(changedOptions);
        if (!this._options.renderSideBySide.get()) {
            // never wrap hidden editor
            result.wordWrapOverride1 = 'off';
            result.wordWrapOverride2 = 'off';
            result.stickyScroll = { enabled: false };
            // Disable unicode highlighting for the original side in inline mode, as they are not shown anyway.
            result.unicodeHighlight = {
                nonBasicASCII: false,
                ambiguousCharacters: false,
                invisibleCharacters: false,
            };
        }
        else {
            result.unicodeHighlight = this._options.editorOptions.get().unicodeHighlight || {};
            result.wordWrapOverride1 = this._options.diffWordWrap.get();
        }
        result.glyphMargin = this._options.renderSideBySide.get();
        if (changedOptions.originalAriaLabel) {
            result.ariaLabel = changedOptions.originalAriaLabel;
        }
        result.ariaLabel = this._updateAriaLabel(result.ariaLabel);
        result.readOnly = !this._options.originalEditable.get();
        result.dropIntoEditor = { enabled: !result.readOnly };
        result.extraEditorClassName = 'original-in-monaco-diff-editor';
        return result;
    }
    _adjustOptionsForRightHandSide(reader, changedOptions) {
        const result = this._adjustOptionsForSubEditor(changedOptions);
        if (changedOptions.modifiedAriaLabel) {
            result.ariaLabel = changedOptions.modifiedAriaLabel;
        }
        result.ariaLabel = this._updateAriaLabel(result.ariaLabel);
        result.wordWrapOverride1 = this._options.diffWordWrap.get();
        result.revealHorizontalRightPadding =
            EditorOptions.revealHorizontalRightPadding.defaultValue +
                OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH;
        result.scrollbar.verticalHasArrows = false;
        result.extraEditorClassName = 'modified-in-monaco-diff-editor';
        return result;
    }
    _adjustOptionsForSubEditor(options) {
        const clonedOptions = {
            ...options,
            dimension: {
                height: 0,
                width: 0,
            },
        };
        clonedOptions.inDiffEditor = true;
        clonedOptions.automaticLayout = false;
        // Clone scrollbar options before changing them
        clonedOptions.scrollbar = { ...(clonedOptions.scrollbar || {}) };
        clonedOptions.folding = false;
        clonedOptions.codeLens = this._options.diffCodeLens.get();
        clonedOptions.fixedOverflowWidgets = true;
        // Clone minimap options before changing them
        clonedOptions.minimap = { ...(clonedOptions.minimap || {}) };
        clonedOptions.minimap.enabled = false;
        if (this._options.hideUnchangedRegions.get()) {
            clonedOptions.stickyScroll = { enabled: false };
        }
        else {
            clonedOptions.stickyScroll = this._options.editorOptions.get().stickyScroll;
        }
        return clonedOptions;
    }
    _updateAriaLabel(ariaLabel) {
        if (!ariaLabel) {
            ariaLabel = '';
        }
        const ariaNavigationTip = localize('diff-aria-navigation-tip', ' use {0} to open the accessibility help.', this._keybindingService.lookupKeybinding('editor.action.accessibilityHelp')?.getAriaLabel());
        if (this._options.accessibilityVerbose.get()) {
            return ariaLabel + ariaNavigationTip;
        }
        else if (ariaLabel) {
            return ariaLabel.replaceAll(ariaNavigationTip, '');
        }
        return '';
    }
};
DiffEditorEditors = __decorate([
    __param(5, IContextKeyService),
    __param(6, IInstantiationService),
    __param(7, IKeybindingService)
], DiffEditorEditors);
export { DiffEditorEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUVOLG9CQUFvQixFQUNwQixPQUFPLEVBQ1AsV0FBVyxFQUNYLG1CQUFtQixHQUNuQixNQUFNLDBDQUEwQyxDQUFBO0FBR2pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sNENBQTRDLENBQUE7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUVyRixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFlaEQsSUFBVyxzQkFBc0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO0lBQzFDLENBQUM7SUEwQ0QsWUFDa0IscUJBQWtDLEVBQ2xDLHFCQUFr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