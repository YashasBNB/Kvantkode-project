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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdGl0bGViYXIvdGl0bGViYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBb0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXRGLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsNkJBQTZCLEVBQzdCLG9CQUFvQixFQUNwQixzQkFBc0IsR0FDdEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU12QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXZFLGtDQUFrQztBQUVsQyxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsT0FBTztJQUN0RCxZQUNrQixPQUFlLEVBQ2hDLEtBQWEsRUFDYixXQUFrRCxFQUNsRCxLQUFhLEVBQ2IsY0FBdUIsRUFDdkIsSUFBMkI7UUFFM0IsSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ3hCLGNBQWMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFD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