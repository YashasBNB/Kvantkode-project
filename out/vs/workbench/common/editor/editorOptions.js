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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2VkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFjaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRXBELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsT0FBMkIsRUFDM0IsTUFBZSxFQUNmLFVBQXNCO0lBRXRCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtJQUVuQiw0QkFBNEI7SUFDNUIsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDakQsSUFBSSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVsQyxPQUFPLEdBQUcsSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELDJCQUEyQjtJQUMzQixJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBVztZQUNyQixlQUFlLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlO1lBQ2xELFdBQVcsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVc7WUFDMUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsZUFBZTtZQUNuRixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXO1NBQ3ZFLENBQUE7UUFFRCxzREFBc0Q7UUFDdEQsaURBQWlEO1FBQ2pELG9EQUFvRDtRQUNwRCwwQkFBMEI7UUFDMUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLGVBQWUsZ0VBQXdDLENBQUMsQ0FBQTtRQUUzRixtQkFBbUI7UUFDbkIsSUFBSSxPQUFPLENBQUMsbUJBQW1CLGtEQUEwQyxFQUFFLENBQUM7WUFDM0UsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM3QyxDQUFDO2FBQU0sSUFDTixPQUFPLENBQUMsbUJBQW1CLG1FQUEyRCxFQUNyRixDQUFDO1lBQ0YsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM5RCxDQUFDO2FBQU0sSUFDTixPQUFPLENBQUMsbUJBQW1CLGtFQUEwRCxFQUNwRixDQUFDO1lBQ0YsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELE9BQU8sR0FBRyxJQUFJLENBQUE7SUFDZixDQUFDO0lBRUQsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxPQUEyQjtJQUMxRCw2REFBNkQ7SUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDOUMsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQ3pCLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsMERBQTBEO0lBQzFELDJEQUEyRDtJQUMzRCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxTQUFpQyxDQUFBO0lBQ3hFLElBQUksc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFFaEQsT0FBTyxzQkFBc0IsQ0FBQTtJQUM5QixDQUFDO0lBRUQsOERBQThEO0lBQzlELGdFQUFnRTtJQUNoRSxNQUFNLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxTQUFpQyxDQUFBO0lBQzFFLElBQUksd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUMsd0JBQXdCLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsT0FBTyx3QkFBd0IsQ0FBQTtBQUNoQyxDQUFDIn0=