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
import * as arrays from '../../../../base/common/arrays.js';
import { escapeRegExpCharacters, isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { knownAcronyms, knownTermMappings, tocData } from './settingsLayout.js';
import { ENABLE_EXTENSION_TOGGLE_SETTINGS, ENABLE_LANGUAGE_FILTER, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG, REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG, compareTwoNullableNumbers, } from '../common/preferences.js';
import { SettingMatchType, SettingValueType, } from '../../../services/preferences/common/preferences.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { FOLDER_SCOPES, WORKSPACE_SCOPES, REMOTE_MACHINE_SCOPES, LOCAL_MACHINE_SCOPES, IWorkbenchConfigurationService, APPLICATION_SCOPES, } from '../../../services/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { EditPresentationTypes, Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { USER_LOCAL_AND_REMOTE_SETTINGS } from '../../../../platform/request/common/request.js';
export const ONLINE_SERVICES_SETTING_TAG = 'usesOnlineServices';
export class SettingsTreeElement extends Disposable {
    constructor(_id) {
        super();
        this._tabbable = false;
        this._onDidChangeTabbable = this._register(new Emitter());
        this.onDidChangeTabbable = this._onDidChangeTabbable.event;
        this.id = _id;
    }
    get tabbable() {
        return this._tabbable;
    }
    set tabbable(value) {
        this._tabbable = value;
        this._onDidChangeTabbable.fire();
    }
}
export class SettingsTreeGroupElement extends SettingsTreeElement {
    get children() {
        return this._children;
    }
    set children(newChildren) {
        this._children = newChildren;
        this._childSettingKeys = new Set();
        this._children.forEach((child) => {
            if (child instanceof SettingsTreeSettingElement) {
                this._childSettingKeys.add(child.setting.key);
            }
        });
    }
    constructor(_id, count, label, level, isFirstGroup) {
        super(_id);
        this._childSettingKeys = new Set();
        this._children = [];
        this.count = count;
        this.label = label;
        this.level = level;
        this.isFirstGroup = isFirstGroup;
    }
    /**
     * Returns whether this group contains the given child key (to a depth of 1 only)
     */
    containsSetting(key) {
        return this._childSettingKeys.has(key);
    }
}
export class SettingsTreeNewExtensionsElement extends SettingsTreeElement {
    constructor(_id, extensionIds) {
        super(_id);
        this.extensionIds = extensionIds;
    }
}
export class SettingsTreeSettingElement extends SettingsTreeElement {
    static { this.MAX_DESC_LINES = 20; }
    constructor(setting, parent, settingsTarget, isWorkspaceTrusted, languageFilter, languageService, productService, userDataProfileService, configurationService) {
        super(sanitizeId(parent.id + '_' + setting.key));
        this.settingsTarget = settingsTarget;
        this.isWorkspaceTrusted = isWorkspaceTrusted;
        this.languageFilter = languageFilter;
        this.languageService = languageService;
        this.productService = productService;
        this.userDataProfileService = userDataProfileService;
        this.configurationService = configurationService;
        this._displayCategory = null;
        this._displayLabel = null;
        /**
         * Whether the setting is configured in the selected scope.
         */
        this.isConfigured = false;
        /**
         * Whether the setting requires trusted target
         */
        this.isUntrusted = false;
        /**
         * Whether the setting is under a policy that blocks all changes.
         */
        this.hasPolicyValue = false;
        this.overriddenScopeList = [];
        this.overriddenDefaultsLanguageList = [];
        /**
         * For each language that contributes setting values or default overrides, we can see those values here.
         */
        this.languageOverrideValues = new Map();
        this.setting = setting;
        this.parent = parent;
        // Make sure description and valueType are initialized
        this.initSettingDescription();
        this.initSettingValueType();
    }
    get displayCategory() {
        if (!this._displayCategory) {
            this.initLabels();
        }
        return this._displayCategory;
    }
    get displayLabel() {
        if (!this._displayLabel) {
            this.initLabels();
        }
        return this._displayLabel;
    }
    initLabels() {
        if (this.setting.title) {
            this._displayLabel = this.setting.title;
            this._displayCategory = this.setting.categoryLabel ?? null;
            return;
        }
        const displayKeyFormat = settingKeyToDisplayFormat(this.setting.key, this.parent.id, this.setting.isLanguageTagSetting);
        this._displayLabel = displayKeyFormat.label;
        this._displayCategory = displayKeyFormat.category;
    }
    initSettingDescription() {
        if (this.setting.description.length > SettingsTreeSettingElement.MAX_DESC_LINES) {
            const truncatedDescLines = this.setting.description.slice(0, SettingsTreeSettingElement.MAX_DESC_LINES);
            truncatedDescLines.push('[...]');
            this.description = truncatedDescLines.join('\n');
        }
        else {
            this.description = this.setting.description.join('\n');
        }
    }
    initSettingValueType() {
        if (isExtensionToggleSetting(this.setting, this.productService)) {
            this.valueType = SettingValueType.ExtensionToggle;
        }
        else if (this.setting.enum &&
            (!this.setting.type || settingTypeEnumRenderable(this.setting.type))) {
            this.valueType = SettingValueType.Enum;
        }
        else if (this.setting.type === 'string') {
            if (this.setting.editPresentation === EditPresentationTypes.Multiline) {
                this.valueType = SettingValueType.MultilineString;
            }
            else {
                this.valueType = SettingValueType.String;
            }
        }
        else if (isExcludeSetting(this.setting)) {
            this.valueType = SettingValueType.Exclude;
        }
        else if (isIncludeSetting(this.setting)) {
            this.valueType = SettingValueType.Include;
        }
        else if (this.setting.type === 'integer') {
            this.valueType = SettingValueType.Integer;
        }
        else if (this.setting.type === 'number') {
            this.valueType = SettingValueType.Number;
        }
        else if (this.setting.type === 'boolean') {
            this.valueType = SettingValueType.Boolean;
        }
        else if (this.setting.type === 'array' &&
            this.setting.arrayItemType &&
            ['string', 'enum', 'number', 'integer'].includes(this.setting.arrayItemType)) {
            this.valueType = SettingValueType.Array;
        }
        else if (Array.isArray(this.setting.type) &&
            this.setting.type.includes(SettingValueType.Null) &&
            this.setting.type.length === 2) {
            if (this.setting.type.includes(SettingValueType.Integer)) {
                this.valueType = SettingValueType.NullableInteger;
            }
            else if (this.setting.type.includes(SettingValueType.Number)) {
                this.valueType = SettingValueType.NullableNumber;
            }
            else {
                this.valueType = SettingValueType.Complex;
            }
        }
        else {
            const schemaType = getObjectSettingSchemaType(this.setting);
            if (schemaType) {
                if (this.setting.allKeysAreBoolean) {
                    this.valueType = SettingValueType.BooleanObject;
                }
                else if (schemaType === 'simple') {
                    this.valueType = SettingValueType.Object;
                }
                else {
                    this.valueType = SettingValueType.ComplexObject;
                }
            }
            else if (this.setting.isLanguageTagSetting) {
                this.valueType = SettingValueType.LanguageTag;
            }
            else {
                this.valueType = SettingValueType.Complex;
            }
        }
    }
    inspectSelf() {
        const targetToInspect = this.getTargetToInspect(this.setting);
        const inspectResult = inspectSetting(this.setting.key, targetToInspect, this.languageFilter, this.configurationService);
        this.update(inspectResult, this.isWorkspaceTrusted);
    }
    getTargetToInspect(setting) {
        if (!this.userDataProfileService.currentProfile.isDefault &&
            !this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            if (setting.scope === 1 /* ConfigurationScope.APPLICATION */) {
                return 1 /* ConfigurationTarget.APPLICATION */;
            }
            if (this.configurationService.isSettingAppliedForAllProfiles(setting.key) &&
                this.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
                return 1 /* ConfigurationTarget.APPLICATION */;
            }
        }
        return this.settingsTarget;
    }
    update(inspectResult, isWorkspaceTrusted) {
        let { isConfigured, inspected, targetSelector, inspectedLanguageOverrides, languageSelector } = inspectResult;
        switch (targetSelector) {
            case 'workspaceFolderValue':
            case 'workspaceValue':
                this.isUntrusted = !!this.setting.restricted && !isWorkspaceTrusted;
                break;
        }
        let displayValue = isConfigured ? inspected[targetSelector] : inspected.defaultValue;
        const overriddenScopeList = [];
        const overriddenDefaultsLanguageList = [];
        if ((languageSelector || targetSelector !== 'workspaceValue') &&
            typeof inspected.workspaceValue !== 'undefined') {
            overriddenScopeList.push('workspace:');
        }
        if ((languageSelector || targetSelector !== 'userRemoteValue') &&
            typeof inspected.userRemoteValue !== 'undefined') {
            overriddenScopeList.push('remote:');
        }
        if ((languageSelector || targetSelector !== 'userLocalValue') &&
            typeof inspected.userLocalValue !== 'undefined') {
            overriddenScopeList.push('user:');
        }
        if (inspected.overrideIdentifiers) {
            for (const overrideIdentifier of inspected.overrideIdentifiers) {
                const inspectedOverride = inspectedLanguageOverrides.get(overrideIdentifier);
                if (inspectedOverride) {
                    if (this.languageService.isRegisteredLanguageId(overrideIdentifier)) {
                        if (languageSelector !== overrideIdentifier &&
                            typeof inspectedOverride.default?.override !== 'undefined') {
                            overriddenDefaultsLanguageList.push(overrideIdentifier);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'workspaceValue') &&
                            typeof inspectedOverride.workspace?.override !== 'undefined') {
                            overriddenScopeList.push(`workspace:${overrideIdentifier}`);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'userRemoteValue') &&
                            typeof inspectedOverride.userRemote?.override !== 'undefined') {
                            overriddenScopeList.push(`remote:${overrideIdentifier}`);
                        }
                        if ((languageSelector !== overrideIdentifier || targetSelector !== 'userLocalValue') &&
                            typeof inspectedOverride.userLocal?.override !== 'undefined') {
                            overriddenScopeList.push(`user:${overrideIdentifier}`);
                        }
                    }
                    this.languageOverrideValues.set(overrideIdentifier, inspectedOverride);
                }
            }
        }
        this.overriddenScopeList = overriddenScopeList;
        this.overriddenDefaultsLanguageList = overriddenDefaultsLanguageList;
        // The user might have added, removed, or modified a language filter,
        // so we reset the default value source to the non-language-specific default value source for now.
        this.defaultValueSource = this.setting.nonLanguageSpecificDefaultValueSource;
        if (inspected.policyValue !== undefined) {
            this.hasPolicyValue = true;
            isConfigured = false; // The user did not manually configure the setting themselves.
            displayValue = inspected.policyValue;
            this.scopeValue = inspected.policyValue;
            this.defaultValue = inspected.defaultValue;
        }
        else if (languageSelector && this.languageOverrideValues.has(languageSelector)) {
            const overrideValues = this.languageOverrideValues.get(languageSelector);
            // In the worst case, go back to using the previous display value.
            // Also, sometimes the override is in the form of a default value override, so consider that second.
            displayValue =
                (isConfigured ? overrideValues[targetSelector] : overrideValues.defaultValue) ??
                    displayValue;
            this.scopeValue = isConfigured && overrideValues[targetSelector];
            this.defaultValue = overrideValues.defaultValue ?? inspected.defaultValue;
            const registryValues = Registry.as(Extensions.Configuration).getConfigurationDefaultsOverrides();
            const source = registryValues.get(`[${languageSelector}]`)?.source;
            const overrideValueSource = source instanceof Map ? source.get(this.setting.key) : undefined;
            if (overrideValueSource) {
                this.defaultValueSource = overrideValueSource;
            }
        }
        else {
            this.scopeValue = isConfigured && inspected[targetSelector];
            this.defaultValue = inspected.defaultValue;
        }
        this.value = displayValue;
        this.isConfigured = isConfigured;
        if (isConfigured ||
            this.setting.tags ||
            this.tags ||
            this.setting.restricted ||
            this.hasPolicyValue) {
            // Don't create an empty Set for all 1000 settings, only if needed
            this.tags = new Set();
            if (isConfigured) {
                this.tags.add(MODIFIED_SETTING_TAG);
            }
            this.setting.tags?.forEach((tag) => this.tags.add(tag));
            if (this.setting.restricted) {
                this.tags.add(REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG);
            }
            if (this.hasPolicyValue) {
                this.tags.add(POLICY_SETTING_TAG);
            }
        }
    }
    matchesAllTags(tagFilters) {
        if (!tagFilters?.size) {
            // This setting, which may have tags,
            // matches against a query with no tags.
            return true;
        }
        if (!this.tags) {
            // The setting must inspect itself to get tag information
            // including for the hasPolicy tag.
            this.inspectSelf();
        }
        // Check that the filter tags are a subset of this setting's tags
        return !!this.tags?.size && Array.from(tagFilters).every((tag) => this.tags.has(tag));
    }
    matchesScope(scope, isRemote) {
        const configTarget = URI.isUri(scope) ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : scope;
        if (!this.setting.scope) {
            return true;
        }
        if (configTarget === 1 /* ConfigurationTarget.APPLICATION */) {
            return APPLICATION_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return FOLDER_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            return WORKSPACE_SCOPES.includes(this.setting.scope);
        }
        if (configTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return (REMOTE_MACHINE_SCOPES.includes(this.setting.scope) ||
                USER_LOCAL_AND_REMOTE_SETTINGS.includes(this.setting.key));
        }
        if (configTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            if (isRemote) {
                return (LOCAL_MACHINE_SCOPES.includes(this.setting.scope) ||
                    USER_LOCAL_AND_REMOTE_SETTINGS.includes(this.setting.key));
            }
        }
        return true;
    }
    matchesAnyExtension(extensionFilters) {
        if (!extensionFilters || !extensionFilters.size) {
            return true;
        }
        if (!this.setting.extensionInfo) {
            return false;
        }
        return Array.from(extensionFilters).some((extensionId) => extensionId.toLowerCase() === this.setting.extensionInfo.id.toLowerCase());
    }
    matchesAnyFeature(featureFilters) {
        if (!featureFilters || !featureFilters.size) {
            return true;
        }
        const features = tocData.children.find((child) => child.id === 'features');
        return Array.from(featureFilters).some((filter) => {
            if (features && features.children) {
                const feature = features.children.find((feature) => 'features/' + filter === feature.id);
                if (feature) {
                    const patterns = feature.settings?.map((setting) => createSettingMatchRegExp(setting));
                    return (patterns &&
                        !this.setting.extensionInfo &&
                        patterns.some((pattern) => pattern.test(this.setting.key.toLowerCase())));
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        });
    }
    matchesAnyId(idFilters) {
        if (!idFilters || !idFilters.size) {
            return true;
        }
        return idFilters.has(this.setting.key);
    }
    matchesAllLanguages(languageFilter) {
        if (!languageFilter) {
            // We're not filtering by language.
            return true;
        }
        if (!this.languageService.isRegisteredLanguageId(languageFilter)) {
            // We're trying to filter by an invalid language.
            return false;
        }
        // We have a language filter in the search widget at this point.
        // We decide to show all language overridable settings to make the
        // lang filter act more like a scope filter,
        // rather than adding on an implicit @modified as well.
        if (this.setting.scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
            return true;
        }
        return false;
    }
}
function createSettingMatchRegExp(pattern) {
    pattern = escapeRegExpCharacters(pattern).replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`, 'i');
}
let SettingsTreeModel = class SettingsTreeModel {
    constructor(_viewState, _isWorkspaceTrusted, _configurationService, _languageService, _userDataProfileService, _productService) {
        this._viewState = _viewState;
        this._isWorkspaceTrusted = _isWorkspaceTrusted;
        this._configurationService = _configurationService;
        this._languageService = _languageService;
        this._userDataProfileService = _userDataProfileService;
        this._productService = _productService;
        this._treeElementsBySettingName = new Map();
    }
    get root() {
        return this._root;
    }
    update(newTocRoot = this._tocRoot) {
        this._treeElementsBySettingName.clear();
        const newRoot = this.createSettingsTreeGroupElement(newTocRoot);
        if (newRoot.children[0] instanceof SettingsTreeGroupElement) {
            ;
            newRoot.children[0].isFirstGroup = true;
        }
        if (this._root) {
            this.disposeChildren(this._root.children);
            this._root.children = newRoot.children;
            newRoot.dispose();
        }
        else {
            this._root = newRoot;
        }
    }
    updateWorkspaceTrust(workspaceTrusted) {
        this._isWorkspaceTrusted = workspaceTrusted;
        this.updateRequireTrustedTargetElements();
    }
    disposeChildren(children) {
        for (const child of children) {
            this.disposeChildAndRecurse(child);
        }
    }
    disposeChildAndRecurse(element) {
        if (element instanceof SettingsTreeGroupElement) {
            this.disposeChildren(element.children);
        }
        element.dispose();
    }
    getElementsByName(name) {
        return this._treeElementsBySettingName.get(name) ?? null;
    }
    updateElementsByName(name) {
        if (!this._treeElementsBySettingName.has(name)) {
            return;
        }
        this.reinspectSettings(this._treeElementsBySettingName.get(name));
    }
    updateRequireTrustedTargetElements() {
        this.reinspectSettings([...this._treeElementsBySettingName.values()].flat().filter((s) => s.isUntrusted));
    }
    reinspectSettings(settings) {
        for (const element of settings) {
            element.inspectSelf();
        }
    }
    createSettingsTreeGroupElement(tocEntry, parent) {
        const depth = parent ? this.getDepth(parent) + 1 : 0;
        const element = new SettingsTreeGroupElement(tocEntry.id, undefined, tocEntry.label, depth, false);
        element.parent = parent;
        const children = [];
        if (tocEntry.settings) {
            const settingChildren = tocEntry.settings.map((s) => this.createSettingsTreeSettingElement(s, element));
            for (const child of settingChildren) {
                if (!child.setting.deprecationMessage) {
                    children.push(child);
                }
                else {
                    child.inspectSelf();
                    if (child.isConfigured) {
                        children.push(child);
                    }
                    else {
                        child.dispose();
                    }
                }
            }
        }
        if (tocEntry.children) {
            const groupChildren = tocEntry.children.map((child) => this.createSettingsTreeGroupElement(child, element));
            children.push(...groupChildren);
        }
        element.children = children;
        return element;
    }
    getDepth(element) {
        if (element.parent) {
            return 1 + this.getDepth(element.parent);
        }
        else {
            return 0;
        }
    }
    createSettingsTreeSettingElement(setting, parent) {
        const element = new SettingsTreeSettingElement(setting, parent, this._viewState.settingsTarget, this._isWorkspaceTrusted, this._viewState.languageFilter, this._languageService, this._productService, this._userDataProfileService, this._configurationService);
        const nameElements = this._treeElementsBySettingName.get(setting.key) ?? [];
        nameElements.push(element);
        this._treeElementsBySettingName.set(setting.key, nameElements);
        return element;
    }
    dispose() {
        this._treeElementsBySettingName.clear();
        this.disposeChildAndRecurse(this._root);
    }
};
SettingsTreeModel = __decorate([
    __param(2, IWorkbenchConfigurationService),
    __param(3, ILanguageService),
    __param(4, IUserDataProfileService),
    __param(5, IProductService)
], SettingsTreeModel);
export { SettingsTreeModel };
export function inspectSetting(key, target, languageFilter, configurationService) {
    const inspectOverrides = URI.isUri(target) ? { resource: target } : undefined;
    const inspected = configurationService.inspect(key, inspectOverrides);
    const targetSelector = target === 1 /* ConfigurationTarget.APPLICATION */
        ? 'applicationValue'
        : target === 3 /* ConfigurationTarget.USER_LOCAL */
            ? 'userLocalValue'
            : target === 4 /* ConfigurationTarget.USER_REMOTE */
                ? 'userRemoteValue'
                : target === 5 /* ConfigurationTarget.WORKSPACE */
                    ? 'workspaceValue'
                    : 'workspaceFolderValue';
    const targetOverrideSelector = target === 1 /* ConfigurationTarget.APPLICATION */
        ? 'application'
        : target === 3 /* ConfigurationTarget.USER_LOCAL */
            ? 'userLocal'
            : target === 4 /* ConfigurationTarget.USER_REMOTE */
                ? 'userRemote'
                : target === 5 /* ConfigurationTarget.WORKSPACE */
                    ? 'workspace'
                    : 'workspaceFolder';
    let isConfigured = typeof inspected[targetSelector] !== 'undefined';
    const overrideIdentifiers = inspected.overrideIdentifiers;
    const inspectedLanguageOverrides = new Map();
    // We must reset isConfigured to be false if languageFilter is set, and manually
    // determine whether it can be set to true later.
    if (languageFilter) {
        isConfigured = false;
    }
    if (overrideIdentifiers) {
        // The setting we're looking at has language overrides.
        for (const overrideIdentifier of overrideIdentifiers) {
            inspectedLanguageOverrides.set(overrideIdentifier, configurationService.inspect(key, { overrideIdentifier }));
        }
        // For all language filters, see if there's an override for that filter.
        if (languageFilter) {
            if (inspectedLanguageOverrides.has(languageFilter)) {
                const overrideValue = inspectedLanguageOverrides.get(languageFilter)[targetOverrideSelector]?.override;
                if (typeof overrideValue !== 'undefined') {
                    isConfigured = true;
                }
            }
        }
    }
    return {
        isConfigured,
        inspected,
        targetSelector,
        inspectedLanguageOverrides,
        languageSelector: languageFilter,
    };
}
function sanitizeId(id) {
    return id.replace(/[\.\/]/, '_');
}
export function settingKeyToDisplayFormat(key, groupId = '', isLanguageTagSetting = false) {
    const lastDotIdx = key.lastIndexOf('.');
    let category = '';
    if (lastDotIdx >= 0) {
        category = key.substring(0, lastDotIdx);
        key = key.substring(lastDotIdx + 1);
    }
    groupId = groupId.replace(/\//g, '.');
    category = trimCategoryForGroup(category, groupId);
    category = wordifyKey(category);
    if (isLanguageTagSetting) {
        key = key.replace(/[\[\]]/g, '');
        key = '$(bracket) ' + key;
    }
    const label = wordifyKey(key);
    return { category, label };
}
function wordifyKey(key) {
    key = key
        .replace(/\.([a-z0-9])/g, (_, p1) => ` \u203A ${p1.toUpperCase()}`) // Replace dot with spaced '>'
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Camel case to spacing, fooBar => foo Bar
        .replace(/^[a-z]/g, (match) => match.toUpperCase()) // Upper casing all first letters, foo => Foo
        .replace(/\b\w+\b/g, (match) => {
        // Upper casing known acronyms
        return knownAcronyms.has(match.toLowerCase()) ? match.toUpperCase() : match;
    });
    for (const [k, v] of knownTermMappings) {
        key = key.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
    }
    return key;
}
/**
 * Removes redundant sections of the category label.
 * A redundant section is a section already reflected in the groupId.
 *
 * @param category The category of the specific setting.
 * @param groupId The author + extension ID.
 * @returns The new category label to use.
 */
function trimCategoryForGroup(category, groupId) {
    const doTrim = (forward) => {
        // Remove the Insiders portion if the category doesn't use it.
        if (!/insiders$/i.test(category)) {
            groupId = groupId.replace(/-?insiders$/i, '');
        }
        const parts = groupId.split('.').map((part) => {
            // Remove hyphens, but only if that results in a match with the category.
            if (part.replace(/-/g, '').toLowerCase() === category.toLowerCase()) {
                return part.replace(/-/g, '');
            }
            else {
                return part;
            }
        });
        while (parts.length) {
            const reg = new RegExp(`^${parts.join('\\.')}(\\.|$)`, 'i');
            if (reg.test(category)) {
                return category.replace(reg, '');
            }
            if (forward) {
                parts.pop();
            }
            else {
                parts.shift();
            }
        }
        return null;
    };
    let trimmed = doTrim(true);
    if (trimmed === null) {
        trimmed = doTrim(false);
    }
    if (trimmed === null) {
        trimmed = category;
    }
    return trimmed;
}
function isExtensionToggleSetting(setting, productService) {
    return (ENABLE_EXTENSION_TOGGLE_SETTINGS &&
        !!productService.extensionRecommendations &&
        !!setting.displayExtensionId);
}
function isExcludeSetting(setting) {
    return (setting.key === 'files.exclude' ||
        setting.key === 'search.exclude' ||
        setting.key === 'workbench.localHistory.exclude' ||
        setting.key === 'explorer.autoRevealExclude' ||
        setting.key === 'files.readonlyExclude' ||
        setting.key === 'files.watcherExclude');
}
function isIncludeSetting(setting) {
    return setting.key === 'files.readonlyInclude';
}
// The values of the following settings when a default values has been removed
export function objectSettingSupportsRemoveDefaultValue(key) {
    return key === 'workbench.editor.customLabels.patterns';
}
function isSimpleType(type) {
    return type === 'string' || type === 'boolean' || type === 'integer' || type === 'number';
}
function getObjectRenderableSchemaType(schema, key) {
    const { type } = schema;
    if (Array.isArray(type)) {
        if (objectSettingSupportsRemoveDefaultValue(key) && type.length === 2) {
            if (type.includes('null') &&
                (type.includes('string') ||
                    type.includes('boolean') ||
                    type.includes('integer') ||
                    type.includes('number'))) {
                return 'simple';
            }
        }
        for (const t of type) {
            if (!isSimpleType(t)) {
                return false;
            }
        }
        return 'complex';
    }
    if (isSimpleType(type)) {
        return 'simple';
    }
    if (type === 'array') {
        if (schema.items) {
            const itemSchemas = Array.isArray(schema.items) ? schema.items : [schema.items];
            for (const { type } of itemSchemas) {
                if (Array.isArray(type)) {
                    for (const t of type) {
                        if (!isSimpleType(t)) {
                            return false;
                        }
                    }
                    return 'complex';
                }
                if (!isSimpleType(type)) {
                    return false;
                }
                return 'complex';
            }
        }
        return false;
    }
    return false;
}
function getObjectSettingSchemaType({ key, type, objectProperties, objectPatternProperties, objectAdditionalProperties, }) {
    if (type !== 'object') {
        return false;
    }
    // object can have any shape
    if (isUndefinedOrNull(objectProperties) &&
        isUndefinedOrNull(objectPatternProperties) &&
        isUndefinedOrNull(objectAdditionalProperties)) {
        return false;
    }
    // objectAdditionalProperties allow the setting to have any shape,
    // but if there's a pattern property that handles everything, then every
    // property will match that patternProperty, so we don't need to look at
    // the value of objectAdditionalProperties in that case.
    if ((objectAdditionalProperties === true || objectAdditionalProperties === undefined) &&
        !Object.keys(objectPatternProperties ?? {}).includes('.*')) {
        return false;
    }
    const schemas = [
        ...Object.values(objectProperties ?? {}),
        ...Object.values(objectPatternProperties ?? {}),
    ];
    if (objectAdditionalProperties && typeof objectAdditionalProperties === 'object') {
        schemas.push(objectAdditionalProperties);
    }
    let schemaType = 'simple';
    for (const schema of schemas) {
        for (const subSchema of Array.isArray(schema.anyOf) ? schema.anyOf : [schema]) {
            const subSchemaType = getObjectRenderableSchemaType(subSchema, key);
            if (subSchemaType === false) {
                return false;
            }
            if (subSchemaType === 'complex') {
                schemaType = 'complex';
            }
        }
    }
    return schemaType;
}
function settingTypeEnumRenderable(_type) {
    const enumRenderableSettingTypes = ['string', 'boolean', 'null', 'integer', 'number'];
    const type = Array.isArray(_type) ? _type : [_type];
    return type.every((type) => enumRenderableSettingTypes.includes(type));
}
export var SearchResultIdx;
(function (SearchResultIdx) {
    SearchResultIdx[SearchResultIdx["Local"] = 0] = "Local";
    SearchResultIdx[SearchResultIdx["Remote"] = 1] = "Remote";
    SearchResultIdx[SearchResultIdx["NewExtensions"] = 2] = "NewExtensions";
})(SearchResultIdx || (SearchResultIdx = {}));
let SearchResultModel = class SearchResultModel extends SettingsTreeModel {
    constructor(viewState, settingsOrderByTocIndex, isWorkspaceTrusted, configurationService, environmentService, languageService, userDataProfileService, productService) {
        super(viewState, isWorkspaceTrusted, configurationService, languageService, userDataProfileService, productService);
        this.environmentService = environmentService;
        this.rawSearchResults = null;
        this.cachedUniqueSearchResults = null;
        this.newExtensionSearchResults = null;
        this.searchResultCount = null;
        this.id = 'searchResultModel';
        this.settingsOrderByTocIndex = settingsOrderByTocIndex;
        this.update({ id: 'searchResultModel', label: '' });
    }
    sortResults(filterMatches) {
        if (this.settingsOrderByTocIndex) {
            for (const match of filterMatches) {
                match.setting.internalOrder = this.settingsOrderByTocIndex.get(match.setting.key);
            }
        }
        // The search only has filters, so we can sort by the order in the TOC.
        if (!this._viewState.query) {
            return filterMatches.sort((a, b) => compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder));
        }
        // Sort the settings according to their relevancy.
        // https://github.com/microsoft/vscode/issues/197773
        filterMatches.sort((a, b) => {
            if (a.matchType !== b.matchType) {
                // Sort by match type if the match types are not the same.
                // The priority of the match type is given by the SettingMatchType enum.
                return b.matchType - a.matchType;
            }
            else if (a.matchType & SettingMatchType.NonContiguousWordsInSettingsLabel ||
                a.matchType & SettingMatchType.ContiguousWordsInSettingsLabel) {
                // The match types of a and b are the same and can be sorted by their number of matched words.
                // If those numbers are the same, sort by the order in the table of contents.
                return (b.keyMatchScore - a.keyMatchScore ||
                    compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder));
            }
            else if (a.matchType === SettingMatchType.RemoteMatch) {
                // The match types are the same and are RemoteMatch.
                // Sort by score.
                return b.score - a.score;
            }
            else {
                // The match types are the same but are not RemoteMatch.
                // Sort by their order in the table of contents.
                return compareTwoNullableNumbers(a.setting.internalOrder, b.setting.internalOrder);
            }
        });
        // Remove duplicates, which sometimes occur with settings
        // such as the experimental toggle setting.
        return arrays.distinct(filterMatches, (match) => match.setting.key);
    }
    getUniqueResults() {
        if (this.cachedUniqueSearchResults) {
            return this.cachedUniqueSearchResults;
        }
        if (!this.rawSearchResults) {
            return null;
        }
        let combinedFilterMatches = [];
        const localMatchKeys = new Set();
        const localResult = this.rawSearchResults[0 /* SearchResultIdx.Local */];
        if (localResult) {
            localResult.filterMatches.forEach((m) => localMatchKeys.add(m.setting.key));
            combinedFilterMatches = localResult.filterMatches;
        }
        const remoteResult = this.rawSearchResults[1 /* SearchResultIdx.Remote */];
        if (remoteResult) {
            remoteResult.filterMatches = remoteResult.filterMatches.filter((m) => !localMatchKeys.has(m.setting.key));
            combinedFilterMatches = combinedFilterMatches.concat(remoteResult.filterMatches);
            this.newExtensionSearchResults = this.rawSearchResults[2 /* SearchResultIdx.NewExtensions */];
        }
        combinedFilterMatches = this.sortResults(combinedFilterMatches);
        this.cachedUniqueSearchResults = {
            filterMatches: combinedFilterMatches,
            exactMatch: localResult.exactMatch, // remote results should never have an exact match
        };
        return this.cachedUniqueSearchResults;
    }
    getRawResults() {
        return this.rawSearchResults ?? [];
    }
    setResult(order, result) {
        this.cachedUniqueSearchResults = null;
        this.newExtensionSearchResults = null;
        this.rawSearchResults ??= [];
        if (!result) {
            delete this.rawSearchResults[order];
            return;
        }
        this.rawSearchResults[order] = result;
        this.updateChildren();
    }
    updateChildren() {
        this.update({
            id: 'searchResultModel',
            label: 'searchResultModel',
            settings: this.getFlatSettings(),
        });
        // Save time by filtering children in the search model instead of relying on the tree filter, which still requires heights to be calculated.
        const isRemote = !!this.environmentService.remoteAuthority;
        const newChildren = [];
        for (const child of this.root.children) {
            if (child instanceof SettingsTreeSettingElement &&
                child.matchesAllTags(this._viewState.tagFilters) &&
                child.matchesScope(this._viewState.settingsTarget, isRemote) &&
                child.matchesAnyExtension(this._viewState.extensionFilters) &&
                child.matchesAnyId(this._viewState.idFilters) &&
                child.matchesAnyFeature(this._viewState.featureFilters) &&
                child.matchesAllLanguages(this._viewState.languageFilter)) {
                newChildren.push(child);
            }
            else {
                child.dispose();
            }
        }
        this.root.children = newChildren;
        this.searchResultCount = this.root.children.length;
        if (this.newExtensionSearchResults?.filterMatches.length) {
            let resultExtensionIds = this.newExtensionSearchResults.filterMatches
                .map((result) => result.setting)
                .filter((setting) => setting.extensionName && setting.extensionPublisher)
                .map((setting) => `${setting.extensionPublisher}.${setting.extensionName}`);
            resultExtensionIds = arrays.distinct(resultExtensionIds);
            if (resultExtensionIds.length) {
                const newExtElement = new SettingsTreeNewExtensionsElement('newExtensions', resultExtensionIds);
                newExtElement.parent = this._root;
                this._root.children.push(newExtElement);
            }
        }
    }
    getUniqueResultsCount() {
        return this.searchResultCount ?? 0;
    }
    getFlatSettings() {
        return this.getUniqueResults()?.filterMatches.map((m) => m.setting) ?? [];
    }
};
SearchResultModel = __decorate([
    __param(3, IWorkbenchConfigurationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ILanguageService),
    __param(6, IUserDataProfileService),
    __param(7, IProductService)
], SearchResultModel);
export { SearchResultModel };
const tagRegex = /(^|\s)@tag:("([^"]*)"|[^"]\S*)/g;
const extensionRegex = /(^|\s)@ext:("([^"]*)"|[^"]\S*)?/g;
const featureRegex = /(^|\s)@feature:("([^"]*)"|[^"]\S*)?/g;
const idRegex = /(^|\s)@id:("([^"]*)"|[^"]\S*)?/g;
const languageRegex = /(^|\s)@lang:("([^"]*)"|[^"]\S*)?/g;
export function parseQuery(query) {
    /**
     * A helper function to parse the query on one type of regex.
     *
     * @param query The search query
     * @param filterRegex The regex to use on the query
     * @param parsedParts The parts that the regex parses out will be appended to the array passed in here.
     * @returns The query with the parsed parts removed
     */
    function getTagsForType(query, filterRegex, parsedParts) {
        return query.replace(filterRegex, (_, __, quotedParsedElement, unquotedParsedElement) => {
            const parsedElement = unquotedParsedElement || quotedParsedElement;
            if (parsedElement) {
                parsedParts.push(...parsedElement
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => !isFalsyOrWhitespace(s)));
            }
            return '';
        });
    }
    const tags = [];
    query = query.replace(tagRegex, (_, __, quotedTag, tag) => {
        tags.push(tag || quotedTag);
        return '';
    });
    query = query.replace(`@${MODIFIED_SETTING_TAG}`, () => {
        tags.push(MODIFIED_SETTING_TAG);
        return '';
    });
    query = query.replace(`@${POLICY_SETTING_TAG}`, () => {
        tags.push(POLICY_SETTING_TAG);
        return '';
    });
    const extensions = [];
    const features = [];
    const ids = [];
    const langs = [];
    query = getTagsForType(query, extensionRegex, extensions);
    query = getTagsForType(query, featureRegex, features);
    query = getTagsForType(query, idRegex, ids);
    if (ENABLE_LANGUAGE_FILTER) {
        query = getTagsForType(query, languageRegex, langs);
    }
    query = query.trim();
    // For now, only return the first found language filter
    return {
        tags,
        extensionFilters: extensions,
        featureFilters: features,
        idFilters: ids,
        languageFilter: langs.length ? langs[0] : undefined,
        query,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1RyZWVNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFNcEQsT0FBTyxFQUFhLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMxRixPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLHFDQUFxQyxFQUNyQyx5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBS04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsOEJBQThCLEVBQzlCLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUdO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