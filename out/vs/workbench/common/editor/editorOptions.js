/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTextEditorViewState } from '../editor.js';
export function applyTextEditorOptions(options, editor, scrollType) {
    let applied = false;
    // Restore view state if any
    const viewState = massageEditorViewState(options);
    if (isTextEditorViewState(viewState)) {
        editor.restoreViewState(viewState);
        applied = true;
    }
    // Restore selection if any
    if (options.selection) {
        const range = {
            startLineNumber: options.selection.startLineNumber,
            startColumn: options.selection.startColumn,
            endLineNumber: options.selection.endLineNumber ?? options.selection.startLineNumber,
            endColumn: options.selection.endColumn ?? options.selection.startColumn,
        };
        // Apply selection with a source so that listeners can
        // distinguish this selection change from others.
        // If no source is provided, set a default source to
        // signal this navigation.
        editor.setSelection(range, options.selectionSource ?? "code.navigation" /* TextEditorSelectionSource.NAVIGATION */);
        // Reveal selection
        if (options.selectionRevealType === 2 /* TextEditorSelectionRevealType.NearTop */) {
            editor.revealRangeNearTop(range, scrollType);
        }
        else if (options.selectionRevealType === 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */) {
            editor.revealRangeNearTopIfOutsideViewport(range, scrollType);
        }
        else if (options.selectionRevealType === 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */) {
            editor.revealRangeInCenterIfOutsideViewport(range, scrollType);
        }
        else {
            editor.revealRangeInCenter(range, scrollType);
        }
        applied = true;
    }
    return applied;
}
function massageEditorViewState(options) {
    // Without a selection or view state, just return immediately
    if (!options.selection || !options.viewState) {
        return options.viewState;
    }
    // Diff editor: since we have an explicit selection, clear the
    // cursor state from the modified side where the selection
    // applies. This avoids a redundant selection change event.
    const candidateDiffViewState = options.viewState;
    if (candidateDiffViewState.modified) {
        candidateDiffViewState.modified.cursorState = [];
        return candidateDiffViewState;
    }
    // Code editor: since we have an explicit selection, clear the
    // cursor state. This avoids a redundant selection change event.
    const candidateEditorViewState = options.viewState;
    if (candidateEditorViewState.cursorState) {
        candidateEditorViewState.cursorState = [];
    }
    return candidateEditorViewState;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFcEQsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxPQUEyQixFQUMzQixNQUFlLEVBQ2YsVUFBc0I7SUFFdEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO0lBRW5CLDRCQUE0QjtJQUM1QixNQUFNLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNqRCxJQUFJLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLE9BQU8sR0FBRyxJQUFJLENBQUE7SUFDZixDQUFDO0lBRUQsMkJBQTJCO0lBQzNCLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sS0FBSyxHQUFXO1lBQ3JCLGVBQWUsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWU7WUFDbEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsV0FBVztZQUMxQyxhQUFhLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlO1lBQ25GLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVc7U0FDdkUsQ0FBQTtRQUVELHNEQUFzRDtRQUN0RCxpREFBaUQ7UUFDakQsb0RBQW9EO1FBQ3BELDBCQUEwQjtRQUMxQixNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsZUFBZSxnRUFBd0MsQ0FBQyxDQUFBO1FBRTNGLG1CQUFtQjtRQUNuQixJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsa0RBQTBDLEVBQUUsQ0FBQztZQUMzRSxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzdDLENBQUM7YUFBTSxJQUNOLE9BQU8sQ0FBQyxtQkFBbUIsbUVBQTJELEVBQ3JGLENBQUM7WUFDRixNQUFNLENBQUMsbUNBQW1DLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzlELENBQUM7YUFBTSxJQUNOLE9BQU8sQ0FBQyxtQkFBbUIsa0VBQTBELEVBQ3BGLENBQUM7WUFDRixNQUFNLENBQUMsb0NBQW9DLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9ELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNmLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLE9BQTJCO0lBQzFELDZEQUE2RDtJQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM5QyxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUE7SUFDekIsQ0FBQztJQUVELDhEQUE4RDtJQUM5RCwwREFBMEQ7SUFDMUQsMkRBQTJEO0lBQzNELE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLFNBQWlDLENBQUE7SUFDeEUsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtRQUVoRCxPQUFPLHNCQUFzQixDQUFBO0lBQzlCLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsZ0VBQWdFO0lBQ2hFLE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLFNBQWlDLENBQUE7SUFDMUUsSUFBSSx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMxQyx3QkFBd0IsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFRCxPQUFPLHdCQUF3QixDQUFBO0FBQ2hDLENBQUMifQ==