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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFLcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBMEI1RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDBCQUEwQixDQUMxQixDQUFBO0FBb0JELE1BQU0sQ0FBQyxNQUFNLDRDQUE0QyxHQUFHLG9DQUFvQyxDQUFBO0FBQ2hHLE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLGlDQUFpQyxDQUFBO0FBQzFGLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGdDQUFnQyxDQUFBO0FBRXZGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQzVGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLElBQUksYUFBYSxDQUM1RCxzQkFBc0IsRUFDdEIsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNsRyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIs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