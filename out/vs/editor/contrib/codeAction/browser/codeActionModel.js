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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLFlBQVksR0FDWixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRzlELE9BQU8sRUFHTixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQTBCLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5HLE9BQU8sRUFBZ0IscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzdELE9BQU8sRUFDTixjQUFjLEVBR2QsdUJBQXVCLEdBQ3ZCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRWhELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFTLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBRTFGLE1BQU0s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