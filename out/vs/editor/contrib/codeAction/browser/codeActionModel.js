/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, TimeoutTimer, } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ShowLightbulbIconMode } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Selection } from '../../../common/core/selection.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../common/types.js';
import { getCodeActions } from './codeAction.js';
export const SUPPORTED_CODE_ACTIONS = new RawContextKey('supportedCodeAction', '');
export const APPLY_FIX_ALL_COMMAND_ID = '_typescript.applyFixAllCodeAction';
class CodeActionOracle extends Disposable {
    constructor(_editor, _markerService, _signalChange, _delay = 250) {
        super();
        this._editor = _editor;
        this._markerService = _markerService;
        this._signalChange = _signalChange;
        this._delay = _delay;
        this._autoTriggerTimer = this._register(new TimeoutTimer());
        this._register(this._markerService.onMarkerChanged((e) => this._onMarkerChanges(e)));
        this._register(this._editor.onDidChangeCursorPosition(() => this._tryAutoTrigger()));
    }
    trigger(trigger) {
        const selection = this._getRangeOfSelectionUnlessWhitespaceEnclosed(trigger);
        this._signalChange(selection ? { trigger, selection } : undefined);
    }
    _onMarkerChanges(resources) {
        const model = this._editor.getModel();
        if (model && resources.some((resource) => isEqual(resource, model.uri))) {
            this._tryAutoTrigger();
        }
    }
    _tryAutoTrigger() {
        this._autoTriggerTimer.cancelAndSet(() => {
            this.trigger({
                type: 2 /* CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
            });
        }, this._delay);
    }
    _getRangeOfSelectionUnlessWhitespaceEnclosed(trigger) {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const selection = this._editor.getSelection();
        if (trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            return selection;
        }
        const enabled = this._editor.getOption(66 /* EditorOption.lightbulb */).enabled;
        if (enabled === ShowLightbulbIconMode.Off) {
            return undefined;
        }
        else if (enabled === ShowLightbulbIconMode.On) {
            return selection;
        }
        else if (enabled === ShowLightbulbIconMode.OnCode) {
            const isSelectionEmpty = selection.isEmpty();
            if (!isSelectionEmpty) {
                return selection;
            }
            const model = this._editor.getModel();
            const { lineNumber, column } = selection.getPosition();
            const line = model.getLineContent(lineNumber);
            if (line.length === 0) {
                // empty line
                return undefined;
            }
            else if (column === 1) {
                // look only right
                if (/\s/.test(line[0])) {
                    return undefined;
                }
            }
            else if (column === model.getLineMaxColumn(lineNumber)) {
                // look only left
                if (/\s/.test(line[line.length - 1])) {
                    return undefined;
                }
            }
            else {
                // look left and right
                if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
                    return undefined;
                }
            }
        }
        return selection;
    }
}
export var CodeActionsState;
(function (CodeActionsState) {
    let Type;
    (function (Type) {
        Type[Type["Empty"] = 0] = "Empty";
        Type[Type["Triggered"] = 1] = "Triggered";
    })(Type = CodeActionsState.Type || (CodeActionsState.Type = {}));
    CodeActionsState.Empty = { type: 0 /* Type.Empty */ };
    class Triggered {
        constructor(trigger, position, _cancellablePromise) {
            this.trigger = trigger;
            this.position = position;
            this._cancellablePromise = _cancellablePromise;
            this.type = 1 /* Type.Triggered */;
            this.actions = _cancellablePromise.catch((e) => {
                if (isCancellationError(e)) {
                    return emptyCodeActionSet;
                }
                throw e;
            });
        }
        cancel() {
            this._cancellablePromise.cancel();
        }
    }
    CodeActionsState.Triggered = Triggered;
})(CodeActionsState || (CodeActionsState = {}));
const emptyCodeActionSet = Object.freeze({
    allActions: [],
    validActions: [],
    dispose: () => { },
    documentation: [],
    hasAutoFix: false,
    hasAIFix: false,
    allAIFixes: false,
});
export class CodeActionModel extends Disposable {
    constructor(_editor, _registry, _markerService, contextKeyService, _progressService, _configurationService) {
        super();
        this._editor = _editor;
        this._registry = _registry;
        this._markerService = _markerService;
        this._progressService = _progressService;
        this._configurationService = _configurationService;
        this._codeActionOracle = this._register(new MutableDisposable());
        this._state = CodeActionsState.Empty;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.codeActionsDisposable = this._register(new MutableDisposable());
        this._disposed = false;
        this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeModel(() => this._update()));
        this._register(this._editor.onDidChangeModelLanguage(() => this._update()));
        this._register(this._registry.onDidChange(() => this._update()));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(66 /* EditorOption.lightbulb */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        super.dispose();
        this.setState(CodeActionsState.Empty, true);
    }
    _settingEnabledNearbyQuickfixes() {
        const model = this._editor?.getModel();
        return this._configurationService
            ? this._configurationService.getValue('editor.codeActionWidget.includeNearbyQuickFixes', {
                resource: model?.uri,
            })
            : false;
    }
    _update() {
        if (this._disposed) {
            return;
        }
        this._codeActionOracle.value = undefined;
        this.setState(CodeActionsState.Empty);
        const model = this._editor.getModel();
        if (model && this._registry.has(model) && !this._editor.getOption(96 /* EditorOption.readOnly */)) {
            const supportedActions = this._registry
                .all(model)
                .flatMap((provider) => provider.providedCodeActionKinds ?? []);
            this._supportedCodeActions.set(supportedActions.join(' '));
            this._codeActionOracle.value = new CodeActionOracle(this._editor, this._markerService, (trigger) => {
                if (!trigger) {
                    this.setState(CodeActionsState.Empty);
                    return;
                }
                const startPosition = trigger.selection.getStartPosition();
                const actions = createCancelablePromise(async (token) => {
                    if (this._settingEnabledNearbyQuickfixes() &&
                        trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */ &&
                        (trigger.trigger.triggerAction === CodeActionTriggerSource.QuickFix ||
                            trigger.trigger.filter?.include?.contains(CodeActionKind.QuickFix))) {
                        const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        const allCodeActions = [...codeActionSet.allActions];
                        if (token.isCancellationRequested) {
                            codeActionSet.dispose();
                            return emptyCodeActionSet;
                        }
                        // Search for quickfixes in the curret code action set.
                        const foundQuickfix = codeActionSet.validActions?.some((action) => action.action.kind
                            ? CodeActionKind.QuickFix.contains(new HierarchicalKind(action.action.kind))
                            : false);
                        const allMarkers = this._markerService.read({ resource: model.uri });
                        if (foundQuickfix) {
                            for (const action of codeActionSet.validActions) {
                                if (action.action.command?.arguments?.some((arg) => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                    action.action.diagnostics = [
                                        ...allMarkers.filter((marker) => marker.relatedInformation),
                                    ];
                                }
                            }
                            return {
                                validActions: codeActionSet.validActions,
                                allActions: allCodeActions,
                                documentation: codeActionSet.documentation,
                                hasAutoFix: codeActionSet.hasAutoFix,
                                hasAIFix: codeActionSet.hasAIFix,
                                allAIFixes: codeActionSet.allAIFixes,
                                dispose: () => {
                                    this.codeActionsDisposable.value = codeActionSet;
                                },
                            };
                        }
                        else if (!foundQuickfix) {
                            // If markers exist, and there are no quickfixes found or length is zero, check for quickfixes on that line.
                            if (allMarkers.length > 0) {
                                const currPosition = trigger.selection.getPosition();
                                let trackedPosition = currPosition;
                                let distance = Number.MAX_VALUE;
                                const currentActions = [...codeActionSet.validActions];
                                for (const marker of allMarkers) {
                                    const col = marker.endColumn;
                                    const row = marker.endLineNumber;
                                    const startRow = marker.startLineNumber;
                                    // Found quickfix on the same line and check relative distance to other markers
                                    if (row === currPosition.lineNumber || startRow === currPosition.lineNumber) {
                                        trackedPosition = new Position(row, col);
                                        const newCodeActionTrigger = {
                                            type: trigger.trigger.type,
                                            triggerAction: trigger.trigger.triggerAction,
                                            filter: {
                                                include: trigger.trigger.filter?.include
                                                    ? trigger.trigger.filter?.include
                                                    : CodeActionKind.QuickFix,
                                            },
                                            autoApply: trigger.trigger.autoApply,
                                            context: {
                                                notAvailableMessage: trigger.trigger.context?.notAvailableMessage || '',
                                                position: trackedPosition,
                                            },
                                        };
                                        const selectionAsPosition = new Selection(trackedPosition.lineNumber, trackedPosition.column, trackedPosition.lineNumber, trackedPosition.column);
                                        const actionsAtMarker = await getCodeActions(this._registry, model, selectionAsPosition, newCodeActionTrigger, Progress.None, token);
                                        if (token.isCancellationRequested) {
                                            actionsAtMarker.dispose();
                                            return emptyCodeActionSet;
                                        }
                                        if (actionsAtMarker.validActions.length !== 0) {
                                            for (const action of actionsAtMarker.validActions) {
                                                if (action.action.command?.arguments?.some((arg) => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                                    action.action.diagnostics = [
                                                        ...allMarkers.filter((marker) => marker.relatedInformation),
                                                    ];
                                                }
                                            }
                                            if (codeActionSet.allActions.length === 0) {
                                                allCodeActions.push(...actionsAtMarker.allActions);
                                            }
                                            // Already filtered through to only get quickfixes, so no need to filter again.
                                            if (Math.abs(currPosition.column - col) < distance) {
                                                currentActions.unshift(...actionsAtMarker.validActions);
                                            }
                                            else {
                                                currentActions.push(...actionsAtMarker.validActions);
                                            }
                                        }
                                        distance = Math.abs(currPosition.column - col);
                                    }
                                }
                                const filteredActions = currentActions.filter((action, index, self) => self.findIndex((a) => a.action.title === action.action.title) === index);
                                filteredActions.sort((a, b) => {
                                    if (a.action.isPreferred && !b.action.isPreferred) {
                                        return -1;
                                    }
                                    else if (!a.action.isPreferred && b.action.isPreferred) {
                                        return 1;
                                    }
                                    else if (a.action.isAI && !b.action.isAI) {
                                        return 1;
                                    }
                                    else if (!a.action.isAI && b.action.isAI) {
                                        return -1;
                                    }
                                    else {
                                        return 0;
                                    }
                                });
                                // Only retriggers if actually found quickfix on the same line as cursor
                                return {
                                    validActions: filteredActions,
                                    allActions: allCodeActions,
                                    documentation: codeActionSet.documentation,
                                    hasAutoFix: codeActionSet.hasAutoFix,
                                    hasAIFix: codeActionSet.hasAIFix,
                                    allAIFixes: codeActionSet.allAIFixes,
                                    dispose: () => {
                                        this.codeActionsDisposable.value = codeActionSet;
                                    },
                                };
                            }
                        }
                    }
                    // Case for manual triggers - specifically Source Actions and Refactors
                    if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                        const codeActions = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        return codeActions;
                    }
                    const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                    this.codeActionsDisposable.value = codeActionSet;
                    return codeActionSet;
                });
                if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                    this._progressService?.showWhile(actions, 250);
                }
                const newState = new CodeActionsState.Triggered(trigger.trigger, startPosition, actions);
                let isManualToAutoTransition = false;
                if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
                    // Check if the current state is manual and the new state is automatic
                    isManualToAutoTransition =
                        this._state.trigger.type === 1 /* CodeActionTriggerType.Invoke */ &&
                            newState.type === 1 /* CodeActionsState.Type.Triggered */ &&
                            newState.trigger.type === 2 /* CodeActionTriggerType.Auto */ &&
                            this._state.position !== newState.position;
                }
                // Do not trigger state if current state is manual and incoming state is automatic
                if (!isManualToAutoTransition) {
                    this.setState(newState);
                }
                else {
                    // Reset the new state after getting code actions back.
                    setTimeout(() => {
                        this.setState(newState);
                    }, 500);
                }
            }, undefined);
            this._codeActionOracle.value.trigger({
                type: 2 /* CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
            });
        }
        else {
            this._supportedCodeActions.reset();
        }
    }
    trigger(trigger) {
        this._codeActionOracle.value?.trigger(trigger);
        this.codeActionsDisposable.clear();
    }
    setState(newState, skipNotify) {
        if (newState === this._state) {
            return;
        }
        // Cancel old request
        if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
            this._state.cancel();
        }
        this._state = newState;
        if (!skipNotify && !this._disposed) {
            this._onDidChangeState.fire(newState);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsWUFBWSxHQUNaLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHOUQsT0FBTyxFQUdOLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBMEIsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbkcsT0FBTyxFQUFnQixxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHN0QsT0FBTyxFQUNOLGNBQWMsRUFHZCx1QkFBdUIsR0FDdkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFaEQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVMscUJBQXFCLEVBQUUsRUFB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