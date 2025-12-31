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
import { h } from '../../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent, } from '../../../../../../base/common/observable.js';
import { EditorExtensionsRegistry, } from '../../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { CodeLensContribution } from '../../../../../../editor/contrib/codelens/browser/codelensController.js';
import { FoldingController } from '../../../../../../editor/contrib/folding/browser/folding.js';
import { MenuWorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_MAX_DIMENSIONS, DEFAULT_EDITOR_MIN_DIMENSIONS, } from '../../../../../browser/parts/editor/editor.js';
import { setStyle } from '../../utils.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
export class CodeEditorView extends Disposable {
    updateOptions(newOptions) {
        this.editor.updateOptions(newOptions);
    }
    constructor(instantiationService, viewModel, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.viewModel = viewModel;
        this.configurationService = configurationService;
        this.model = this.viewModel.map((m) => /** @description model */ m?.model);
        this.htmlElements = h('div.code-view', [
            h('div.header@header', [
                h('span.title@title'),
                h('span.description@description'),
                h('span.detail@detail'),
                h('span.toolbar@toolbar'),
            ]),
            h('div.container', [h('div.gutter@gutterDiv'), h('div@editor')]),
        ]);
        this._onDidViewChange = new Emitter();
        this.view = {
            element: this.htmlElements.root,
            minimumWidth: DEFAULT_EDITOR_MIN_DIMENSIONS.width,
            maximumWidth: DEFAULT_EDITOR_MAX_DIMENSIONS.width,
            minimumHeight: DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumHeight: DEFAULT_EDITOR_MAX_DIMENSIONS.height,
            onDidChange: this._onDidViewChange.event,
            layout: (width, height, top, left) => {
                setStyle(this.htmlElements.root, { width, height, top, left });
                this.editor.layout({
                    width: width - this.htmlElements.gutterDiv.clientWidth,
                    height: height - this.htmlElements.header.clientHeight,
                });
            },
            // preferredWidth?: number | undefined;
            // preferredHeight?: number | undefined;
            // priority?: LayoutPriority | undefined;
            // snap?: boolean | undefined;
        };
        this.checkboxesVisible = observableConfigValue('mergeEditor.showCheckboxes', false, this.configurationService);
        this.showDeletionMarkers = observableConfigValue('mergeEditor.showDeletionMarkers', true, this.configurationService);
        this.useSimplifiedDecorations = observableConfigValue('mergeEditor.useSimplifiedDecorations', false, this.configurationService);
        this.editor = this.instantiationService.createInstance(CodeEditorWidget, this.htmlElements.editor, {}, {
            contributions: this.getEditorContributions(),
        });
        this.isFocused = observableFromEvent(this, Event.any(this.editor.onDidBlurEditorWidget, this.editor.onDidFocusEditorWidget), () => /** @description editor.hasWidgetFocus */ this.editor.hasWidgetFocus());
        this.cursorPosition = observableFromEvent(this, this.editor.onDidChangeCursorPosition, () => /** @description editor.getPosition */ this.editor.getPosition());
        this.selection = observableFromEvent(this, this.editor.onDidChangeCursorSelection, () => /** @description editor.getSelections */ this.editor.getSelections());
        this.cursorLineNumber = this.cursorPosition.map((p) => /** @description cursorPosition.lineNumber */ p?.lineNumber);
    }
    getEditorContributions() {
        return EditorExtensionsRegistry.getEditorContributions().filter((c) => c.id !== FoldingController.ID && c.id !== CodeLensContribution.ID);
    }
}
export function createSelectionsAutorun(codeEditorView, translateRange) {
    const selections = derived((reader) => {
        /** @description selections */
        const viewModel = codeEditorView.viewModel.read(reader);
        if (!viewModel) {
            return [];
        }
        const baseRange = viewModel.selectionInBase.read(reader);
        if (!baseRange || baseRange.sourceEditor === codeEditorView) {
            return [];
        }
        return baseRange.rangesInBase.map((r) => translateRange(r, viewModel));
    });
    return autorun((reader) => {
        /** @description set selections */
        const ranges = selections.read(reader);
        if (ranges.length === 0) {
            return;
        }
        codeEditorView.editor.setSelections(ranges.map((r) => new Selection(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn)));
    });
}
let TitleMenu = class TitleMenu extends Disposable {
    constructor(menuId, targetHtmlElement, instantiationService) {
        super();
        const toolbar = instantiationService.createInstance(MenuWorkbenchToolBar, targetHtmlElement, menuId, {
            menuOptions: { renderShortTitle: true },
            toolbarOptions: { primaryGroup: (g) => g === 'primary' },
        });
        this._store.add(toolbar);
    }
};
TitleMenu = __decorate([
    __param(2, IInstantiationService)
], TitleMenu);
export { TitleMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvclZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvZWRpdG9ycy9jb2RlRWRpdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUVOLE9BQU8sRUFDUCxPQUFPLEVBQ1AsbUJBQW1CLEdBQ25CLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBR3pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUc1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDZCQUE2QixHQUM3QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtB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