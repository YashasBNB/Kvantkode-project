/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../../base/common/objects.js';
export class BaseCellEditorOptions extends Disposable {
    static { this.fixedEditorOptions = {
        scrollBeyondLastLine: false,
        scrollbar: {
            verticalScrollbarSize: 14,
            horizontal: 'auto',
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            alwaysConsumeMouseWheel: false,
        },
        renderLineHighlightOnlyWhenFocus: true,
        overviewRulerLanes: 0,
        lineDecorationsWidth: 0,
        folding: true,
        fixedOverflowWidgets: true,
        minimap: { enabled: false },
        renderValidationDecorations: 'on',
        lineNumbersMinChars: 3,
    }; }
    get value() {
        return this._value;
    }
    constructor(notebookEditor, notebookOptions, configurationService, language) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookOptions = notebookOptions;
        this.configurationService = configurationService;
        this.language = language;
        this._localDisposableStore = this._register(new DisposableStore());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor') || e.affectsConfiguration('notebook')) {
                this._recomputeOptions();
            }
        }));
        this._register(notebookOptions.onDidChangeOptions((e) => {
            if (e.cellStatusBarVisibility || e.editorTopPadding || e.editorOptionsCustomizations) {
                this._recomputeOptions();
            }
        }));
        this._register(this.notebookEditor.onDidChangeModel(() => {
            this._localDisposableStore.clear();
            if (this.notebookEditor.hasModel()) {
                this._localDisposableStore.add(this.notebookEditor.onDidChangeOptions(() => {
                    this._recomputeOptions();
                }));
                this._recomputeOptions();
            }
        }));
        if (this.notebookEditor.hasModel()) {
            this._localDisposableStore.add(this.notebookEditor.onDidChangeOptions(() => {
                this._recomputeOptions();
            }));
        }
        this._value = this._computeEditorOptions();
    }
    _recomputeOptions() {
        this._value = this._computeEditorOptions();
        this._onDidChange.fire();
    }
    _computeEditorOptions() {
        const editorOptions = deepClone(this.configurationService.getValue('editor', {
            overrideIdentifier: this.language,
        }));
        const editorOptionsOverrideRaw = this.notebookOptions.getDisplayOptions().editorOptionsCustomizations;
        const editorOptionsOverride = {};
        if (editorOptionsOverrideRaw) {
            for (const key in editorOptionsOverrideRaw) {
                if (key.indexOf('editor.') === 0) {
                    editorOptionsOverride[key.substring(7)] =
                        editorOptionsOverrideRaw[key];
                }
            }
        }
        const computed = Object.freeze({
            ...editorOptions,
            ...BaseCellEditorOptions.fixedEditorOptions,
            ...editorOptionsOverride,
            ...{ padding: { top: 12, bottom: 12 } },
            readOnly: this.notebookEditor.isReadOnly,
        });
        return computed;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jZWxsRWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFNakUsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7YUFDckMsdUJBQWtCLEdBQW1CO1FBQ25ELG9CQUFvQixFQUFFLEtBQUs7UUFDM0IsU0FBUyxFQUFFO1lBQ1YscUJBQXFCLEVBQUUsRUFBRTtZQUN6QixVQUFVLEVBQUUsTUFBTTtZQUNsQixVQUFVLEVBQUUsSUFBSTtZQUNoQixpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsdUJBQXVCLEVBQUUsS0FBSztTQUM5QjtRQUNELGdDQUFnQyxFQUFFLElBQUk7UUFDdEMsa0JBQWtCLEVBQUUsQ0FBQztRQUNyQixvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sRUFBRSxJQUFJO1FBQ2Isb0JBQW9CLEVBQUUsSUFBSTtRQUMxQixPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO1FBQzNCLDJCQUEyQixFQUFFLElBQUk7UUFDakMsbUJBQW1CLEVBQUUsQ0FBQztLQUN0QixBQWxCZ0MsQ0FrQmhDO0lBT0QsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxZQUNVLGNBQXVDLEVBQ3ZDLGVBQWdDLEVBQ2hD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