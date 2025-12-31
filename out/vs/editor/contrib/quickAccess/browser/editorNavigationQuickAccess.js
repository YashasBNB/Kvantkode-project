/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { getCodeEditor, isDiffEditor } from '../../../browser/editorBrowser.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { overviewRulerRangeHighlight } from '../../../common/core/editorColorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
/**
 * A reusable quick access provider for the editor with support
 * for adding decorations for navigating in the currently active file
 * (for example "Go to line", "Go to symbol").
 */
export class AbstractEditorNavigationQuickAccessProvider {
    constructor(options) {
        this.options = options;
        //#endregion
        //#region Decorations Utils
        this.rangeHighlightDecorationId = undefined;
    }
    //#region Provider methods
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Apply options if any
        picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;
        // Disable filtering & sorting, we control the results
        picker.matchOnLabel =
            picker.matchOnDescription =
                picker.matchOnDetail =
                    picker.sortByLabel =
                        false;
        // Provide based on current active editor
        const pickerDisposable = disposables.add(new MutableDisposable());
        pickerDisposable.value = this.doProvide(picker, token, runOptions);
        // Re-create whenever the active editor changes
        disposables.add(this.onDidActiveTextEditorControlChange(() => {
            // Clear old
            pickerDisposable.value = undefined;
            // Add new
            pickerDisposable.value = this.doProvide(picker, token);
        }));
        return disposables;
    }
    doProvide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // With text control
        const editor = this.activeTextEditorControl;
        if (editor && this.canProvideWithTextEditor(editor)) {
            const context = { editor };
            // Restore any view state if this picker was closed
            // without actually going to a line
            const codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                // Remember view state and update it when the cursor position
                // changes even later because it could be that the user has
                // configured quick access to remain open when focus is lost and
                // we always want to restore the current location.
                let lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                disposables.add(codeEditor.onDidChangeCursorPosition(() => {
                    lastKnownEditorViewState = editor.saveViewState() ?? undefined;
                }));
                context.restoreViewState = () => {
                    if (lastKnownEditorViewState && editor === this.activeTextEditorControl) {
                        editor.restoreViewState(lastKnownEditorViewState);
                    }
                };
                disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => context.restoreViewState?.()));
            }
            // Clean up decorations on dispose
            disposables.add(toDisposable(() => this.clearDecorations(editor)));
            // Ask subclass for entries
            disposables.add(this.provideWithTextEditor(context, picker, token, runOptions));
        }
        // Without text control
        else {
            disposables.add(this.provideWithoutTextEditor(picker, token));
        }
        return disposables;
    }
    /**
     * Subclasses to implement if they can operate on the text editor.
     */
    canProvideWithTextEditor(editor) {
        return true;
    }
    gotoLocation({ editor }, options) {
        editor.setSelection(options.range, "code.jump" /* TextEditorSelectionSource.JUMP */);
        editor.revealRangeInCenter(options.range, 0 /* ScrollType.Smooth */);
        if (!options.preserveFocus) {
            editor.focus();
        }
        const model = editor.getModel();
        if (model && 'getLineContent' in model) {
            status(`${model.getLineContent(options.range.startLineNumber)}`);
        }
    }
    getModel(editor) {
        return isDiffEditor(editor) ? editor.getModel()?.modified : editor.getModel();
    }
    addDecorations(editor, range) {
        editor.changeDecorations((changeAccessor) => {
            // Reset old decorations if any
            const deleteDecorations = [];
            if (this.rangeHighlightDecorationId) {
                deleteDecorations.push(this.rangeHighlightDecorationId.overviewRulerDecorationId);
                deleteDecorations.push(this.rangeHighlightDecorationId.rangeHighlightId);
                this.rangeHighlightDecorationId = undefined;
            }
            // Add new decorations for the range
            const newDecorations = [
                // highlight the entire line on the range
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight',
                        className: 'rangeHighlight',
                        isWholeLine: true,
                    },
                },
                // also add overview ruler highlight
                {
                    range,
                    options: {
                        description: 'quick-access-range-highlight-overview',
                        overviewRuler: {
                            color: themeColorFromId(overviewRulerRangeHighlight),
                            position: OverviewRulerLane.Full,
                        },
                    },
                },
            ];
            const [rangeHighlightId, overviewRulerDecorationId] = changeAccessor.deltaDecorations(deleteDecorations, newDecorations);
            this.rangeHighlightDecorationId = { rangeHighlightId, overviewRulerDecorationId };
        });
    }
    clearDecorations(editor) {
        const rangeHighlightDecorationId = this.rangeHighlightDecorationId;
        if (rangeHighlightDecorationId) {
            editor.changeDecorations((changeAccessor) => {
                changeAccessor.deltaDecorations([
                    rangeHighlightDecorationId.overviewRulerDecorationId,
                    rangeHighlightDecorationId.rangeHighlightId,
                ], []);
            });
            this.rangeHighlightDecorationId = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTmF2aWdhdGlvblF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci9lZGl0b3JOYXZpZ2F0aW9uUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUcvRSxPQUFPLEVBQXFDLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFVekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBeUJqRTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFnQiwyQ0FBMkM7SUFDaEUsWUFBc0IsT0FBNkM7UUFBN0MsWUFBTyxHQUFQLE9BQU8sQ0FBc0M7UUE2Sm5FLFlBQVk7UUFFWiwyQkFBMkI7UUFFbkIsK0JBQTBCLEdBQXNDLFNBQVMsQ0FBQTtJQWpLWCxDQUFDO0lBRXZFLDBCQUEwQjtJQUUxQixPQUFPLENBQ04sTUFBMkQsRUFDM0QsS0FBd0IsRUFDeEIsVUFBMkM7UUFFM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6Qyx1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHFCQUFx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