/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce, equals, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, isCancellationError, onUnexpectedExternalError, } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IModelService } from '../../../common/services/model.js';
import { TextModelCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { CodeActionItem, CodeActionKind, CodeActionTriggerSource, filtersAction, mayIncludeActionsOfKind, } from '../common/types.js';
export const codeActionCommandId = 'editor.action.codeAction';
export const quickFixCommandId = 'editor.action.quickFix';
export const autoFixCommandId = 'editor.action.autoFix';
export const refactorCommandId = 'editor.action.refactor';
export const refactorPreviewCommandId = 'editor.action.refactor.preview';
export const sourceActionCommandId = 'editor.action.sourceAction';
export const organizeImportsCommandId = 'editor.action.organizeImports';
export const fixAllCommandId = 'editor.action.fixAll';
class ManagedCodeActionSet extends Disposable {
    static codeActionsPreferredComparator(a, b) {
        if (a.isPreferred && !b.isPreferred) {
            return -1;
        }
        else if (!a.isPreferred && b.isPreferred) {
            return 1;
        }
        else {
            return 0;
        }
    }
    static codeActionsComparator({ action: a }, { action: b }) {
        if (a.isAI && !b.isAI) {
            return 1;
        }
        else if (!a.isAI && b.isAI) {
            return -1;
        }
        if (isNonEmptyArray(a.diagnostics)) {
            return isNonEmptyArray(b.diagnostics)
                ? ManagedCodeActionSet.codeActionsPreferredComparator(a, b)
                : -1;
        }
        else if (isNonEmptyArray(b.diagnostics)) {
            return 1;
        }
        else {
            return ManagedCodeActionSet.codeActionsPreferredComparator(a, b); // both have no diagnostics
        }
    }
    constructor(actions, documentation, disposables) {
        super();
        this.documentation = documentation;
        this._register(disposables);
        this.allActions = [...actions].sort(ManagedCodeActionSet.codeActionsComparator);
        this.validActions = this.allActions.filter(({ action }) => !action.disabled);
    }
    get hasAutoFix() {
        return this.validActions.some(({ action: fix }) => !!fix.kind &&
            CodeActionKind.QuickFix.contains(new HierarchicalKind(fix.kind)) &&
            !!fix.isPreferred);
    }
    get hasAIFix() {
        return this.validActions.some(({ action: fix }) => !!fix.isAI);
    }
    get allAIFixes() {
        return this.validActions.every(({ action: fix }) => !!fix.isAI);
    }
}
const emptyCodeActionsResponse = { actions: [], documentation: undefined };
export async function getCodeActions(registry, model, rangeOrSelection, trigger, progress, token) {
    const filter = trigger.filter || {};
    const notebookFilter = {
        ...filter,
        excludes: [...(filter.excludes || []), CodeActionKind.Notebook],
    };
    const codeActionContext = {
        only: filter.include?.value,
        trigger: trigger.type,
    };
    const cts = new TextModelCancellationTokenSource(model, token);
    // if the trigger is auto (autosave, lightbulb, etc), we should exclude notebook codeActions
    const excludeNotebookCodeActions = trigger.type === 2 /* languages.CodeActionTriggerType.Auto */;
    const providers = getCodeActionProviders(registry, model, excludeNotebookCodeActions ? notebookFilter : filter);
    const disposables = new DisposableStore();
    const promises = providers.map(async (provider) => {
        const handle = setTimeout(() => progress.report(provider), 1250);
        try {
            const providedCodeActions = await provider.provideCodeActions(model, rangeOrSelection, codeActionContext, cts.token);
            if (providedCodeActions) {
                disposables.add(providedCodeActions);
            }
            if (cts.token.isCancellationRequested) {
                return emptyCodeActionsResponse;
            }
            const filteredActions = (providedCodeActions?.actions || []).filter((action) => action && filtersAction(filter, action));
            const documentation = getDocumentationFromProvider(provider, filteredActions, filter.include);
            return {
                actions: filteredActions.map((action) => new CodeActionItem(action, provider)),
                documentation,
            };
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            onUnexpectedExternalError(err);
            return emptyCodeActionsResponse;
        }
        finally {
            clearTimeout(handle);
        }
    });
    const listener = registry.onDidChange(() => {
        const newProviders = registry.all(model);
        if (!equals(newProviders, providers)) {
            cts.cancel();
        }
    });
    try {
        const actions = await Promise.all(promises);
        const allActions = actions.map((x) => x.actions).flat();
        const allDocumentation = [
            ...coalesce(actions.map((x) => x.documentation)),
            ...getAdditionalDocumentationForShowingActions(registry, model, trigger, allActions),
        ];
        return new ManagedCodeActionSet(allActions, allDocumentation, disposables);
    }
    catch (err) {
        disposables.dispose();
        throw err;
    }
    finally {
        listener.dispose();
        cts.dispose();
    }
}
function getCodeActionProviders(registry, model, filter) {
    return (registry
        .all(model)
        // Don't include providers that we know will not return code actions of interest
        .filter((provider) => {
        if (!provider.providedCodeActionKinds) {
            // We don't know what type of actions this provider will return.
            return true;
        }
        return provider.providedCodeActionKinds.some((kind) => mayIncludeActionsOfKind(filter, new HierarchicalKind(kind)));
    }));
}
function* getAdditionalDocumentationForShowingActions(registry, model, trigger, actionsToShow) {
    if (model && actionsToShow.length) {
        for (const provider of registry.all(model)) {
            if (provider._getAdditionalMenuItems) {
                yield* provider._getAdditionalMenuItems?.({ trigger: trigger.type, only: trigger.filter?.include?.value }, actionsToShow.map((item) => item.action));
            }
        }
    }
}
function getDocumentationFromProvider(provider, providedCodeActions, only) {
    if (!provider.documentation) {
        return undefined;
    }
    const documentation = provider.documentation.map((entry) => ({
        kind: new HierarchicalKind(entry.kind),
        command: entry.command,
    }));
    if (only) {
        let currentBest;
        for (const entry of documentation) {
            if (entry.kind.contains(only)) {
                if (!currentBest) {
                    currentBest = entry;
                }
                else {
                    // Take best match
                    if (currentBest.kind.contains(entry.kind)) {
                        currentBest = entry;
                    }
                }
            }
        }
        if (currentBest) {
            return currentBest?.command;
        }
    }
    // Otherwise, check to see if any of the provided actions match.
    for (const action of providedCodeActions) {
        if (!action.kind) {
            continue;
        }
        for (const entry of documentation) {
            if (entry.kind.contains(new HierarchicalKind(action.kind))) {
                return entry.command;
            }
        }
    }
    return undefined;
}
export var ApplyCodeActionReason;
(function (ApplyCodeActionReason) {
    ApplyCodeActionReason["OnSave"] = "onSave";
    ApplyCodeActionReason["FromProblemsView"] = "fromProblemsView";
    ApplyCodeActionReason["FromCodeActions"] = "fromCodeActions";
    ApplyCodeActionReason["FromAILightbulb"] = "fromAILightbulb";
    ApplyCodeActionReason["FromProblemsHover"] = "fromProblemsHover";
})(ApplyCodeActionReason || (ApplyCodeActionReason = {}));
export async function applyCodeAction(accessor, item, codeActionReason, options, token = CancellationToken.None) {
    const bulkEditService = accessor.get(IBulkEditService);
    const commandService = accessor.get(ICommandService);
    const telemetryService = accessor.get(ITelemetryService);
    const notificationService = accessor.get(INotificationService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    telemetryService.publicLog2('codeAction.applyCodeAction', {
        codeActionTitle: item.action.title,
        codeActionKind: item.action.kind,
        codeActionIsPreferred: !!item.action.isPreferred,
        reason: codeActionReason,
    });
    accessibilitySignalService.playSignal(AccessibilitySignal.codeActionTriggered);
    await item.resolve(token);
    if (token.isCancellationRequested) {
        return;
    }
    if (item.action.edit?.edits.length) {
        const result = await bulkEditService.apply(item.action.edit, {
            editor: options?.editor,
            label: item.action.title,
            quotableLabel: item.action.title,
            code: 'undoredo.codeAction',
            respectAutoSaveConfig: codeActionReason !== ApplyCodeActionReason.OnSave,
            showPreview: options?.preview,
        });
        if (!result.isApplied) {
            return;
        }
    }
    if (item.action.command) {
        try {
            await commandService.executeCommand(item.action.command.id, ...(item.action.command.arguments || []));
        }
        catch (err) {
            const message = asMessage(err);
            notificationService.error(typeof message === 'string'
                ? message
                : nls.localize('applyCodeActionFailed', 'An unknown error occurred while applying the code action'));
        }
    }
    // ensure the start sound and end sound do not overlap
    setTimeout(() => accessibilitySignalService.playSignal(AccessibilitySignal.codeActionApplied), 100);
}
function asMessage(err) {
    if (typeof err === 'string') {
        return err;
    }
    else if (err instanceof Error && typeof err.message === 'string') {
        return err.message;
    }
    else {
        return undefined;
    }
}
CommandsRegistry.registerCommand('_executeCodeActionProvider', async function (accessor, resource, rangeOrSelection, kind, itemResolveCount) {
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const { codeActionProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const validatedRangeOrSelection = Selection.isISelection(rangeOrSelection)
        ? Selection.liftSelection(rangeOrSelection)
        : Range.isIRange(rangeOrSelection)
            ? model.validateRange(rangeOrSelection)
            : undefined;
    if (!validatedRangeOrSelection) {
        throw illegalArgument();
    }
    const include = typeof kind === 'string' ? new HierarchicalKind(kind) : undefined;
    const codeActionSet = await getCodeActions(codeActionProvider, model, validatedRangeOrSelection, {
        type: 1 /* languages.CodeActionTriggerType.Invoke */,
        triggerAction: CodeActionTriggerSource.Default,
        filter: { includeSourceActions: true, include },
    }, Progress.None, CancellationToken.None);
    const resolving = [];
    const resolveCount = Math.min(codeActionSet.validActions.length, typeof itemResolveCount === 'number' ? itemResolveCount : 0);
    for (let i = 0; i < resolveCount; i++) {
        resolving.push(codeActionSet.validActions[i].resolve(CancellationToken.None));
    }
    try {
        await Promise.all(resolving);
        return codeActionSet.validActions.map((item) => item.action);
    }
    finally {
        setTimeout(() => codeActionSet.dispose(), 100);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLHlCQUF5QixHQUN6QixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFP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