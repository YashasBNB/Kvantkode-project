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
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { visit } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, OVERRIDE_PROPERTY_REGEX, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { SettingMatchType, } from './preferences.js';
import { FOLDER_SCOPES, WORKSPACE_SCOPES } from '../../configuration/common/configuration.js';
import { createValidator } from './preferencesValidation.js';
export const nullRange = {
    startLineNumber: -1,
    startColumn: -1,
    endLineNumber: -1,
    endColumn: -1,
};
function isNullRange(range) {
    return (range.startLineNumber === -1 &&
        range.startColumn === -1 &&
        range.endLineNumber === -1 &&
        range.endColumn === -1);
}
class AbstractSettingsModel extends EditorModel {
    constructor() {
        super(...arguments);
        this._currentResultGroups = new Map();
    }
    updateResultGroup(id, resultGroup) {
        if (resultGroup) {
            this._currentResultGroups.set(id, resultGroup);
        }
        else {
            this._currentResultGroups.delete(id);
        }
        this.removeDuplicateResults();
        return this.update();
    }
    /**
     * Remove duplicates between result groups, preferring results in earlier groups
     */
    removeDuplicateResults() {
        const settingKeys = new Set();
        [...this._currentResultGroups.keys()]
            .sort((a, b) => this._currentResultGroups.get(a).order - this._currentResultGroups.get(b).order)
            .forEach((groupId) => {
            const group = this._currentResultGroups.get(groupId);
            group.result.filterMatches = group.result.filterMatches.filter((s) => !settingKeys.has(s.setting.key));
            group.result.filterMatches.forEach((s) => settingKeys.add(s.setting.key));
        });
    }
    filterSettings(filter, groupFilter, settingMatcher) {
        const allGroups = this.filterGroups;
        const filterMatches = [];
        for (const group of allGroups) {
            const groupMatched = groupFilter(group);
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    const settingMatchResult = settingMatcher(setting, group);
                    if (groupMatched || settingMatchResult) {
                        filterMatches.push({
                            setting,
                            matches: settingMatchResult && settingMatchResult.matches,
                            matchType: settingMatchResult?.matchType ?? SettingMatchType.None,
                            keyMatchScore: settingMatchResult?.keyMatchScore ?? 0,
                            score: settingMatchResult?.score ?? 0,
                        });
                    }
                }
            }
        }
        return filterMatches;
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (key === setting.key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    collectMetadata(groups) {
        const metadata = Object.create(null);
        let hasMetadata = false;
        groups.forEach((g) => {
            if (g.result.metadata) {
                metadata[g.id] = g.result.metadata;
                hasMetadata = true;
            }
        });
        return hasMetadata ? metadata : null;
    }
    get filterGroups() {
        return this.settingsGroups;
    }
}
export class SettingsEditorModel extends AbstractSettingsModel {
    constructor(reference, _configurationTarget) {
        super();
        this._configurationTarget = _configurationTarget;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.settingsModel = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
        this._register(this.settingsModel.onDidChangeContent(() => {
            this._settingsGroups = undefined;
            this._onDidChangeGroups.fire();
        }));
    }
    get uri() {
        return this.settingsModel.uri;
    }
    get configurationTarget() {
        return this._configurationTarget;
    }
    get settingsGroups() {
        if (!this._settingsGroups) {
            this.parse();
        }
        return this._settingsGroups;
    }
    get content() {
        return this.settingsModel.getValue();
    }
    isSettingsProperty(property, previousParents) {
        return previousParents.length === 0; // Settings is root
    }
    parse() {
        this._settingsGroups = parse(this.settingsModel, (property, previousParents) => this.isSettingsProperty(property, previousParents));
    }
    update() {
        const resultGroups = [...this._currentResultGroups.values()];
        if (!resultGroups.length) {
            return undefined;
        }
        // Transform resultGroups into IFilterResult - ISetting ranges are already correct here
        const filteredSettings = [];
        const matches = [];
        resultGroups.forEach((group) => {
            group.result.filterMatches.forEach((filterMatch) => {
                filteredSettings.push(filterMatch.setting);
                if (filterMatch.matches) {
                    matches.push(...filterMatch.matches);
                }
            });
        });
        let filteredGroup;
        const modelGroup = this.settingsGroups[0]; // Editable model has one or zero groups
        if (modelGroup) {
            filteredGroup = {
                id: modelGroup.id,
                range: modelGroup.range,
                sections: [
                    {
                        settings: filteredSettings,
                    },
                ],
                title: modelGroup.title,
                titleRange: modelGroup.titleRange,
                order: modelGroup.order,
                extensionInfo: modelGroup.extensionInfo,
            };
        }
        const metadata = this.collectMetadata(resultGroups);
        return {
            allGroups: this.settingsGroups,
            filteredGroups: filteredGroup ? [filteredGroup] : [],
            matches,
            metadata: metadata ?? undefined,
        };
    }
}
let Settings2EditorModel = class Settings2EditorModel extends AbstractSettingsModel {
    constructor(_defaultSettings, configurationService) {
        super();
        this._defaultSettings = _defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this.additionalGroups = [];
        this.dirty = false;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.dirty = true;
                this._onDidChangeGroups.fire();
            }
        }));
        this._register(Registry.as(Extensions.Configuration).onDidSchemaChange((e) => {
            this.dirty = true;
            this._onDidChangeGroups.fire();
        }));
    }
    /** Doesn't include the "Commonly Used" group */
    get filterGroups() {
        return this.settingsGroups.slice(1);
    }
    get settingsGroups() {
        const groups = this._defaultSettings.getSettingsGroups(this.dirty);
        this.dirty = false;
        return [...groups, ...this.additionalGroups];
    }
    /** For programmatically added groups outside of registered configurations */
    setAdditionalGroups(groups) {
        this.additionalGroups = groups;
    }
    update() {
        throw new Error('Not supported');
    }
};
Settings2EditorModel = __decorate([
    __param(1, IConfigurationService)
], Settings2EditorModel);
export { Settings2EditorModel };
function parse(model, isSettingsProperty) {
    const settings = [];
    let overrideSetting = null;
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    let settingsPropertyIndex = -1;
    const range = {
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 0,
    };
    function onValue(value, offset, length) {
        if (Array.isArray(currentParent)) {
            ;
            currentParent.push(value);
        }
        else if (currentProperty) {
            currentParent[currentProperty] = value;
        }
        if (previousParents.length === settingsPropertyIndex + 1 ||
            (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
            // settings value started
            const setting = previousParents.length === settingsPropertyIndex + 1
                ? settings[settings.length - 1]
                : overrideSetting.overrides[overrideSetting.overrides.length - 1];
            if (setting) {
                const valueStartPosition = model.getPositionAt(offset);
                const valueEndPosition = model.getPositionAt(offset + length);
                setting.value = value;
                setting.valueRange = {
                    startLineNumber: valueStartPosition.lineNumber,
                    startColumn: valueStartPosition.column,
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column,
                };
                setting.range = Object.assign(setting.range, {
                    endLineNumber: valueEndPosition.lineNumber,
                    endColumn: valueEndPosition.column,
                });
            }
        }
    }
    const visitor = {
        onObjectBegin: (offset, length) => {
            if (isSettingsProperty(currentProperty, previousParents)) {
                // Settings started
                settingsPropertyIndex = previousParents.length;
                const position = model.getPositionAt(offset);
                range.startLineNumber = position.lineNumber;
                range.startColumn = position.column;
            }
            const object = {};
            onValue(object, offset, length);
            currentParent = object;
            currentProperty = null;
            previousParents.push(currentParent);
        },
        onObjectProperty: (name, offset, length) => {
            currentProperty = name;
            if (previousParents.length === settingsPropertyIndex + 1 ||
                (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting started
                const settingStartPosition = model.getPositionAt(offset);
                const setting = {
                    description: [],
                    descriptionIsMarkdown: false,
                    key: name,
                    keyRange: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column + 1,
                        endLineNumber: settingStartPosition.lineNumber,
                        endColumn: settingStartPosition.column + length,
                    },
                    range: {
                        startLineNumber: settingStartPosition.lineNumber,
                        startColumn: settingStartPosition.column,
                        endLineNumber: 0,
                        endColumn: 0,
                    },
                    value: null,
                    valueRange: nullRange,
                    descriptionRanges: [],
                    overrides: [],
                    overrideOf: overrideSetting ?? undefined,
                };
                if (previousParents.length === settingsPropertyIndex + 1) {
                    settings.push(setting);
                    if (OVERRIDE_PROPERTY_REGEX.test(name)) {
                        overrideSetting = setting;
                    }
                }
                else {
                    overrideSetting.overrides.push(setting);
                }
            }
        },
        onObjectEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (settingsPropertyIndex !== -1 &&
                (previousParents.length === settingsPropertyIndex + 1 ||
                    (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null))) {
                // setting ended
                const setting = previousParents.length === settingsPropertyIndex + 1
                    ? settings[settings.length - 1]
                    : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column,
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column,
                    });
                }
                if (previousParents.length === settingsPropertyIndex + 1) {
                    overrideSetting = null;
                }
            }
            if (previousParents.length === settingsPropertyIndex) {
                // settings ended
                const position = model.getPositionAt(offset);
                range.endLineNumber = position.lineNumber;
                range.endColumn = position.column;
                settingsPropertyIndex = -1;
            }
        },
        onArrayBegin: (offset, length) => {
            const array = [];
            onValue(array, offset, length);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: (offset, length) => {
            currentParent = previousParents.pop();
            if (previousParents.length === settingsPropertyIndex + 1 ||
                (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
                // setting value ended
                const setting = previousParents.length === settingsPropertyIndex + 1
                    ? settings[settings.length - 1]
                    : overrideSetting.overrides[overrideSetting.overrides.length - 1];
                if (setting) {
                    const valueEndPosition = model.getPositionAt(offset + length);
                    setting.valueRange = Object.assign(setting.valueRange, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column,
                    });
                    setting.range = Object.assign(setting.range, {
                        endLineNumber: valueEndPosition.lineNumber,
                        endColumn: valueEndPosition.column,
                    });
                }
            }
        },
        onLiteralValue: onValue,
        onError: (error) => {
            const setting = settings[settings.length - 1];
            if (setting &&
                (isNullRange(setting.range) ||
                    isNullRange(setting.keyRange) ||
                    isNullRange(setting.valueRange))) {
                settings.pop();
            }
        },
    };
    if (!model.isDisposed()) {
        visit(model.getValue(), visitor);
    }
    return settings.length > 0
        ? [
            {
                id: model.isDisposed() ? '' : model.id,
                sections: [
                    {
                        settings,
                    },
                ],
                title: '',
                titleRange: nullRange,
                range,
            },
        ]
        : [];
}
export class WorkspaceConfigurationEditorModel extends SettingsEditorModel {
    constructor() {
        super(...arguments);
        this._configurationGroups = [];
    }
    get configurationGroups() {
        return this._configurationGroups;
    }
    parse() {
        super.parse();
        this._configurationGroups = parse(this.settingsModel, (property, previousParents) => previousParents.length === 0);
    }
    isSettingsProperty(property, previousParents) {
        return property === 'settings' && previousParents.length === 1;
    }
}
export class DefaultSettings extends Disposable {
    constructor(_mostCommonlyUsedSettingsKeys, target, configurationService) {
        super();
        this._mostCommonlyUsedSettingsKeys = _mostCommonlyUsedSettingsKeys;
        this.target = target;
        this.configurationService = configurationService;
        this._settingsByName = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.source === 7 /* ConfigurationTarget.DEFAULT */) {
                this.reset();
                this._onDidChange.fire();
            }
        }));
    }
    getContent(forceUpdate = false) {
        if (!this._content || forceUpdate) {
            this.initialize();
        }
        return this._content;
    }
    getContentWithoutMostCommonlyUsed(forceUpdate = false) {
        if (!this._contentWithoutMostCommonlyUsed || forceUpdate) {
            this.initialize();
        }
        return this._contentWithoutMostCommonlyUsed;
    }
    getSettingsGroups(forceUpdate = false) {
        if (!this._allSettingsGroups || forceUpdate) {
            this.initialize();
        }
        return this._allSettingsGroups;
    }
    initialize() {
        this._allSettingsGroups = this.parse();
        this._content = this.toContent(this._allSettingsGroups, 0);
        this._contentWithoutMostCommonlyUsed = this.toContent(this._allSettingsGroups, 1);
    }
    reset() {
        this._content = undefined;
        this._contentWithoutMostCommonlyUsed = undefined;
        this._allSettingsGroups = undefined;
    }
    parse() {
        const settingsGroups = this.getRegisteredGroups();
        this.initAllSettingsMap(settingsGroups);
        const mostCommonlyUsed = this.getMostCommonlyUsedSettings();
        return [mostCommonlyUsed, ...settingsGroups];
    }
    getRegisteredGroups() {
        const configurations = Registry.as(Extensions.Configuration)
            .getConfigurations()
            .slice();
        const groups = this.removeEmptySettingsGroups(configurations
            .sort(this.compareConfigurationNodes)
            .reduce((result, config, index, array) => this.parseConfig(config, result, array), []));
        return this.sortGroups(groups);
    }
    sortGroups(groups) {
        groups.forEach((group) => {
            group.sections.forEach((section) => {
                section.settings.sort((a, b) => a.key.localeCompare(b.key));
            });
        });
        return groups;
    }
    initAllSettingsMap(allSettingsGroups) {
        this._settingsByName = new Map();
        for (const group of allSettingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this._settingsByName.set(setting.key, setting);
                }
            }
        }
    }
    getMostCommonlyUsedSettings() {
        const settings = coalesce(this._mostCommonlyUsedSettingsKeys.map((key) => {
            const setting = this._settingsByName.get(key);
            if (setting) {
                return {
                    description: setting.description,
                    key: setting.key,
                    value: setting.value,
                    keyRange: nullRange,
                    range: nullRange,
                    valueRange: nullRange,
                    overrides: [],
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                    type: setting.type,
                    enum: setting.enum,
                    enumDescriptions: setting.enumDescriptions,
                    descriptionRanges: [],
                };
            }
            return null;
        }));
        return {
            id: 'mostCommonlyUsed',
            range: nullRange,
            title: nls.localize('commonlyUsed', 'Commonly Used'),
            titleRange: nullRange,
            sections: [
                {
                    settings,
                },
            ],
        };
    }
    parseConfig(config, result, configurations, settingsGroup, seenSettings) {
        seenSettings = seenSettings ? seenSettings : {};
        let title = config.title;
        if (!title) {
            const configWithTitleAndSameId = configurations.find((c) => c.id === config.id && c.title);
            if (configWithTitleAndSameId) {
                title = configWithTitleAndSameId.title;
            }
        }
        if (title) {
            if (!settingsGroup) {
                settingsGroup = result.find((g) => g.title === title && g.extensionInfo?.id === config.extensionInfo?.id);
                if (!settingsGroup) {
                    settingsGroup = {
                        sections: [{ settings: [] }],
                        id: config.id || '',
                        title: title || '',
                        titleRange: nullRange,
                        order: config.order,
                        range: nullRange,
                        extensionInfo: config.extensionInfo,
                    };
                    result.push(settingsGroup);
                }
            }
            else {
                settingsGroup.sections[settingsGroup.sections.length - 1].title = title;
            }
        }
        if (config.properties) {
            if (!settingsGroup) {
                settingsGroup = {
                    sections: [{ settings: [] }],
                    id: config.id || '',
                    title: config.id || '',
                    titleRange: nullRange,
                    order: config.order,
                    range: nullRange,
                    extensionInfo: config.extensionInfo,
                };
                result.push(settingsGroup);
            }
            const configurationSettings = [];
            for (const setting of [
                ...settingsGroup.sections[settingsGroup.sections.length - 1].settings,
                ...this.parseSettings(config),
            ]) {
                if (!seenSettings[setting.key]) {
                    configurationSettings.push(setting);
                    seenSettings[setting.key] = true;
                }
            }
            if (configurationSettings.length) {
                settingsGroup.sections[settingsGroup.sections.length - 1].settings = configurationSettings;
            }
        }
        config.allOf?.forEach((c) => this.parseConfig(c, result, configurations, settingsGroup, seenSettings));
        return result;
    }
    removeEmptySettingsGroups(settingsGroups) {
        const result = [];
        for (const settingsGroup of settingsGroups) {
            settingsGroup.sections = settingsGroup.sections.filter((section) => section.settings.length > 0);
            if (settingsGroup.sections.length) {
                result.push(settingsGroup);
            }
        }
        return result;
    }
    parseSettings(config) {
        const result = [];
        const settingsObject = config.properties;
        const extensionInfo = config.extensionInfo;
        // Try using the title if the category id wasn't given
        // (in which case the category id is the same as the extension id)
        const categoryLabel = config.extensionInfo?.id === config.id ? config.title : config.id;
        for (const key in settingsObject) {
            const prop = settingsObject[key];
            if (this.matchesScope(prop)) {
                const value = prop.default;
                let description = prop.markdownDescription || prop.description || '';
                if (typeof description !== 'string') {
                    description = '';
                }
                const descriptionLines = description.split('\n');
                const overrides = OVERRIDE_PROPERTY_REGEX.test(key)
                    ? this.parseOverrideSettings(prop.default)
                    : [];
                let listItemType;
                if (prop.type === 'array' && prop.items && !Array.isArray(prop.items) && prop.items.type) {
                    if (prop.items.enum) {
                        listItemType = 'enum';
                    }
                    else if (!Array.isArray(prop.items.type)) {
                        listItemType = prop.items.type;
                    }
                }
                const objectProperties = prop.type === 'object' ? prop.properties : undefined;
                const objectPatternProperties = prop.type === 'object' ? prop.patternProperties : undefined;
                const objectAdditionalProperties = prop.type === 'object' ? prop.additionalProperties : undefined;
                let enumToUse = prop.enum;
                let enumDescriptions = prop.markdownEnumDescriptions ?? prop.enumDescriptions;
                let enumDescriptionsAreMarkdown = !!prop.markdownEnumDescriptions;
                if (listItemType === 'enum' && !Array.isArray(prop.items)) {
                    enumToUse = prop.items.enum;
                    enumDescriptions = prop.items.markdownEnumDescriptions ?? prop.items.enumDescriptions;
                    enumDescriptionsAreMarkdown = !!prop.items.markdownEnumDescriptions;
                }
                let allKeysAreBoolean = false;
                if (prop.type === 'object' &&
                    !prop.additionalProperties &&
                    prop.properties &&
                    Object.keys(prop.properties).length) {
                    allKeysAreBoolean = Object.keys(prop.properties).every((key) => {
                        return prop.properties[key].type === 'boolean';
                    });
                }
                let isLanguageTagSetting = false;
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    isLanguageTagSetting = true;
                }
                let defaultValueSource;
                if (!isLanguageTagSetting) {
                    const registeredConfigurationProp = prop;
                    if (registeredConfigurationProp && registeredConfigurationProp.defaultValueSource) {
                        defaultValueSource = registeredConfigurationProp.defaultValueSource;
                    }
                }
                if (!enumToUse &&
                    (prop.enumItemLabels || enumDescriptions || enumDescriptionsAreMarkdown)) {
                    console.error(`The setting ${key} has enum-related fields, but doesn't have an enum field. This setting may render improperly in the Settings editor.`);
                }
                result.push({
                    key,
                    value,
                    description: descriptionLines,
                    descriptionIsMarkdown: !!prop.markdownDescription,
                    range: nullRange,
                    keyRange: nullRange,
                    valueRange: nullRange,
                    descriptionRanges: [],
                    overrides,
                    scope: prop.scope,
                    type: prop.type,
                    arrayItemType: listItemType,
                    objectProperties,
                    objectPatternProperties,
                    objectAdditionalProperties,
                    enum: enumToUse,
                    enumDescriptions: enumDescriptions,
                    enumDescriptionsAreMarkdown: enumDescriptionsAreMarkdown,
                    enumItemLabels: prop.enumItemLabels,
                    uniqueItems: prop.uniqueItems,
                    tags: prop.tags,
                    disallowSyncIgnore: prop.disallowSyncIgnore,
                    restricted: prop.restricted,
                    extensionInfo: extensionInfo,
                    deprecationMessage: prop.markdownDeprecationMessage || prop.deprecationMessage,
                    deprecationMessageIsMarkdown: !!prop.markdownDeprecationMessage,
                    validator: createValidator(prop),
                    allKeysAreBoolean,
                    editPresentation: prop.editPresentation,
                    order: prop.order,
                    nonLanguageSpecificDefaultValueSource: defaultValueSource,
                    isLanguageTagSetting,
                    categoryLabel,
                });
            }
        }
        return result;
    }
    parseOverrideSettings(overrideSettings) {
        return Object.keys(overrideSettings).map((key) => ({
            key,
            value: overrideSettings[key],
            description: [],
            descriptionIsMarkdown: false,
            range: nullRange,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionRanges: [],
            overrides: [],
        }));
    }
    matchesScope(property) {
        if (!property.scope) {
            return true;
        }
        if (this.target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            return FOLDER_SCOPES.indexOf(property.scope) !== -1;
        }
        if (this.target === 5 /* ConfigurationTarget.WORKSPACE */) {
            return WORKSPACE_SCOPES.indexOf(property.scope) !== -1;
        }
        return true;
    }
    compareConfigurationNodes(c1, c2) {
        if (typeof c1.order !== 'number') {
            return 1;
        }
        if (typeof c2.order !== 'number') {
            return -1;
        }
        if (c1.order === c2.order) {
            const title1 = c1.title || '';
            const title2 = c2.title || '';
            return title1.localeCompare(title2);
        }
        return c1.order - c2.order;
    }
    toContent(settingsGroups, startIndex) {
        const builder = new SettingsContentBuilder();
        for (let i = startIndex; i < settingsGroups.length; i++) {
            builder.pushGroup(settingsGroups[i], i === startIndex, i === settingsGroups.length - 1);
        }
        return builder.getContent();
    }
}
export class DefaultSettingsEditorModel extends AbstractSettingsModel {
    constructor(_uri, reference, defaultSettings) {
        super();
        this._uri = _uri;
        this.defaultSettings = defaultSettings;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this._register(defaultSettings.onDidChange(() => this._onDidChangeGroups.fire()));
        this._model = reference.object.textEditorModel;
        this._register(this.onWillDispose(() => reference.dispose()));
    }
    get uri() {
        return this._uri;
    }
    get target() {
        return this.defaultSettings.target;
    }
    get settingsGroups() {
        return this.defaultSettings.getSettingsGroups();
    }
    get filterGroups() {
        // Don't look at "commonly used" for filter
        return this.settingsGroups.slice(1);
    }
    update() {
        if (this._model.isDisposed()) {
            return undefined;
        }
        // Grab current result groups, only render non-empty groups
        const resultGroups = [...this._currentResultGroups.values()].sort((a, b) => a.order - b.order);
        const nonEmptyResultGroups = resultGroups.filter((group) => group.result.filterMatches.length);
        const startLine = this.settingsGroups.at(-1).range.endLineNumber + 2;
        const { settingsGroups: filteredGroups, matches } = this.writeResultGroups(nonEmptyResultGroups, startLine);
        const metadata = this.collectMetadata(resultGroups);
        return resultGroups.length
            ? {
                allGroups: this.settingsGroups,
                filteredGroups,
                matches,
                metadata: metadata ?? undefined,
            }
            : undefined;
    }
    /**
     * Translate the ISearchResultGroups to text, and write it to the editor model
     */
    writeResultGroups(groups, startLine) {
        const contentBuilderOffset = startLine - 1;
        const builder = new SettingsContentBuilder(contentBuilderOffset);
        const settingsGroups = [];
        const matches = [];
        if (groups.length) {
            builder.pushLine(',');
            groups.forEach((resultGroup) => {
                const settingsGroup = this.getGroup(resultGroup);
                settingsGroups.push(settingsGroup);
                matches.push(...this.writeSettingsGroupToBuilder(builder, settingsGroup, resultGroup.result.filterMatches));
            });
        }
        // note: 1-indexed line numbers here
        const groupContent = builder.getContent() + '\n';
        const groupEndLine = this._model.getLineCount();
        const cursorPosition = new Selection(startLine, 1, startLine, 1);
        const edit = {
            text: groupContent,
            forceMoveMarkers: true,
            range: new Range(startLine, 1, groupEndLine, 1),
        };
        this._model.pushEditOperations([cursorPosition], [edit], () => [cursorPosition]);
        // Force tokenization now - otherwise it may be slightly delayed, causing a flash of white text
        const tokenizeTo = Math.min(startLine + 60, this._model.getLineCount());
        this._model.tokenization.forceTokenization(tokenizeTo);
        return { matches, settingsGroups };
    }
    writeSettingsGroupToBuilder(builder, settingsGroup, filterMatches) {
        filterMatches = filterMatches.map((filteredMatch) => {
            // Fix match ranges to offset from setting start line
            return {
                setting: filteredMatch.setting,
                score: filteredMatch.score,
                matchType: filteredMatch.matchType,
                keyMatchScore: filteredMatch.keyMatchScore,
                matches: filteredMatch.matches &&
                    filteredMatch.matches.map((match) => {
                        return new Range(match.startLineNumber - filteredMatch.setting.range.startLineNumber, match.startColumn, match.endLineNumber - filteredMatch.setting.range.startLineNumber, match.endColumn);
                    }),
            };
        });
        builder.pushGroup(settingsGroup);
        // builder has rewritten settings ranges, fix match ranges
        const fixedMatches = filterMatches
            .map((m) => m.matches || [])
            .flatMap((settingMatches, i) => {
            const setting = settingsGroup.sections[0].settings[i];
            return settingMatches.map((range) => {
                return new Range(range.startLineNumber + setting.range.startLineNumber, range.startColumn, range.endLineNumber + setting.range.startLineNumber, range.endColumn);
            });
        });
        return fixedMatches;
    }
    copySetting(setting) {
        return {
            description: setting.description,
            scope: setting.scope,
            type: setting.type,
            enum: setting.enum,
            enumDescriptions: setting.enumDescriptions,
            key: setting.key,
            value: setting.value,
            range: setting.range,
            overrides: [],
            overrideOf: setting.overrideOf,
            tags: setting.tags,
            deprecationMessage: setting.deprecationMessage,
            keyRange: nullRange,
            valueRange: nullRange,
            descriptionIsMarkdown: undefined,
            descriptionRanges: [],
        };
    }
    getPreference(key) {
        for (const group of this.settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (setting.key === key) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    getGroup(resultGroup) {
        return {
            id: resultGroup.id,
            range: nullRange,
            title: resultGroup.label,
            titleRange: nullRange,
            sections: [
                {
                    settings: resultGroup.result.filterMatches.map((m) => this.copySetting(m.setting)),
                },
            ],
        };
    }
}
class SettingsContentBuilder {
    get lineCountWithOffset() {
        return this._contentByLines.length + this._rangeOffset;
    }
    get lastLine() {
        return this._contentByLines[this._contentByLines.length - 1] || '';
    }
    constructor(_rangeOffset = 0) {
        this._rangeOffset = _rangeOffset;
        this._contentByLines = [];
    }
    pushLine(...lineText) {
        this._contentByLines.push(...lineText);
    }
    pushGroup(settingsGroups, isFirst, isLast) {
        this._contentByLines.push(isFirst ? '[{' : '{');
        const lastSetting = this._pushGroup(settingsGroups, '  ');
        if (lastSetting) {
            // Strip the comma from the last setting
            const lineIdx = lastSetting.range.endLineNumber - this._rangeOffset;
            const content = this._contentByLines[lineIdx - 2];
            this._contentByLines[lineIdx - 2] = content.substring(0, content.length - 1);
        }
        this._contentByLines.push(isLast ? '}]' : '},');
    }
    _pushGroup(group, indent) {
        let lastSetting = null;
        const groupStart = this.lineCountWithOffset + 1;
        for (const section of group.sections) {
            if (section.title) {
                const sectionTitleStart = this.lineCountWithOffset + 1;
                this.addDescription([section.title], indent, this._contentByLines);
                section.titleRange = {
                    startLineNumber: sectionTitleStart,
                    startColumn: 1,
                    endLineNumber: this.lineCountWithOffset,
                    endColumn: this.lastLine.length,
                };
            }
            if (section.settings.length) {
                for (const setting of section.settings) {
                    this.pushSetting(setting, indent);
                    lastSetting = setting;
                }
            }
        }
        group.range = {
            startLineNumber: groupStart,
            startColumn: 1,
            endLineNumber: this.lineCountWithOffset,
            endColumn: this.lastLine.length,
        };
        return lastSetting;
    }
    getContent() {
        return this._contentByLines.join('\n');
    }
    pushSetting(setting, indent) {
        const settingStart = this.lineCountWithOffset + 1;
        this.pushSettingDescription(setting, indent);
        let preValueContent = indent;
        const keyString = JSON.stringify(setting.key);
        preValueContent += keyString;
        setting.keyRange = {
            startLineNumber: this.lineCountWithOffset + 1,
            startColumn: preValueContent.indexOf(setting.key) + 1,
            endLineNumber: this.lineCountWithOffset + 1,
            endColumn: setting.key.length,
        };
        preValueContent += ': ';
        const valueStart = this.lineCountWithOffset + 1;
        this.pushValue(setting, preValueContent, indent);
        setting.valueRange = {
            startLineNumber: valueStart,
            startColumn: preValueContent.length + 1,
            endLineNumber: this.lineCountWithOffset,
            endColumn: this.lastLine.length + 1,
        };
        this._contentByLines[this._contentByLines.length - 1] += ',';
        this._contentByLines.push('');
        setting.range = {
            startLineNumber: settingStart,
            startColumn: 1,
            endLineNumber: this.lineCountWithOffset,
            endColumn: this.lastLine.length,
        };
    }
    pushSettingDescription(setting, indent) {
        const fixSettingLink = (line) => line.replace(/`#(.*)#`/g, (match, settingName) => `\`${settingName}\``);
        setting.descriptionRanges = [];
        const descriptionPreValue = indent + '// ';
        const deprecationMessageLines = setting.deprecationMessage?.split(/\n/g) ?? [];
        for (let line of [...deprecationMessageLines, ...setting.description]) {
            line = fixSettingLink(line);
            this._contentByLines.push(descriptionPreValue + line);
            setting.descriptionRanges.push({
                startLineNumber: this.lineCountWithOffset,
                startColumn: this.lastLine.indexOf(line) + 1,
                endLineNumber: this.lineCountWithOffset,
                endColumn: this.lastLine.length,
            });
        }
        if (setting.enum && setting.enumDescriptions?.some((desc) => !!desc)) {
            setting.enumDescriptions.forEach((desc, i) => {
                const displayEnum = escapeInvisibleChars(String(setting.enum[i]));
                const line = desc ? `${displayEnum}: ${fixSettingLink(desc)}` : displayEnum;
                const lines = line.split(/\n/g);
                lines[0] = ' - ' + lines[0];
                this._contentByLines.push(...lines.map((l) => `${indent}// ${l}`));
                setting.descriptionRanges.push({
                    startLineNumber: this.lineCountWithOffset,
                    startColumn: this.lastLine.indexOf(line) + 1,
                    endLineNumber: this.lineCountWithOffset,
                    endColumn: this.lastLine.length,
                });
            });
        }
    }
    pushValue(setting, preValueConent, indent) {
        const valueString = JSON.stringify(setting.value, null, indent);
        if (valueString && typeof setting.value === 'object') {
            if (setting.overrides && setting.overrides.length) {
                this._contentByLines.push(preValueConent + ' {');
                for (const subSetting of setting.overrides) {
                    this.pushSetting(subSetting, indent + indent);
                    this._contentByLines.pop();
                }
                const lastSetting = setting.overrides[setting.overrides.length - 1];
                const content = this._contentByLines[lastSetting.range.endLineNumber - 2];
                this._contentByLines[lastSetting.range.endLineNumber - 2] = content.substring(0, content.length - 1);
                this._contentByLines.push(indent + '}');
            }
            else {
                const mulitLineValue = valueString.split('\n');
                this._contentByLines.push(preValueConent + mulitLineValue[0]);
                for (let i = 1; i < mulitLineValue.length; i++) {
                    this._contentByLines.push(indent + mulitLineValue[i]);
                }
            }
        }
        else {
            this._contentByLines.push(preValueConent + valueString);
        }
    }
    addDescription(description, indent, result) {
        for (const line of description) {
            result.push(indent + '// ' + line);
        }
    }
}
class RawSettingsContentBuilder extends SettingsContentBuilder {
    constructor(indent = '\t') {
        super(0);
        this.indent = indent;
    }
    pushGroup(settingsGroups) {
        this._pushGroup(settingsGroups, this.indent);
    }
}
export class DefaultRawSettingsEditorModel extends Disposable {
    constructor(defaultSettings) {
        super();
        this.defaultSettings = defaultSettings;
        this._content = null;
        this._onDidContentChanged = this._register(new Emitter());
        this.onDidContentChanged = this._onDidContentChanged.event;
        this._register(defaultSettings.onDidChange(() => {
            this._content = null;
            this._onDidContentChanged.fire();
        }));
    }
    get content() {
        if (this._content === null) {
            const builder = new RawSettingsContentBuilder();
            builder.pushLine('{');
            for (const settingsGroup of this.defaultSettings.getRegisteredGroups()) {
                builder.pushGroup(settingsGroup);
            }
            builder.pushLine('}');
            this._content = builder.getContent();
        }
        return this._content;
    }
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}
export function defaultKeybindingsContents(keybindingService) {
    const defaultsHeader = '// ' +
        nls.localize('defaultKeybindingsHeader', 'Override key bindings by placing them into your key bindings file.');
    return defaultsHeader + '\n' + keybindingService.getDefaultKeybindingsContent();
}
let DefaultKeybindingsEditorModel = class DefaultKeybindingsEditorModel {
    constructor(_uri, keybindingService) {
        this._uri = _uri;
        this.keybindingService = keybindingService;
    }
    get uri() {
        return this._uri;
    }
    get content() {
        if (!this._content) {
            this._content = defaultKeybindingsContents(this.keybindingService);
        }
        return this._content;
    }
    getPreference() {
        return null;
    }
    dispose() {
        // Not disposable
    }
};
DefaultKeybindingsEditorModel = __decorate([
    __param(1, IKeybindingService)
], DefaultKeybindingsEditorModel);
export { DefaultKeybindingsEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXNNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBRTdFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFJdkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUdOLFVBQVUsRUFLVix1QkFBdUIsR0FDdkIsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFXTixnQkFBZ0IsR0FDaEIsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTVELE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBVztJQUNoQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQ25CLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDZixhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ2pCLFNBQVMsRUFBRSxDQUFDLENBQUM7Q0FDYixDQUFBO0FBQ0QsU0FBUyxXQUFXLENBQUMsS0FBYTtJQUNqQyxPQUFPLENBQ04sS0FBSyxDQUFDLGVBQWUsS0FBSyxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUM7UUFDeEIsS0FBSyxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUM7UUFDMUIsS0FBSyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FDdEIsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFlLHFCQUFzQixTQUFRLFdBQVc7SUFBeEQ7O1FBQ1cseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUE7SUFvR3ZFLENBQUM7SUFsR0EsaUJBQWlCLENBQ2hCLEVBQVUsRUFDVixXQUEyQztRQUUzQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDN0IsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssc0JBQXNCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFVLENBQ3BDO1FBQUEsQ0FBQyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNwQyxJQUFJLENBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FDM0Y7YUFDQSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFBO1lBQ3JELEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FDN0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUN0QyxDQUFBO1lBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxjQUFjLENBQ2IsTUFBYyxFQUNkLFdBQXlCLEVBQ3pCLGNBQStCO1FBRS9CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7UUFFbkMsTUFBTSxhQUFhLEdBQW9CLEVBQUUsQ0FBQTtRQUN6QyxLQUFLLE1BQU0sS0FBSyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN2QyxLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFFekQsSUFBSSxZQUFZLElBQUksa0JBQWtCLEVBQUUsQ0FBQzt3QkFDeEMsYUFBYSxDQUFDLElBQUksQ0FBQzs0QkFDbEIsT0FBTzs0QkFDUCxPQUFPLEVBQUUsa0JBQWtCLElBQUksa0JBQWtCLENBQUMsT0FBTzs0QkFDekQsU0FBUyxFQUFFLGtCQUFrQixFQUFFLFNBQVMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJOzRCQUNqRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxJQUFJLENBQUM7NEJBQ3JELEtBQUssRUFBRSxrQkFBa0IsRUFBRSxLQUFLLElBQUksQ0FBQzt5QkFDckMsQ0FBQyxDQUFBO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQztJQUVELGFBQWEsQ0FBQyxHQUFXO1FBQ3hCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pDLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN0QyxLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxHQUFHLEtBQUssT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUN6QixPQUFPLE9BQU8sQ0FBQTtvQkFDZixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFUyxlQUFlLENBQ3hCLE1BQTRCO1FBRTVCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3ZCLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7Z0JBQ2xDLFdBQVcsR0FBRyxJQUFJLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFjLFlBQVk7UUFDekIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7Q0FLRDtBQUVELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxxQkFBcUI7SUFPN0QsWUFDQyxTQUF1QyxFQUMvQixvQkFBeUM7UUFFakQsS0FBSyxFQUFFLENBQUE7UUFGQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXFCO1FBTGpDLHVCQUFrQixHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMvRSxzQkFBaUIsR0FBZ0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQU90RSxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZ0IsQ0FBQTtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMvQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUE7SUFDOUIsQ0FBQztJQUVELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFUyxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGVBQXlCO1FBQ3ZFLE9BQU8sZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUEsQ0FBQyxtQkFBbUI7SUFDeEQsQ0FBQztJQUVTLEtBQUs7UUFDZCxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FDM0IsSUFBSSxDQUFDLGFBQWEsRUFDbEIsQ0FBQyxRQUFnQixFQUFFLGVBQXlCLEVBQVcsRUFBRSxDQUN4RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVTLE1BQU07UUFDZixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsdUZBQXVGO1FBQ3ZGLE1BQU0sZ0JBQWdCLEdBQWUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtRQUM1QixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ2xELGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzFDLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksYUFBeUMsQ0FBQTtRQUM3QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsd0NBQXdDO1FBQ2xGLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsYUFBYSxHQUFHO2dCQUNmLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRTtnQkFDakIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO2dCQUN2QixRQUFRLEVBQUU7b0JBQ1Q7d0JBQ0MsUUFBUSxFQUFFLGdCQUFnQjtxQkFDMUI7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO2dCQUN2QixVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVU7Z0JBQ2pDLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztnQkFDdkIsYUFBYSxFQUFFLFVBQVUsQ0FBQyxhQUFhO2FBQ3ZDLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRCxPQUFPO1lBQ04sU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQzlCLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsT0FBTztZQUNQLFFBQVEsRUFBRSxRQUFRLElBQUksU0FBUztTQUMvQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRU0sSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxxQkFBcUI7SUFPOUQsWUFDUyxnQkFBaUMsRUFDbEIsb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBSEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFpQjtRQVB6Qix1QkFBa0IsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0Usc0JBQWlCLEdBQWdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFFL0QscUJBQWdCLEdBQXFCLEVBQUUsQ0FBQTtRQUN2QyxVQUFLLEdBQUcsS0FBSyxDQUFBO1FBUXBCLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxNQUFNLHdDQUFnQyxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO2dCQUNqQixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JGLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMvQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxJQUF1QixZQUFZO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLE9BQU8sQ0FBQyxHQUFHLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCw2RUFBNkU7SUFDN0UsbUJBQW1CLENBQUMsTUFBd0I7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQTtJQUMvQixDQUFDO0lBRVMsTUFBTTtRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztDQUNELENBQUE7QUFoRFksb0JBQW9CO0lBUzlCLFdBQUEscUJBQXFCLENBQUE7R0FUWCxvQkFBb0IsQ0FnRGhDOztBQUVELFNBQVMsS0FBSyxDQUNiLEtBQWlCLEVBQ2pCLGtCQUFtRjtJQUVuRixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7SUFDL0IsSUFBSSxlQUFlLEdBQW9CLElBQUksQ0FBQTtJQUUzQyxJQUFJLGVBQWUsR0FBa0IsSUFBSSxDQUFBO0lBQ3pDLElBQUksYUFBYSxHQUFRLEVBQUUsQ0FBQTtJQUMzQixNQUFNLGVBQWUsR0FBVSxFQUFFLENBQUE7SUFDakMsSUFBSSxxQkFBcUIsR0FBVyxDQUFDLENBQUMsQ0FBQTtJQUN0QyxNQUFNLEtBQUssR0FBRztRQUNiLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLFdBQVcsRUFBRSxDQUFDO1FBQ2QsYUFBYSxFQUFFLENBQUM7UUFDaEIsU0FBUyxFQUFFLENBQUM7S0FDWixDQUFBO0lBRUQsU0FBUyxPQUFPLENBQUMsS0FBVSxFQUFFLE1BQWMsRUFBRSxNQUFjO1FBQzFELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFBUSxhQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLENBQUM7YUFBTSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzVCLGFBQWEsQ0FBQyxlQUFlLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDdkMsQ0FBQztRQUNELElBQ0MsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDO1lBQ3BELENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLElBQUksZUFBZSxLQUFLLElBQUksQ0FBQyxFQUNqRixDQUFDO1lBQ0YseUJBQXlCO1lBQ3pCLE1BQU0sT0FBTyxHQUNaLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQztnQkFDbkQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLGVBQWdCLENBQUMsU0FBVSxDQUFDLGVBQWdCLENBQUMsU0FBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN2RSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdEQsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQTtnQkFDN0QsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7Z0JBQ3JCLE9BQU8sQ0FBQyxVQUFVLEdBQUc7b0JBQ3BCLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxVQUFVO29CQUM5QyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsTUFBTTtvQkFDdEMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7b0JBQzFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO2lCQUNsQyxDQUFBO2dCQUNELE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO29CQUM1QyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsVUFBVTtvQkFDMUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLE1BQU07aUJBQ2xDLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUFnQjtRQUM1QixhQUFhLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDakQsSUFBSSxrQkFBa0IsQ0FBQyxlQUFnQixFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELG1CQUFtQjtnQkFDbkIscUJBQXFCLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQTtnQkFDOUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO2dCQUMzQyxLQUFLLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7WUFDcEMsQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQTtZQUNqQixPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMvQixhQUFhLEdBQUcsTUFBTSxDQUFBO1lBQ3RCLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFZLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQ2xFLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsSUFDQyxlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7Z0JBQ3BELENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLElBQUksZUFBZSxLQUFLLElBQUksQ0FBQyxFQUNqRixDQUFDO2dCQUNGLGtCQUFrQjtnQkFDbEIsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN4RCxNQUFNLE9BQU8sR0FBYTtvQkFDekIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YscUJBQXFCLEVBQUUsS0FBSztvQkFDNUIsR0FBRyxFQUFFLElBQUk7b0JBQ1QsUUFBUSxFQUFFO3dCQUNULGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVO3dCQUNoRCxXQUFXLEVBQUUsb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUM7d0JBQzVDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVO3dCQUM5QyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsTUFBTSxHQUFHLE1BQU07cUJBQy9DO29CQUNELEtBQUssRUFBRTt3QkFDTixlQUFlLEVBQUUsb0JBQW9CLENBQUMsVUFBVTt3QkFDaEQsV0FBVyxFQUFFLG9CQUFvQixDQUFDLE1BQU07d0JBQ3hDLGFBQWEsRUFBRSxDQUFDO3dCQUNoQixTQUFTLEVBQUUsQ0FBQztxQkFDWjtvQkFDRCxLQUFLLEVBQUUsSUFBSTtvQkFDWCxVQUFVLEVBQUUsU0FBUztvQkFDckIsaUJBQWlCLEVBQUUsRUFBRTtvQkFDckIsU0FBUyxFQUFFLEVBQUU7b0JBQ2IsVUFBVSxFQUFFLGVBQWUsSUFBSSxTQUFTO2lCQUN4QyxDQUFBO2dCQUNELElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDdEIsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDeEMsZUFBZSxHQUFHLE9BQU8sQ0FBQTtvQkFDMUIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsZUFBZ0IsQ0FBQyxTQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxXQUFXLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDL0MsYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNyQyxJQUNDLHFCQUFxQixLQUFLLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7b0JBQ3BELENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLElBQUksZUFBZSxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQ25GLENBQUM7Z0JBQ0YsZ0JBQWdCO2dCQUNoQixNQUFNLE9BQU8sR0FDWixlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7b0JBQ25ELENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQy9CLENBQUMsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZFLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQTtvQkFDN0QsT0FBTyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7d0JBQ3RELGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVO3dCQUMxQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsTUFBTTtxQkFDbEMsQ0FBQyxDQUFBO29CQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO3dCQUM1QyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsVUFBVTt3QkFDMUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLE1BQU07cUJBQ2xDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsZUFBZSxHQUFHLElBQUksQ0FBQTtnQkFDdkIsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztnQkFDdEQsaUJBQWlCO2dCQUNqQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM1QyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7Z0JBQ3pDLEtBQUssQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtnQkFDakMscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFDRCxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDaEQsTUFBTSxLQUFLLEdBQVUsRUFBRSxDQUFBO1lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzlCLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDbkMsYUFBYSxHQUFHLEtBQUssQ0FBQTtZQUNyQixlQUFlLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxVQUFVLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDOUMsYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNyQyxJQUNDLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQztnQkFDcEQsQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUMsSUFBSSxlQUFlLEtBQUssSUFBSSxDQUFDLEVBQ2pGLENBQUM7Z0JBQ0Ysc0JBQXNCO2dCQUN0QixNQUFNLE9BQU8sR0FDWixlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7b0JBQ25ELENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQy9CLENBQUMsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZFLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQTtvQkFDN0QsT0FBTyxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7d0JBQ3RELGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVO3dCQUMxQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsTUFBTTtxQkFDbEMsQ0FBQyxDQUFBO29CQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO3dCQUM1QyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsVUFBVTt3QkFDMUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLE1BQU07cUJBQ2xDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxjQUFjLEVBQUUsT0FBTztRQUN2QixPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNsQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUM3QyxJQUNDLE9BQU87Z0JBQ1AsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztvQkFDMUIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7b0JBQzdCLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsRUFDaEMsQ0FBQztnQkFDRixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUE7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDekIsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDekIsQ0FBQyxDQUFDO1lBQ0E7Z0JBQ0MsRUFBRSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDdEMsUUFBUSxFQUFFO29CQUNUO3dCQUNDLFFBQVE7cUJBQ1I7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLEtBQUs7YUFDb0I7U0FDMUI7UUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO0FBQ04sQ0FBQztBQUVELE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxtQkFBbUI7SUFBMUU7O1FBQ1MseUJBQW9CLEdBQXFCLEVBQUUsQ0FBQTtJQWlCcEQsQ0FBQztJQWZBLElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFa0IsS0FBSztRQUN2QixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUNoQyxJQUFJLENBQUMsYUFBYSxFQUNsQixDQUFDLFFBQWdCLEVBQUUsZUFBeUIsRUFBVyxFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQ3RGLENBQUE7SUFDRixDQUFDO0lBRWtCLGtCQUFrQixDQUFDLFFBQWdCLEVBQUUsZUFBeUI7UUFDaEYsT0FBTyxRQUFRLEtBQUssVUFBVSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFTOUMsWUFDUyw2QkFBdUMsRUFDdEMsTUFBMkIsRUFDM0Isb0JBQTJDO1FBRXBELEtBQUssRUFBRSxDQUFBO1FBSkMsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFVO1FBQ3RDLFdBQU0sR0FBTixNQUFNLENBQXFCO1FBQzNCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFSN0Msb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUVwQyxpQkFBWSxHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN6RSxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQVExRCxJQUFJLENBQUMsU0FBUyxDQUNiLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxDQUFDLENBQUMsTUFBTSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsV0FBVyxHQUFHLEtBQUs7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksV0FBVyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELGlDQUFpQyxDQUFDLFdBQVcsR0FBRyxLQUFLO1FBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLElBQUksV0FBVyxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQywrQkFBZ0MsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsaUJBQWlCLENBQUMsV0FBVyxHQUFHLEtBQUs7UUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFTyxVQUFVO1FBQ2pCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVPLEtBQUs7UUFDWixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQTtRQUN6QixJQUFJLENBQUMsK0JBQStCLEdBQUcsU0FBUyxDQUFBO1FBQ2hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUE7SUFDcEMsQ0FBQztJQUVPLEtBQUs7UUFDWixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtRQUMzRCxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxjQUFjLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUM7YUFDbEYsaUJBQWlCLEVBQUU7YUFDbkIsS0FBSyxFQUFFLENBQUE7UUFDVCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQzVDLGNBQWM7YUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDO2FBQ3BDLE1BQU0sQ0FFTCxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUNqRixDQUFBO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFTyxVQUFVLENBQUMsTUFBd0I7UUFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3hCLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ2xDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDNUQsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGtCQUFrQixDQUFDLGlCQUFtQztRQUM3RCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFBO1FBQ2xELEtBQUssTUFBTSxLQUFLLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QyxLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQy9DLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTywyQkFBMkI7UUFDbEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUN4QixJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDOUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDN0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixPQUFPO29CQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztvQkFDaEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO29CQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7b0JBQ3BCLFFBQVEsRUFBRSxTQUFTO29CQUNuQixLQUFLLEVBQUUsU0FBUztvQkFDaEIsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLFNBQVMsRUFBRSxFQUFFO29CQUNiLEtBQUsscUNBQTZCO29CQUNsQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7b0JBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtvQkFDbEIsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQjtvQkFDMUMsaUJBQWlCLEVBQUUsRUFBRTtpQkFDRixDQUFBO1lBQ3JCLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxPQUFPO1lBQ04sRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixLQUFLLEVBQUUsU0FBUztZQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1lBQ3BELFVBQVUsRUFBRSxTQUFTO1lBQ3JCLFFBQVEsRUFBRTtnQkFDVDtvQkFDQyxRQUFRO2lCQUNSO2FBQ0Q7U0FDd0IsQ0FBQTtJQUMzQixDQUFDO0lBRU8sV0FBVyxDQUNsQixNQUEwQixFQUMxQixNQUF3QixFQUN4QixjQUFvQyxFQUNwQyxhQUE4QixFQUM5QixZQUF5QztRQUV6QyxZQUFZLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sd0JBQXdCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMxRixJQUFJLHdCQUF3QixFQUFFLENBQUM7Z0JBQzlCLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixhQUFhLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FDMUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUM1RSxDQUFBO2dCQUNELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsYUFBYSxHQUFHO3dCQUNmLFFBQVEsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO3dCQUM1QixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFO3dCQUNuQixLQUFLLEVBQUUsS0FBSyxJQUFJLEVBQUU7d0JBQ2xCLFVBQVUsRUFBRSxTQUFTO3dCQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7d0JBQ25CLEtBQUssRUFBRSxTQUFTO3dCQUNoQixhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7cUJBQ25DLENBQUE7b0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDeEUsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLGFBQWEsR0FBRztvQkFDZixRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQztvQkFDNUIsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRTtvQkFDbkIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRTtvQkFDdEIsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztvQkFDbkIsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLGFBQWEsRUFBRSxNQUFNLENBQUMsYUFBYTtpQkFDbkMsQ0FBQTtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzNCLENBQUM7WUFDRCxNQUFNLHFCQUFxQixHQUFlLEVBQUUsQ0FBQTtZQUM1QyxLQUFLLE1BQU0sT0FBTyxJQUFJO2dCQUNyQixHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDckUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQzthQUM3QixFQUFFLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNuQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQTtnQkFDakMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQTtZQUMzRixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQ3hFLENBQUE7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxjQUFnQztRQUNqRSxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO1FBQ25DLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FDckQsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDeEMsQ0FBQTtZQUNELElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGFBQWEsQ0FBQyxNQUEwQjtRQUMvQyxNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUE7UUFFN0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQTtRQUN4QyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFBO1FBRTFDLHNEQUFzRDtRQUN0RCxrRUFBa0U7UUFDbEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUV2RixLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFpQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUQsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7Z0JBQzFCLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQTtnQkFDcEUsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDckMsV0FBVyxHQUFHLEVBQUUsQ0FBQTtnQkFDakIsQ0FBQztnQkFDRCxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sU0FBUyxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7b0JBQ2xELENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztvQkFDMUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtnQkFDTCxJQUFJLFlBQWdDLENBQUE7Z0JBQ3BDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzFGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDckIsWUFBWSxHQUFHLE1BQU0sQ0FBQTtvQkFDdEIsQ0FBQzt5QkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzVDLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtvQkFDL0IsQ0FBQztnQkFDRixDQUFDO2dCQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDN0UsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQzNGLE1BQU0sMEJBQTBCLEdBQy9CLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFFL0QsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtnQkFDekIsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFBO2dCQUM3RSxJQUFJLDJCQUEyQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUE7Z0JBQ2pFLElBQUksWUFBWSxLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzNELFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBTSxDQUFDLElBQUksQ0FBQTtvQkFDNUIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQU0sQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUMsS0FBTSxDQUFDLGdCQUFnQixDQUFBO29CQUN2RiwyQkFBMkIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyx3QkFBd0IsQ0FBQTtnQkFDckUsQ0FBQztnQkFFRCxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtnQkFDN0IsSUFDQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7b0JBQ3RCLENBQUMsSUFBSSxDQUFDLG9CQUFvQjtvQkFDMUIsSUFBSSxDQUFDLFVBQVU7b0JBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxFQUNsQyxDQUFDO29CQUNGLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO3dCQUM5RCxPQUFPLElBQUksQ0FBQyxVQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQTtvQkFDaEQsQ0FBQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFFRCxJQUFJLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtnQkFDaEMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO2dCQUM1QixDQUFDO2dCQUVELElBQUksa0JBQStELENBQUE7Z0JBQ25FLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUMzQixNQUFNLDJCQUEyQixHQUFHLElBQThDLENBQUE7b0JBQ2xGLElBQUksMkJBQTJCLElBQUksMkJBQTJCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzt3QkFDbkYsa0JBQWtCLEdBQUcsMkJBQTJCLENBQUMsa0JBQWtCLENBQUE7b0JBQ3BFLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUNDLENBQUMsU0FBUztvQkFDVixDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksZ0JBQWdCLElBQUksMkJBQTJCLENBQUMsRUFDdkUsQ0FBQztvQkFDRixPQUFPLENBQUMsS0FBSyxDQUNaLGVBQWUsR0FBRyxzSEFBc0gsQ0FDeEksQ0FBQTtnQkFDRixDQUFDO2dCQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsR0FBRztvQkFDSCxLQUFLO29CQUNMLFdBQVcsRUFBRSxnQkFBZ0I7b0JBQzdCLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CO29CQUNqRCxLQUFLLEVBQUUsU0FBUztvQkFDaEIsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLFVBQVUsRUFBRSxTQUFTO29CQUNyQixpQkFBaUIsRUFBRSxFQUFFO29CQUNyQixTQUFTO29CQUNULEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztvQkFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO29CQUNmLGFBQWEsRUFBRSxZQUFZO29CQUMzQixnQkFBZ0I7b0JBQ2hCLHVCQUF1QjtvQkFDdkIsMEJBQTBCO29CQUMxQixJQUFJLEVBQUUsU0FBUztvQkFDZixnQkFBZ0IsRUFBRSxnQkFBZ0I7b0JBQ2xDLDJCQUEyQixFQUFFLDJCQUEyQjtvQkFDeEQsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO29CQUNuQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7b0JBQzdCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCO29CQUMzQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLGFBQWEsRUFBRSxhQUFhO29CQUM1QixrQkFBa0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLElBQUksSUFBSSxDQUFDLGtCQUFrQjtvQkFDOUUsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEI7b0JBQy9ELFNBQVMsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNoQyxpQkFBaUI7b0JBQ2pCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7b0JBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztvQkFDakIscUNBQXFDLEVBQUUsa0JBQWtCO29CQUN6RCxvQkFBb0I7b0JBQ3BCLGFBQWE7aUJBQ2IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxnQkFBcUI7UUFDbEQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELEdBQUc7WUFDSCxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1lBQzVCLFdBQVcsRUFBRSxFQUFFO1lBQ2YscUJBQXFCLEVBQUUsS0FBSztZQUM1QixLQUFLLEVBQUUsU0FBUztZQUNoQixRQUFRLEVBQUUsU0FBUztZQUNuQixVQUFVLEVBQUUsU0FBUztZQUNyQixpQkFBaUIsRUFBRSxFQUFFO1lBQ3JCLFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU8sWUFBWSxDQUFDLFFBQTRCO1FBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxpREFBeUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sMENBQWtDLEVBQUUsQ0FBQztZQUNuRCxPQUFPLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHlCQUF5QixDQUFDLEVBQXNCLEVBQUUsRUFBc0I7UUFDL0UsSUFBSSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFBO1lBQzdCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFBO1lBQzdCLE9BQU8sTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVPLFNBQVMsQ0FBQyxjQUFnQyxFQUFFLFVBQWtCO1FBQ3JFLE1BQU0sT0FBTyxHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQTtRQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDeEYsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFDWixTQUFRLHFCQUFxQjtJQVE3QixZQUNTLElBQVMsRUFDakIsU0FBdUMsRUFDdEIsZUFBZ0M7UUFFakQsS0FBSyxFQUFFLENBQUE7UUFKQyxTQUFJLEdBQUosSUFBSSxDQUFLO1FBRUEsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBTmpDLHVCQUFrQixHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMvRSxzQkFBaUIsR0FBZ0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQVN0RSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZ0IsQ0FBQTtRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDaEQsQ0FBQztJQUVELElBQXVCLFlBQVk7UUFDbEMsMkNBQTJDO1FBQzNDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVTLE1BQU07UUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsMkRBQTJEO1FBQzNELE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5RixNQUFNLG9CQUFvQixHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckUsTUFBTSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUN6RSxvQkFBb0IsRUFDcEIsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25ELE9BQU8sWUFBWSxDQUFDLE1BQU07WUFDekIsQ0FBQyxDQUFDO2dCQUNBLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDOUIsY0FBYztnQkFDZCxPQUFPO2dCQUNQLFFBQVEsRUFBRSxRQUFRLElBQUksU0FBUzthQUMvQjtZQUNGLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUIsQ0FDeEIsTUFBNEIsRUFDNUIsU0FBaUI7UUFFakIsTUFBTSxvQkFBb0IsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUVoRSxNQUFNLGNBQWMsR0FBcUIsRUFBRSxDQUFBO1FBQzNDLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtRQUM1QixJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDaEQsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDbEMsT0FBTyxDQUFDLElBQUksQ0FDWCxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FDbEMsT0FBTyxFQUNQLGFBQWEsRUFDYixXQUFXLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FDaEMsQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDaEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLGNBQWMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLElBQUksR0FBeUI7WUFDbEMsSUFBSSxFQUFFLFlBQVk7WUFDbEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1NBQy9DLENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFFaEYsK0ZBQStGO1FBQy9GLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRU8sMkJBQTJCLENBQ2xDLE9BQStCLEVBQy9CLGFBQTZCLEVBQzdCLGFBQThCO1FBRTlCLGFBQWEsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDbkQscURBQXFEO1lBQ3JELE9BQU87Z0JBQ04sT0FBTyxFQUFFLGFBQWEsQ0FBQyxPQUFPO2dCQUM5QixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7Z0JBQzFCLFNBQVMsRUFBRSxhQUFhLENBQUMsU0FBUztnQkFDbEMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxhQUFhO2dCQUMxQyxPQUFPLEVBQ04sYUFBYSxDQUFDLE9BQU87b0JBQ3JCLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7d0JBQ25DLE9BQU8sSUFBSSxLQUFLLENBQ2YsS0FBSyxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ25FLEtBQUssQ0FBQyxXQUFXLEVBQ2pCLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNqRSxLQUFLLENBQUMsU0FBUyxDQUNmLENBQUE7b0JBQ0YsQ0FBQyxDQUFDO2FBQ0gsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoQywwREFBMEQ7UUFDMUQsTUFBTSxZQUFZLEdBQUcsYUFBYTthQUNoQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO2FBQzNCLE9BQU8sQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyRCxPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbkMsT0FBTyxJQUFJLEtBQUssQ0FDZixLQUFLLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNyRCxLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNuRCxLQUFLLENBQUMsU0FBUyxDQUNmLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUgsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUVPLFdBQVcsQ0FBQyxPQUFpQjtRQUNwQyxPQUFPO1lBQ04sV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQ2hDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7WUFDMUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ2hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsU0FBUyxFQUFFLEVBQUU7WUFDYixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxrQkFBa0I7WUFDOUMsUUFBUSxFQUFFLFNBQVM7WUFDbkIsVUFBVSxFQUFFLFNBQVM7WUFDckIscUJBQXFCLEVBQUUsU0FBUztZQUNoQyxpQkFBaUIsRUFBRSxFQUFFO1NBQ3JCLENBQUE7SUFDRixDQUFDO0lBRVEsYUFBYSxDQUFDLEdBQVc7UUFDakMsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekMsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQ3pCLE9BQU8sT0FBTyxDQUFBO29CQUNmLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxXQUErQjtRQUMvQyxPQUFPO1lBQ04sRUFBRSxFQUFFLFdBQVcsQ0FBQyxFQUFFO1lBQ2xCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSztZQUN4QixVQUFVLEVBQUUsU0FBUztZQUNyQixRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsUUFBUSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ2xGO2FBQ0Q7U0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxzQkFBc0I7SUFHM0IsSUFBWSxtQkFBbUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFZLFFBQVE7UUFDbkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsWUFBb0IsZUFBZSxDQUFDO1FBQWhCLGlCQUFZLEdBQVosWUFBWSxDQUFJO1FBQ25DLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxRQUFRLENBQUMsR0FBRyxRQUFrQjtRQUM3QixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxTQUFTLENBQUMsY0FBOEIsRUFBRSxPQUFpQixFQUFFLE1BQWdCO1FBQzVFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV6RCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLHdDQUF3QztZQUN4QyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1lBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0UsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRVMsVUFBVSxDQUFDLEtBQXFCLEVBQUUsTUFBYztRQUN6RCxJQUFJLFdBQVcsR0FBb0IsSUFBSSxDQUFBO1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUE7UUFDL0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ25CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNsRSxPQUFPLENBQUMsVUFBVSxHQUFHO29CQUNwQixlQUFlLEVBQUUsaUJBQWlCO29CQUNsQyxXQUFXLEVBQUUsQ0FBQztvQkFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtvQkFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtpQkFDL0IsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdCLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtvQkFDakMsV0FBVyxHQUFHLE9BQU8sQ0FBQTtnQkFDdEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsS0FBSyxDQUFDLEtBQUssR0FBRztZQUNiLGVBQWUsRUFBRSxVQUFVO1lBQzNCLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7WUFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtTQUMvQixDQUFBO1FBQ0QsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTyxXQUFXLENBQUMsT0FBaUIsRUFBRSxNQUFjO1FBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUE7UUFFakQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUU1QyxJQUFJLGVBQWUsR0FBRyxNQUFNLENBQUE7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDN0MsZUFBZSxJQUFJLFNBQVMsQ0FBQTtRQUM1QixPQUFPLENBQUMsUUFBUSxHQUFHO1lBQ2xCLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQztZQUM3QyxXQUFXLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNyRCxhQUFhLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUM7WUFDM0MsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTTtTQUM3QixDQUFBO1FBRUQsZUFBZSxJQUFJLElBQUksQ0FBQTtRQUN2QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVoRCxPQUFPLENBQUMsVUFBVSxHQUFHO1lBQ3BCLGVBQWUsRUFBRSxVQUFVO1lBQzNCLFdBQVcsRUFBRSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDdkMsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7WUFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7U0FDbkMsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFBO1FBQzVELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLE9BQU8sQ0FBQyxLQUFLLEdBQUc7WUFDZixlQUFlLEVBQUUsWUFBWTtZQUM3QixXQUFXLEVBQUUsQ0FBQztZQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07U0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxPQUFpQixFQUFFLE1BQWM7UUFDL0QsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQTtRQUV4RSxPQUFPLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFBO1FBQzlCLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUMxQyxNQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzlFLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLHVCQUF1QixFQUFFLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUUzQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNyRCxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO2dCQUM5QixlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtnQkFDekMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQzVDLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CO2dCQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO2FBQy9CLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxLQUFLLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUE7Z0JBRTNFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQy9CLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsTUFBTSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFFbEUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztvQkFDOUIsZUFBZSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7b0JBQ3pDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO29CQUM1QyxhQUFhLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtvQkFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtpQkFDL0IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxPQUFpQixFQUFFLGNBQXNCLEVBQUUsTUFBYztRQUMxRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELElBQUksV0FBVyxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN0RCxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFBO2dCQUNoRCxLQUFLLE1BQU0sVUFBVSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFBO29CQUM3QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUMzQixDQUFDO2dCQUNELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pFLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FDNUUsQ0FBQyxFQUNELE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUNsQixDQUFBO2dCQUNELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUN4QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDOUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUM3RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNoRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLENBQUE7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsV0FBcUIsRUFBRSxNQUFjLEVBQUUsTUFBZ0I7UUFDN0UsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0seUJBQTBCLFNBQVEsc0JBQXNCO0lBQzdELFlBQW9CLFNBQWlCLElBQUk7UUFDeEMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRFcsV0FBTSxHQUFOLE1BQU0sQ0FBZTtJQUV6QyxDQUFDO0lBRVEsU0FBUyxDQUFDLGNBQThCO1FBQ2hELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBVTtJQU01RCxZQUFvQixlQUFnQztRQUNuRCxLQUFLLEVBQUUsQ0FBQTtRQURZLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUw1QyxhQUFRLEdBQWtCLElBQUksQ0FBQTtRQUVyQix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNsRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBSTdELElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7WUFDcEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2pDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQXlCLEVBQUUsQ0FBQTtZQUMvQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLEtBQUssTUFBTSxhQUFhLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7Z0JBQ3hFLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDakMsQ0FBQztZQUNELE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDckMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFNBQWlCO0lBQzlDLE9BQU8sU0FBUyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDMUUsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxpQkFBcUM7SUFDL0UsTUFBTSxjQUFjLEdBQ25CLEtBQUs7UUFDTCxHQUFHLENBQUMsUUFBUSxDQUNYLDBCQUEwQixFQUMxQixvRUFBb0UsQ0FDcEUsQ0FBQTtJQUNGLE9BQU8sY0FBYyxHQUFHLElBQUksR0FBRyxpQkFBaUIsQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO0FBQ2hGLENBQUM7QUFFTSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQUd6QyxZQUNTLElBQVMsRUFDb0IsaUJBQXFDO1FBRGxFLFNBQUksR0FBSixJQUFJLENBQUs7UUFDb0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUN4RSxDQUFDO0lBRUosSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsYUFBYTtRQUNaLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU87UUFDTixpQkFBaUI7SUFDbEIsQ0FBQztDQUNELENBQUE7QUExQlksNkJBQTZCO0lBS3ZDLFdBQUEsa0JBQWtCLENBQUE7R0FMUiw2QkFBNkIsQ0EwQnpDIn0=