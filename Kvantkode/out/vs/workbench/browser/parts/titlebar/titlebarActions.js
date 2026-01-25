/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../../common/activity.js';
import { IsAuxiliaryWindowFocusedContext, IsMainWindowFullscreenContext, TitleBarStyleContext, TitleBarVisibleContext, } from '../../../common/contextkeys.js';
import { isLinux, isNative } from '../../../../base/common/platform.js';
// --- Context Menu Actions --- //
export class ToggleTitleBarConfigAction extends Action2 {
    constructor(section, title, description, order, mainWindowOnly, when) {
        when = ContextKeyExpr.and(mainWindowOnly ? IsAuxiliaryWindowFocusedContext.toNegated() : ContextKeyExpr.true(), when);
        super({
            id: `toggle.${section}`,
            title,
            metadata: description ? { description } : undefined,
            toggled: ContextKeyExpr.equals(`config.${section}`, true),
            menu: [
                {
                    id: MenuId.TitleBarContext,
                    when,
                    order,
                    group: '2_config',
                },
                {
                    id: MenuId.TitleBarTitleContext,
                    when,
                    order,
                    group: '2_config',
                },
            ],
        });
        this.section = section;
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const value = configService.getValue(this.section);
        configService.updateValue(this.section, !value);
    }
}
registerAction2(class ToggleCommandCenter extends ToggleTitleBarConfigAction {
    constructor() {
        super("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */, localize('toggle.commandCenter', 'Command Center'), localize('toggle.commandCenterDescription', 'Toggle visibility of the Command Center in title bar'), 1, false);
    }
});
registerAction2(class ToggleNavigationControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('workbench.navigationControl.enabled', localize('toggle.navigation', 'Navigation Controls'), localize('toggle.navigationDescription', 'Toggle visibility of the Navigation Controls in title bar'), 2, false, ContextKeyExpr.has('config.window.commandCenter'));
    }
});
registerAction2(class ToggleLayoutControl extends ToggleTitleBarConfigAction {
    constructor() {
        super("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */, localize('toggle.layout', 'Layout Controls'), localize('toggle.layoutDescription', 'Toggle visibility of the Layout Controls in title bar'), 4, true);
    }
});
registerAction2(class ToggleCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `toggle.${"window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */}`,
            title: localize('toggle.hideCustomTitleBar', 'Hide Custom Title Bar'),
            menu: [
                {
                    id: MenuId.TitleBarContext,
                    order: 0,
                    when: ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */),
                    group: '3_toggle',
                },
                {
                    id: MenuId.TitleBarTitleContext,
                    order: 0,
                    when: ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */),
                    group: '3_toggle',
                },
            ],
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
    }
});
registerAction2(class ToggleCustomTitleBarWindowed extends Action2 {
    constructor() {
        super({
            id: `toggle.${"window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */}.windowed`,
            title: localize('toggle.hideCustomTitleBarInFullScreen', 'Hide Custom Title Bar In Full Screen'),
            menu: [
                {
                    id: MenuId.TitleBarContext,
                    order: 1,
                    when: IsMainWindowFullscreenContext,
                    group: '3_toggle',
                },
                {
                    id: MenuId.TitleBarTitleContext,
                    order: 1,
                    when: IsMainWindowFullscreenContext,
                    group: '3_toggle',
                },
            ],
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "windowed" /* CustomTitleBarVisibility.WINDOWED */);
    }
});
class ToggleCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `toggle.toggleCustomTitleBar`,
            title: localize('toggle.customTitleBar', 'Custom Title Bar'),
            toggled: TitleBarVisibleContext,
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    order: 6,
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.layoutControl.enabled', false), ContextKeyExpr.equals('config.window.commandCenter', false), ContextKeyExpr.notEquals('config.workbench.editor.editorActionsLocation', 'titleBar'), ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'top'), ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'bottom'))?.negate()), IsMainWindowFullscreenContext),
                    group: '2_workbench_layout',
                },
            ],
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const contextKeyService = accessor.get(IContextKeyService);
        const titleBarVisibility = configService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */);
        switch (titleBarVisibility) {
            case "never" /* CustomTitleBarVisibility.NEVER */:
                configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                break;
            case "windowed" /* CustomTitleBarVisibility.WINDOWED */: {
                const isFullScreen = IsMainWindowFullscreenContext.evaluate(contextKeyService.getContext(null));
                if (isFullScreen) {
                    configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                }
                else {
                    configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
                }
                break;
            }
            case "auto" /* CustomTitleBarVisibility.AUTO */:
            default:
                configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
                break;
        }
    }
}
registerAction2(ToggleCustomTitleBar);
registerAction2(class ShowCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `showCustomTitleBar`,
            title: localize2('showCustomTitleBar', 'Show Custom Title Bar'),
            precondition: TitleBarVisibleContext.negate(),
            f1: true,
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
    }
});
registerAction2(class HideCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `hideCustomTitleBar`,
            title: localize2('hideCustomTitleBar', 'Hide Custom Title Bar'),
            precondition: TitleBarVisibleContext,
            f1: true,
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
    }
});
registerAction2(class HideCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `hideCustomTitleBarInFullScreen`,
            title: localize2('hideCustomTitleBarInFullScreen', 'Hide Custom Title Bar In Full Screen'),
            precondition: ContextKeyExpr.and(TitleBarVisibleContext, IsMainWindowFullscreenContext),
            f1: true,
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "windowed" /* CustomTitleBarVisibility.WINDOWED */);
    }
});
registerAction2(class ToggleEditorActions extends Action2 {
    static { this.settingsID = `workbench.editor.editorActionsLocation`; }
    constructor() {
        const titleBarContextCondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.workbench.editor.showTabs`, 'none').negate(), ContextKeyExpr.equals(`config.${ToggleEditorActions.settingsID}`, 'default'))?.negate();
        super({
            id: `toggle.${ToggleEditorActions.settingsID}`,
            title: localize('toggle.editorActions', 'Editor Actions'),
            toggled: ContextKeyExpr.equals(`config.${ToggleEditorActions.settingsID}`, 'hidden').negate(),
            menu: [
                {
                    id: MenuId.TitleBarContext,
                    order: 3,
                    when: titleBarContextCondition,
                    group: '2_config',
                },
                {
                    id: MenuId.TitleBarTitleContext,
                    order: 3,
                    when: titleBarContextCondition,
                    group: '2_config',
                },
            ],
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const storageService = accessor.get(IStorageService);
        const location = configService.getValue(ToggleEditorActions.settingsID);
        if (location === 'hidden') {
            const showTabs = configService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */);
            // If tabs are visible, then set the editor actions to be in the title bar
            if (showTabs !== 'none') {
                configService.updateValue(ToggleEditorActions.settingsID, 'titleBar');
            }
            // If tabs are not visible, then set the editor actions to the last location the were before being hidden
            else {
                const storedValue = storageService.get(ToggleEditorActions.settingsID, 0 /* StorageScope.PROFILE */);
                configService.updateValue(ToggleEditorActions.settingsID, storedValue ?? 'default');
            }
            storageService.remove(ToggleEditorActions.settingsID, 0 /* StorageScope.PROFILE */);
        }
        // Store the current value (titleBar or default) in the storage service for later to restore
        else {
            configService.updateValue(ToggleEditorActions.settingsID, 'hidden');
            storageService.store(ToggleEditorActions.settingsID, location, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
});
if (isLinux && isNative) {
    registerAction2(class ToggleCustomTitleBar extends Action2 {
        constructor() {
            super({
                id: `toggle.${"window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */}`,
                title: localize('toggle.titleBarStyle', 'Restore Native Title Bar'),
                menu: [
                    {
                        id: MenuId.TitleBarContext,
                        order: 0,
                        when: ContextKeyExpr.equals(TitleBarStyleContext.key, "custom" /* TitlebarStyle.CUSTOM */),
                        group: '4_restore_native_title',
                    },
                    {
                        id: MenuId.TitleBarTitleContext,
                        order: 0,
                        when: ContextKeyExpr.equals(TitleBarStyleContext.key, "custom" /* TitlebarStyle.CUSTOM */),
                        group: '4_restore_native_title',
                    },
                ],
            });
        }
        run(accessor) {
            const configService = accessor.get(IConfigurationService);
            configService.updateValue("window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */, "native" /* TitlebarStyle.NATIVE */);
        }
    });
}
// --- Toolbar actions --- //
export const ACCOUNTS_ACTIVITY_TILE_ACTION = {
    id: ACCOUNTS_ACTIVITY_ID,
    label: localize('accounts', 'Accounts'),
    tooltip: localize('accounts', 'Accounts'),
    class: undefined,
    enabled: true,
    run: function () { },
};
export const GLOBAL_ACTIVITY_TITLE_ACTION = {
    id: GLOBAL_ACTIVITY_ID,
    label: localize('manage', 'Manage'),
    tooltip: localize('manage', 'Manage'),
    class: undefined,
    enabled: true,
    run: function () { },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci90aXRsZWJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFvQixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFdEYsT0FBTyxFQUNOLCtCQUErQixFQUMvQiw2QkFBNkIsRUFDN0Isb0JBQW9CLEVBQ3BCLHNCQUFzQixHQUN0QixNQUFNLGdDQUFnQyxDQUFBO0FBTXZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdkUsa0NBQWtDO0FBRWxDLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxPQUFPO0lBQ3RELFlBQ2tCLE9BQWUsRUFDaEMsS0FBYSxFQUNiLFdBQWtELEVBQ2xELEtBQWEsRUFDYixjQUF1QixFQUN2QixJQUEyQjtRQUUzQixJQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDeEIsY0FBYyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksRUFB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