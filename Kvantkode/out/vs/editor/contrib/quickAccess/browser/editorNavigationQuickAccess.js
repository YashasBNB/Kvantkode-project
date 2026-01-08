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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTmF2aWdhdGlvblF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL2VkaXRvck5hdmlnYXRpb25RdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQ04sZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRy9FLE9BQU8sRUFBcUMsaUJBQWlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVV6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUF5QmpFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQWdCLDJDQUEyQztJQUNoRSxZQUFzQixPQUE2QztRQUE3QyxZQUFPLEdBQVAsT0FBTyxDQUFzQztRQTZKbkUsWUFBWTtRQUVaLDJCQUEyQjtRQUVuQiwrQkFBMEIsR0FBc0MsU0FBUyxDQUFBO0lBaktYLENBQUM7SUFFdkUsMEJBQTBCO0lBRTFCLE9BQU8sQ0FDTixNQUEyRCxFQUMzRCxLQUF3QixFQUN4QixVQUEyQztRQUUzQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLHVCQUF1QjtRQUN2QixNQUFNLENBQUMscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUs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