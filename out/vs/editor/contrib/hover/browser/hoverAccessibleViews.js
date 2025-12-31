/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ContentHoverController } from './contentHoverController.js';
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import { DECREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID, DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, } from './hoverActionIds.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Action } from '../../../../base/common/actions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { labelForHoverVerbosityAction } from './markdownHoverParticipant.js';
var HoverAccessibilityHelpNLS;
(function (HoverAccessibilityHelpNLS) {
    HoverAccessibilityHelpNLS.increaseVerbosity = localize('increaseVerbosity', '- The focused hover part verbosity level can be increased with the Increase Hover Verbosity command.', `<keybinding:${INCREASE_HOVER_VERBOSITY_ACTION_ID}>`);
    HoverAccessibilityHelpNLS.decreaseVerbosity = localize('decreaseVerbosity', '- The focused hover part verbosity level can be decreased with the Decrease Hover Verbosity command.', `<keybinding:${DECREASE_HOVER_VERBOSITY_ACTION_ID}>`);
})(HoverAccessibilityHelpNLS || (HoverAccessibilityHelpNLS = {}));
export class HoverAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 95;
        this.name = 'hover';
        this.when = EditorContextKeys.hoverFocused;
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            throw new Error('No active or focused code editor');
        }
        const hoverController = ContentHoverController.get(codeEditor);
        if (!hoverController) {
            return;
        }
        const keybindingService = accessor.get(IKeybindingService);
        return accessor
            .get(IInstantiationService)
            .createInstance(HoverAccessibleViewProvider, keybindingService, codeEditor, hoverController);
    }
}
export class HoverAccessibilityHelp {
    constructor() {
        this.priority = 100;
        this.name = 'hover';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = EditorContextKeys.hoverVisible;
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            throw new Error('No active or focused code editor');
        }
        const hoverController = ContentHoverController.get(codeEditor);
        if (!hoverController) {
            return;
        }
        return accessor
            .get(IInstantiationService)
            .createInstance(HoverAccessibilityHelpProvider, hoverController);
    }
}
class BaseHoverAccessibleViewProvider extends Disposable {
    constructor(_hoverController) {
        super();
        this._hoverController = _hoverController;
        this.id = "hover" /* AccessibleViewProviderId.Hover */;
        this.verbositySettingKey = 'accessibility.verbosity.hover';
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._focusedHoverPartIndex = -1;
    }
    onOpen() {
        if (!this._hoverController) {
            return;
        }
        this._hoverController.shouldKeepOpenOnEditorMouseMoveOrLeave = true;
        this._focusedHoverPartIndex = this._hoverController.focusedHoverPartIndex();
        this._register(this._hoverController.onHoverContentsChanged(() => {
            this._onDidChangeContent.fire();
        }));
    }
    onClose() {
        if (!this._hoverController) {
            return;
        }
        if (this._focusedHoverPartIndex === -1) {
            this._hoverController.focus();
        }
        else {
            this._hoverController.focusHoverPartWithIndex(this._focusedHoverPartIndex);
        }
        this._focusedHoverPartIndex = -1;
        this._hoverController.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
    }
    provideContentAtIndex(focusedHoverIndex, includeVerbosityActions) {
        if (focusedHoverIndex !== -1) {
            const accessibleContent = this._hoverController.getAccessibleWidgetContentAtIndex(focusedHoverIndex);
            if (accessibleContent === undefined) {
                return '';
            }
            const contents = [];
            if (includeVerbosityActions) {
                contents.push(...this._descriptionsOfVerbosityActionsForIndex(focusedHoverIndex));
            }
            contents.push(accessibleContent);
            return contents.join('\n');
        }
        else {
            const accessibleContent = this._hoverController.getAccessibleWidgetContent();
            if (accessibleContent === undefined) {
                return '';
            }
            const contents = [];
            contents.push(accessibleContent);
            return contents.join('\n');
        }
    }
    _descriptionsOfVerbosityActionsForIndex(index) {
        const content = [];
        const descriptionForIncreaseAction = this._descriptionOfVerbosityActionForIndex(HoverVerbosityAction.Increase, index);
        if (descriptionForIncreaseAction !== undefined) {
            content.push(descriptionForIncreaseAction);
        }
        const descriptionForDecreaseAction = this._descriptionOfVerbosityActionForIndex(HoverVerbosityAction.Decrease, index);
        if (descriptionForDecreaseAction !== undefined) {
            content.push(descriptionForDecreaseAction);
        }
        return content;
    }
    _descriptionOfVerbosityActionForIndex(action, index) {
        const isActionSupported = this._hoverController.doesHoverAtIndexSupportVerbosityAction(index, action);
        if (!isActionSupported) {
            return;
        }
        switch (action) {
            case HoverVerbosityAction.Increase:
                return HoverAccessibilityHelpNLS.increaseVerbosity;
            case HoverVerbosityAction.Decrease:
                return HoverAccessibilityHelpNLS.decreaseVerbosity;
        }
    }
}
export class HoverAccessibilityHelpProvider extends BaseHoverAccessibleViewProvider {
    constructor(hoverController) {
        super(hoverController);
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        return this.provideContentAtIndex(this._focusedHoverPartIndex, true);
    }
}
export class HoverAccessibleViewProvider extends BaseHoverAccessibleViewProvider {
    constructor(_keybindingService, _editor, hoverController) {
        super(hoverController);
        this._keybindingService = _keybindingService;
        this._editor = _editor;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._initializeOptions(this._editor, hoverController);
    }
    provideContent() {
        return this.provideContentAtIndex(this._focusedHoverPartIndex, false);
    }
    get actions() {
        const actions = [];
        actions.push(this._getActionFor(this._editor, HoverVerbosityAction.Increase));
        actions.push(this._getActionFor(this._editor, HoverVerbosityAction.Decrease));
        return actions;
    }
    _getActionFor(editor, action) {
        let actionId;
        let accessibleActionId;
        let actionCodicon;
        switch (action) {
            case HoverVerbosityAction.Increase:
                actionId = INCREASE_HOVER_VERBOSITY_ACTION_ID;
                accessibleActionId = INCREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID;
                actionCodicon = Codicon.add;
                break;
            case HoverVerbosityAction.Decrease:
                actionId = DECREASE_HOVER_VERBOSITY_ACTION_ID;
                accessibleActionId = DECREASE_HOVER_VERBOSITY_ACCESSIBLE_ACTION_ID;
                actionCodicon = Codicon.remove;
                break;
        }
        const actionLabel = labelForHoverVerbosityAction(this._keybindingService, action);
        const actionEnabled = this._hoverController.doesHoverAtIndexSupportVerbosityAction(this._focusedHoverPartIndex, action);
        return new Action(accessibleActionId, actionLabel, ThemeIcon.asClassName(actionCodicon), actionEnabled, () => {
            editor.getAction(actionId)?.run({ index: this._focusedHoverPartIndex, focus: false });
        });
    }
    _initializeOptions(editor, hoverController) {
        const helpProvider = this._register(new HoverAccessibilityHelpProvider(hoverController));
        this.options.language = editor.getModel()?.getLanguageId();
        this.options.customHelp = () => {
            return helpProvider.provideContentAtIndex(this._focusedHoverPartIndex, true);
        };
    }
}
export class ExtHoverAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 90;
        this.name = 'extension-hover';
    }
    getProvider(accessor) {
        const contextViewService = accessor.get(IContextViewService);
        const contextViewElement = contextViewService.getContextViewElement();
        const extensionHoverContent = contextViewElement?.textContent ?? undefined;
        const hoverService = accessor.get(IHoverService);
        if (contextViewElement.classList.contains('accessible-view-container') ||
            !extensionHoverContent) {
            // The accessible view, itself, uses the context view service to display the text. We don't want to read that.
            return;
        }
        return new AccessibleContentProvider("hover" /* AccessibleViewProviderId.Hover */, { language: 'typescript', type: "view" /* AccessibleViewType.View */ }, () => {
            return extensionHoverContent;
        }, () => {
            hoverService.showAndFocusLastHover();
        }, 'accessibility.verbosity.hover');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJBY2Nlc3NpYmxlVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2hvdmVyQWNjZXNzaWJsZVZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBR04seUJBQXlCLEdBR3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sNkNBQTZDLEVBQzdDLGtDQUFrQyxFQUNsQyw2Q0FBNkMsRUFDN0Msa0NBQWtDLEdBQ2xDLE1BQU0scUJBQXFCLENBQUE7QUFFNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUs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