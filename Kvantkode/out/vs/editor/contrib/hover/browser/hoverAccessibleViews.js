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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJBY2Nlc3NpYmxlVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvaG92ZXJBY2Nlc3NpYmxlVmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFHTix5QkFBeUIsR0FHekIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sRUFDTiw2Q0FBNkMsRUFDN0Msa0NBQWtDLEVBQ2xDLDZDQUE2QyxFQUM3QyxrQ0FBa0MsR0FDbEMsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVFLElBQVUseUJBQXlCLENBV2xDO0FBWEQsV0FBVSx5QkFBeUI7SUFDckIsMkNBQWlCLEdBQUcsUUFBUSxDQUN4QyxtQkFBbUIsRUFDbkIsc0dBQXNHLEVBQ3RHLGVBQWUsa0NBQWtDLEdBQUcsQ0FDcEQsQ0FBQTtJQUNZLDJDQUFpQixHQUFHLFFBQVEsQ0FDeEMsbUJBQW1CLEVBQ25CLHNHQUFzRyxFQUN0RyxlQUFlLGtDQUFrQyxHQUFHLENBQ3BELENBQUE7QUFDRixDQUFDLEVBWFMseUJBQXlCLEtBQXpCLHlCQUF5QixRQVdsQztBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFDaUIsU0FBSSx3Q0FBMEI7UUFDOUIsYUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNiLFNBQUksR0FBRyxPQUFPLENBQUE7UUFDZCxTQUFJLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFBO0lBa0J0RCxDQUFDO0lBaEJBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLFVBQVUsR0FDZixpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDcEYsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE9BQU8sUUFBUTthQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQzthQUMxQixjQUFjLENBQUMsMkJBQTJCLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQzlGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFDaUIsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxPQUFPLENBQUE7UUFDZCxTQUFJLHdDQUEwQjtRQUM5QixTQUFJLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFBO0lBaUJ0RCxDQUFDO0lBZkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sVUFBVSxHQUNmLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLElBQUksaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUNwRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxRQUFRO2FBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDO2FBQzFCLGNBQWMsQ0FBQyw4QkFBOEIsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0NBQ0Q7QUFFRCxNQUFlLCtCQUNkLFNBQVEsVUFBVTtJQWNsQixZQUErQixnQkFBd0M7UUFDdEUsS0FBSyxFQUFFLENBQUE7UUFEdUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF3QjtRQVJ2RCxPQUFFLGdEQUFpQztRQUNuQyx3QkFBbUIsR0FBRywrQkFBK0IsQ0FBQTtRQUVwRCx3QkFBbUIsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDekUsdUJBQWtCLEdBQWdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFFdEUsMkJBQXNCLEdBQVcsQ0FBQyxDQUFDLENBQUE7SUFJN0MsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsc0NBQXNDLEdBQUcsSUFBSSxDQUFBO1FBQ25FLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUMzRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7WUFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLHNCQUFzQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzlCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFDRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNDQUFzQyxHQUFHLEtBQUssQ0FBQTtJQUNyRSxDQUFDO0lBRUQscUJBQXFCLENBQUMsaUJBQXlCLEVBQUUsdUJBQWdDO1FBQ2hGLElBQUksaUJBQWlCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLGlCQUFpQixHQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUNBQWlDLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUMzRSxJQUFJLGlCQUFpQixLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUE7WUFDN0IsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO2dCQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtZQUNsRixDQUFDO1lBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ2hDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixFQUFFLENBQUE7WUFDNUUsSUFBSSxpQkFBaUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO1lBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUNoQyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFTyx1Q0FBdUMsQ0FBQyxLQUFhO1FBQzVELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtRQUM1QixNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQyxxQ0FBcUMsQ0FDOUUsb0JBQW9CLENBQUMsUUFBUSxFQUM3QixLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksNEJBQTRCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQyxxQ0FBcUMsQ0FDOUUsb0JBQW9CLENBQUMsUUFBUSxFQUM3QixLQUFLLENBQ0wsQ0FBQTtRQUNELElBQUksNEJBQTRCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxxQ0FBcUMsQ0FDNUMsTUFBNEIsRUFDNUIsS0FBYTtRQUViLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNDQUFzQyxDQUNyRixLQUFLLEVBQ0wsTUFBTSxDQUNOLENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUNELFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDaEIsS0FBSyxvQkFBb0IsQ0FBQyxRQUFRO2dCQUNqQyxPQUFPLHlCQUF5QixDQUFDLGlCQUFpQixDQUFBO1lBQ25ELEtBQUssb0JBQW9CLENBQUMsUUFBUTtnQkFDakMsT0FBTyx5QkFBeUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDhCQUNaLFNBQVEsK0JBQStCO0lBS3ZDLFlBQVksZUFBdUM7UUFDbEQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBSFAsWUFBTyxHQUEyQixFQUFFLElBQUksc0NBQXlCLEVBQUUsQ0FBQTtJQUluRixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMkJBQ1osU0FBUSwrQkFBK0I7SUFLdkMsWUFDa0Isa0JBQXNDLEVBQ3RDLE9BQW9CLEVBQ3JDLGVBQXVDO1FBRXZDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUpMLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDdEMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUp0QixZQUFPLEdBQTJCLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxDQUFBO1FBUWxGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2pCLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtRQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzdFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDN0UsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sYUFBYSxDQUFDLE1BQW1CLEVBQUUsTUFBNEI7UUFDdEUsSUFBSSxRQUFnQixDQUFBO1FBQ3BCLElBQUksa0JBQTBCLENBQUE7UUFDOUIsSUFBSSxhQUF3QixDQUFBO1FBQzVCLFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDaEIsS0FBSyxvQkFBb0IsQ0FBQyxRQUFRO2dCQUNqQyxRQUFRLEdBQUcsa0NBQWtDLENBQUE7Z0JBQzdDLGtCQUFrQixHQUFHLDZDQUE2QyxDQUFBO2dCQUNsRSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQTtnQkFDM0IsTUFBSztZQUNOLEtBQUssb0JBQW9CLENBQUMsUUFBUTtnQkFDakMsUUFBUSxHQUFHLGtDQUFrQyxDQUFBO2dCQUM3QyxrQkFBa0IsR0FBRyw2Q0FBNkMsQ0FBQTtnQkFDbEUsYUFBYSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7Z0JBQzlCLE1BQUs7UUFDUCxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsNEJBQTRCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQ0FBc0MsQ0FDakYsSUFBSSxDQUFDLHNCQUFzQixFQUMzQixNQUFNLENBQ04sQ0FBQTtRQUNELE9BQU8sSUFBSSxNQUFNLENBQ2hCLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsU0FBUyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsRUFDcEMsYUFBYSxFQUNiLEdBQUcsRUFBRTtZQUNKLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN0RixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxNQUFtQixFQUFFLGVBQXVDO1FBQ3RGLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQTtRQUMxRCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxHQUFHLEVBQUU7WUFDOUIsT0FBTyxZQUFZLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdFLENBQUMsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFDaUIsU0FBSSx3Q0FBMEI7UUFDOUIsYUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNiLFNBQUksR0FBRyxpQkFBaUIsQ0FBQTtJQTJCekMsQ0FBQztJQXpCQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDNUQsTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBQ3JFLE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLEVBQUUsV0FBVyxJQUFJLFNBQVMsQ0FBQTtRQUMxRSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRWhELElBQ0Msa0JBQWtCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQztZQUNsRSxDQUFDLHFCQUFxQixFQUNyQixDQUFDO1lBQ0YsOEdBQThHO1lBQzlHLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxJQUFJLHlCQUF5QiwrQ0FFbkMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDekQsR0FBRyxFQUFFO1lBQ0osT0FBTyxxQkFBcUIsQ0FBQTtRQUM3QixDQUFDLEVBQ0QsR0FBRyxFQUFFO1lBQ0osWUFBWSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDckMsQ0FBQyxFQUNELCtCQUErQixDQUMvQixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=