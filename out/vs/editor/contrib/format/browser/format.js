/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorStateCancellationTokenSource, TextModelCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { isCodeEditor } from '../../../browser/editorBrowser.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { FormattingEdit } from './formattingEdit.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ExtensionIdentifierSet } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
export function getRealAndSyntheticDocumentFormattersOrdered(documentFormattingEditProvider, documentRangeFormattingEditProvider, model) {
    const result = [];
    const seen = new ExtensionIdentifierSet();
    // (1) add all document formatter
    const docFormatter = documentFormattingEditProvider.ordered(model);
    for (const formatter of docFormatter) {
        result.push(formatter);
        if (formatter.extensionId) {
            seen.add(formatter.extensionId);
        }
    }
    // (2) add all range formatter as document formatter (unless the same extension already did that)
    const rangeFormatter = documentRangeFormattingEditProvider.ordered(model);
    for (const formatter of rangeFormatter) {
        if (formatter.extensionId) {
            if (seen.has(formatter.extensionId)) {
                continue;
            }
            seen.add(formatter.extensionId);
        }
        result.push({
            displayName: formatter.displayName,
            extensionId: formatter.extensionId,
            provideDocumentFormattingEdits(model, options, token) {
                return formatter.provideDocumentRangeFormattingEdits(model, model.getFullModelRange(), options, token);
            },
        });
    }
    return result;
}
export var FormattingKind;
(function (FormattingKind) {
    FormattingKind[FormattingKind["File"] = 1] = "File";
    FormattingKind[FormattingKind["Selection"] = 2] = "Selection";
})(FormattingKind || (FormattingKind = {}));
export var FormattingMode;
(function (FormattingMode) {
    FormattingMode[FormattingMode["Explicit"] = 1] = "Explicit";
    FormattingMode[FormattingMode["Silent"] = 2] = "Silent";
})(FormattingMode || (FormattingMode = {}));
export class FormattingConflicts {
    static { this._selectors = new LinkedList(); }
    static setFormatterSelector(selector) {
        const remove = FormattingConflicts._selectors.unshift(selector);
        return { dispose: remove };
    }
    static async select(formatter, document, mode, kind) {
        if (formatter.length === 0) {
            return undefined;
        }
        const selector = Iterable.first(FormattingConflicts._selectors);
        if (selector) {
            return await selector(formatter, document, mode, kind);
        }
        return undefined;
    }
}
export async function formatDocumentRangesWithSelectedProvider(accessor, editorOrModel, rangeOrRanges, mode, progress, token, userGesture) {
    const instaService = accessor.get(IInstantiationService);
    const { documentRangeFormattingEditProvider: documentRangeFormattingEditProviderRegistry } = accessor.get(ILanguageFeaturesService);
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = documentRangeFormattingEditProviderRegistry.ordered(model);
    const selected = await FormattingConflicts.select(provider, model, mode, 2 /* FormattingKind.Selection */);
    if (selected) {
        progress.report(selected);
        await instaService.invokeFunction(formatDocumentRangesWithProvider, selected, editorOrModel, rangeOrRanges, token, userGesture);
    }
}
export async function formatDocumentRangesWithProvider(accessor, provider, editorOrModel, rangeOrRanges, token, userGesture) {
    const workerService = accessor.get(IEditorWorkerService);
    const logService = accessor.get(ILogService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    let model;
    let cts;
    if (isCodeEditor(editorOrModel)) {
        model = editorOrModel.getModel();
        cts = new EditorStateCancellationTokenSource(editorOrModel, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */, undefined, token);
    }
    else {
        model = editorOrModel;
        cts = new TextModelCancellationTokenSource(editorOrModel, token);
    }
    // make sure that ranges don't overlap nor touch each other
    const ranges = [];
    let len = 0;
    for (const range of asArray(rangeOrRanges).sort(Range.compareRangesUsingStarts)) {
        if (len > 0 && Range.areIntersectingOrTouching(ranges[len - 1], range)) {
            ranges[len - 1] = Range.fromPositions(ranges[len - 1].getStartPosition(), range.getEndPosition());
        }
        else {
            len = ranges.push(range);
        }
    }
    const computeEdits = async (range) => {
        logService.trace(`[format][provideDocumentRangeFormattingEdits] (request)`, provider.extensionId?.value, range);
        const result = (await provider.provideDocumentRangeFormattingEdits(model, range, model.getFormattingOptions(), cts.token)) || [];
        logService.trace(`[format][provideDocumentRangeFormattingEdits] (response)`, provider.extensionId?.value, result);
        return result;
    };
    const hasIntersectingEdit = (a, b) => {
        if (!a.length || !b.length) {
            return false;
        }
        // quick exit if the list of ranges are completely unrelated [O(n)]
        const mergedA = a.reduce((acc, val) => {
            return Range.plusRange(acc, val.range);
        }, a[0].range);
        if (!b.some((x) => {
            return Range.intersectRanges(mergedA, x.range);
        })) {
            return false;
        }
        // fallback to a complete check [O(n^2)]
        for (const edit of a) {
            for (const otherEdit of b) {
                if (Range.intersectRanges(edit.range, otherEdit.range)) {
                    return true;
                }
            }
        }
        return false;
    };
    const allEdits = [];
    const rawEditsList = [];
    try {
        if (typeof provider.provideDocumentRangesFormattingEdits === 'function') {
            logService.trace(`[format][provideDocumentRangeFormattingEdits] (request)`, provider.extensionId?.value, ranges);
            const result = (await provider.provideDocumentRangesFormattingEdits(model, ranges, model.getFormattingOptions(), cts.token)) || [];
            logService.trace(`[format][provideDocumentRangeFormattingEdits] (response)`, provider.extensionId?.value, result);
            rawEditsList.push(result);
        }
        else {
            for (const range of ranges) {
                if (cts.token.isCancellationRequested) {
                    return true;
                }
                rawEditsList.push(await computeEdits(range));
            }
            for (let i = 0; i < ranges.length; ++i) {
                for (let j = i + 1; j < ranges.length; ++j) {
                    if (cts.token.isCancellationRequested) {
                        return true;
                    }
                    if (hasIntersectingEdit(rawEditsList[i], rawEditsList[j])) {
                        // Merge ranges i and j into a single range, recompute the associated edits
                        const mergedRange = Range.plusRange(ranges[i], ranges[j]);
                        const edits = await computeEdits(mergedRange);
                        ranges.splice(j, 1);
                        ranges.splice(i, 1);
                        ranges.push(mergedRange);
                        rawEditsList.splice(j, 1);
                        rawEditsList.splice(i, 1);
                        rawEditsList.push(edits);
                        // Restart scanning
                        i = 0;
                        j = 0;
                    }
                }
            }
        }
        for (const rawEdits of rawEditsList) {
            if (cts.token.isCancellationRequested) {
                return true;
            }
            const minimalEdits = await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
            if (minimalEdits) {
                allEdits.push(...minimalEdits);
            }
        }
    }
    finally {
        cts.dispose();
    }
    if (allEdits.length === 0) {
        return false;
    }
    if (isCodeEditor(editorOrModel)) {
        // use editor to apply edits
        FormattingEdit.execute(editorOrModel, allEdits, true);
        editorOrModel.revealPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), 1 /* ScrollType.Immediate */);
    }
    else {
        // use model to apply edits
        const [{ range }] = allEdits;
        const initialSelection = new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        model.pushEditOperations([initialSelection], allEdits.map((edit) => {
            return {
                text: edit.text,
                range: Range.lift(edit.range),
                forceMoveMarkers: true,
            };
        }), (undoEdits) => {
            for (const { range } of undoEdits) {
                if (Range.areIntersectingOrTouching(range, initialSelection)) {
                    return [
                        new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
                    ];
                }
            }
            return null;
        });
    }
    accessibilitySignalService.playSignal(AccessibilitySignal.format, { userGesture });
    return true;
}
export async function formatDocumentWithSelectedProvider(accessor, editorOrModel, mode, progress, token, userGesture) {
    const instaService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    const selected = await FormattingConflicts.select(provider, model, mode, 1 /* FormattingKind.File */);
    if (selected) {
        progress.report(selected);
        await instaService.invokeFunction(formatDocumentWithProvider, selected, editorOrModel, mode, token, userGesture);
    }
}
export async function formatDocumentWithProvider(accessor, provider, editorOrModel, mode, token, userGesture) {
    const workerService = accessor.get(IEditorWorkerService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    let model;
    let cts;
    if (isCodeEditor(editorOrModel)) {
        model = editorOrModel.getModel();
        cts = new EditorStateCancellationTokenSource(editorOrModel, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */, undefined, token);
    }
    else {
        model = editorOrModel;
        cts = new TextModelCancellationTokenSource(editorOrModel, token);
    }
    let edits;
    try {
        const rawEdits = await provider.provideDocumentFormattingEdits(model, model.getFormattingOptions(), cts.token);
        edits = await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        if (cts.token.isCancellationRequested) {
            return true;
        }
    }
    finally {
        cts.dispose();
    }
    if (!edits || edits.length === 0) {
        return false;
    }
    if (isCodeEditor(editorOrModel)) {
        // use editor to apply edits
        FormattingEdit.execute(editorOrModel, edits, mode !== 2 /* FormattingMode.Silent */);
        if (mode !== 2 /* FormattingMode.Silent */) {
            editorOrModel.revealPositionInCenterIfOutsideViewport(editorOrModel.getPosition(), 1 /* ScrollType.Immediate */);
        }
    }
    else {
        // use model to apply edits
        const [{ range }] = edits;
        const initialSelection = new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        model.pushEditOperations([initialSelection], edits.map((edit) => {
            return {
                text: edit.text,
                range: Range.lift(edit.range),
                forceMoveMarkers: true,
            };
        }), (undoEdits) => {
            for (const { range } of undoEdits) {
                if (Range.areIntersectingOrTouching(range, initialSelection)) {
                    return [
                        new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
                    ];
                }
            }
            return null;
        });
    }
    accessibilitySignalService.playSignal(AccessibilitySignal.format, { userGesture });
    return true;
}
export async function getDocumentRangeFormattingEditsUntilResult(workerService, languageFeaturesService, model, range, options, token) {
    const providers = languageFeaturesService.documentRangeFormattingEditProvider.ordered(model);
    for (const provider of providers) {
        const rawEdits = await Promise.resolve(provider.provideDocumentRangeFormattingEdits(model, range, options, token)).catch(onUnexpectedExternalError);
        if (isNonEmptyArray(rawEdits)) {
            return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        }
    }
    return undefined;
}
export async function getDocumentFormattingEditsUntilResult(workerService, languageFeaturesService, model, options, token) {
    const providers = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    for (const provider of providers) {
        const rawEdits = await Promise.resolve(provider.provideDocumentFormattingEdits(model, options, token)).catch(onUnexpectedExternalError);
        if (isNonEmptyArray(rawEdits)) {
            return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
        }
    }
    return undefined;
}
export async function getDocumentFormattingEditsWithSelectedProvider(workerService, languageFeaturesService, editorOrModel, mode, token) {
    const model = isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel;
    const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
    const selected = await FormattingConflicts.select(provider, model, mode, 1 /* FormattingKind.File */);
    if (selected) {
        const rawEdits = await Promise.resolve(selected.provideDocumentFormattingEdits(model, model.getOptions(), token)).catch(onUnexpectedExternalError);
        return await workerService.computeMoreMinimalEdits(model.uri, rawEdits);
    }
    return undefined;
}
export function getOnTypeFormattingEdits(workerService, languageFeaturesService, model, position, ch, options, token) {
    const providers = languageFeaturesService.onTypeFormattingEditProvider.ordered(model);
    if (providers.length === 0) {
        return Promise.resolve(undefined);
    }
    if (providers[0].autoFormatTriggerCharacters.indexOf(ch) < 0) {
        return Promise.resolve(undefined);
    }
    return Promise.resolve(providers[0].provideOnTypeFormattingEdits(model, position, ch, options, token))
        .catch(onUnexpectedExternalError)
        .then((edits) => {
        return workerService.computeMoreMinimalEdits(model.uri, edits);
    });
}
CommandsRegistry.registerCommand('_executeFormatRangeProvider', async function (accessor, ...args) {
    const [resource, range, options] = args;
    assertType(URI.isUri(resource));
    assertType(Range.isIRange(range));
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getDocumentRangeFormattingEditsUntilResult(workerService, languageFeaturesService, reference.object.textEditorModel, Range.lift(range), options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
CommandsRegistry.registerCommand('_executeFormatDocumentProvider', async function (accessor, ...args) {
    const [resource, options] = args;
    assertType(URI.isUri(resource));
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getDocumentFormattingEditsUntilResult(workerService, languageFeaturesService, reference.object.textEditorModel, options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
CommandsRegistry.registerCommand('_executeFormatOnTypeProvider', async function (accessor, ...args) {
    const [resource, position, ch, options] = args;
    assertType(URI.isUri(resource));
    assertType(Position.isIPosition(position));
    assertType(typeof ch === 'string');
    const resolverService = accessor.get(ITextModelService);
    const workerService = accessor.get(IEditorWorkerService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const reference = await resolverService.createModelReference(resource);
    try {
        return getOnTypeFormattingEdits(workerService, languageFeaturesService, reference.object.textEditorModel, Position.lift(position), ch, options, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9ybWF0L2Jyb3dzZXIvZm9ybWF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUEyQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBRU4sa0NBQWtDLEVBQ2xDLGdDQUFnQyxHQUNoQyxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBcUIsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFTN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFN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