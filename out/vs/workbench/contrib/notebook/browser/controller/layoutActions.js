/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { NotebookSetting } from '../../common/notebookCommon.js';
import { NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../common/notebookContextKeys.js';
import { INotebookService } from '../../common/notebookService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
registerAction2(class NotebookConfigureLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.select',
            title: localize2('workbench.notebook.layout.select.label', 'Select between Notebook Layouts'),
            f1: true,
            precondition: ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true),
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true), ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true)),
                    order: 0,
                },
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.globalToolbar', true), ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true)),
                    order: 0,
                },
            ],
        });
    }
    run(accessor) {
        accessor
            .get(ICommandService)
            .executeCommand('workbench.action.openWalkthrough', { category: 'notebooks', step: 'notebookProfile' }, true);
    }
});
registerAction2(class NotebookConfigureLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.configure',
            title: localize2('workbench.notebook.layout.configure.label', 'Customize Notebook Layout'),
            f1: true,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true),
                    order: 1,
                },
            ],
        });
    }
    run(accessor) {
        accessor
            .get(IPreferencesService)
            .openSettings({ jsonEditor: false, query: '@tag:notebookLayout' });
    }
});
registerAction2(class NotebookConfigureLayoutFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.configure.editorTitle',
            title: localize2('workbench.notebook.layout.configure.label', 'Customize Notebook Layout'),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayout',
                    when: NOTEBOOK_IS_ACTIVE_EDITOR,
                    order: 1,
                },
            ],
        });
    }
    run(accessor) {
        accessor
            .get(IPreferencesService)
            .openSettings({ jsonEditor: false, query: '@tag:notebookLayout' });
    }
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    submenu: MenuId.NotebookEditorLayoutConfigure,
    rememberDefaultAction: false,
    title: localize2('customizeNotebook', 'Customize Notebook...'),
    icon: Codicon.gear,
    group: 'navigation',
    order: -1,
    when: NOTEBOOK_IS_ACTIVE_EDITOR,
});
registerAction2(class ToggleLineNumberFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleLineNumbersFromEditorTitle',
            title: localize2('notebook.toggleLineNumbers', 'Toggle Notebook Line Numbers'),
            precondition: NOTEBOOK_EDITOR_FOCUSED,
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 1,
                    when: NOTEBOOK_IS_ACTIVE_EDITOR,
                },
            ],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: true,
            toggled: {
                condition: ContextKeyExpr.notEquals('config.notebook.lineNumbers', 'off'),
                title: localize('notebook.showLineNumbers', 'Notebook Line Numbers'),
            },
        });
    }
    async run(accessor) {
        return accessor.get(ICommandService).executeCommand('notebook.toggleLineNumbers');
    }
});
registerAction2(class ToggleCellToolbarPositionFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleCellToolbarPositionFromEditorTitle',
            title: localize2('notebook.toggleCellToolbarPosition', 'Toggle Cell Toolbar Position'),
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 3,
                },
            ],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, ...args) {
        return accessor
            .get(ICommandService)
            .executeCommand('notebook.toggleCellToolbarPosition', ...args);
    }
});
registerAction2(class ToggleBreadcrumbFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.toggleFromEditorTitle',
            title: localize2('notebook.toggleBreadcrumb', 'Toggle Breadcrumbs'),
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 2,
                },
            ],
            f1: false,
        });
    }
    async run(accessor) {
        return accessor.get(ICommandService).executeCommand('breadcrumbs.toggle');
    }
});
registerAction2(class SaveMimeTypeDisplayOrder extends Action2 {
    constructor() {
        super({
            id: 'notebook.saveMimeTypeOrder',
            title: localize2('notebook.saveMimeTypeOrder', 'Save Mimetype Display Order'),
            f1: true,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
        });
    }
    run(accessor) {
        const service = accessor.get(INotebookService);
        const disposables = new DisposableStore();
        const qp = disposables.add(accessor
            .get(IQuickInputService)
            .createQuickPick());
        qp.placeholder = localize('notebook.placeholder', 'Settings file to save in');
        qp.items = [
            {
                target: 2 /* ConfigurationTarget.USER */,
                label: localize('saveTarget.machine', 'User Settings'),
            },
            {
                target: 5 /* ConfigurationTarget.WORKSPACE */,
                label: localize('saveTarget.workspace', 'Workspace Settings'),
            },
        ];
        disposables.add(qp.onDidAccept(() => {
            const target = qp.selectedItems[0]?.target;
            if (target !== undefined) {
                service.saveMimeDisplayOrder(target);
            }
            qp.dispose();
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.show();
    }
});
registerAction2(class NotebookWebviewResetAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.webview.reset',
            title: localize2('workbench.notebook.layout.webview.reset.label', 'Reset Notebook Webview'),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
        });
    }
    run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        if (args) {
            const uri = URI.revive(args);
            const notebookEditorService = accessor.get(INotebookEditorService);
            const widgets = notebookEditorService
                .listNotebookEditors()
                .filter((widget) => widget.hasModel() && widget.textModel.uri.toString() === uri.toString());
            for (const widget of widgets) {
                if (widget.hasModel()) {
                    widget.getInnerWebview()?.reload();
                }
            }
        }
        else {
            const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
            if (!editor) {
                return;
            }
            editor.getInnerWebview()?.reload();
        }
    }
});
registerAction2(class ToggleNotebookStickyScroll extends Action2 {
    constructor() {
        super({
            id: 'notebook.action.toggleNotebookStickyScroll',
            title: {
                ...localize2('toggleStickyScroll', 'Toggle Notebook Sticky Scroll'),
                mnemonicTitle: localize({ key: 'mitoggleNotebookStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Toggle Notebook Sticky Scroll'),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.stickyScroll.enabled', true),
                title: localize('notebookStickyScroll', 'Toggle Notebook Sticky Scroll'),
                mnemonicTitle: localize({ key: 'mitoggleNotebookStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Toggle Notebook Sticky Scroll'),
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.NotebookStickyScrollContext, group: 'notebookView', order: 2 },
                { id: MenuId.NotebookToolbarContext, group: 'notebookView', order: 2 },
            ],
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('notebook.stickyScroll.enabled');
        return configurationService.updateValue('notebook.stickyScroll.enabled', newValue);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9sYXlvdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFeEYsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU1RixlQUFlLENBQ2QsTUFBTSw2QkFBOEIsU0FBUSxPQUFPO0lBQ2xEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUNmLHdDQUF3QyxFQUN4QyxpQ0FBaUMsQ0FDakM7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDO1lBQ3pGLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHlCQUF5QixFQUN6QixjQUFjLENBQUMsU0FBUyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxFQUMvRCxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQzNFO29CQUNELEtBQUssRUFBRSxDQUFDO2lCQUNSO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLEVBQzVELGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxlQUFlLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FDM0U7b0JBQ0QsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUTthQUNOLEdBQUcsQ0FBQyxlQUFlLENBQUM7YUFDcEIsY0FBYyxDQUNkLGtDQUFrQyxFQUNsQyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEVBQ2xELElBQUksQ0FDSixDQUFBO0lBQ0gsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLDZCQUE4QixTQUFRLE9BQU87SUFDbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDO1lBQ3pDLEtBQUssRUFBRSxTQUFTLENBQUMsMkNBQTJDLEVBQUUsMkJBQTJCLENBQUM7WUFDMUYsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUseUJBQXlCO1lBQ25DLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7b0JBQzFCLEtBQUssRUFBRSxnQkFBZ0I7b0JBQ3ZCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQztvQkFDbEUsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUTthQUNOLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQzthQUN4QixZQUFZLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUE7SUFDcEUsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLHNDQUF1QyxTQUFRLE9BQU87SUFDM0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsaURBQWlEO1lBQ3JELEtBQUssRUFBRSxTQUFTLENBQUMsMkNBQTJDLEVBQUUsMkJBQTJCLENBQUM7WUFDMUYsRUFBRSxFQUFFLEtBQUs7WUFDVCxRQUFRLEVBQUUseUJBQXlCO1lBQ25DLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtvQkFDeEMsS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsSUFBSSxFQUFFLHlCQUF5QjtvQkFDL0IsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUTthQUNOLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQzthQUN4QixZQUFZLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUE7SUFDcEUsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtJQUMvQyxPQUFPLEVBQUUsTUFBTSxDQUFDLDZCQUE2QjtJQUM3QyxxQkFBcUIsRUFBRSxLQUFLO0lBQzVCLEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUM7SUFDOUQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO0lBQ2xCLEtBQUssRUFBRSxZQUFZO0lBQ25CLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDVCxJQUFJLEVBQUUseUJBQXlCO0NBQy9CLENBQUMsQ0FBQTtBQUVGLGVBQWUsQ0FDZCxNQUFNLCtCQUFnQyxTQUFRLE9BQU87SUFDcEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkNBQTJDO1lBQy9DLEtBQUssRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUsOEJBQThCLENBQUM7WUFDOUUsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7b0JBQ3hDLEtBQUssRUFBRSx1QkFBdUI7b0JBQzlCLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSx5QkFBeUI7aUJBQy9CO2FBQ0Q7WUFDRCxRQUFRLEVBQUUseUJBQXlCO1lBQ25DLEVBQUUsRUFBRSxJQUFJO1lBQ1IsT0FBTyxFQUFFO2dCQUNSLFNBQVMsRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQztnQkFDekUsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx1QkFBdUIsQ0FBQzthQUNwRTtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtJQUNsRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sd0NBQXlDLFNBQVEsT0FBTztJQUM3RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSw4QkFBOEIsQ0FBQztZQUN0RixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7b0JBQ3hDLEtBQUssRUFBRSx1QkFBdUI7b0JBQzlCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxRQUFRLEVBQUUseUJBQXlCO1lBQ25DLEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDbkQsT0FBTyxRQUFRO2FBQ2IsR0FBRyxDQUFDLGVBQWUsQ0FBQzthQUNwQixjQUFjLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sK0JBQWdDLFNBQVEsT0FBTztJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxvQkFBb0IsQ0FBQztZQUNuRSxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7b0JBQ3hDLEtBQUssRUFBRSx1QkFBdUI7b0JBQzlCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sd0JBQXlCLFNBQVEsT0FBTztJQUM3QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEI7WUFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSw2QkFBNkIsQ0FBQztZQUM3RSxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsWUFBWSxFQUFFLHlCQUF5QjtTQUN2QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pCLFFBQVE7YUFDTixHQUFHLENBQUMsa0JBQWtCLENBQUM7YUFDdkIsZUFBZSxFQUFvRCxDQUNyRSxDQUFBO1FBQ0QsRUFBRSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUM3RSxFQUFFLENBQUMsS0FBSyxHQUFHO1lBQ1Y7Z0JBQ0MsTUFBTSxrQ0FBMEI7Z0JBQ2hDLEtBQUssRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsZUFBZSxDQUFDO2FBQ3REO1lBQ0Q7Z0JBQ0MsTUFBTSx1Q0FBK0I7Z0JBQ3JDLEtBQUssRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUM7YUFDN0Q7U0FDRCxDQUFBO1FBRUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNuQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtZQUMxQyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3JDLENBQUM7WUFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDYixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUQsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLDBCQUEyQixTQUFRLE9BQU87SUFDL0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLEtBQUssRUFBRSxTQUFTLENBQUMsK0NBQStDLEVBQUUsd0JBQXdCLENBQUM7WUFDM0YsRUFBRSxFQUFFLEtBQUs7WUFDVCxRQUFRLEVBQUUseUJBQXlCO1NBQ25DLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUFvQjtRQUNuRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRWxELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVCLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sT0FBTyxHQUFHLHFCQUFxQjtpQkFDbkMsbUJBQW1CLEVBQUU7aUJBQ3JCLE1BQU0sQ0FDTixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDbkYsQ0FBQTtZQUNGLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQTtnQkFDbkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sTUFBTSxHQUFHLCtCQUErQixDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzlFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLDBCQUEyQixTQUFRLE9BQU87SUFDL0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNENBQTRDO1lBQ2hELEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSwrQkFBK0IsQ0FBQztnQkFDbkUsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsOEJBQThCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMzRSxpQ0FBaUMsQ0FDakM7YUFDRDtZQUNELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixPQUFPLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsc0NBQXNDLEVBQUUsSUFBSSxDQUFDO2dCQUM5RSxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLCtCQUErQixDQUFDO2dCQUN4RSxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSw4QkFBOEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzNFLGlDQUFpQyxDQUNqQzthQUNEO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUU7Z0JBQzdCLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7Z0JBQzNFLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7YUFDdEU7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFFBQVEsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ2hGLE9BQU8sb0JBQW9CLENBQUMsV0FBVyxDQUFDLCtCQUErQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ25GLENBQUM7Q0FDRCxDQUNELENBQUEifQ==