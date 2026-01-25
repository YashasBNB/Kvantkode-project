/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CodeActionController_1;
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { editorFindMatchHighlight, editorFindMatchHighlightBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Position } from '../../../common/core/position.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MessageController } from '../../message/browser/messageController.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../common/types.js';
import { ApplyCodeActionReason, applyCodeAction } from './codeAction.js';
import { CodeActionKeybindingResolver } from './codeActionKeybindingResolver.js';
import { toMenuItems } from './codeActionMenu.js';
import { CodeActionModel } from './codeActionModel.js';
import { LightBulbWidget } from './lightBulbWidget.js';
const DECORATION_CLASS_NAME = 'quickfix-edit-highlight';
let CodeActionController = class CodeActionController extends Disposable {
    static { CodeActionController_1 = this; }
    static { this.ID = 'editor.contrib.codeActionController'; }
    static get(editor) {
        return editor.getContribution(CodeActionController_1.ID);
    }
    constructor(editor, markerService, contextKeyService, instantiationService, languageFeaturesService, progressService, _commandService, _configurationService, _actionWidgetService, _instantiationService, _progressService) {
        super();
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._actionWidgetService = _actionWidgetService;
        this._instantiationService = _instantiationService;
        this._progressService = _progressService;
        this._activeCodeActions = this._register(new MutableDisposable());
        this._showDisabled = false;
        this._disposed = false;
        this._editor = editor;
        this._model = this._register(new CodeActionModel(this._editor, languageFeaturesService.codeActionProvider, markerService, contextKeyService, progressService, _configurationService));
        this._register(this._model.onDidChangeState((newState) => this.update(newState)));
        this._lightBulbWidget = new Lazy(() => {
            const widget = this._editor.getContribution(LightBulbWidget.ID);
            if (widget) {
                this._register(widget.onClick((e) => this.showCodeActionsFromLightbulb(e.actions, e)));
            }
            return widget;
        });
        this._resolver = instantiationService.createInstance(CodeActionKeybindingResolver);
        this._register(this._editor.onDidLayoutChange(() => this._actionWidgetService.hide()));
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
    async showCodeActionsFromLightbulb(actions, at) {
        if (actions.allAIFixes && actions.validActions.length === 1) {
            const actionItem = actions.validActions[0];
            const command = actionItem.action.command;
            if (command && command.id === 'inlineChat.start') {
                if (command.arguments && command.arguments.length >= 1) {
                    command.arguments[0] = { ...command.arguments[0], autoSend: false };
                }
            }
            await this.applyCodeAction(actionItem, false, false, ApplyCodeActionReason.FromAILightbulb);
            return;
        }
        await this.showCodeActionList(actions, at, {
            includeDisabledActions: false,
            fromLightbulb: true,
        });
    }
    showCodeActions(_trigger, actions, at) {
        return this.showCodeActionList(actions, at, {
            includeDisabledActions: false,
            fromLightbulb: false,
        });
    }
    hideCodeActions() {
        this._actionWidgetService.hide();
    }
    manualTriggerAtCurrentPosition(notAvailableMessage, triggerAction, filter, autoApply) {
        if (!this._editor.hasModel()) {
            return;
        }
        MessageController.get(this._editor)?.closeMessage();
        const triggerPosition = this._editor.getPosition();
        this._trigger({
            type: 1 /* CodeActionTriggerType.Invoke */,
            triggerAction,
            filter,
            autoApply,
            context: { notAvailableMessage, position: triggerPosition },
        });
    }
    _trigger(trigger) {
        return this._model.trigger(trigger);
    }
    async applyCodeAction(action, retrigger, preview, actionReason) {
        const progress = this._progressService.show(true, 500);
        try {
            await this._instantiationService.invokeFunction(applyCodeAction, action, actionReason, {
                preview,
                editor: this._editor,
            });
        }
        finally {
            if (retrigger) {
                this._trigger({
                    type: 2 /* CodeActionTriggerType.Auto */,
                    triggerAction: CodeActionTriggerSource.QuickFix,
                    filter: {},
                });
            }
            progress.done();
        }
    }
    hideLightBulbWidget() {
        this._lightBulbWidget.rawValue?.hide();
        this._lightBulbWidget.rawValue?.gutterHide();
    }
    async update(newState) {
        if (newState.type !== 1 /* CodeActionsState.Type.Triggered */) {
            this.hideLightBulbWidget();
            return;
        }
        let actions;
        try {
            actions = await newState.actions;
        }
        catch (e) {
            onUnexpectedError(e);
            return;
        }
        if (this._disposed) {
            return;
        }
        const selection = this._editor.getSelection();
        if (selection?.startLineNumber !== newState.position.lineNumber) {
            return;
        }
        this._lightBulbWidget.value?.update(actions, newState.trigger, newState.position);
        if (newState.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            if (newState.trigger.filter?.include) {
                // Triggered for specific scope
                // Check to see if we want to auto apply.
                const validActionToApply = this.tryGetValidActionToApply(newState.trigger, actions);
                if (validActionToApply) {
                    try {
                        this.hideLightBulbWidget();
                        await this.applyCodeAction(validActionToApply, false, false, ApplyCodeActionReason.FromCodeActions);
                    }
                    finally {
                        actions.dispose();
                    }
                    return;
                }
                // Check to see if there is an action that we would have applied were it not invalid
                if (newState.trigger.context) {
                    const invalidAction = this.getInvalidActionThatWouldHaveBeenApplied(newState.trigger, actions);
                    if (invalidAction && invalidAction.action.disabled) {
                        MessageController.get(this._editor)?.showMessage(invalidAction.action.disabled, newState.trigger.context.position);
                        actions.dispose();
                        return;
                    }
                }
            }
            const includeDisabledActions = !!newState.trigger.filter?.include;
            if (newState.trigger.context) {
                if (!actions.allActions.length ||
                    (!includeDisabledActions && !actions.validActions.length)) {
                    MessageController.get(this._editor)?.showMessage(newState.trigger.context.notAvailableMessage, newState.trigger.context.position);
                    this._activeCodeActions.value = actions;
                    actions.dispose();
                    return;
                }
            }
            this._activeCodeActions.value = actions;
            this.showCodeActionList(actions, this.toCoords(newState.position), {
                includeDisabledActions,
                fromLightbulb: false,
            });
        }
        else {
            // auto magically triggered
            if (this._actionWidgetService.isVisible) {
                // TODO: Figure out if we should update the showing menu?
                actions.dispose();
            }
            else {
                this._activeCodeActions.value = actions;
            }
        }
    }
    getInvalidActionThatWouldHaveBeenApplied(trigger, actions) {
        if (!actions.allActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length === 0) ||
            (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.allActions.length === 1)) {
            return actions.allActions.find(({ action }) => action.disabled);
        }
        return undefined;
    }
    tryGetValidActionToApply(trigger, actions) {
        if (!actions.validActions.length) {
            return undefined;
        }
        if ((trigger.autoApply === "first" /* CodeActionAutoApply.First */ && actions.validActions.length > 0) ||
            (trigger.autoApply === "ifSingle" /* CodeActionAutoApply.IfSingle */ && actions.validActions.length === 1)) {
            return actions.validActions[0];
        }
        return undefined;
    }
    static { this.DECORATION = ModelDecorationOptions.register({
        description: 'quickfix-highlight',
        className: DECORATION_CLASS_NAME,
    }); }
    async showCodeActionList(actions, at, options) {
        const currentDecorations = this._editor.createDecorationsCollection();
        const editorDom = this._editor.getDomNode();
        if (!editorDom) {
            return;
        }
        const actionsToShow = options.includeDisabledActions && (this._showDisabled || actions.validActions.length === 0)
            ? actions.allActions
            : actions.validActions;
        if (!actionsToShow.length) {
            return;
        }
        const anchor = Position.isIPosition(at) ? this.toCoords(at) : at;
        const delegate = {
            onSelect: async (action, preview) => {
                this.applyCodeAction(action, 
                /* retrigger */ true, !!preview, options.fromLightbulb
                    ? ApplyCodeActionReason.FromAILightbulb
                    : ApplyCodeActionReason.FromCodeActions);
                this._actionWidgetService.hide(false);
                currentDecorations.clear();
            },
            onHide: (didCancel) => {
                this._editor?.focus();
                currentDecorations.clear();
            },
            onHover: async (action, token) => {
                if (token.isCancellationRequested) {
                    return;
                }
                let canPreview = false;
                const actionKind = action.action.kind;
                if (actionKind) {
                    const hierarchicalKind = new HierarchicalKind(actionKind);
                    const refactorKinds = [
                        CodeActionKind.RefactorExtract,
                        CodeActionKind.RefactorInline,
                        CodeActionKind.RefactorRewrite,
                        CodeActionKind.RefactorMove,
                        CodeActionKind.Source,
                    ];
                    canPreview = refactorKinds.some((refactorKind) => refactorKind.contains(hierarchicalKind));
                }
                return { canPreview: canPreview || !!action.action.edit?.edits.length };
            },
            onFocus: (action) => {
                if (action && action.action) {
                    const ranges = action.action.ranges;
                    const diagnostics = action.action.diagnostics;
                    currentDecorations.clear();
                    if (ranges && ranges.length > 0) {
                        // Handles case for `fix all` where there are multiple diagnostics.
                        const decorations = diagnostics && diagnostics?.length > 1
                            ? diagnostics.map((diagnostic) => ({
                                range: diagnostic,
                                options: CodeActionController_1.DECORATION,
                            }))
                            : ranges.map((range) => ({ range, options: CodeActionController_1.DECORATION }));
                        currentDecorations.set(decorations);
                    }
                    else if (diagnostics && diagnostics.length > 0) {
                        const decorations = diagnostics.map((diagnostic) => ({
                            range: diagnostic,
                            options: CodeActionController_1.DECORATION,
                        }));
                        currentDecorations.set(decorations);
                        const diagnostic = diagnostics[0];
                        if (diagnostic.startLineNumber && diagnostic.startColumn) {
                            const selectionText = this._editor
                                .getModel()
                                ?.getWordAtPosition({
                                lineNumber: diagnostic.startLineNumber,
                                column: diagnostic.startColumn,
                            })?.word;
                            aria.status(localize('editingNewSelection', 'Context: {0} at line {1} and column {2}.', selectionText, diagnostic.startLineNumber, diagnostic.startColumn));
                        }
                    }
                }
                else {
                    currentDecorations.clear();
                }
            },
        };
        this._actionWidgetService.show('codeActionWidget', true, toMenuItems(actionsToShow, this._shouldShowHeaders(), this._resolver.getResolver()), delegate, anchor, editorDom, this._getActionBarActions(actions, at, options));
    }
    toCoords(position) {
        if (!this._editor.hasModel()) {
            return { x: 0, y: 0 };
        }
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
        this._editor.render();
        // Translate to absolute editor position
        const cursorCoords = this._editor.getScrolledVisiblePosition(position);
        const editorCoords = getDomNodePagePosition(this._editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        return { x, y };
    }
    _shouldShowHeaders() {
        const model = this._editor?.getModel();
        return this._configurationService.getValue('editor.codeActionWidget.showHeaders', {
            resource: model?.uri,
        });
    }
    _getActionBarActions(actions, at, options) {
        if (options.fromLightbulb) {
            return [];
        }
        const resultActions = actions.documentation.map((command) => ({
            id: command.id,
            label: command.title,
            tooltip: command.tooltip ?? '',
            class: undefined,
            enabled: true,
            run: () => this._commandService.executeCommand(command.id, ...(command.arguments ?? [])),
        }));
        if (options.includeDisabledActions &&
            actions.validActions.length > 0 &&
            actions.allActions.length !== actions.validActions.length) {
            resultActions.push(this._showDisabled
                ? {
                    id: 'hideMoreActions',
                    label: localize('hideMoreActions', 'Hide Disabled'),
                    enabled: true,
                    tooltip: '',
                    class: undefined,
                    run: () => {
                        this._showDisabled = false;
                        return this.showCodeActionList(actions, at, options);
                    },
                }
                : {
                    id: 'showMoreActions',
                    label: localize('showMoreActions', 'Show Disabled'),
                    enabled: true,
                    tooltip: '',
                    class: undefined,
                    run: () => {
                        this._showDisabled = true;
                        return this.showCodeActionList(actions, at, options);
                    },
                });
        }
        return resultActions;
    }
};
CodeActionController = CodeActionController_1 = __decorate([
    __param(1, IMarkerService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IEditorProgressService),
    __param(6, ICommandService),
    __param(7, IConfigurationService),
    __param(8, IActionWidgetService),
    __param(9, IInstantiationService),
    __param(10, IEditorProgressService)
], CodeActionController);
export { CodeActionController };
registerThemingParticipant((theme, collector) => {
    const addBackgroundColorRule = (selector, color) => {
        if (color) {
            collector.addRule(`.monaco-editor ${selector} { background-color: ${color}; }`);
        }
    };
    addBackgroundColorRule('.quickfix-edit-highlight', theme.getColor(editorFindMatchHighlight));
    const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
    if (findMatchHighlightBorder) {
        collector.addRule(`.monaco-editor .quickfix-edit-highlight { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; box-sizing: border-box; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUtoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsOEJBQThCLEdBQzlC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