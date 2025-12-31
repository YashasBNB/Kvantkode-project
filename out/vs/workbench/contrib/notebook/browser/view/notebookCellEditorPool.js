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
import * as DOM from '../../../../../base/browser/dom.js';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { CellFocusMode } from '../notebookBrowser.js';
import { CellEditorOptions } from './cellParts/cellEditorOptions.js';
let NotebookCellEditorPool = class NotebookCellEditorPool extends Disposable {
    constructor(notebookEditor, contextKeyServiceProvider, textModelService, _configurationService, _instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyServiceProvider = contextKeyServiceProvider;
        this.textModelService = textModelService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._editorDisposable = this._register(new MutableDisposable());
        this._isInitialized = false;
        this._isDisposed = false;
        this._focusedEditorDOM = this.notebookEditor
            .getDomNode()
            .appendChild(DOM.$('.cell-editor-part-cache'));
        this._focusedEditorDOM.style.position = 'absolute';
        this._focusedEditorDOM.style.top = '-50000px';
        this._focusedEditorDOM.style.width = '1px';
        this._focusedEditorDOM.style.height = '1px';
    }
    _initializeEditor(cell) {
        this._editorContextKeyService = this._register(this.contextKeyServiceProvider(this._focusedEditorDOM));
        const editorContainer = DOM.prepend(this._focusedEditorDOM, DOM.$('.cell-editor-container'));
        const editorInstaService = this._register(this._instantiationService.createChild(new ServiceCollection([IContextKeyService, this._editorContextKeyService])));
        EditorContextKeys.inCompositeEditor.bindTo(this._editorContextKeyService).set(true);
        const editorOptions = new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(cell.language), this.notebookEditor.notebookOptions, this._configurationService);
        this._editor = this._register(editorInstaService.createInstance(CodeEditorWidget, editorContainer, {
            ...editorOptions.getDefaultValue(),
            dimension: {
                width: 0,
                height: 0,
            },
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
                handleMouseWheel: false,
                useShadows: false,
            },
        }, {
            contributions: this.notebookEditor.creationOptions.cellEditorContributions,
        }));
        editorOptions.dispose();
        this._isInitialized = true;
    }
    preserveFocusedEditor(cell) {
        if (!this._isInitialized) {
            this._initializeEditor(cell);
        }
        this._editorDisposable.clear();
        this._focusEditorCancellablePromise?.cancel();
        this._focusEditorCancellablePromise = createCancelablePromise(async (token) => {
            const ref = await this.textModelService.createModelReference(cell.uri);
            if (this._isDisposed || token.isCancellationRequested) {
                ref.dispose();
                return;
            }
            const editorDisposable = new DisposableStore();
            editorDisposable.add(ref);
            this._editor.setModel(ref.object.textEditorModel);
            this._editor.setSelections(cell.getSelections());
            this._editor.focus();
            const _update = () => {
                const editorSelections = this._editor.getSelections();
                if (editorSelections) {
                    cell.setSelections(editorSelections);
                }
                this.notebookEditor.revealInView(cell);
                this._editor.setModel(null);
                ref.dispose();
            };
            editorDisposable.add(this._editor.onDidChangeModelContent((e) => {
                _update();
            }));
            editorDisposable.add(this._editor.onDidChangeCursorSelection((e) => {
                if (e.source === 'keyboard' || e.source === 'mouse') {
                    _update();
                }
            }));
            editorDisposable.add(this.notebookEditor.onDidChangeActiveEditor(() => {
                const latestActiveCell = this.notebookEditor.getActiveCell();
                if (latestActiveCell !== cell || latestActiveCell.focusMode !== CellFocusMode.Editor) {
                    // focus moves to another cell or cell container
                    // we should stop preserving the editor
                    this._editorDisposable.clear();
                    this._editor.setModel(null);
                    ref.dispose();
                }
            }));
            this._editorDisposable.value = editorDisposable;
        });
    }
    dispose() {
        this._isDisposed = true;
        this._focusEditorCancellablePromise?.cancel();
        super.dispose();
    }
};
NotebookCellEditorPool = __decorate([
    __param(2, ITextModelService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], NotebookCellEditorPool);
export { NotebookCellEditorPool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRWRpdG9yUG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9ub3RlYm9va0NlbGxFZGl0b3JQb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUEyQyxNQUFNLHVCQUF1QixDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQVNyRCxZQUNVLGNBQXVDLEVBQy9CLHlCQUVZLEVBQ1YsZ0JBQW9ELEVBQ2hELHFCQUE2RCxFQUM3RCxx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