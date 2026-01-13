/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { EditorAction, registerEditorAction, } from '../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { shouldSynchronizeModel } from '../../../../editor/common/model.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { formatDocumentRangesWithSelectedProvider, } from '../../../../editor/contrib/format/browser/format.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IQuickDiffService } from '../../scm/common/quickDiff.js';
import { getOriginalResource } from '../../scm/common/quickDiffService.js';
registerEditorAction(class FormatModifiedAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatChanges',
            label: nls.localize2('formatChanges', 'Format Modified Lines'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasDocumentSelectionFormattingProvider),
        });
    }
    async run(accessor, editor) {
        const instaService = accessor.get(IInstantiationService);
        if (!editor.hasModel()) {
            return;
        }
        const ranges = await instaService.invokeFunction(getModifiedRanges, editor.getModel());
        if (isNonEmptyArray(ranges)) {
            return instaService.invokeFunction(formatDocumentRangesWithSelectedProvider, editor, ranges, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true);
        }
    }
});
export async function getModifiedRanges(accessor, modified) {
    const quickDiffService = accessor.get(IQuickDiffService);
    const workerService = accessor.get(IEditorWorkerService);
    const modelService = accessor.get(ITextModelService);
    const original = await getOriginalResource(quickDiffService, modified.uri, modified.getLanguageId(), shouldSynchronizeModel(modified));
    if (!original) {
        return null; // let undefined signify no changes, null represents no source control (there's probably a better way, but I can't think of one rn)
    }
    const ranges = [];
    const ref = await modelService.createModelReference(original);
    try {
        if (!workerService.canComputeDirtyDiff(original, modified.uri)) {
            return undefined;
        }
        const changes = await workerService.computeDirtyDiff(original, modified.uri, false);
        if (!isNonEmptyArray(changes)) {
            return undefined;
        }
        for (const change of changes) {
            ranges.push(modified.validateRange(new Range(change.modifiedStartLineNumber, 1, change.modifiedEndLineNumber ||
                change.modifiedStartLineNumber /*endLineNumber is 0 when things got deleted*/, Number.MAX_SAFE_INTEGER)));
        }
    }
    finally {
        ref.dispose();
    }
    return ranges;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0TW9kaWZpZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2Zvcm1hdC9icm93c2VyL2Zvcm1hdE1vZGlmaWVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUVwQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQWMsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sd0NBQXdDLEdBRXhDLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFB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