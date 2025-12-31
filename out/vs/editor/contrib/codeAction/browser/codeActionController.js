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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbkNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUE7QUFLaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDhCQUE4QixHQUM5QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU5RixPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFJdEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUlOLGNBQWMsRUFHZCx1QkFBdUIsR0FDdkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDeEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sc0JBQXNCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBT3RELE1BQU0scUJBQXFCLEdBQUcseUJBQXlCLENBQUE7QUFFaEQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUM1QixPQUFFLEdBQUcscUNBQXFDLEFBQXhDLENBQXdDO0lBRTFELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF1QixzQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBYUQsWUFDQyxNQUFtQixFQUNILGFBQTZCLEVBQ3pCLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDeEMsdUJBQWlELEVBQ25ELGVBQXVDLEVBQzlDLGVBQWlELEVBQzNDLHFCQUE2RCxFQUM5RCxvQkFBMkQsRUFDMUQscUJBQTZELEVBQzVELGdCQUF5RDtRQUVqRixLQUFLLEVBQUUsQ0FBQTtRQU4yQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM3Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ3pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDM0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF3QjtRQWxCakUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFpQixDQUFDLENBQUE7UUFDcEYsa0JBQWEsR0FBRyxLQUFLLENBQUE7UUFJckIsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQWlCeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQixJQUFJLGVBQWUsQ0FDbEIsSUFBSSxDQUFDLE9BQU8sRUFDWix1QkFBdUIsQ0FBQyxrQkFBa0IsRUFDMUMsYUFBYSxFQUNiLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YscUJBQXFCLENBQ3JCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBa0IsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2hGLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBRWxGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsNEJBQTRCLENBQ3pDLE9BQXNCLEVBQ3RCLEVBQXVCO1FBRXZCLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFBO1lBQ3pDLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxFQUFFLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4RCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQTtnQkFDcEUsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUscUJBQXFCLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDM0YsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQzFDLHNCQUFzQixFQUFFLEtBQUs7WUFDN0IsYUFBYSxFQUFFLElBQUk7U0FDbkIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLGVBQWUsQ0FDckIsUUFBMkIsRUFDM0IsT0FBc0IsRUFDdEIsRUFBdUI7UUFFdkIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRTtZQUMzQyxzQkFBc0IsRUFBRSxLQUFLO1lBQzdCLGFBQWEsRUFBRSxLQUFLO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxlQUFlO1FBQ3JCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sOEJBQThCLENBQ3BDLG1CQUEyQixFQUMzQixhQUFzQyxFQUN0QyxNQUF5QixFQUN6QixTQUErQjtRQUUvQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xELElBQUksQ0FBQyxRQUFRLENBQUM7WUFDYixJQUFJLHNDQUE4QjtZQUNsQyxhQUFhO1lBQ2IsTUFBTTtZQUNOLFNBQVM7WUFDVCxPQUFPLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFO1NBQzNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxRQUFRLENBQUMsT0FBMEI7UUFDMUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FDcEIsTUFBc0IsRUFDdEIsU0FBa0IsRUFDbEIsT0FBZ0IsRUFDaEIsWUFBbUM7UUFFbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFO2dCQUN0RixPQUFPO2dCQUNQLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTzthQUNwQixDQUFDLENBQUE7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQ2IsSUFBSSxvQ0FBNEI7b0JBQ2hDLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxRQUFRO29CQUMvQyxNQUFNLEVBQUUsRUFBRTtpQkFDVixDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUM3QyxDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFnQztRQUNwRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLDRDQUFvQyxFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFDMUIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLE9BQXNCLENBQUE7UUFDMUIsSUFBSSxDQUFDO1lBQ0osT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQTtRQUNqQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzdDLElBQUksU0FBUyxFQUFFLGVBQWUsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pFLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWpGLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLHlDQUFpQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDdEMsK0JBQStCO2dCQUMvQix5Q0FBeUM7Z0JBRXpDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ25GLElBQUksa0JBQWtCLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDO3dCQUNKLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO3dCQUMxQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQ3pCLGtCQUFrQixFQUNsQixLQUFLLEVBQ0wsS0FBSyxFQUNMLHFCQUFxQixDQUFDLGVBQWUsQ0FDckMsQ0FBQTtvQkFDRixDQUFDOzRCQUFTLENBQUM7d0JBQ1YsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO29CQUNsQixDQUFDO29CQUNELE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxvRkFBb0Y7Z0JBQ3BGLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHdDQUF3QyxDQUNsRSxRQUFRLENBQUMsT0FBTyxFQUNoQixPQUFPLENBQ1AsQ0FBQTtvQkFDRCxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNwRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsQ0FDL0MsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQzdCLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FDakMsQ0FBQTt3QkFDRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7d0JBQ2pCLE9BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQTtZQUNqRSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQ0MsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQzFCLENBQUMsQ0FBQyxzQkFBc0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQ3hELENBQUM7b0JBQ0YsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXLENBQy9DLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUM1QyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQ2pDLENBQUE7b0JBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxPQUFPLENBQUE7b0JBQ3ZDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDakIsT0FBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xFLHNCQUFzQjtnQkFDdEIsYUFBYSxFQUFFLEtBQUs7YUFDcEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCwyQkFBMkI7WUFDM0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3pDLHlEQUF5RDtnQkFDekQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2xCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtZQUN4QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3Q0FBd0MsQ0FDL0MsT0FBMEIsRUFDMUIsT0FBc0I7UUFFdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQ0MsQ0FBQyxPQUFPLENBQUMsU0FBUyw0Q0FBOEIsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7WUFDdEYsQ0FBQyxPQUFPLENBQUMsU0FBUyxrREFBaUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFDdEYsQ0FBQztZQUNGLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsT0FBMEIsRUFDMUIsT0FBc0I7UUFFdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQ0MsQ0FBQyxPQUFPLENBQUMsU0FBUyw0Q0FBOEIsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDcEYsQ0FBQyxPQUFPLENBQUMsU0FBUyxrREFBaUMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFDeEYsQ0FBQztZQUNGLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQzthQUV1QixlQUFVLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQ3BFLFdBQVcsRUFBRSxvQkFBb0I7UUFDakMsU0FBUyxFQUFFLHFCQUFxQjtLQUNoQyxDQUFDLEFBSGdDLENBR2hDO0lBRUssS0FBSyxDQUFDLGtCQUFrQixDQUM5QixPQUFzQixFQUN0QixFQUF1QixFQUN2QixPQUEyQjtRQUUzQixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUVyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzNDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUNsQixPQUFPLENBQUMsc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztZQUMxRixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVU7WUFDcEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVoRSxNQUFNLFFBQVEsR0FBd0M7WUFDckQsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFzQixFQUFFLE9BQWlCLEVBQUUsRUFBRTtnQkFDN0QsSUFBSSxDQUFDLGVBQWUsQ0FDbkIsTUFBTTtnQkFDTixlQUFlLENBQUMsSUFBSSxFQUNwQixDQUFDLENBQUMsT0FBTyxFQUNULE9BQU8sQ0FBQyxhQUFhO29CQUNwQixDQUFDLENBQUMscUJBQXFCLENBQUMsZUFBZTtvQkFDdkMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FDeEMsQ0FBQTtnQkFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQixDQUFDO1lBQ0QsTUFBTSxFQUFFLENBQUMsU0FBVSxFQUFFLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7Z0JBQ3JCLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzNCLENBQUM7WUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQXNCLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUNuRSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuQyxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO2dCQUN0QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQTtnQkFFckMsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUN6RCxNQUFNLGFBQWEsR0FBRzt3QkFDckIsY0FBYyxDQUFDLGVBQWU7d0JBQzlCLGNBQWMsQ0FBQyxjQUFjO3dCQUM3QixjQUFjLENBQUMsZUFBZTt3QkFDOUIsY0FBYyxDQUFDLFlBQVk7d0JBQzNCLGNBQWMsQ0FBQyxNQUFNO3FCQUNyQixDQUFBO29CQUVELFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtnQkFDM0YsQ0FBQztnQkFFRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFVBQVUsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3hFLENBQUM7WUFDRCxPQUFPLEVBQUUsQ0FBQyxNQUFrQyxFQUFFLEVBQUU7Z0JBQy9DLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7b0JBQ25DLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFBO29CQUM3QyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFDMUIsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDakMsbUVBQW1FO3dCQUNuRSxNQUFNLFdBQVcsR0FDaEIsV0FBVyxJQUFJLFdBQVcsRUFBRSxNQUFNLEdBQUcsQ0FBQzs0QkFDckMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ2pDLEtBQUssRUFBRSxVQUFVO2dDQUNqQixPQUFPLEVBQUUsc0JBQW9CLENBQUMsVUFBVTs2QkFDeEMsQ0FBQyxDQUFDOzRCQUNKLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxzQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQ2hGLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtvQkFDcEMsQ0FBQzt5QkFBTSxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUNsRCxNQUFNLFdBQVcsR0FBNEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDN0UsS0FBSyxFQUFFLFVBQVU7NEJBQ2pCLE9BQU8sRUFBRSxzQkFBb0IsQ0FBQyxVQUFVO3lCQUN4QyxDQUFDLENBQUMsQ0FBQTt3QkFDSCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7d0JBQ25DLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDakMsSUFBSSxVQUFVLENBQUMsZUFBZSxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzs0QkFDMUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU87aUNBQ2hDLFFBQVEsRUFBRTtnQ0FDWCxFQUFFLGlCQUFpQixDQUFDO2dDQUNuQixVQUFVLEVBQUUsVUFBVSxDQUFDLGVBQWU7Z0NBQ3RDLE1BQU0sRUFBRSxVQUFVLENBQUMsV0FBVzs2QkFDOUIsQ0FBQyxFQUFFLElBQUksQ0FBQTs0QkFDVCxJQUFJLENBQUMsTUFBTSxDQUNWLFFBQVEsQ0FDUCxxQkFBcUIsRUFDckIsMENBQTBDLEVBQzFDLGFBQWEsRUFDYixVQUFVLENBQUMsZUFBZSxFQUMxQixVQUFVLENBQUMsV0FBVyxDQUN0QixDQUNELENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FDN0Isa0JBQWtCLEVBQ2xCLElBQUksRUFDSixXQUFXLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsRUFDbkYsUUFBUSxFQUNSLE1BQU0sRUFDTixTQUFTLEVBQ1QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQy9DLENBQUE7SUFDRixDQUFDO0lBRU8sUUFBUSxDQUFDLFFBQW1CO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3RCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLCtCQUF1QixDQUFBO1FBQzNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFckIsd0NBQXdDO1FBQ3hDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEUsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtRQUMvQyxNQUFNLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtRQUVuRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUN0QyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMscUNBQXFDLEVBQUU7WUFDakYsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxvQkFBb0IsQ0FDM0IsT0FBc0IsRUFDdEIsRUFBdUIsRUFDdkIsT0FBMkI7UUFFM0IsSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0IsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQzlDLENBQUMsT0FBTyxFQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3RCLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUNkLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sSUFBSSxFQUFFO1lBQzlCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUM7U0FDeEYsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUNDLE9BQU8sQ0FBQyxzQkFBc0I7WUFDOUIsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUMvQixPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDeEQsQ0FBQztZQUNGLGFBQWEsQ0FBQyxJQUFJLENBQ2pCLElBQUksQ0FBQyxhQUFhO2dCQUNqQixDQUFDLENBQUM7b0JBQ0EsRUFBRSxFQUFFLGlCQUFpQjtvQkFDckIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUM7b0JBQ25ELE9BQU8sRUFBRSxJQUFJO29CQUNiLE9BQU8sRUFBRSxFQUFFO29CQUNYLEtBQUssRUFBRSxTQUFTO29CQUNoQixHQUFHLEVBQUUsR0FBRyxFQUFFO3dCQUNULElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO3dCQUMxQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUNyRCxDQUFDO2lCQUNEO2dCQUNGLENBQUMsQ0FBQztvQkFDQSxFQUFFLEVBQUUsaUJBQWlCO29CQUNyQixLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGVBQWUsQ0FBQztvQkFDbkQsT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLEdBQUcsRUFBRSxHQUFHLEVBQUU7d0JBQ1QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7d0JBQ3pCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBQ3JELENBQUM7aUJBQ0QsQ0FDSCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7O0FBdGVXLG9CQUFvQjtJQW9COUIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsWUFBQSxzQkFBc0IsQ0FBQTtHQTdCWixvQkFBb0IsQ0F1ZWhDOztBQUVELDBCQUEwQixDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQy9DLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEtBQXdCLEVBQVEsRUFBRTtRQUNuRixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsU0FBUyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsUUFBUSx3QkFBd0IsS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUNoRixDQUFDO0lBQ0YsQ0FBQyxDQUFBO0lBRUQsc0JBQXNCLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7SUFDNUYsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDLENBQUE7SUFFL0UsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxPQUFPLENBQ2hCLHlEQUF5RCxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSx3QkFBd0IsNkJBQTZCLENBQ2pLLENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUEifQ==