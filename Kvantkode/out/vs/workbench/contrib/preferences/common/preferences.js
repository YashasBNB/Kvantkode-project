/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IPreferencesSearchService = createDecorator('preferencesSearchService');
export const SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'settings.action.clearSearchResults';
export const SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU = 'settings.action.showContextMenu';
export const SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS = 'settings.action.suggestFilters';
export const CONTEXT_SETTINGS_EDITOR = new RawContextKey('inSettingsEditor', false);
export const CONTEXT_SETTINGS_JSON_EDITOR = new RawContextKey('inSettingsJSONEditor', false);
export const CONTEXT_SETTINGS_SEARCH_FOCUS = new RawContextKey('inSettingsSearch', false);
export const CONTEXT_TOC_ROW_FOCUS = new RawContextKey('settingsTocRowFocus', false);
export const CONTEXT_SETTINGS_ROW_FOCUS = new RawContextKey('settingRowFocus', false);
export const CONTEXT_KEYBINDINGS_EDITOR = new RawContextKey('inKeybindings', false);
export const CONTEXT_KEYBINDINGS_SEARCH_FOCUS = new RawContextKey('inKeybindingsSearch', false);
export const CONTEXT_KEYBINDING_FOCUS = new RawContextKey('keybindingFocus', false);
export const CONTEXT_WHEN_FOCUS = new RawContextKey('whenFocus', false);
export const KEYBINDINGS_EDITOR_COMMAND_SEARCH = 'keybindings.editor.searchKeybindings';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'keybindings.editor.clearSearchResults';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_HISTORY = 'keybindings.editor.clearSearchHistory';
export const KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS = 'keybindings.editor.recordSearchKeys';
export const KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE = 'keybindings.editor.toggleSortByPrecedence';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE = 'keybindings.editor.defineKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_ADD = 'keybindings.editor.addKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN = 'keybindings.editor.defineWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_ACCEPT_WHEN = 'keybindings.editor.acceptWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REJECT_WHEN = 'keybindings.editor.rejectWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REMOVE = 'keybindings.editor.removeKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_RESET = 'keybindings.editor.resetKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_COPY = 'keybindings.editor.copyKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND = 'keybindings.editor.copyCommandKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE = 'keybindings.editor.copyCommandTitle';
export const KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR = 'keybindings.editor.showConflicts';
export const KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS = 'keybindings.editor.focusKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS = 'keybindings.editor.showDefaultKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS = 'keybindings.editor.showUserKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_EXTENSION_KEYBINDINGS = 'keybindings.editor.showExtensionKeybindings';
export const MODIFIED_SETTING_TAG = 'modified';
export const EXTENSION_SETTING_TAG = 'ext:';
export const FEATURE_SETTING_TAG = 'feature:';
export const ID_SETTING_TAG = 'id:';
export const LANGUAGE_SETTING_TAG = 'lang:';
export const GENERAL_TAG_SETTING_TAG = 'tag:';
export const POLICY_SETTING_TAG = 'hasPolicy';
export const WORKSPACE_TRUST_SETTING_TAG = 'workspaceTrust';
export const REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG = 'requireTrustedWorkspace';
export const KEYBOARD_LAYOUT_OPEN_PICKER = 'workbench.action.openKeyboardLayoutPicker';
export const ENABLE_LANGUAGE_FILTER = true;
export const ENABLE_EXTENSION_TOGGLE_SETTINGS = true;
export const EXTENSION_FETCH_TIMEOUT_MS = 1000;
let cachedExtensionToggleData;
export async function getExperimentalExtensionToggleData(extensionGalleryService, productService) {
    if (!ENABLE_EXTENSION_TOGGLE_SETTINGS) {
        return undefined;
    }
    if (!extensionGalleryService.isEnabled()) {
        return undefined;
    }
    if (cachedExtensionToggleData) {
        return cachedExtensionToggleData;
    }
    if (productService.extensionRecommendations && productService.commonlyUsedSettings) {
        const settingsEditorRecommendedExtensions = {};
        Object.keys(productService.extensionRecommendations).forEach((extensionId) => {
            const extensionInfo = productService.extensionRecommendations[extensionId];
            if (extensionInfo.onSettingsEditorOpen) {
                settingsEditorRecommendedExtensions[extensionId] = extensionInfo;
            }
        });
        const recommendedExtensionsGalleryInfo = {};
        for (const key in settingsEditorRecommendedExtensions) {
            const extensionId = key;
            // Recommend prerelease if not on Stable.
            const isStable = productService.quality === 'stable';
            try {
                const extensions = await raceTimeout(extensionGalleryService.getExtensions([{ id: extensionId, preRelease: !isStable }], CancellationToken.None), EXTENSION_FETCH_TIMEOUT_MS);
                if (extensions?.length === 1) {
                    recommendedExtensionsGalleryInfo[key] = extensions[0];
                }
                else {
                    // same as network connection fail. we do not want a blank settings page: https://github.com/microsoft/vscode/issues/195722
                    // so instead of returning partial data we return undefined here
                    return undefined;
                }
            }
            catch (e) {
                // Network connection fail. Return nothing rather than partial data.
                return undefined;
            }
        }
        cachedExtensionToggleData = {
            settingsEditorRecommendedExtensions,
            recommendedExtensionsGalleryInfo,
            commonlyUsed: productService.commonlyUsedSettings,
        };
        return cachedExtensionToggleData;
    }
    return undefined;
}
/**
 * Compares two nullable numbers such that null values always come after defined ones.
 */
export function compareTwoNullableNumbers(a, b) {
    const aOrMax = a ?? Number.MAX_SAFE_INTEGER;
    const bOrMax = b ?? Number.MAX_SAFE_INTEGER;
    if (aOrMax < bOrMax) {
        return -1;
    }
    else if (aOrMax > bOrMax) {
        return 1;
    }
    else {
        return 0;
    }
}
export const PREVIEW_INDICATOR_DESCRIPTION = localize('previewIndicatorDescription', 'Preview setting: this setting controls a new feature that is still under refinement yet ready to use. Feedback is welcome.');
export const EXPERIMENTAL_INDICATOR_DESCRIPTION = localize('experimentalIndicatorDescription', 'Experimental setting: this setting controls a new feature that is actively being developed and may be unstable. It is subject to change or removal.');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUtwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUEwQjVGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FDdkQsMEJBQTBCLENBQzFCLENBQUE7QUFvQkQsTUFBTSxDQUFDLE1BQU0sNENBQTRDLEdBQUcsb0NBQW9DLENBQUE7QUFDaEcsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUcsaUNBQWlDLENBQUE7QUFDMUYsTUFBTSxDQUFDLE1BQU0sdUNBQXVDLEdBQUcsZ0NBQWdDLENBQUE7QUFFdkYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQVUsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDNUYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxhQUFhLENBQzVELHNCQUFzQixFQUN0QixLQUFLLENBQ0wsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFVLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ2xHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFVLHFC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