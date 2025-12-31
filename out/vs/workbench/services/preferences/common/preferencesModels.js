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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvY29tbW9uL3ByZWZlcmVuY2VzTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFlLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSXZFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFHTixVQUFVLEVBS1YsdUJBQXVCLEdBQ3ZCLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRSxPQUFPLEVBV04sZ0JBQWdCLEdBQ2hCLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUU1RCxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQVc7SUFDaEMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUNuQixXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ2YsYUFBYSxFQUFFLENBQUMsQ0FBQztJQUNqQixTQUFTLEVBQUUsQ0FBQyxDQUFDO0NBQ2IsQ0FBQTtBQUNELFNBQVMsV0FBVyxDQUFDLEtBQWE7SUFDakMsT0FBTyxDQUNOLEtBQUssQ0FBQyxlQUFlLEtBQUssQ0FBQyxDQUFDO1FBQzVCLEtBQUssQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLEtBQUssQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDO1FBQzFCLEtBQUssQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQ3RCLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBZSxxQkFBc0IsU0FBUSxXQUFXO0lBQXhEOztRQUNXLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUE4QixDQUFBO0lBb0d2RSxDQUFDO0lBbEdBLGlCQUFpQixDQUNoQixFQUFVLEVBQ1YsV0FBMkM7UUFFM0MsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMvQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNLLHNCQUFzQjtRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUNwQztRQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDcEMsSUFBSSxDQUNKLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLENBQzNGO2FBQ0EsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQTtZQUNyRCxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQzdELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FDdEMsQ0FBQTtZQUNELEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUUsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsY0FBYyxDQUNiLE1BQWMsRUFDZCxXQUF5QixFQUN6QixjQUErQjtRQUUvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBRW5DLE1BQU0sYUFBYSxHQUFvQixFQUFFLENBQUE7UUFDekMsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUMvQixNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkMsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxNQUFNLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBRXpELElBQUksWUFBWSxJQUFJLGtCQUFrQixFQUFFLENBQUM7d0JBQ3hDLGFBQWEsQ0FBQyxJQUFJLENBQUM7NEJBQ2xCLE9BQU87NEJBQ1AsT0FBTyxFQUFFLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLE9BQU87NEJBQ3pELFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLElBQUksZ0JBQWdCLENBQUMsSUFBSTs0QkFDakUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsSUFBSSxDQUFDOzRCQUNyRCxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxJQUFJLENBQUM7eUJBQ3JDLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxhQUFhLENBQUMsR0FBVztRQUN4QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QyxLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3hDLElBQUksR0FBRyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDekIsT0FBTyxPQUFPLENBQUE7b0JBQ2YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVMsZUFBZSxDQUN4QixNQUE0QjtRQUU1QixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN2QixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN2QixRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO2dCQUNsQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBYyxZQUFZO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0NBS0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEscUJBQXFCO0lBTzdELFlBQ0MsU0FBdUMsRUFDL0Isb0JBQXlDO1FBRWpELEtBQUssRUFBRSxDQUFBO1FBRkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxQjtRQUxqQyx1QkFBa0IsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0Usc0JBQWlCLEdBQWdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFPdEUsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWdCLENBQUE7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtZQUMxQyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFJLG1CQUFtQjtRQUN0QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGVBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRVMsa0JBQWtCLENBQUMsUUFBZ0IsRUFBRSxlQUF5QjtRQUN2RSxPQUFPLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBLENBQUMsbUJBQW1CO0lBQ3hELENBQUM7SUFFUyxLQUFLO1FBQ2QsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQzNCLElBQUksQ0FBQyxhQUFhLEVBQ2xCLENBQUMsUUFBZ0IsRUFBRSxlQUF5QixFQUFXLEVBQUUsQ0FDeEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FDbkQsQ0FBQTtJQUNGLENBQUM7SUFFUyxNQUFNO1FBQ2YsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELHVGQUF1RjtRQUN2RixNQUFNLGdCQUFnQixHQUFlLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7UUFDNUIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzlCLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUNsRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLGFBQXlDLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLHdDQUF3QztRQUNsRixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLGFBQWEsR0FBRztnQkFDZixFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztnQkFDdkIsUUFBUSxFQUFFO29CQUNUO3dCQUNDLFFBQVEsRUFBRSxnQkFBZ0I7cUJBQzFCO2lCQUNEO2dCQUNELEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSztnQkFDdkIsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO2dCQUNqQyxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7Z0JBQ3ZCLGFBQWEsRUFBRSxVQUFVLENBQUMsYUFBYTthQUN2QyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsT0FBTztZQUNOLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUM5QixjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BELE9BQU87WUFDUCxRQUFRLEVBQUUsUUFBUSxJQUFJLFNBQVM7U0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEscUJBQXFCO0lBTzlELFlBQ1MsZ0JBQWlDLEVBQ2xCLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUhDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUI7UUFQekIsdUJBQWtCLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9FLHNCQUFpQixHQUFnQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBRS9ELHFCQUFnQixHQUFxQixFQUFFLENBQUE7UUFDdkMsVUFBSyxHQUFHLEtBQUssQ0FBQTtRQVFwQixJQUFJLENBQUMsU0FBUyxDQUNiLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxDQUFDLENBQUMsTUFBTSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtnQkFDakIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyRixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtZQUNqQixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxnREFBZ0Q7SUFDaEQsSUFBdUIsWUFBWTtRQUNsQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixPQUFPLENBQUMsR0FBRyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsNkVBQTZFO0lBQzdFLG1CQUFtQixDQUFDLE1BQXdCO1FBQzNDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUE7SUFDL0IsQ0FBQztJQUVTLE1BQU07UUFDZixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7Q0FDRCxDQUFBO0FBaERZLG9CQUFvQjtJQVM5QixXQUFBLHFCQUFxQixDQUFBO0dBVFgsb0JBQW9CLENBZ0RoQzs7QUFFRCxTQUFTLEtBQUssQ0FDYixLQUFpQixFQUNqQixrQkFBbUY7SUFFbkYsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO0lBQy9CLElBQUksZUFBZSxHQUFvQixJQUFJLENBQUE7SUFFM0MsSUFBSSxlQUFlLEdBQWtCLElBQUksQ0FBQTtJQUN6QyxJQUFJLGFBQWEsR0FBUSxFQUFFLENBQUE7SUFDM0IsTUFBTSxlQUFlLEdBQVUsRUFBRSxDQUFBO0lBQ2pDLElBQUkscUJBQXFCLEdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDdEMsTUFBTSxLQUFLLEdBQUc7UUFDYixlQUFlLEVBQUUsQ0FBQztRQUNsQixXQUFXLEVBQUUsQ0FBQztRQUNkLGFBQWEsRUFBRSxDQUFDO1FBQ2hCLFNBQVMsRUFBRSxDQUFDO0tBQ1osQ0FBQTtJQUVELFNBQVMsT0FBTyxDQUFDLEtBQVUsRUFBRSxNQUFjLEVBQUUsTUFBYztRQUMxRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxDQUFDO1lBQVEsYUFBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwQyxDQUFDO2FBQU0sSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM1QixhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUNDLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQztZQUNwRCxDQUFDLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQyxJQUFJLGVBQWUsS0FBSyxJQUFJLENBQUMsRUFDakYsQ0FBQztZQUNGLHlCQUF5QjtZQUN6QixNQUFNLE9BQU8sR0FDWixlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7Z0JBQ25ELENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxlQUFnQixDQUFDLFNBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7Z0JBQzdELE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO2dCQUNyQixPQUFPLENBQUMsVUFBVSxHQUFHO29CQUNwQixlQUFlLEVBQUUsa0JBQWtCLENBQUMsVUFBVTtvQkFDOUMsV0FBVyxFQUFFLGtCQUFrQixDQUFDLE1BQU07b0JBQ3RDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVO29CQUMxQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsTUFBTTtpQkFDbEMsQ0FBQTtnQkFDRCxPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtvQkFDNUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7b0JBQzFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO2lCQUNsQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLE9BQU8sR0FBZ0I7UUFDNUIsYUFBYSxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQ2pELElBQUksa0JBQWtCLENBQUMsZUFBZ0IsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUMzRCxtQkFBbUI7Z0JBQ25CLHFCQUFxQixHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUE7Z0JBQzlDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzVDLEtBQUssQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtnQkFDM0MsS0FBSyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1lBQ3BDLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7WUFDakIsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDL0IsYUFBYSxHQUFHLE1BQU0sQ0FBQTtZQUN0QixlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQ3RCLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUNELGdCQUFnQixFQUFFLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUNsRSxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQ3RCLElBQ0MsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDO2dCQUNwRCxDQUFDLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQyxJQUFJLGVBQWUsS0FBSyxJQUFJLENBQUMsRUFDakYsQ0FBQztnQkFDRixrQkFBa0I7Z0JBQ2xCLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDeEQsTUFBTSxPQUFPLEdBQWE7b0JBQ3pCLFdBQVcsRUFBRSxFQUFFO29CQUNmLHFCQUFxQixFQUFFLEtBQUs7b0JBQzVCLEdBQUcsRUFBRSxJQUFJO29CQUNULFFBQVEsRUFBRTt3QkFDVCxlQUFlLEVBQUUsb0JBQW9CLENBQUMsVUFBVTt3QkFDaEQsV0FBVyxFQUFFLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUM1QyxhQUFhLEVBQUUsb0JBQW9CLENBQUMsVUFBVTt3QkFDOUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxNQUFNO3FCQUMvQztvQkFDRCxLQUFLLEVBQUU7d0JBQ04sZUFBZSxFQUFFLG9CQUFvQixDQUFDLFVBQVU7d0JBQ2hELFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNO3dCQUN4QyxhQUFhLEVBQUUsQ0FBQzt3QkFDaEIsU0FBUyxFQUFFLENBQUM7cUJBQ1o7b0JBQ0QsS0FBSyxFQUFFLElBQUk7b0JBQ1gsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLGlCQUFpQixFQUFFLEVBQUU7b0JBQ3JCLFNBQVMsRUFBRSxFQUFFO29CQUNiLFVBQVUsRUFBRSxlQUFlLElBQUksU0FBUztpQkFDeEMsQ0FBQTtnQkFDRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3RCLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ3hDLGVBQWUsR0FBRyxPQUFPLENBQUE7b0JBQzFCLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGVBQWdCLENBQUMsU0FBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsV0FBVyxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQy9DLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDckMsSUFDQyxxQkFBcUIsS0FBSyxDQUFDLENBQUM7Z0JBQzVCLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDO29CQUNwRCxDQUFDLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQyxJQUFJLGVBQWUsS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUNuRixDQUFDO2dCQUNGLGdCQUFnQjtnQkFDaEIsTUFBTSxPQUFPLEdBQ1osZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDO29CQUNuRCxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUMvQixDQUFDLENBQUMsZUFBZ0IsQ0FBQyxTQUFVLENBQUMsZUFBZ0IsQ0FBQyxTQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN2RSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7b0JBQzdELE9BQU8sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO3dCQUN0RCxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsVUFBVTt3QkFDMUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLE1BQU07cUJBQ2xDLENBQUMsQ0FBQTtvQkFDRixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTt3QkFDNUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7d0JBQzFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO3FCQUNsQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFFRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFELGVBQWUsR0FBRyxJQUFJLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixFQUFFLENBQUM7Z0JBQ3RELGlCQUFpQjtnQkFDakIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO2dCQUN6QyxLQUFLLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7Z0JBQ2pDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO1FBQ0QsWUFBWSxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFVLEVBQUUsQ0FBQTtZQUN2QixPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUM5QixlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ25DLGFBQWEsR0FBRyxLQUFLLENBQUE7WUFDckIsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBQ0QsVUFBVSxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQzlDLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDckMsSUFDQyxlQUFlLENBQUMsTUFBTSxLQUFLLHFCQUFxQixHQUFHLENBQUM7Z0JBQ3BELENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDLElBQUksZUFBZSxLQUFLLElBQUksQ0FBQyxFQUNqRixDQUFDO2dCQUNGLHNCQUFzQjtnQkFDdEIsTUFBTSxPQUFPLEdBQ1osZUFBZSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsR0FBRyxDQUFDO29CQUNuRCxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUMvQixDQUFDLENBQUMsZUFBZ0IsQ0FBQyxTQUFVLENBQUMsZUFBZ0IsQ0FBQyxTQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN2RSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7b0JBQzdELE9BQU8sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO3dCQUN0RCxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsVUFBVTt3QkFDMUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLE1BQU07cUJBQ2xDLENBQUMsQ0FBQTtvQkFDRixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTt3QkFDNUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7d0JBQzFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO3FCQUNsQyxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsY0FBYyxFQUFFLE9BQU87UUFDdkIsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDbEIsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDN0MsSUFDQyxPQUFPO2dCQUNQLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7b0JBQzFCLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO29CQUM3QixXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQ2hDLENBQUM7Z0JBQ0YsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFBO0lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1FBQ3pCLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQ3pCLENBQUMsQ0FBQztZQUNBO2dCQUNDLEVBQUUsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RDLFFBQVEsRUFBRTtvQkFDVDt3QkFDQyxRQUFRO3FCQUNSO2lCQUNEO2dCQUNELEtBQUssRUFBRSxFQUFFO2dCQUNULFVBQVUsRUFBRSxTQUFTO2dCQUNyQixLQUFLO2FBQ29CO1NBQzFCO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtBQUNOLENBQUM7QUFFRCxNQUFNLE9BQU8saUNBQWtDLFNBQVEsbUJBQW1CO0lBQTFFOztRQUNTLHlCQUFvQixHQUFxQixFQUFFLENBQUE7SUFpQnBELENBQUM7SUFmQSxJQUFJLG1CQUFtQjtRQUN0QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRWtCLEtBQUs7UUFDdkIsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2IsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FDaEMsSUFBSSxDQUFDLGFBQWEsRUFDbEIsQ0FBQyxRQUFnQixFQUFFLGVBQXlCLEVBQVcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUN0RixDQUFBO0lBQ0YsQ0FBQztJQUVrQixrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGVBQXlCO1FBQ2hGLE9BQU8sUUFBUSxLQUFLLFVBQVUsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBUzlDLFlBQ1MsNkJBQXVDLEVBQ3RDLE1BQTJCLEVBQzNCLG9CQUEyQztRQUVwRCxLQUFLLEVBQUUsQ0FBQTtRQUpDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBVTtRQUN0QyxXQUFNLEdBQU4sTUFBTSxDQUFxQjtRQUMzQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBUjdDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUE7UUFFcEMsaUJBQVksR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDekUsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFRMUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25ELElBQUksQ0FBQyxDQUFDLE1BQU0sd0NBQWdDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNaLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLFdBQVcsR0FBRyxLQUFLO1FBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxXQUFXLEdBQUcsS0FBSztRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsK0JBQWdDLENBQUE7SUFDN0MsQ0FBQztJQUVELGlCQUFpQixDQUFDLFdBQVcsR0FBRyxLQUFLO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksV0FBVyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRU8sVUFBVTtRQUNqQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsSUFBSSxDQUFDLCtCQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFTyxLQUFLO1FBQ1osSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7UUFDekIsSUFBSSxDQUFDLCtCQUErQixHQUFHLFNBQVMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO0lBQ3BDLENBQUM7SUFFTyxLQUFLO1FBQ1osTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDakQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDM0QsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDO2FBQ2xGLGlCQUFpQixFQUFFO2FBQ25CLEtBQUssRUFBRSxDQUFBO1FBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUM1QyxjQUFjO2FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQzthQUNwQyxNQUFNLENBRUwsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDakYsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQXdCO1FBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN4QixLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNsQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzVELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxpQkFBbUM7UUFDN0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUNsRCxLQUFLLE1BQU0sS0FBSyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkMsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN4QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUMvQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FDeEIsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzlDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTztvQkFDTixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7b0JBQ2hDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztvQkFDaEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO29CQUNwQixRQUFRLEVBQUUsU0FBUztvQkFDbkIsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFVBQVUsRUFBRSxTQUFTO29CQUNyQixTQUFTLEVBQUUsRUFBRTtvQkFDYixLQUFLLHFDQUE2QjtvQkFDbEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7b0JBQ2xCLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7b0JBQzFDLGlCQUFpQixFQUFFLEVBQUU7aUJBQ0YsQ0FBQTtZQUNyQixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsT0FBTztZQUNOLEVBQUUsRUFBRSxrQkFBa0I7WUFDdEIsS0FBSyxFQUFFLFNBQVM7WUFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztZQUNwRCxVQUFVLEVBQUUsU0FBUztZQUNyQixRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsUUFBUTtpQkFDUjthQUNEO1NBQ3dCLENBQUE7SUFDM0IsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsTUFBMEIsRUFDMUIsTUFBd0IsRUFDeEIsY0FBb0MsRUFDcEMsYUFBOEIsRUFDOUIsWUFBeUM7UUFFekMsWUFBWSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDL0MsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLHdCQUF3QixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUYsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO2dCQUM5QixLQUFLLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDcEIsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQzFCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUUsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FDNUUsQ0FBQTtnQkFDRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BCLGFBQWEsR0FBRzt3QkFDZixRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQzt3QkFDNUIsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRTt3QkFDbkIsS0FBSyxFQUFFLEtBQUssSUFBSSxFQUFFO3dCQUNsQixVQUFVLEVBQUUsU0FBUzt3QkFDckIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO3dCQUNuQixLQUFLLEVBQUUsU0FBUzt3QkFDaEIsYUFBYSxFQUFFLE1BQU0sQ0FBQyxhQUFhO3FCQUNuQyxDQUFBO29CQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ3hFLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixhQUFhLEdBQUc7b0JBQ2YsUUFBUSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7b0JBQzVCLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUU7b0JBQ25CLEtBQUssRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUU7b0JBQ3RCLFVBQVUsRUFBRSxTQUFTO29CQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7b0JBQ25CLEtBQUssRUFBRSxTQUFTO29CQUNoQixhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7aUJBQ25DLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUMzQixDQUFDO1lBQ0QsTUFBTSxxQkFBcUIsR0FBZSxFQUFFLENBQUE7WUFDNUMsS0FBSyxNQUFNLE9BQU8sSUFBSTtnQkFDckIsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVE7Z0JBQ3JFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7YUFDN0IsRUFBRSxDQUFDO2dCQUNILElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ2hDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDbkMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUE7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbEMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcscUJBQXFCLENBQUE7WUFDM0YsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUN4RSxDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8seUJBQXlCLENBQUMsY0FBZ0M7UUFDakUsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQTtRQUNuQyxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzVDLGFBQWEsQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ3JELENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQ3hDLENBQUE7WUFDRCxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxhQUFhLENBQUMsTUFBMEI7UUFDL0MsTUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFBO1FBRTdCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUE7UUFDeEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQTtRQUUxQyxzREFBc0Q7UUFDdEQsa0VBQWtFO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRSxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFFdkYsS0FBSyxNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksR0FBaUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzlELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO2dCQUMxQixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUE7Z0JBQ3BFLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3JDLFdBQVcsR0FBRyxFQUFFLENBQUE7Z0JBQ2pCLENBQUM7Z0JBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO29CQUNsRCxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7b0JBQzFDLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQ0wsSUFBSSxZQUFnQyxDQUFBO2dCQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUMxRixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ3JCLFlBQVksR0FBRyxNQUFNLENBQUE7b0JBQ3RCLENBQUM7eUJBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUM1QyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUE7b0JBQy9CLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQzdFLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUMzRixNQUFNLDBCQUEwQixHQUMvQixJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBRS9ELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7Z0JBQ3pCLElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtnQkFDN0UsSUFBSSwyQkFBMkIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFBO2dCQUNqRSxJQUFJLFlBQVksS0FBSyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUMzRCxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQU0sQ0FBQyxJQUFJLENBQUE7b0JBQzVCLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFNLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDLEtBQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtvQkFDdkYsMkJBQTJCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsd0JBQXdCLENBQUE7Z0JBQ3JFLENBQUM7Z0JBRUQsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUE7Z0JBQzdCLElBQ0MsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRO29CQUN0QixDQUFDLElBQUksQ0FBQyxvQkFBb0I7b0JBQzFCLElBQUksQ0FBQyxVQUFVO29CQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFDbEMsQ0FBQztvQkFDRixpQkFBaUIsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTt3QkFDOUQsT0FBTyxJQUFJLENBQUMsVUFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUE7b0JBQ2hELENBQUMsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBRUQsSUFBSSxvQkFBb0IsR0FBRyxLQUFLLENBQUE7Z0JBQ2hDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLG9CQUFvQixHQUFHLElBQUksQ0FBQTtnQkFDNUIsQ0FBQztnQkFFRCxJQUFJLGtCQUErRCxDQUFBO2dCQUNuRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDM0IsTUFBTSwyQkFBMkIsR0FBRyxJQUE4QyxDQUFBO29CQUNsRixJQUFJLDJCQUEyQixJQUFJLDJCQUEyQixDQUFDLGtCQUFrQixFQUFFLENBQUM7d0JBQ25GLGtCQUFrQixHQUFHLDJCQUEyQixDQUFDLGtCQUFrQixDQUFBO29CQUNwRSxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsSUFDQyxDQUFDLFNBQVM7b0JBQ1YsQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLGdCQUFnQixJQUFJLDJCQUEyQixDQUFDLEVBQ3ZFLENBQUM7b0JBQ0YsT0FBTyxDQUFDLEtBQUssQ0FDWixlQUFlLEdBQUcsc0hBQXNILENBQ3hJLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLEdBQUc7b0JBQ0gsS0FBSztvQkFDTCxXQUFXLEVBQUUsZ0JBQWdCO29CQUM3QixxQkFBcUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQjtvQkFDakQsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLFFBQVEsRUFBRSxTQUFTO29CQUNuQixVQUFVLEVBQUUsU0FBUztvQkFDckIsaUJBQWlCLEVBQUUsRUFBRTtvQkFDckIsU0FBUztvQkFDVCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixhQUFhLEVBQUUsWUFBWTtvQkFDM0IsZ0JBQWdCO29CQUNoQix1QkFBdUI7b0JBQ3ZCLDBCQUEwQjtvQkFDMUIsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsZ0JBQWdCLEVBQUUsZ0JBQWdCO29CQUNsQywyQkFBMkIsRUFBRSwyQkFBMkI7b0JBQ3hELGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztvQkFDbkMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO29CQUM3QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ2Ysa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtvQkFDM0MsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO29CQUMzQixhQUFhLEVBQUUsYUFBYTtvQkFDNUIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixJQUFJLElBQUksQ0FBQyxrQkFBa0I7b0JBQzlFLDRCQUE0QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCO29CQUMvRCxTQUFTLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQztvQkFDaEMsaUJBQWlCO29CQUNqQixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO29CQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLHFDQUFxQyxFQUFFLGtCQUFrQjtvQkFDekQsb0JBQW9CO29CQUNwQixhQUFhO2lCQUNiLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8scUJBQXFCLENBQUMsZ0JBQXFCO1FBQ2xELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsRCxHQUFHO1lBQ0gsS0FBSyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztZQUM1QixXQUFXLEVBQUUsRUFBRTtZQUNmLHFCQUFxQixFQUFFLEtBQUs7WUFDNUIsS0FBSyxFQUFFLFNBQVM7WUFDaEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsVUFBVSxFQUFFLFNBQVM7WUFDckIsaUJBQWlCLEVBQUUsRUFBRTtZQUNyQixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVPLFlBQVksQ0FBQyxRQUE0QjtRQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0saURBQXlDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLDBDQUFrQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxFQUFzQixFQUFFLEVBQXNCO1FBQy9FLElBQUksT0FBTyxFQUFFLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDVixDQUFDO1FBQ0QsSUFBSSxFQUFFLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMzQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQTtZQUM3QixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQTtZQUM3QixPQUFPLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFTyxTQUFTLENBQUMsY0FBZ0MsRUFBRSxVQUFrQjtRQUNyRSxNQUFNLE9BQU8sR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUE7UUFDNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUMsS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMEJBQ1osU0FBUSxxQkFBcUI7SUFRN0IsWUFDUyxJQUFTLEVBQ2pCLFNBQXVDLEVBQ3RCLGVBQWdDO1FBRWpELEtBQUssRUFBRSxDQUFBO1FBSkMsU0FBSSxHQUFKLElBQUksQ0FBSztRQUVBLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQU5qQyx1QkFBa0IsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDL0Usc0JBQWlCLEdBQWdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFTdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWdCLENBQUE7UUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ2hELENBQUM7SUFFRCxJQUF1QixZQUFZO1FBQ2xDLDJDQUEyQztRQUMzQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFUyxNQUFNO1FBQ2YsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUYsTUFBTSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU5RixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FDekUsb0JBQW9CLEVBQ3BCLFNBQVMsQ0FDVCxDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRCxPQUFPLFlBQVksQ0FBQyxNQUFNO1lBQ3pCLENBQUMsQ0FBQztnQkFDQSxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWM7Z0JBQzlCLGNBQWM7Z0JBQ2QsT0FBTztnQkFDUCxRQUFRLEVBQUUsUUFBUSxJQUFJLFNBQVM7YUFDL0I7WUFDRixDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQ3hCLE1BQTRCLEVBQzVCLFNBQWlCO1FBRWpCLE1BQU0sb0JBQW9CLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFaEUsTUFBTSxjQUFjLEdBQXFCLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7UUFDNUIsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzlCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ2hELGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQ2xDLE9BQU8sQ0FBQyxJQUFJLENBQ1gsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQ2xDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQ2hDLENBQ0QsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDL0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxJQUFJLEdBQXlCO1lBQ2xDLElBQUksRUFBRSxZQUFZO1lBQ2xCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztTQUMvQyxDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBRWhGLCtGQUErRjtRQUMvRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXRELE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVPLDJCQUEyQixDQUNsQyxPQUErQixFQUMvQixhQUE2QixFQUM3QixhQUE4QjtRQUU5QixhQUFhLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ25ELHFEQUFxRDtZQUNyRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxhQUFhLENBQUMsT0FBTztnQkFDOUIsS0FBSyxFQUFFLGFBQWEsQ0FBQyxLQUFLO2dCQUMxQixTQUFTLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ2xDLGFBQWEsRUFBRSxhQUFhLENBQUMsYUFBYTtnQkFDMUMsT0FBTyxFQUNOLGFBQWEsQ0FBQyxPQUFPO29CQUNyQixhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO3dCQUNuQyxPQUFPLElBQUksS0FBSyxDQUNmLEtBQUssQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUNuRSxLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDakUsS0FBSyxDQUFDLFNBQVMsQ0FDZixDQUFBO29CQUNGLENBQUMsQ0FBQzthQUNILENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFaEMsMERBQTBEO1FBQzFELE1BQU0sWUFBWSxHQUFHLGFBQWE7YUFDaEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQzthQUMzQixPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckQsT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ25DLE9BQU8sSUFBSSxLQUFLLENBQ2YsS0FBSyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDckQsS0FBSyxDQUFDLFdBQVcsRUFDakIsS0FBSyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDbkQsS0FBSyxDQUFDLFNBQVMsQ0FDZixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVILE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFTyxXQUFXLENBQUMsT0FBaUI7UUFDcEMsT0FBTztZQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztZQUNoQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCO1lBQzFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztZQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxFQUFFO1lBQ2IsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixrQkFBa0IsRUFBRSxPQUFPLENBQUMsa0JBQWtCO1lBQzlDLFFBQVEsRUFBRSxTQUFTO1lBQ25CLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLHFCQUFxQixFQUFFLFNBQVM7WUFDaEMsaUJBQWlCLEVBQUUsRUFBRTtTQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVRLGFBQWEsQ0FBQyxHQUFXO1FBQ2pDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pDLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN0QyxLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxPQUFPLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUN6QixPQUFPLE9BQU8sQ0FBQTtvQkFDZixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxRQUFRLENBQUMsV0FBK0I7UUFDL0MsT0FBTztZQUNOLEVBQUUsRUFBRSxXQUFXLENBQUMsRUFBRTtZQUNsQixLQUFLLEVBQUUsU0FBUztZQUNoQixLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUs7WUFDeEIsVUFBVSxFQUFFLFNBQVM7WUFDckIsUUFBUSxFQUFFO2dCQUNUO29CQUNDLFFBQVEsRUFBRSxXQUFXLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNsRjthQUNEO1NBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sc0JBQXNCO0lBRzNCLElBQVksbUJBQW1CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN2RCxDQUFDO0lBRUQsSUFBWSxRQUFRO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbkUsQ0FBQztJQUVELFlBQW9CLGVBQWUsQ0FBQztRQUFoQixpQkFBWSxHQUFaLFlBQVksQ0FBSTtRQUNuQyxJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQUcsUUFBa0I7UUFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsU0FBUyxDQUFDLGNBQThCLEVBQUUsT0FBaUIsRUFBRSxNQUFnQjtRQUM1RSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQix3Q0FBd0M7WUFDeEMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQTtZQUNuRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzdFLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVTLFVBQVUsQ0FBQyxLQUFxQixFQUFFLE1BQWM7UUFDekQsSUFBSSxXQUFXLEdBQW9CLElBQUksQ0FBQTtRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBQy9DLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUE7Z0JBQ3RELElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDbEUsT0FBTyxDQUFDLFVBQVUsR0FBRztvQkFDcEIsZUFBZSxFQUFFLGlCQUFpQjtvQkFDbEMsV0FBVyxFQUFFLENBQUM7b0JBQ2QsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7b0JBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07aUJBQy9CLENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixLQUFLLE1BQU0sT0FBTyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQ2pDLFdBQVcsR0FBRyxPQUFPLENBQUE7Z0JBQ3RCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssQ0FBQyxLQUFLLEdBQUc7WUFDYixlQUFlLEVBQUUsVUFBVTtZQUMzQixXQUFXLEVBQUUsQ0FBQztZQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07U0FDL0IsQ0FBQTtRQUNELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQWlCLEVBQUUsTUFBYztRQUNwRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBRWpELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFNUMsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFBO1FBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdDLGVBQWUsSUFBSSxTQUFTLENBQUE7UUFDNUIsT0FBTyxDQUFDLFFBQVEsR0FBRztZQUNsQixlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUM7WUFDN0MsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDckQsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDO1lBQzNDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU07U0FDN0IsQ0FBQTtRQUVELGVBQWUsSUFBSSxJQUFJLENBQUE7UUFDdkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFaEQsT0FBTyxDQUFDLFVBQVUsR0FBRztZQUNwQixlQUFlLEVBQUUsVUFBVTtZQUMzQixXQUFXLEVBQUUsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3ZDLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1NBQ25DLENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQTtRQUM1RCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixPQUFPLENBQUMsS0FBSyxHQUFHO1lBQ2YsZUFBZSxFQUFFLFlBQVk7WUFDN0IsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtZQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO1NBQy9CLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsT0FBaUIsRUFBRSxNQUFjO1FBQy9ELE1BQU0sY0FBYyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUE7UUFFeEUsT0FBTyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQTtRQUM5QixNQUFNLG1CQUFtQixHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDMUMsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM5RSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDckQsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztnQkFDOUIsZUFBZSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7Z0JBQ3pDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUM1QyxhQUFhLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtnQkFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTthQUMvQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3RFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsS0FBSyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO2dCQUUzRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRWxFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7b0JBQzlCLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CO29CQUN6QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztvQkFDNUMsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7b0JBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07aUJBQy9CLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxTQUFTLENBQUMsT0FBaUIsRUFBRSxjQUFzQixFQUFFLE1BQWM7UUFDMUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMvRCxJQUFJLFdBQVcsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEQsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQTtnQkFDaEQsS0FBSyxNQUFNLFVBQVUsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzVDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQTtvQkFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtnQkFDM0IsQ0FBQztnQkFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN6RSxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQzVFLENBQUMsRUFDRCxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDbEIsQ0FBQTtnQkFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDN0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDaEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLFdBQXFCLEVBQUUsTUFBYyxFQUFFLE1BQWdCO1FBQzdFLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHlCQUEwQixTQUFRLHNCQUFzQjtJQUM3RCxZQUFvQixTQUFpQixJQUFJO1FBQ3hDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQURXLFdBQU0sR0FBTixNQUFNLENBQWU7SUFFekMsQ0FBQztJQUVRLFNBQVMsQ0FBQyxjQUE4QjtRQUNoRCxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFNNUQsWUFBb0IsZUFBZ0M7UUFDbkQsS0FBSyxFQUFFLENBQUE7UUFEWSxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFMNUMsYUFBUSxHQUFrQixJQUFJLENBQUE7UUFFckIseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbEUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQUk3RCxJQUFJLENBQUMsU0FBUyxDQUNiLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1lBQ3BCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNqQyxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM1QixNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUF5QixFQUFFLENBQUE7WUFDL0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixLQUFLLE1BQU0sYUFBYSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO2dCQUN4RSxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7WUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztDQUNEO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxTQUFpQjtJQUM5QyxPQUFPLFNBQVMsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQzFFLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsaUJBQXFDO0lBQy9FLE1BQU0sY0FBYyxHQUNuQixLQUFLO1FBQ0wsR0FBRyxDQUFDLFFBQVEsQ0FDWCwwQkFBMEIsRUFDMUIsb0VBQW9FLENBQ3BFLENBQUE7SUFDRixPQUFPLGNBQWMsR0FBRyxJQUFJLEdBQUcsaUJBQWlCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtBQUNoRixDQUFDO0FBRU0sSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7SUFHekMsWUFDUyxJQUFTLEVBQ29CLGlCQUFxQztRQURsRSxTQUFJLEdBQUosSUFBSSxDQUFLO1FBQ29CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFDeEUsQ0FBQztJQUVKLElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ25FLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPO1FBQ04saUJBQWlCO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBMUJZLDZCQUE2QjtJQUt2QyxXQUFBLGtCQUFrQixDQUFBO0dBTFIsNkJBQTZCLENBMEJ6QyJ9