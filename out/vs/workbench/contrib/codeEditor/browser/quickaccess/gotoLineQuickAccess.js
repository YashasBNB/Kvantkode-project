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
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as QuickaccesExtensions, } from '../../../../../platform/quickinput/common/quickAccess.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
let GotoLineQuickAccessProvider = class GotoLineQuickAccessProvider extends AbstractGotoLineQuickAccessProvider {
    constructor(editorService, editorGroupService, configurationService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.onDidActiveTextEditorControlChange = this.editorService.onDidActiveEditorChange;
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
        };
    }
    get activeTextEditorControl() {
        return this.editorService.activeTextEditorControl;
    }
    gotoLocation(context, options) {
        // Check for sideBySide use
        if ((options.keyMods.alt ||
            (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) ||
            options.forceSideBySide) &&
            this.editorService.activeEditor) {
            context.restoreViewState?.(); // since we open to the side, restore view state in this editor
            const editorOptions = {
                selection: options.range,
                pinned: options.keyMods.ctrlCmd || this.configuration.openEditorPinned,
                preserveFocus: options.preserveFocus,
            };
            this.editorGroupService.sideGroup.openEditor(this.editorService.activeEditor, editorOptions);
        }
        // Otherwise let parent handle it
        else {
            super.gotoLocation(context, options);
        }
    }
};
GotoLineQuickAccessProvider = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService)
], GotoLineQuickAccessProvider);
export { GotoLineQuickAccessProvider };
class GotoLineAction extends Action2 {
    static { this.ID = 'workbench.action.gotoLine'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            title: localize2('gotoLine', 'Go to Line/Column...'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: null,
                primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 37 /* KeyCode.KeyG */ },
            },
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(GotoLineQuickAccessProvider.PREFIX);
    }
}
registerAction2(GotoLineAction);
Registry.as(QuickaccesExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: GotoLineQuickAccessProvider,
    prefix: AbstractGotoLineQuickAccessProvider.PREFIX,
    placeholder: localize('gotoLineQuickAccessPlaceholder', 'Type the line number and optional column to go to (e.g. 42:5 for line 42 and column 5).'),
    helpEntries: [
        {
            description: localize('gotoLineQuickAccess', 'Go to Line/Column'),
            commandId: GotoLineAction.ID,
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9xdWlja2FjY2Vzcy9nb3RvTGluZVF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUVOLFVBQVUsSUFBSSxvQkFBb0IsR0FDbEMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBTTVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRXpGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsbUNBQW1DO0lBR25GLFlBQ2lCLGFBQThDLEVBQ3hDLGtCQUF5RCxFQUN4RCxvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFKMEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3ZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUFDdkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUxqRSx1Q0FBa0MsR0FBRyxJQUFJLENB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