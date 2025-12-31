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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0TW9kaWZpZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9mb3JtYXQvYnJvd3Nlci9mb3JtYXRNb2RpZmllZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUNOLFlBQVksRUFDWixvQkFBb0IsR0FFcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUNOLHdDQUF3QyxHQUV4QyxNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUxRSxvQkFBb0IsQ0FDbkIsTUFB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