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
var AbstractSettingRenderer_1, CopySettingIdAction_1, CopySettingAsJSONAction_1, CopySettingAsURLAction_1, SyncSettingAction_1, ApplySettingToAllProfilesAction_1;
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { DefaultStyleController, } from '../../../../base/browser/ui/list/listWidget.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ObjectTreeModel } from '../../../../base/browser/ui/tree/objectTreeModel.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, isDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, getLanguageTagSettingPlainKey, } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles, getInputBoxStyle, getListStyles, getSelectBoxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { getIgnoredSettings } from '../../../../platform/userDataSync/common/settingsMerge.js';
import { IUserDataSyncEnablementService, getDefaultIgnoredSettings, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { APPLICATION_SCOPES, APPLY_ALL_PROFILES_SETTING, IWorkbenchConfigurationService, } from '../../../services/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { SETTINGS_AUTHORITY, SettingValueType, } from '../../../services/preferences/common/preferences.js';
import { getInvalidTypeError } from '../../../services/preferences/common/preferencesValidation.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { LANGUAGE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU, compareTwoNullableNumbers, } from '../common/preferences.js';
import { settingsNumberInputBackground, settingsNumberInputBorder, settingsNumberInputForeground, settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground, } from '../common/settingsEditorColorRegistry.js';
import { settingsMoreActionIcon } from './preferencesIcons.js';
import { SettingsTreeIndicatorsLabel, getIndicatorsLabelAriaLabel, } from './settingsEditorSettingIndicators.js';
import { SettingsTreeGroupElement, SettingsTreeNewExtensionsElement, SettingsTreeSettingElement, inspectSetting, objectSettingSupportsRemoveDefaultValue, settingKeyToDisplayFormat, } from './settingsTreeModels.js';
import { ExcludeSettingWidget, IncludeSettingWidget, ListSettingWidget, ObjectSettingCheckboxWidget, ObjectSettingDropdownWidget, } from './settingsWidgets.js';
const $ = DOM.$;
function getIncludeExcludeDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object' ? (element.defaultValue ?? {}) : {};
    const data = element.isConfigured
        ? { ...elementDefaultValue, ...element.scopeValue }
        : elementDefaultValue;
    return Object.keys(data)
        .filter((key) => !!data[key])
        .map((key) => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] &&
            element.setting.type === 'object' &&
            element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        const value = data[key];
        const sibling = typeof value === 'boolean' ? undefined : value.when;
        return {
            value: {
                type: 'string',
                data: key,
            },
            sibling,
            elementType: element.valueType,
            source,
        };
    });
}
function areAllPropertiesDefined(properties, itemsToDisplay) {
    const staticProperties = new Set(properties);
    itemsToDisplay.forEach(({ key }) => staticProperties.delete(key.data));
    return staticProperties.size === 0;
}
function getEnumOptionsFromSchema(schema) {
    if (schema.anyOf) {
        return schema.anyOf.map(getEnumOptionsFromSchema).flat();
    }
    const enumDescriptions = schema.enumDescriptions ?? [];
    return (schema.enum ?? []).map((value, idx) => {
        const description = idx < enumDescriptions.length ? enumDescriptions[idx] : undefined;
        return { value, description };
    });
}
function getObjectValueType(schema) {
    if (schema.anyOf) {
        const subTypes = schema.anyOf.map(getObjectValueType);
        if (subTypes.some((type) => type === 'enum')) {
            return 'enum';
        }
        return 'string';
    }
    if (schema.type === 'boolean') {
        return 'boolean';
    }
    else if (schema.type === 'string' && isDefined(schema.enum) && schema.enum.length > 0) {
        return 'enum';
    }
    else {
        return 'string';
    }
}
function getObjectEntryValueDisplayValue(type, data, options) {
    if (type === 'boolean') {
        return { type, data: !!data };
    }
    else if (type === 'enum') {
        return { type, data: '' + data, options };
    }
    else {
        return { type, data: '' + data };
    }
}
function getObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object' ? (element.defaultValue ?? {}) : {};
    const elementScopeValue = typeof element.scopeValue === 'object' ? (element.scopeValue ?? {}) : {};
    const data = element.isConfigured
        ? { ...elementDefaultValue, ...elementScopeValue }
        : element.hasPolicyValue
            ? element.scopeValue
            : elementDefaultValue;
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object.entries(objectPatternProperties ?? {}).map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema,
    }));
    const wellDefinedKeyEnumOptions = Object.entries(objectProperties ?? {}).map(([key, schema]) => ({
        value: key,
        description: schema.description,
    }));
    return Object.keys(data)
        .map((key) => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] &&
            element.setting.type === 'object' &&
            element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        if (isDefined(objectProperties) && key in objectProperties) {
            const valueEnumOptions = getEnumOptionsFromSchema(objectProperties[key]);
            return {
                key: {
                    type: 'enum',
                    data: key,
                    options: wellDefinedKeyEnumOptions,
                },
                value: getObjectEntryValueDisplayValue(getObjectValueType(objectProperties[key]), data[key], valueEnumOptions),
                keyDescription: objectProperties[key].description,
                removable: isUndefinedOrNull(defaultValue),
                resetable: !isUndefinedOrNull(defaultValue),
                source,
            };
        }
        // The row is removable if it doesn't have a default value assigned or the setting supports removing the default value.
        // If a default value is assigned and the user modified the default, it can be reset back to the default.
        const removable = defaultValue === undefined || objectSettingSupportsRemoveDefaultValue(element.setting.key);
        const resetable = !!defaultValue && defaultValue !== data[key];
        const schema = patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (schema) {
            const valueEnumOptions = getEnumOptionsFromSchema(schema);
            return {
                key: { type: 'string', data: key },
                value: getObjectEntryValueDisplayValue(getObjectValueType(schema), data[key], valueEnumOptions),
                keyDescription: schema.description,
                removable,
                resetable,
                source,
            };
        }
        const additionalValueEnums = getEnumOptionsFromSchema(typeof objectAdditionalProperties === 'boolean' ? {} : (objectAdditionalProperties ?? {}));
        return {
            key: { type: 'string', data: key },
            value: getObjectEntryValueDisplayValue(typeof objectAdditionalProperties === 'object'
                ? getObjectValueType(objectAdditionalProperties)
                : 'string', data[key], additionalValueEnums),
            keyDescription: typeof objectAdditionalProperties === 'object'
                ? objectAdditionalProperties.description
                : undefined,
            removable,
            resetable,
            source,
        };
    })
        .filter((item) => !isUndefinedOrNull(item.value.data));
}
function getBoolObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object' ? (element.defaultValue ?? {}) : {};
    const elementScopeValue = typeof element.scopeValue === 'object' ? (element.scopeValue ?? {}) : {};
    const data = element.isConfigured
        ? { ...elementDefaultValue, ...elementScopeValue }
        : elementDefaultValue;
    const { objectProperties } = element.setting;
    const displayValues = [];
    for (const key in objectProperties) {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] &&
            element.setting.type === 'object' &&
            element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(key);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        displayValues.push({
            key: {
                type: 'string',
                data: key,
            },
            value: {
                type: 'boolean',
                data: !!data[key],
            },
            keyDescription: objectProperties[key].description,
            removable: false,
            resetable: true,
            source,
        });
    }
    return displayValues;
}
function createArraySuggester(element) {
    return (keys, idx) => {
        const enumOptions = [];
        if (element.setting.enum) {
            element.setting.enum.forEach((key, i) => {
                // include the currently selected value, even if uniqueItems is true
                if (!element.setting.uniqueItems ||
                    (idx !== undefined && key === keys[idx]) ||
                    !keys.includes(key)) {
                    const description = element.setting.enumDescriptions?.[i];
                    enumOptions.push({ value: key, description });
                }
            });
        }
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectKeySuggester(element) {
    const { objectProperties } = element.setting;
    const allStaticKeys = Object.keys(objectProperties ?? {});
    return (keys) => {
        const existingKeys = new Set(keys);
        const enumOptions = [];
        allStaticKeys.forEach((staticKey) => {
            if (!existingKeys.has(staticKey)) {
                enumOptions.push({
                    value: staticKey,
                    description: objectProperties[staticKey].description,
                });
            }
        });
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectValueSuggester(element) {
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object.entries(objectPatternProperties ?? {}).map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema,
    }));
    return (key) => {
        let suggestedSchema;
        if (isDefined(objectProperties) && key in objectProperties) {
            suggestedSchema = objectProperties[key];
        }
        const patternSchema = suggestedSchema ?? patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (isDefined(patternSchema)) {
            suggestedSchema = patternSchema;
        }
        else if (isDefined(objectAdditionalProperties) &&
            typeof objectAdditionalProperties === 'object') {
            suggestedSchema = objectAdditionalProperties;
        }
        if (isDefined(suggestedSchema)) {
            const type = getObjectValueType(suggestedSchema);
            if (type === 'boolean') {
                return { type, data: suggestedSchema.default ?? true };
            }
            else if (type === 'enum') {
                const options = getEnumOptionsFromSchema(suggestedSchema);
                return { type, data: suggestedSchema.default ?? options[0].value, options };
            }
            else {
                return { type, data: suggestedSchema.default ?? '' };
            }
        }
        return;
    };
}
function isNonNullableNumericType(type) {
    return type === 'number' || type === 'integer';
}
function parseNumericObjectValues(dataElement, v) {
    const newRecord = {};
    for (const key in v) {
        // Set to true/false once we're sure of the answer
        let keyMatchesNumericProperty;
        const patternProperties = dataElement.setting.objectPatternProperties;
        const properties = dataElement.setting.objectProperties;
        const additionalProperties = dataElement.setting.objectAdditionalProperties;
        // Match the current record key against the properties of the object
        if (properties) {
            for (const propKey in properties) {
                if (propKey === key) {
                    keyMatchesNumericProperty = isNonNullableNumericType(properties[propKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined && patternProperties) {
            for (const patternKey in patternProperties) {
                if (key.match(patternKey)) {
                    keyMatchesNumericProperty = isNonNullableNumericType(patternProperties[patternKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined &&
            additionalProperties &&
            typeof additionalProperties !== 'boolean') {
            if (isNonNullableNumericType(additionalProperties.type)) {
                keyMatchesNumericProperty = true;
            }
        }
        newRecord[key] = keyMatchesNumericProperty ? Number(v[key]) : v[key];
    }
    return newRecord;
}
function getListDisplayValue(element) {
    if (!element.value || !Array.isArray(element.value)) {
        return [];
    }
    if (element.setting.arrayItemType === 'enum') {
        let enumOptions = [];
        if (element.setting.enum) {
            enumOptions = element.setting.enum.map((setting, i) => {
                return {
                    value: setting,
                    description: element.setting.enumDescriptions?.[i],
                };
            });
        }
        return element.value.map((key) => {
            return {
                value: {
                    type: 'enum',
                    data: key,
                    options: enumOptions,
                },
            };
        });
    }
    else {
        return element.value.map((key) => {
            return {
                value: {
                    type: 'string',
                    data: key,
                },
            };
        });
    }
}
function getShowAddButtonList(dataElement, listDisplayValue) {
    if (dataElement.setting.enum && dataElement.setting.uniqueItems) {
        return dataElement.setting.enum.length - listDisplayValue.length > 0;
    }
    else {
        return true;
    }
}
export function resolveSettingsTree(tocData, coreSettingsGroups, logService) {
    const allSettings = getFlatSettings(coreSettingsGroups);
    return {
        tree: _resolveSettingsTree(tocData, allSettings, logService),
        leftoverSettings: allSettings,
    };
}
export function resolveConfiguredUntrustedSettings(groups, target, languageFilter, configurationService) {
    const allSettings = getFlatSettings(groups);
    return [...allSettings].filter((setting) => setting.restricted &&
        inspectSetting(setting.key, target, languageFilter, configurationService).isConfigured);
}
export async function createTocTreeForExtensionSettings(extensionService, groups) {
    const extGroupTree = new Map();
    const addEntryToTree = (extensionId, extensionName, childEntry) => {
        if (!extGroupTree.has(extensionId)) {
            const rootEntry = {
                id: extensionId,
                label: extensionName,
                children: [],
            };
            extGroupTree.set(extensionId, rootEntry);
        }
        extGroupTree.get(extensionId).children.push(childEntry);
    };
    const processGroupEntry = async (group) => {
        const flatSettings = group.sections.map((section) => section.settings).flat();
        const extensionId = group.extensionInfo.id;
        const extension = await extensionService.getExtension(extensionId);
        const extensionName = extension?.displayName ?? extension?.name ?? extensionId;
        // There could be multiple groups with the same extension id that all belong to the same extension.
        // To avoid highlighting all groups upon expanding the extension's ToC entry,
        // use the group ID only if it is non-empty and isn't the extension ID.
        // Ref https://github.com/microsoft/vscode/issues/241521.
        const settingGroupId = group.id && group.id !== extensionId ? group.id : group.title;
        const childEntry = {
            id: settingGroupId,
            label: group.title,
            order: group.order,
            settings: flatSettings,
        };
        addEntryToTree(extensionId, extensionName, childEntry);
    };
    const processPromises = groups.map((g) => processGroupEntry(g));
    return Promise.all(processPromises).then(() => {
        const extGroups = [];
        for (const extensionRootEntry of extGroupTree.values()) {
            for (const child of extensionRootEntry.children) {
                // Sort the individual settings of the child by order.
                // Leave the undefined order settings untouched.
                child.settings?.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
            }
            if (extensionRootEntry.children.length === 1) {
                // There is a single category for this extension.
                // Push a flattened setting.
                extGroups.push({
                    id: extensionRootEntry.id,
                    label: extensionRootEntry.children[0].label,
                    settings: extensionRootEntry.children[0].settings,
                });
            }
            else {
                // Sort the categories.
                // Leave the undefined order categories untouched.
                extensionRootEntry.children.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
                // If there is a category that matches the setting name,
                // add the settings in manually as "ungrouped" settings.
                // https://github.com/microsoft/vscode/issues/137259
                const ungroupedChild = extensionRootEntry.children.find((child) => child.label === extensionRootEntry.label);
                if (ungroupedChild && !ungroupedChild.children) {
                    const groupedChildren = extensionRootEntry.children.filter((child) => child !== ungroupedChild);
                    extGroups.push({
                        id: extensionRootEntry.id,
                        label: extensionRootEntry.label,
                        settings: ungroupedChild.settings,
                        children: groupedChildren,
                    });
                }
                else {
                    // Push all the groups as-is.
                    extGroups.push(extensionRootEntry);
                }
            }
        }
        // Sort the outermost settings.
        extGroups.sort((a, b) => a.label.localeCompare(b.label));
        return {
            id: 'extensions',
            label: localize('extensions', 'Extensions'),
            children: extGroups,
        };
    });
}
function _resolveSettingsTree(tocData, allSettings, logService) {
    let children;
    if (tocData.children) {
        children = tocData.children
            .filter((child) => child.hide !== true)
            .map((child) => _resolveSettingsTree(child, allSettings, logService))
            .filter((child) => child.children?.length || child.settings?.length);
    }
    let settings;
    if (tocData.settings) {
        settings = tocData.settings
            .map((pattern) => getMatchingSettings(allSettings, pattern, logService))
            .flat();
    }
    if (!children && !settings) {
        throw new Error(`TOC node has no child groups or settings: ${tocData.id}`);
    }
    return {
        id: tocData.id,
        label: tocData.label,
        children,
        settings,
    };
}
const knownDynamicSettingGroups = [/^settingsSync\..*/, /^sync\..*/, /^workbench.fontAliasing$/];
function getMatchingSettings(allSettings, pattern, logService) {
    const result = [];
    allSettings.forEach((s) => {
        if (settingMatches(s, pattern)) {
            result.push(s);
            allSettings.delete(s);
        }
    });
    if (!result.length && !knownDynamicSettingGroups.some((r) => r.test(pattern))) {
        logService.warn(`Settings pattern "${pattern}" doesn't match any settings`);
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
}
const settingPatternCache = new Map();
export function createSettingMatchRegExp(pattern) {
    pattern = escapeRegExpCharacters(pattern).replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`, 'i');
}
function settingMatches(s, pattern) {
    let regExp = settingPatternCache.get(pattern);
    if (!regExp) {
        regExp = createSettingMatchRegExp(pattern);
        settingPatternCache.set(pattern, regExp);
    }
    return regExp.test(s.key);
}
function getFlatSettings(settingsGroups) {
    const result = new Set();
    for (const group of settingsGroups) {
        for (const section of group.sections) {
            for (const s of section.settings) {
                if (!s.overrides || !s.overrides.length) {
                    result.add(s);
                }
            }
        }
    }
    return result;
}
const SETTINGS_TEXT_TEMPLATE_ID = 'settings.text.template';
const SETTINGS_MULTILINE_TEXT_TEMPLATE_ID = 'settings.multilineText.template';
const SETTINGS_NUMBER_TEMPLATE_ID = 'settings.number.template';
const SETTINGS_ENUM_TEMPLATE_ID = 'settings.enum.template';
const SETTINGS_BOOL_TEMPLATE_ID = 'settings.bool.template';
const SETTINGS_ARRAY_TEMPLATE_ID = 'settings.array.template';
const SETTINGS_EXCLUDE_TEMPLATE_ID = 'settings.exclude.template';
const SETTINGS_INCLUDE_TEMPLATE_ID = 'settings.include.template';
const SETTINGS_OBJECT_TEMPLATE_ID = 'settings.object.template';
const SETTINGS_BOOL_OBJECT_TEMPLATE_ID = 'settings.boolObject.template';
const SETTINGS_COMPLEX_TEMPLATE_ID = 'settings.complex.template';
const SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID = 'settings.complexObject.template';
const SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID = 'settings.newExtensions.template';
const SETTINGS_ELEMENT_TEMPLATE_ID = 'settings.group.template';
const SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID = 'settings.extensionToggle.template';
function removeChildrenFromTabOrder(node) {
    const focusableElements = node.querySelectorAll(`
		[tabindex="0"],
		input:not([tabindex="-1"]),
		select:not([tabindex="-1"]),
		textarea:not([tabindex="-1"]),
		a:not([tabindex="-1"]),
		button:not([tabindex="-1"]),
		area:not([tabindex="-1"])
	`);
    focusableElements.forEach((element) => {
        element.setAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR, 'true');
        element.setAttribute('tabindex', '-1');
    });
}
function addChildrenToTabOrder(node) {
    const focusableElements = node.querySelectorAll(`[${AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR}="true"]`);
    focusableElements.forEach((element) => {
        element.removeAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR);
        element.setAttribute('tabindex', '0');
    });
}
let AbstractSettingRenderer = class AbstractSettingRenderer extends Disposable {
    static { AbstractSettingRenderer_1 = this; }
    static { this.CONTROL_CLASS = 'setting-control-focus-target'; }
    static { this.CONTROL_SELECTOR = '.' + this.CONTROL_CLASS; }
    static { this.CONTENTS_CLASS = 'setting-item-contents'; }
    static { this.CONTENTS_SELECTOR = '.' + this.CONTENTS_CLASS; }
    static { this.ALL_ROWS_SELECTOR = '.monaco-list-row'; }
    static { this.SETTING_KEY_ATTR = 'data-key'; }
    static { this.SETTING_ID_ATTR = 'data-id'; }
    static { this.ELEMENT_FOCUSABLE_ATTR = 'data-focusable'; }
    constructor(settingActions, disposableActionFactory, _themeService, _contextViewService, _openerService, _instantiationService, _commandService, _contextMenuService, _keybindingService, _configService, _extensionsService, _extensionsWorkbenchService, _productService, _telemetryService, _hoverService) {
        super();
        this.settingActions = settingActions;
        this.disposableActionFactory = disposableActionFactory;
        this._themeService = _themeService;
        this._contextViewService = _contextViewService;
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._configService = _configService;
        this._extensionsService = _extensionsService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._productService = _productService;
        this._telemetryService = _telemetryService;
        this._hoverService = _hoverService;
        this._onDidClickOverrideElement = this._register(new Emitter());
        this.onDidClickOverrideElement = this._onDidClickOverrideElement.event;
        this._onDidChangeSetting = this._register(new Emitter());
        this.onDidChangeSetting = this._onDidChangeSetting.event;
        this._onDidOpenSettings = this._register(new Emitter());
        this.onDidOpenSettings = this._onDidOpenSettings.event;
        this._onDidClickSettingLink = this._register(new Emitter());
        this.onDidClickSettingLink = this._onDidClickSettingLink.event;
        this._onDidFocusSetting = this._register(new Emitter());
        this.onDidFocusSetting = this._onDidFocusSetting.event;
        this._onDidChangeIgnoredSettings = this._register(new Emitter());
        this.onDidChangeIgnoredSettings = this._onDidChangeIgnoredSettings.event;
        this._onDidChangeSettingHeight = this._register(new Emitter());
        this.onDidChangeSettingHeight = this._onDidChangeSettingHeight.event;
        this._onApplyFilter = this._register(new Emitter());
        this.onApplyFilter = this._onApplyFilter.event;
        this.markdownRenderer = _instantiationService.createInstance(MarkdownRenderer, {});
        this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
        this._register(this._configService.onDidChangeConfiguration((e) => {
            this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
            this._onDidChangeIgnoredSettings.fire();
        }));
    }
    renderCommonTemplate(tree, _container, typeClass) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-' + typeClass);
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer_1.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const labelCategoryContainer = DOM.append(titleElement, $('.setting-item-cat-label-container'));
        const categoryElement = DOM.append(labelCategoryContainer, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(labelCategoryContainer, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = toDispose.add(this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement));
        const descriptionElement = DOM.append(container, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', 'The setting has been configured in the current scope.'),
        }));
        const valueElement = DOM.append(container, $('.setting-item-value'));
        const controlElement = DOM.append(valueElement, $('div.setting-item-control'));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            descriptionElement,
            controlElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar,
        };
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, DOM.EventType.MOUSE_DOWN, (e) => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, (e) => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, (e) => container.classList.remove('mouseover')));
        return template;
    }
    addSettingElementFocusHandler(template) {
        const focusTracker = DOM.trackFocus(template.containerElement);
        template.toDispose.add(focusTracker);
        template.toDispose.add(focusTracker.onDidBlur(() => {
            if (template.containerElement.classList.contains('focused')) {
                template.containerElement.classList.remove('focused');
            }
        }));
        template.toDispose.add(focusTracker.onDidFocus(() => {
            template.containerElement.classList.add('focused');
            if (template.context) {
                this._onDidFocusSetting.fire(template.context);
            }
        }));
    }
    renderSettingToolbar(container) {
        const toggleMenuKeybinding = this._keybindingService.lookupKeybinding(SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU);
        let toggleMenuTitle = localize('settingsContextMenuTitle', 'More Actions... ');
        if (toggleMenuKeybinding) {
            toggleMenuTitle += ` (${toggleMenuKeybinding && toggleMenuKeybinding.getLabel()})`;
        }
        const toolbar = new ToolBar(container, this._contextMenuService, {
            toggleMenuTitle,
            renderDropdownAsChildElement: !isIOS,
            moreIcon: settingsMoreActionIcon,
        });
        return toolbar;
    }
    renderSettingElement(node, index, template) {
        const element = node.element;
        // The element must inspect itself to get information for
        // the modified indicator and the overridden Settings indicators.
        element.inspectSelf();
        template.context = element;
        template.toolbar.context = element;
        const actions = this.disposableActionFactory(element.setting, element.settingsTarget);
        actions.forEach((a) => isDisposable(a) && template.elementDisposables.add(a));
        template.toolbar.setActions([], [...this.settingActions, ...actions]);
        const setting = element.setting;
        template.containerElement.classList.toggle('is-configured', element.isConfigured);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_KEY_ATTR, element.setting.key);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_ID_ATTR, element.id);
        const titleTooltip = setting.key + (element.isConfigured ? ' - Modified' : '');
        template.categoryElement.textContent = element.displayCategory
            ? element.displayCategory + ': '
            : '';
        template.elementDisposables.add(this._hoverService.setupDelayedHover(template.categoryElement, { content: titleTooltip }));
        template.labelElement.text = element.displayLabel;
        template.labelElement.title = titleTooltip;
        template.descriptionElement.innerText = '';
        if (element.setting.descriptionIsMarkdown) {
            const renderedDescription = this.renderSettingMarkdown(element, template.containerElement, element.description, template.elementDisposables);
            template.descriptionElement.appendChild(renderedDescription);
        }
        else {
            template.descriptionElement.innerText = element.description;
        }
        template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
        template.elementDisposables.add(this._configService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING)) {
                template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
            }
        }));
        const onChange = (value) => this._onDidChangeSetting.fire({
            key: element.setting.key,
            value,
            type: template.context.valueType,
            manualReset: false,
            scope: element.setting.scope,
        });
        const deprecationText = element.setting.deprecationMessage || '';
        if (deprecationText && element.setting.deprecationMessageIsMarkdown) {
            template.deprecationWarningElement.innerText = '';
            template.deprecationWarningElement.appendChild(this.renderSettingMarkdown(element, template.containerElement, element.setting.deprecationMessage, template.elementDisposables));
        }
        else {
            template.deprecationWarningElement.innerText = deprecationText;
        }
        template.deprecationWarningElement.prepend($('.codicon.codicon-error'));
        template.containerElement.classList.toggle('is-deprecated', !!deprecationText);
        this.renderValue(element, template, onChange);
        template.indicatorsLabel.updateWorkspaceTrust(element);
        template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        template.indicatorsLabel.updateDefaultOverrideIndicator(element);
        template.indicatorsLabel.updatePreviewIndicator(element);
        template.elementDisposables.add(this.onDidChangeIgnoredSettings(() => {
            template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        }));
        this.updateSettingTabbable(element, template);
        template.elementDisposables.add(element.onDidChangeTabbable(() => {
            this.updateSettingTabbable(element, template);
        }));
    }
    updateSettingTabbable(element, template) {
        if (element.tabbable) {
            addChildrenToTabOrder(template.containerElement);
        }
        else {
            removeChildrenFromTabOrder(template.containerElement);
        }
    }
    renderSettingMarkdown(element, container, text, disposables) {
        // Rewrite `#editor.fontSize#` to link format
        text = fixSettingLinks(text);
        const renderedMarkdown = this.markdownRenderer.render({ value: text, isTrusted: true }, {
            actionHandler: {
                callback: (content) => {
                    if (content.startsWith('#')) {
                        const e = {
                            source: element,
                            targetKey: content.substring(1),
                        };
                        this._onDidClickSettingLink.fire(e);
                    }
                    else {
                        this._openerService.open(content, { allowCommands: true }).catch(onUnexpectedError);
                    }
                },
                disposables,
            },
            asyncRenderCallback: () => {
                const height = container.clientHeight;
                if (height) {
                    this._onDidChangeSettingHeight.fire({ element, height });
                }
            },
        });
        disposables.add(renderedMarkdown);
        renderedMarkdown.element.classList.add('setting-item-markdown');
        cleanRenderedMarkdown(renderedMarkdown.element);
        return renderedMarkdown.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
    disposeElement(_element, _index, template, _height) {
        ;
        template.elementDisposables?.clear();
    }
};
AbstractSettingRenderer = AbstractSettingRenderer_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IContextViewService),
    __param(4, IOpenerService),
    __param(5, IInstantiationService),
    __param(6, ICommandService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, IConfigurationService),
    __param(10, IExtensionService),
    __param(11, IExtensionsWorkbenchService),
    __param(12, IProductService),
    __param(13, ITelemetryService),
    __param(14, IHoverService)
], AbstractSettingRenderer);
export { AbstractSettingRenderer };
class SettingGroupRenderer {
    constructor() {
        this.templateId = SETTINGS_ELEMENT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('group-title');
        const template = {
            parent: container,
            toDispose: new DisposableStore(),
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.parent.innerText = '';
        const labelElement = DOM.append(templateData.parent, $('div.settings-group-title-label.settings-row-inner-container'));
        labelElement.classList.add(`settings-group-level-${element.element.level}`);
        labelElement.textContent = element.element.label;
        if (element.element.isFirstGroup) {
            labelElement.classList.add('settings-group-first');
        }
    }
    disposeTemplate(templateData) {
        templateData.toDispose.dispose();
    }
}
let SettingNewExtensionsRenderer = class SettingNewExtensionsRenderer {
    constructor(_commandService) {
        this._commandService = _commandService;
        this.templateId = SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        container.classList.add('setting-item-new-extensions');
        const button = new Button(container, { title: true, ...defaultButtonStyles });
        toDispose.add(button);
        toDispose.add(button.onDidClick(() => {
            if (template.context) {
                this._commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', template.context.extensionIds);
            }
        }));
        button.label = localize('newExtensionsButtonLabel', 'Show matching extensions');
        button.element.classList.add('settings-new-extensions-button');
        const template = {
            button,
            toDispose,
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.context = element.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
};
SettingNewExtensionsRenderer = __decorate([
    __param(0, ICommandService)
], SettingNewExtensionsRenderer);
export { SettingNewExtensionsRenderer };
export class SettingComplexRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_TEMPLATE_ID;
    }
    static { this.EDIT_IN_JSON_LABEL = localize('editInSettingsJson', 'Edit in settings.json'); }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'complex');
        const openSettingsButton = DOM.append(common.controlElement, $('a.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const plainKey = getLanguageTagSettingPlainKey(dataElement.setting.key);
        const editLanguageSettingLabel = localize('editLanguageSettingLabel', 'Edit settings for {0}', plainKey);
        const isLanguageTagSetting = dataElement.setting.isLanguageTagSetting;
        template.button.textContent = isLanguageTagSetting
            ? editLanguageSettingLabel
            : SettingComplexRenderer.EDIT_IN_JSON_LABEL;
        const onClickOrKeydown = (e) => {
            if (isLanguageTagSetting) {
                this._onApplyFilter.fire(`@${LANGUAGE_SETTING_TAG}${plainKey}`);
            }
            else {
                this._onDidOpenSettings.fire(dataElement.setting.key);
            }
            e.preventDefault();
            e.stopPropagation();
        };
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.CLICK, (e) => {
            onClickOrKeydown(e);
        }));
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.KEY_DOWN, (e) => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                onClickOrKeydown(e);
            }
        }));
        this.renderValidations(dataElement, template);
        if (isLanguageTagSetting) {
            template.button.setAttribute('aria-label', editLanguageSettingLabel);
        }
        else {
            template.button.setAttribute('aria-label', `${SettingComplexRenderer.EDIT_IN_JSON_LABEL}: ${dataElement.setting.key}`);
        }
    }
    renderValidations(dataElement, template) {
        const errMsg = dataElement.isConfigured && getInvalidTypeError(dataElement.value, dataElement.setting.type);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            return;
        }
        template.containerElement.classList.remove('invalid-input');
    }
}
class SettingComplexObjectRenderer extends SettingComplexRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const objectSettingWidget = common.toDispose.add(this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement));
        objectSettingWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const openSettingsButton = DOM.append(DOM.append(common.controlElement, $('.complex-object-edit-in-settings-button-container')), $('a.complex-object.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement,
            objectSettingWidget,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        template.objectSettingWidget.setValue(items, {
            settingKey: dataElement.setting.key,
            showAddButton: false,
            isReadOnly: true,
        });
        template.button.parentElement?.classList.toggle('hide', dataElement.hasPolicyValue);
        super.renderValue(dataElement, template, onChange);
    }
}
class SettingArrayRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ARRAY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const listWidget = this._instantiationService.createInstance(ListSettingWidget, common.controlElement);
        listWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(listWidget);
        const template = {
            ...common,
            listWidget,
            validationErrorMessageElement,
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(listWidget.onDidChangeList((e) => {
            const newList = this.computeNewList(template, e);
            template.onChange?.(newList);
        }));
        return template;
    }
    computeNewList(template, e) {
        if (template.context) {
            let newValue = [];
            if (Array.isArray(template.context.scopeValue)) {
                newValue = [...template.context.scopeValue];
            }
            else if (Array.isArray(template.context.value)) {
                newValue = [...template.context.value];
            }
            if (e.type === 'move') {
                // A drag and drop occurred
                const sourceIndex = e.sourceIndex;
                const targetIndex = e.targetIndex;
                const splicedElem = newValue.splice(sourceIndex, 1)[0];
                newValue.splice(targetIndex, 0, splicedElem);
            }
            else if (e.type === 'remove' || e.type === 'reset') {
                newValue.splice(e.targetIndex, 1);
            }
            else if (e.type === 'change') {
                const itemValueData = e.newItem.value.data.toString();
                // Update value
                if (e.targetIndex > -1) {
                    newValue[e.targetIndex] = itemValueData;
                }
                // For some reason, we are updating and cannot find original value
                // Just append the value in this case
                else {
                    newValue.push(itemValueData);
                }
            }
            else if (e.type === 'add') {
                newValue.push(e.newItem.value.data.toString());
            }
            if (template.context.defaultValue &&
                Array.isArray(template.context.defaultValue) &&
                template.context.defaultValue.length === newValue.length &&
                template.context.defaultValue.join() === newValue.join()) {
                return undefined;
            }
            return newValue;
        }
        return undefined;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getListDisplayValue(dataElement);
        const keySuggester = dataElement.setting.enum ? createArraySuggester(dataElement) : undefined;
        template.listWidget.setValue(value, {
            showAddButton: getShowAddButtonList(dataElement, value),
            keySuggester,
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.listWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const itemType = dataElement.setting.arrayItemType;
                const arrToSave = isNonNullableNumericType(itemType) ? v.map((a) => +a) : v;
                onChange(arrToSave);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, value.map((v) => v.value.data.toString()), true);
    }
}
class AbstractSettingObjectRenderer extends AbstractSettingRenderer {
    renderTemplateWithWidget(common, widget) {
        widget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(widget);
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const template = {
            ...common,
            validationErrorMessageElement,
        };
        if (widget instanceof ObjectSettingCheckboxWidget) {
            template.objectCheckboxWidget = widget;
        }
        else {
            template.objectDropdownWidget = widget;
        }
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
}
class SettingObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList((e) => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        const widget = template.objectDropdownWidget;
        if (template.context) {
            const settingSupportsRemoveDefault = objectSettingSupportsRemoveDefaultValue(template.context.setting.key);
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? (template.context.defaultValue ?? {})
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object' ? (template.context.scopeValue ?? {}) : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            widget.items.forEach((item, idx) => {
                // Item was updated
                if ((e.type === 'change' || e.type === 'move') && e.targetIndex === idx) {
                    // If the key of the default value is changed, remove the default value
                    if (e.originalItem.key.data !== e.newItem.key.data &&
                        settingSupportsRemoveDefault &&
                        e.originalItem.key.data in defaultValue) {
                        newValue[e.originalItem.key.data] = null;
                    }
                    else {
                        delete newValue[e.originalItem.key.data];
                    }
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if ((e.type !== 'change' && e.type !== 'move') ||
                    e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            // Item was deleted
            if (e.type === 'remove' || e.type === 'reset') {
                const objectKey = e.originalItem.key.data;
                const removingDefaultValue = e.type === 'remove' &&
                    settingSupportsRemoveDefault &&
                    defaultValue[objectKey] === e.originalItem.value.data;
                if (removingDefaultValue) {
                    newValue[objectKey] = null;
                }
                else {
                    delete newValue[objectKey];
                }
                const itemToDelete = newItems.findIndex((item) => item.key.data === objectKey);
                const defaultItemValue = defaultValue[objectKey];
                // Item does not have a default or default is bing removed
                if (removingDefaultValue ||
                    (isUndefinedOrNull(defaultValue[objectKey]) && itemToDelete > -1)) {
                    newItems.splice(itemToDelete, 1);
                }
                else if (!removingDefaultValue && itemToDelete > -1) {
                    newItems[itemToDelete].value.data = defaultItemValue;
                }
            }
            // New item was added
            else if (e.type === 'add') {
                newValue[e.newItem.key.data] = e.newItem.value.data;
                newItems.push(e.newItem);
            }
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value &&
                    defaultValue[key] === value &&
                    !(settingSupportsRemoveDefault && value === null)) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectDropdownWidget.setValue(newItems);
            template.onChange?.(newObject);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        const { key, objectProperties, objectPatternProperties, objectAdditionalProperties } = dataElement.setting;
        template.objectDropdownWidget.setValue(items, {
            settingKey: key,
            showAddButton: objectAdditionalProperties === false
                ? !areAllPropertiesDefined(Object.keys(objectProperties ?? {}), items) ||
                    isDefined(objectPatternProperties)
                : true,
            keySuggester: createObjectKeySuggester(dataElement),
            valueSuggester: createObjectValueSuggester(dataElement),
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.objectDropdownWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const parsedRecord = parseNumericObjectValues(dataElement, v);
                onChange(parsedRecord);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, dataElement.value, true);
    }
}
class SettingBoolObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingCheckboxWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList((e) => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        if (template.context) {
            const widget = template.objectCheckboxWidget;
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? (template.context.defaultValue ?? {})
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object' ? (template.context.scopeValue ?? {}) : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            if (e.type !== 'change') {
                console.warn('Unexpected event type', e.type, 'for bool object setting', template.context.setting.key);
                return;
            }
            widget.items.forEach((item, idx) => {
                // Item was updated
                if (e.targetIndex === idx) {
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if (e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value && defaultValue[key] === value) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectCheckboxWidget.setValue(newItems);
            template.onChange?.(newObject);
            // Focus this setting explicitly, in case we were previously
            // focused on another setting and clicked a checkbox/value container
            // for this setting.
            this._onDidFocusSetting.fire(template.context);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getBoolObjectDisplayValue(dataElement);
        const { key } = dataElement.setting;
        template.objectCheckboxWidget.setValue(items, {
            settingKey: key,
        });
        template.context = dataElement;
        template.onChange = (v) => {
            onChange(v);
        };
    }
}
class SettingIncludeExcludeRenderer extends AbstractSettingRenderer {
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const includeExcludeWidget = this._instantiationService.createInstance(this.isExclude() ? ExcludeSettingWidget : IncludeSettingWidget, common.controlElement);
        includeExcludeWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(includeExcludeWidget);
        const template = {
            ...common,
            includeExcludeWidget,
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(includeExcludeWidget.onDidChangeList((e) => this.onDidChangeIncludeExclude(template, e)));
        return template;
    }
    onDidChangeIncludeExclude(template, e) {
        if (template.context) {
            const newValue = { ...template.context.scopeValue };
            // first delete the existing entry, if present
            if (e.type !== 'add') {
                if (e.originalItem.value.data.toString() in template.context.defaultValue) {
                    // delete a default by overriding it
                    newValue[e.originalItem.value.data.toString()] = false;
                }
                else {
                    delete newValue[e.originalItem.value.data.toString()];
                }
            }
            // then add the new or updated entry, if present
            if (e.type === 'change' || e.type === 'add' || e.type === 'move') {
                if (e.newItem.value.data.toString() in template.context.defaultValue &&
                    !e.newItem.sibling) {
                    // add a default by deleting its override
                    delete newValue[e.newItem.value.data.toString()];
                }
                else {
                    newValue[e.newItem.value.data.toString()] = e.newItem.sibling
                        ? { when: e.newItem.sibling }
                        : true;
                }
            }
            function sortKeys(obj) {
                const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
                const retVal = {};
                for (const key of sortedKeys) {
                    retVal[key] = obj[key];
                }
                return retVal;
            }
            this._onDidChangeSetting.fire({
                key: template.context.setting.key,
                value: Object.keys(newValue).length === 0 ? undefined : sortKeys(newValue),
                type: template.context.valueType,
                manualReset: false,
                scope: template.context.setting.scope,
            });
        }
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getIncludeExcludeDisplayValue(dataElement);
        template.includeExcludeWidget.setValue(value);
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.includeExcludeWidget.cancelEdit();
        }));
    }
}
class SettingExcludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return true;
    }
}
class SettingIncludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_INCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return false;
    }
}
const settingsInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsTextInputBackground,
    inputForeground: settingsTextInputForeground,
    inputBorder: settingsTextInputBorder,
});
class AbstractSettingTextRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.MULTILINE_MAX_HEIGHT = 150;
    }
    renderTemplate(_container, useMultiline) {
        const common = this.renderCommonTemplate(null, _container, 'text');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBoxOptions = {
            flexibleHeight: useMultiline,
            flexibleWidth: false,
            flexibleMaxHeight: this.MULTILINE_MAX_HEIGHT,
            inputBoxStyles: settingsInputBoxStyles,
        };
        const inputBox = new InputBox(common.controlElement, this._contextViewService, inputBoxOptions);
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange((e) => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.inputBox.value = dataElement.value;
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.onChange = (value) => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(value);
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const template = super.renderTemplate(_container, false);
        // TODO@9at8: listWidget filters out all key events from input boxes, so we need to come up with a better way
        // Disable ArrowUp and ArrowDown behaviour in favor of list navigation
        template.toDispose.add(DOM.addStandardDisposableListener(template.inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
            if (e.equals(16 /* KeyCode.UpArrow */) || e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
            }
        }));
        return template;
    }
}
class SettingMultilineTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        return super.renderTemplate(_container, true);
    }
    renderValue(dataElement, template, onChange) {
        const onChangeOverride = (value) => {
            // Ensure the model is up to date since a different value will be rendered as different height when probing the height.
            dataElement.value = value;
            onChange(value);
        };
        super.renderValue(dataElement, template, onChangeOverride);
        template.elementDisposables.add(template.inputBox.onDidHeightChange((e) => {
            const height = template.containerElement.clientHeight;
            // Don't fire event if height is reported as 0,
            // which sometimes happens when clicking onto a new setting.
            if (height) {
                this._onDidChangeSettingHeight.fire({
                    element: dataElement,
                    height: template.containerElement.clientHeight,
                });
            }
        }));
        template.inputBox.layout();
    }
}
class SettingEnumRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ENUM_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'enum');
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder,
        });
        const selectBox = new SelectBox([], 0, this._contextViewService, styles, {
            useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents),
        });
        common.toDispose.add(selectBox);
        selectBox.render(common.controlElement);
        const selectElement = common.controlElement.querySelector('select');
        if (selectElement) {
            selectElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
            selectElement.tabIndex = 0;
        }
        common.toDispose.add(selectBox.onDidSelect((e) => {
            template.onChange?.(e.index);
        }));
        const enumDescriptionElement = common.containerElement.insertBefore($('.setting-item-enumDescription'), common.descriptionElement.nextSibling);
        const template = {
            ...common,
            selectBox,
            selectElement,
            enumDescriptionElement,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        // Make shallow copies here so that we don't modify the actual dataElement later
        const enumItemLabels = dataElement.setting.enumItemLabels
            ? [...dataElement.setting.enumItemLabels]
            : [];
        const enumDescriptions = dataElement.setting.enumDescriptions
            ? [...dataElement.setting.enumDescriptions]
            : [];
        const settingEnum = [...dataElement.setting.enum];
        const enumDescriptionsAreMarkdown = dataElement.setting.enumDescriptionsAreMarkdown;
        const disposables = new DisposableStore();
        template.elementDisposables.add(disposables);
        let createdDefault = false;
        if (!settingEnum.includes(dataElement.defaultValue)) {
            // Add a new potentially blank default setting
            settingEnum.unshift(dataElement.defaultValue);
            enumDescriptions.unshift('');
            enumItemLabels.unshift('');
            createdDefault = true;
        }
        // Use String constructor in case of null or undefined values
        const stringifiedDefaultValue = escapeInvisibleChars(String(dataElement.defaultValue));
        const displayOptions = settingEnum
            .map(String)
            .map(escapeInvisibleChars)
            .map((data, index) => {
            const description = enumDescriptions[index] &&
                (enumDescriptionsAreMarkdown
                    ? fixSettingLinks(enumDescriptions[index], false)
                    : enumDescriptions[index]);
            return {
                text: enumItemLabels[index] ? enumItemLabels[index] : data,
                detail: enumItemLabels[index] ? data : '',
                description,
                descriptionIsMarkdown: enumDescriptionsAreMarkdown,
                descriptionMarkdownActionHandler: {
                    callback: (content) => {
                        this._openerService.open(content).catch(onUnexpectedError);
                    },
                    disposables: disposables,
                },
                decoratorRight: data === stringifiedDefaultValue || (createdDefault && index === 0)
                    ? localize('settings.Default', 'default')
                    : '',
            };
        });
        template.selectBox.setOptions(displayOptions);
        template.selectBox.setAriaLabel(dataElement.setting.key);
        let idx = settingEnum.indexOf(dataElement.value);
        if (idx === -1) {
            idx = 0;
        }
        template.onChange = undefined;
        template.selectBox.select(idx);
        template.onChange = (idx) => {
            if (createdDefault && idx === 0) {
                onChange(dataElement.defaultValue);
            }
            else {
                onChange(settingEnum[idx]);
            }
        };
        template.enumDescriptionElement.innerText = '';
    }
}
const settingsNumberInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsNumberInputBackground,
    inputForeground: settingsNumberInputForeground,
    inputBorder: settingsNumberInputBorder,
});
class SettingNumberRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_NUMBER_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'number');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBox = new InputBox(common.controlElement, this._contextViewService, {
            type: 'number',
            inputBoxStyles: settingsNumberInputBoxStyles,
        });
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange((e) => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const numParseFn = dataElement.valueType === 'integer' || dataElement.valueType === 'nullable-integer'
            ? parseInt
            : parseFloat;
        const nullNumParseFn = dataElement.valueType === 'nullable-integer' || dataElement.valueType === 'nullable-number'
            ? (v) => (v === '' ? null : numParseFn(v))
            : numParseFn;
        template.onChange = undefined;
        template.inputBox.value =
            typeof dataElement.value === 'number' ? dataElement.value.toString() : '';
        template.inputBox.step = dataElement.valueType.includes('integer') ? '1' : 'any';
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.onChange = (value) => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(nullNumParseFn(value));
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingBoolRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-bool');
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const categoryElement = DOM.append(titleElement, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(titleElement, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement);
        const descriptionAndValueElement = DOM.append(container, $('.setting-item-value-description'));
        const controlElement = DOM.append(descriptionAndValueElement, $('.setting-item-bool-control'));
        const descriptionElement = DOM.append(descriptionAndValueElement, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', 'The setting has been configured in the current scope.'),
        }));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const checkbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'setting-value-checkbox',
            isChecked: true,
            title: '',
            ...unthemedToggleStyles,
        });
        controlElement.appendChild(checkbox.domNode);
        toDispose.add(checkbox);
        toDispose.add(checkbox.onChange(() => {
            template.onChange(checkbox.checked);
        }));
        // Need to listen for mouse clicks on description and toggle checkbox - use target ID for safety
        // Also have to ignore embedded links - too buried to stop propagation
        toDispose.add(DOM.addDisposableListener(descriptionElement, DOM.EventType.MOUSE_DOWN, (e) => {
            const targetElement = e.target;
            // Toggle target checkbox
            if (targetElement.tagName.toLowerCase() !== 'a') {
                template.checkbox.checked = !template.checkbox.checked;
                template.onChange(checkbox.checked);
            }
            DOM.EventHelper.stop(e);
        }));
        checkbox.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        toDispose.add(toolbar);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            controlElement,
            checkbox,
            descriptionElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar,
        };
        this.addSettingElementFocusHandler(template);
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, 'mousedown', (e) => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, (e) => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, (e) => container.classList.remove('mouseover')));
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.checkbox.checked = dataElement.value;
        template.checkbox.setTitle(dataElement.setting.key);
        template.onChange = onChange;
    }
}
class SettingsExtensionToggleRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
        this._onDidDismissExtensionSetting = this._register(new Emitter());
        this.onDidDismissExtensionSetting = this._onDidDismissExtensionSetting.event;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'extension-toggle');
        const actionButton = new Button(common.containerElement, {
            title: false,
            ...defaultButtonStyles,
        });
        actionButton.element.classList.add('setting-item-extension-toggle-button');
        actionButton.label = localize('showExtension', 'Show Extension');
        const dismissButton = new Button(common.containerElement, {
            title: false,
            secondary: true,
            ...defaultButtonStyles,
        });
        dismissButton.element.classList.add('setting-item-extension-dismiss-button');
        dismissButton.label = localize('dismiss', 'Dismiss');
        const template = {
            ...common,
            actionButton,
            dismissButton,
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.elementDisposables.clear();
        const extensionId = dataElement.setting.displayExtensionId;
        template.elementDisposables.add(template.actionButton.onDidClick(async () => {
            this._telemetryService.publicLog2('ManageExtensionClick', { extensionId });
            this._commandService.executeCommand('extension.open', extensionId);
        }));
        template.elementDisposables.add(template.dismissButton.onDidClick(async () => {
            this._telemetryService.publicLog2('DismissExtensionClick', { extensionId });
            this._onDidDismissExtensionSetting.fire(extensionId);
        }));
    }
}
let SettingTreeRenderers = class SettingTreeRenderers extends Disposable {
    constructor(_instantiationService, _contextMenuService, _contextViewService, _userDataSyncEnablementService) {
        super();
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._userDataSyncEnablementService = _userDataSyncEnablementService;
        this._onDidChangeSetting = this._register(new Emitter());
        this.settingActions = [
            new Action('settings.resetSetting', localize('resetSettingLabel', 'Reset Setting'), undefined, undefined, async (context) => {
                if (context instanceof SettingsTreeSettingElement) {
                    if (!context.isUntrusted) {
                        this._onDidChangeSetting.fire({
                            key: context.setting.key,
                            value: undefined,
                            type: context.setting.type,
                            manualReset: true,
                            scope: context.setting.scope,
                        });
                    }
                }
            }),
            new Separator(),
            this._instantiationService.createInstance(CopySettingIdAction),
            this._instantiationService.createInstance(CopySettingAsJSONAction),
            this._instantiationService.createInstance(CopySettingAsURLAction),
        ];
        const actionFactory = (setting, settingTarget) => this.getActionsForSetting(setting, settingTarget);
        const emptyActionFactory = (_) => [];
        const extensionRenderer = this._instantiationService.createInstance(SettingsExtensionToggleRenderer, [], emptyActionFactory);
        const settingRenderers = [
            this._instantiationService.createInstance(SettingBoolRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingNumberRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingArrayRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingMultilineTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingExcludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingIncludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingEnumRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingBoolObjectRenderer, this.settingActions, actionFactory),
            extensionRenderer,
        ];
        this.onDidClickOverrideElement = Event.any(...settingRenderers.map((r) => r.onDidClickOverrideElement));
        this.onDidChangeSetting = Event.any(...settingRenderers.map((r) => r.onDidChangeSetting), this._onDidChangeSetting.event);
        this.onDidDismissExtensionSetting = extensionRenderer.onDidDismissExtensionSetting;
        this.onDidOpenSettings = Event.any(...settingRenderers.map((r) => r.onDidOpenSettings));
        this.onDidClickSettingLink = Event.any(...settingRenderers.map((r) => r.onDidClickSettingLink));
        this.onDidFocusSetting = Event.any(...settingRenderers.map((r) => r.onDidFocusSetting));
        this.onDidChangeSettingHeight = Event.any(...settingRenderers.map((r) => r.onDidChangeSettingHeight));
        this.onApplyFilter = Event.any(...settingRenderers.map((r) => r.onApplyFilter));
        this.allRenderers = [
            ...settingRenderers,
            this._instantiationService.createInstance(SettingGroupRenderer),
            this._instantiationService.createInstance(SettingNewExtensionsRenderer),
        ];
    }
    getActionsForSetting(setting, settingTarget) {
        const actions = [];
        if (!(setting.scope && APPLICATION_SCOPES.includes(setting.scope)) &&
            settingTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            actions.push(this._instantiationService.createInstance(ApplySettingToAllProfilesAction, setting));
        }
        if (this._userDataSyncEnablementService.isEnabled() && !setting.disallowSyncIgnore) {
            actions.push(this._instantiationService.createInstance(SyncSettingAction, setting));
        }
        if (actions.length) {
            actions.splice(0, 0, new Separator());
        }
        return actions;
    }
    cancelSuggesters() {
        this._contextViewService.hideContextView();
    }
    showContextMenu(element, settingDOMElement) {
        const toolbarElement = settingDOMElement.querySelector('.monaco-toolbar');
        if (toolbarElement) {
            this._contextMenuService.showContextMenu({
                getActions: () => this.settingActions,
                getAnchor: () => toolbarElement,
                getActionsContext: () => element,
            });
        }
    }
    getSettingDOMElementForDOMElement(domElement) {
        const parent = DOM.findParentWithClass(domElement, AbstractSettingRenderer.CONTENTS_CLASS);
        if (parent) {
            return parent;
        }
        return null;
    }
    getDOMElementsForSettingKey(treeContainer, key) {
        return treeContainer.querySelectorAll(`[${AbstractSettingRenderer.SETTING_KEY_ATTR}="${key}"]`);
    }
    getKeyForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_KEY_ATTR);
    }
    getIdForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_ID_ATTR);
    }
    dispose() {
        super.dispose();
        this.settingActions.forEach((action) => {
            if (isDisposable(action)) {
                action.dispose();
            }
        });
        this.allRenderers.forEach((renderer) => {
            if (isDisposable(renderer)) {
                renderer.dispose();
            }
        });
    }
};
SettingTreeRenderers = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IUserDataSyncEnablementService)
], SettingTreeRenderers);
export { SettingTreeRenderers };
/**
 * Validate and render any error message. Returns true if the value is invalid.
 */
function renderValidations(dataElement, template, calledOnStartup) {
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(template.inputBox.value);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', 'Validation Error.');
            template.inputBox.inputElement.parentElement.setAttribute('aria-label', [validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.inputBox.inputElement.parentElement.removeAttribute('aria-label');
        }
    }
    template.containerElement.classList.remove('invalid-input');
    return false;
}
/**
 * Validate and render any error message for arrays. Returns true if the value is invalid.
 */
function renderArrayValidations(dataElement, template, value, calledOnStartup) {
    template.containerElement.classList.add('invalid-input');
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(value);
        if (errMsg && errMsg !== '') {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', 'Validation Error.');
            template.containerElement.setAttribute('aria-label', [dataElement.setting.key, validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.containerElement.setAttribute('aria-label', dataElement.setting.key);
            template.containerElement.classList.remove('invalid-input');
        }
    }
    return false;
}
function cleanRenderedMarkdown(element) {
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes.item(i);
        const tagName = child.tagName && child.tagName.toLowerCase();
        if (tagName === 'img') {
            child.remove();
        }
        else {
            cleanRenderedMarkdown(child);
        }
    }
}
function fixSettingLinks(text, linkify = true) {
    return text.replace(/`#([^#\s`]+)#`|'#([^#\s']+)#'/g, (match, backticksGroup, quotesGroup) => {
        const settingKey = backticksGroup ?? quotesGroup;
        const targetDisplayFormat = settingKeyToDisplayFormat(settingKey);
        const targetName = `${targetDisplayFormat.category}: ${targetDisplayFormat.label}`;
        return linkify ? `[${targetName}](#${settingKey} "${settingKey}")` : `"${targetName}"`;
    });
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}
let SettingsTreeFilter = class SettingsTreeFilter {
    constructor(viewState, environmentService) {
        this.viewState = viewState;
        this.environmentService = environmentService;
    }
    filter(element, parentVisibility) {
        // Filter during search
        if (this.viewState.filterToCategory && element instanceof SettingsTreeSettingElement) {
            if (!this.settingContainedInGroup(element.setting, this.viewState.filterToCategory)) {
                return false;
            }
        }
        // Non-user scope selected
        if (element instanceof SettingsTreeSettingElement &&
            this.viewState.settingsTarget !== 3 /* ConfigurationTarget.USER_LOCAL */) {
            const isRemote = !!this.environmentService.remoteAuthority;
            if (!element.matchesScope(this.viewState.settingsTarget, isRemote)) {
                return false;
            }
        }
        // Group with no visible children
        if (element instanceof SettingsTreeGroupElement) {
            if (typeof element.count === 'number') {
                return element.count > 0;
            }
            return 2 /* TreeVisibility.Recurse */;
        }
        // Filtered "new extensions" button
        if (element instanceof SettingsTreeNewExtensionsElement) {
            if (this.viewState.tagFilters?.size || this.viewState.filterToCategory) {
                return false;
            }
        }
        return true;
    }
    settingContainedInGroup(setting, group) {
        return group.children.some((child) => {
            if (child instanceof SettingsTreeGroupElement) {
                return this.settingContainedInGroup(setting, child);
            }
            else if (child instanceof SettingsTreeSettingElement) {
                return child.setting.key === setting.key;
            }
            else {
                return false;
            }
        });
    }
};
SettingsTreeFilter = __decorate([
    __param(1, IWorkbenchEnvironmentService)
], SettingsTreeFilter);
export { SettingsTreeFilter };
class SettingsTreeDelegate extends CachedListVirtualDelegate {
    getTemplateId(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return SETTINGS_ELEMENT_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeSettingElement) {
            if (element.valueType === SettingValueType.ExtensionToggle) {
                return SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
            }
            const invalidTypeError = element.isConfigured && getInvalidTypeError(element.value, element.setting.type);
            if (invalidTypeError) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Boolean) {
                return SETTINGS_BOOL_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Integer ||
                element.valueType === SettingValueType.Number ||
                element.valueType === SettingValueType.NullableInteger ||
                element.valueType === SettingValueType.NullableNumber) {
                return SETTINGS_NUMBER_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.MultilineString) {
                return SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.String) {
                return SETTINGS_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Enum) {
                return SETTINGS_ENUM_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Array) {
                return SETTINGS_ARRAY_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Exclude) {
                return SETTINGS_EXCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Include) {
                return SETTINGS_INCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Object) {
                return SETTINGS_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.BooleanObject) {
                return SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.ComplexObject) {
                return SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.LanguageTag) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            return SETTINGS_COMPLEX_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeNewExtensionsElement) {
            return SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
        }
        throw new Error('unknown element type: ' + element);
    }
    hasDynamicHeight(element) {
        return !(element instanceof SettingsTreeGroupElement);
    }
    estimateHeight(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return 42;
        }
        return element instanceof SettingsTreeSettingElement &&
            element.valueType === SettingValueType.Boolean
            ? 78
            : 104;
    }
}
export class NonCollapsibleObjectTreeModel extends ObjectTreeModel {
    isCollapsible(element) {
        return false;
    }
    setCollapsed(element, collapsed, recursive) {
        return false;
    }
}
class SettingsTreeAccessibilityProvider {
    constructor(configurationService, languageService, userDataProfilesService) {
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.userDataProfilesService = userDataProfilesService;
    }
    getAriaLabel(element) {
        if (element instanceof SettingsTreeSettingElement) {
            const ariaLabelSections = [];
            ariaLabelSections.push(`${element.displayCategory} ${element.displayLabel}.`);
            if (element.isConfigured) {
                const modifiedText = localize('settings.Modified', 'Modified.');
                ariaLabelSections.push(modifiedText);
            }
            const indicatorsLabelAriaLabel = getIndicatorsLabelAriaLabel(element, this.configurationService, this.userDataProfilesService, this.languageService);
            if (indicatorsLabelAriaLabel.length) {
                ariaLabelSections.push(`${indicatorsLabelAriaLabel}.`);
            }
            const descriptionWithoutSettingLinks = renderMarkdownAsPlaintext({
                value: fixSettingLinks(element.description, false),
            });
            if (descriptionWithoutSettingLinks.length) {
                ariaLabelSections.push(descriptionWithoutSettingLinks);
            }
            return ariaLabelSections.join(' ');
        }
        else if (element instanceof SettingsTreeGroupElement) {
            return element.label;
        }
        else {
            return element.id;
        }
    }
    getWidgetAriaLabel() {
        return localize('settings', 'Settings');
    }
}
let SettingsTree = class SettingsTree extends WorkbenchObjectTree {
    constructor(container, viewState, renderers, contextKeyService, listService, configurationService, instantiationService, languageService, userDataProfilesService) {
        super('SettingsTree', container, new SettingsTreeDelegate(), renderers, {
            horizontalScrolling: false,
            supportDynamicHeights: true,
            scrollToActiveElement: true,
            identityProvider: {
                getId(e) {
                    return e.id;
                },
            },
            accessibilityProvider: new SettingsTreeAccessibilityProvider(configurationService, languageService, userDataProfilesService),
            styleController: (id) => new DefaultStyleController(domStylesheetsJs.createStyleSheet(container), id),
            filter: instantiationService.createInstance(SettingsTreeFilter, viewState),
            smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling'),
            multipleSelectionSupport: false,
            findWidgetEnabled: false,
            renderIndentGuides: RenderIndentGuides.None,
            transformOptimization: false, // Disable transform optimization #177470
        }, instantiationService, contextKeyService, listService, configurationService);
        this.getHTMLElement().classList.add('settings-editor-tree');
        this.style(getListStyles({
            listBackground: editorBackground,
            listActiveSelectionBackground: editorBackground,
            listActiveSelectionForeground: foreground,
            listFocusAndSelectionBackground: editorBackground,
            listFocusAndSelectionForeground: foreground,
            listFocusBackground: editorBackground,
            listFocusForeground: foreground,
            listHoverForeground: foreground,
            listHoverBackground: editorBackground,
            listHoverOutline: editorBackground,
            listFocusOutline: editorBackground,
            listInactiveSelectionBackground: editorBackground,
            listInactiveSelectionForeground: foreground,
            listInactiveFocusBackground: editorBackground,
            listInactiveFocusOutline: editorBackground,
            treeIndentGuidesStroke: undefined,
            treeInactiveIndentGuidesStroke: undefined,
        }));
        this.disposables.add(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.list.smoothScrolling')) {
                this.updateOptions({
                    smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling'),
                });
            }
        }));
    }
    createModel(user, options) {
        return new NonCollapsibleObjectTreeModel(user, options);
    }
};
SettingsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IWorkbenchConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ILanguageService),
    __param(8, IUserDataProfilesService)
], SettingsTree);
export { SettingsTree };
let CopySettingIdAction = class CopySettingIdAction extends Action {
    static { CopySettingIdAction_1 = this; }
    static { this.ID = 'settings.copySettingId'; }
    static { this.LABEL = localize('copySettingIdLabel', 'Copy Setting ID'); }
    constructor(clipboardService) {
        super(CopySettingIdAction_1.ID, CopySettingIdAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            await this.clipboardService.writeText(context.setting.key);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingIdAction = CopySettingIdAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingIdAction);
let CopySettingAsJSONAction = class CopySettingAsJSONAction extends Action {
    static { CopySettingAsJSONAction_1 = this; }
    static { this.ID = 'settings.copySettingAsJSON'; }
    static { this.LABEL = localize('copySettingAsJSONLabel', 'Copy Setting as JSON'); }
    constructor(clipboardService) {
        super(CopySettingAsJSONAction_1.ID, CopySettingAsJSONAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            const jsonResult = `"${context.setting.key}": ${JSON.stringify(context.value, undefined, '  ')}`;
            await this.clipboardService.writeText(jsonResult);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsJSONAction = CopySettingAsJSONAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingAsJSONAction);
let CopySettingAsURLAction = class CopySettingAsURLAction extends Action {
    static { CopySettingAsURLAction_1 = this; }
    static { this.ID = 'settings.copySettingAsURL'; }
    static { this.LABEL = localize('copySettingAsURLLabel', 'Copy Setting as URL'); }
    constructor(clipboardService, productService) {
        super(CopySettingAsURLAction_1.ID, CopySettingAsURLAction_1.LABEL);
        this.clipboardService = clipboardService;
        this.productService = productService;
    }
    async run(context) {
        if (context) {
            const settingKey = context.setting.key;
            const product = this.productService.urlProtocol;
            const uri = URI.from({ scheme: product, authority: SETTINGS_AUTHORITY, path: `/${settingKey}` }, true);
            await this.clipboardService.writeText(uri.toString());
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsURLAction = CopySettingAsURLAction_1 = __decorate([
    __param(0, IClipboardService),
    __param(1, IProductService)
], CopySettingAsURLAction);
let SyncSettingAction = class SyncSettingAction extends Action {
    static { SyncSettingAction_1 = this; }
    static { this.ID = 'settings.stopSyncingSetting'; }
    static { this.LABEL = localize('stopSyncingSetting', 'Sync This Setting'); }
    constructor(setting, configService) {
        super(SyncSettingAction_1.ID, SyncSettingAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, (e) => e.affectsConfiguration('settingsSync.ignoredSettings'))(() => this.update()));
        this.update();
    }
    async update() {
        const ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this.configService);
        this.checked = !ignoredSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        let currentValue = [...this.configService.getValue('settingsSync.ignoredSettings')];
        currentValue = currentValue.filter((v) => v !== this.setting.key && v !== `-${this.setting.key}`);
        const defaultIgnoredSettings = getDefaultIgnoredSettings();
        const isDefaultIgnored = defaultIgnoredSettings.includes(this.setting.key);
        const askedToSync = !this.checked;
        // If asked to sync, then add only if it is ignored by default
        if (askedToSync && isDefaultIgnored) {
            currentValue.push(`-${this.setting.key}`);
        }
        // If asked not to sync, then add only if it is not ignored by default
        if (!askedToSync && !isDefaultIgnored) {
            currentValue.push(this.setting.key);
        }
        this.configService.updateValue('settingsSync.ignoredSettings', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
        return Promise.resolve(undefined);
    }
};
SyncSettingAction = SyncSettingAction_1 = __decorate([
    __param(1, IConfigurationService)
], SyncSettingAction);
let ApplySettingToAllProfilesAction = class ApplySettingToAllProfilesAction extends Action {
    static { ApplySettingToAllProfilesAction_1 = this; }
    static { this.ID = 'settings.applyToAllProfiles'; }
    static { this.LABEL = localize('applyToAllProfiles', 'Apply Setting to all Profiles'); }
    constructor(setting, configService) {
        super(ApplySettingToAllProfilesAction_1.ID, ApplySettingToAllProfilesAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, (e) => e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING))(() => this.update()));
        this.update();
    }
    update() {
        const allProfilesSettings = this.configService.getValue(APPLY_ALL_PROFILES_SETTING);
        this.checked = allProfilesSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        const value = this.configService.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        if (this.checked) {
            value.splice(value.indexOf(this.setting.key), 1);
        }
        else {
            value.push(this.setting.key);
        }
        const newValue = distinct(value);
        if (this.checked) {
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).application?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        else {
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).userLocal?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
    }
};
ApplySettingToAllProfilesAction = ApplySettingToAllProfilesAction_1 = __decorate([
    __param(1, IWorkbenchConfigurationService)
], ApplySettingToAllProfilesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV4RixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFpQixRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNwRixPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFxQixTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxlQUFlLEVBQUUs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