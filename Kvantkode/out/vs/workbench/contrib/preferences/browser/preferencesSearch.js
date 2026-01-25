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
var AiRelatedInformationSearchProvider_1;
import { SettingMatchType, SettingKeyMatchTypes, } from '../../../services/preferences/common/preferences.js';
import { distinct } from '../../../../base/common/arrays.js';
import * as strings from '../../../../base/common/strings.js';
import { matchesContiguousSubString, matchesSubString, matchesWords, } from '../../../../base/common/filters.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IPreferencesSearchService, } from '../common/preferences.js';
import { IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IAiRelatedInformationService, RelatedInformationType, } from '../../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { TfIdfCalculator } from '../../../../base/common/tfIdf.js';
import { nullRange } from '../../../services/preferences/common/preferencesModels.js';
let PreferencesSearchService = class PreferencesSearchService extends Disposable {
    constructor(instantiationService, configurationService, extensionManagementService, extensionEnablementService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        // This request goes to the shared process but results won't change during a window's lifetime, so cache the results.
        this._installedExtensions = this.extensionManagementService
            .getInstalled(1 /* ExtensionType.User */)
            .then((exts) => {
            // Filter to enabled extensions that have settings
            return exts
                .filter((ext) => this.extensionEnablementService.isEnabled(ext))
                .filter((ext) => ext.manifest && ext.manifest.contributes && ext.manifest.contributes.configuration)
                .filter((ext) => !!ext.identifier.uuid);
        });
    }
    get remoteSearchAllowed() {
        const workbenchSettings = this.configurationService.getValue().workbench.settings;
        return workbenchSettings.enableNaturalLanguageSearch;
    }
    getRemoteSearchProvider(filter) {
        if (!this.remoteSearchAllowed) {
            return undefined;
        }
        this._remoteSearchProvider ??= this.instantiationService.createInstance(RemoteSearchProvider);
        this._remoteSearchProvider.setFilter(filter);
        return this._remoteSearchProvider;
    }
    getLocalSearchProvider(filter) {
        return this.instantiationService.createInstance(LocalSearchProvider, filter);
    }
};
PreferencesSearchService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService)
], PreferencesSearchService);
export { PreferencesSearchService };
function cleanFilter(filter) {
    // Remove " and : which are likely to be copypasted as part of a setting name.
    // Leave other special characters which the user might want to search for.
    return filter.replace(/[":]/g, ' ').replace(/  /g, ' ').trim();
}
let LocalSearchProvider = class LocalSearchProvider {
    constructor(_filter, configurationService) {
        this._filter = _filter;
        this.configurationService = configurationService;
        this._filter = cleanFilter(this._filter);
    }
    searchModel(preferencesModel, token) {
        if (!this._filter) {
            return Promise.resolve(null);
        }
        const settingMatcher = (setting) => {
            let { matches, matchType, keyMatchScore } = new SettingMatches(this._filter, setting, true, this.configurationService);
            if (matchType === SettingMatchType.None || matches.length === 0) {
                return null;
            }
            if (strings.equalsIgnoreCase(this._filter, setting.key)) {
                matchType = SettingMatchType.ExactMatch;
            }
            return {
                matches,
                matchType,
                keyMatchScore,
                score: 0, // only used for RemoteSearchProvider matches.
            };
        };
        const filterMatches = preferencesModel.filterSettings(this._filter, this.getGroupFilter(this._filter), settingMatcher);
        // Check the top key match type.
        const topKeyMatchType = Math.max(...filterMatches.map((m) => m.matchType & SettingKeyMatchTypes));
        // Always allow description matches as part of https://github.com/microsoft/vscode/issues/239936.
        const alwaysAllowedMatchTypes = SettingMatchType.DescriptionOrValueMatch | SettingMatchType.LanguageTagSettingMatch;
        const filteredMatches = filterMatches.filter((m) => m.matchType & topKeyMatchType ||
            m.matchType & alwaysAllowedMatchTypes ||
            m.matchType === SettingMatchType.ExactMatch);
        return Promise.resolve({
            filterMatches: filteredMatches,
            exactMatch: filteredMatches.some((m) => m.matchType === SettingMatchType.ExactMatch),
        });
    }
    getGroupFilter(filter) {
        const regex = strings.createRegExp(filter, false, { global: true });
        return (group) => {
            return group.id !== 'defaultOverrides' && regex.test(group.title);
        };
    }
};
LocalSearchProvider = __decorate([
    __param(1, IConfigurationService)
], LocalSearchProvider);
export { LocalSearchProvider };
export class SettingMatches {
    constructor(searchString, setting, searchDescription, configurationService) {
        this.searchDescription = searchDescription;
        this.configurationService = configurationService;
        this.matchType = SettingMatchType.None;
        /**
         * A match score for key matches to allow comparing key matches against each other.
         * Otherwise, all key matches are treated the same, and sorting is done by ToC order.
         */
        this.keyMatchScore = 0;
        this.matches = distinct(this._findMatchesInSetting(searchString, setting), (match) => `${match.startLineNumber}_${match.startColumn}_${match.endLineNumber}_${match.endColumn}_`);
    }
    _findMatchesInSetting(searchString, setting) {
        const result = this._doFindMatchesInSetting(searchString, setting);
        return result;
    }
    _keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    _toAlphaNumeric(s) {
        return s.replace(/[^A-Za-z0-9]+/g, '');
    }
    _doFindMatchesInSetting(searchString, setting) {
        const descriptionMatchingWords = new Map();
        const keyMatchingWords = new Map();
        const valueMatchingWords = new Map();
        // Key (ID) search
        // First, search by the setting's ID and label.
        const settingKeyAsWords = this._keyToLabel(setting.key);
        const queryWords = new Set(searchString.split(' '));
        for (const word of queryWords) {
            // Check if the key contains the word. Use contiguous search.
            const keyMatches = matchesWords(word, settingKeyAsWords, true);
            if (keyMatches?.length) {
                keyMatchingWords.set(word, keyMatches.map((match) => this.toKeyRange(setting, match)));
            }
        }
        if (keyMatchingWords.size === queryWords.size) {
            // All words in the query matched with something in the setting key.
            // Matches "edit format on paste" to "editor.formatOnPaste".
            this.matchType |= SettingMatchType.AllWordsInSettingsLabel;
        }
        else if (keyMatchingWords.size >= 2) {
            // Matches "edit paste" to "editor.formatOnPaste".
            // The if statement reduces noise by preventing "editor formatonpast" from matching all editor settings.
            this.matchType |= SettingMatchType.ContiguousWordsInSettingsLabel;
            this.keyMatchScore = keyMatchingWords.size;
        }
        const searchStringAlphaNumeric = this._toAlphaNumeric(searchString);
        const keyAlphaNumeric = this._toAlphaNumeric(setting.key);
        const keyIdMatches = matchesContiguousSubString(searchStringAlphaNumeric, keyAlphaNumeric);
        if (keyIdMatches?.length) {
            // Matches "editorformatonp" to "editor.formatonpaste".
            keyMatchingWords.set(setting.key, keyIdMatches.map((match) => this.toKeyRange(setting, match)));
            this.matchType |= SettingMatchType.ContiguousQueryInSettingId;
        }
        // Fall back to non-contiguous key (ID) searches if nothing matched yet.
        if (this.matchType === SettingMatchType.None) {
            keyMatchingWords.clear();
            for (const word of queryWords) {
                const keyMatches = matchesWords(word, settingKeyAsWords, false);
                if (keyMatches?.length) {
                    keyMatchingWords.set(word, keyMatches.map((match) => this.toKeyRange(setting, match)));
                }
            }
            if (keyMatchingWords.size >= 2 || (keyMatchingWords.size === 1 && queryWords.size === 1)) {
                // Matches "edforonpas" to "editor.formatOnPaste".
                // The if statement reduces noise by preventing "editor fomonpast" from matching all editor settings.
                this.matchType |= SettingMatchType.NonContiguousWordsInSettingsLabel;
                this.keyMatchScore = keyMatchingWords.size;
            }
            else {
                const keyIdMatches = matchesSubString(searchStringAlphaNumeric, keyAlphaNumeric);
                if (keyIdMatches?.length) {
                    // Matches "edfmonpas" to "editor.formatOnPaste".
                    keyMatchingWords.set(setting.key, keyIdMatches.map((match) => this.toKeyRange(setting, match)));
                    this.matchType |= SettingMatchType.NonContiguousQueryInSettingId;
                }
            }
        }
        // Check if the match was for a language tag group setting such as [markdown].
        // In such a case, move that setting to be last.
        if (setting.overrides?.length && this.matchType !== SettingMatchType.None) {
            this.matchType = SettingMatchType.LanguageTagSettingMatch;
            const keyRanges = keyMatchingWords.size ? Array.from(keyMatchingWords.values()).flat() : [];
            return [...keyRanges];
        }
        // Description search
        // Search the description if we found non-contiguous key matches at best.
        const hasContiguousKeyMatchTypes = this.matchType >= SettingMatchType.ContiguousWordsInSettingsLabel;
        if (this.searchDescription && !hasContiguousKeyMatchTypes) {
            for (const word of queryWords) {
                // Search the description lines.
                for (let lineIndex = 0; lineIndex < setting.description.length; lineIndex++) {
                    const descriptionMatches = matchesContiguousSubString(word, setting.description[lineIndex]);
                    if (descriptionMatches?.length) {
                        descriptionMatchingWords.set(word, descriptionMatches.map((match) => this.toDescriptionRange(setting, match, lineIndex)));
                    }
                }
            }
            if (descriptionMatchingWords.size === queryWords.size) {
                this.matchType |= SettingMatchType.DescriptionOrValueMatch;
            }
            else {
                // Clear out the match for now. We want to require all words to match in the description.
                descriptionMatchingWords.clear();
            }
        }
        // Value search
        // Check if the value contains all the words.
        // Search the values if we found non-contiguous key matches at best.
        if (!hasContiguousKeyMatchTypes) {
            if (setting.enum?.length) {
                // Search all string values of enums.
                for (const option of setting.enum) {
                    if (typeof option !== 'string') {
                        continue;
                    }
                    valueMatchingWords.clear();
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, option);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map((match) => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                        break;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
            else {
                // Search single string value.
                const settingValue = this.configurationService.getValue(setting.key);
                if (typeof settingValue === 'string') {
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, settingValue);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map((match) => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
        }
        const descriptionRanges = descriptionMatchingWords.size
            ? Array.from(descriptionMatchingWords.values()).flat()
            : [];
        const keyRanges = keyMatchingWords.size ? Array.from(keyMatchingWords.values()).flat() : [];
        const valueRanges = valueMatchingWords.size
            ? Array.from(valueMatchingWords.values()).flat()
            : [];
        return [...descriptionRanges, ...keyRanges, ...valueRanges];
    }
    toKeyRange(setting, match) {
        return {
            startLineNumber: setting.keyRange.startLineNumber,
            startColumn: setting.keyRange.startColumn + match.start,
            endLineNumber: setting.keyRange.startLineNumber,
            endColumn: setting.keyRange.startColumn + match.end,
        };
    }
    toDescriptionRange(setting, match, lineIndex) {
        const descriptionRange = setting.descriptionRanges[lineIndex];
        if (!descriptionRange) {
            // This case occurs with added settings such as the
            // manage extension setting.
            return nullRange;
        }
        return {
            startLineNumber: descriptionRange.startLineNumber,
            startColumn: descriptionRange.startColumn + match.start,
            endLineNumber: descriptionRange.endLineNumber,
            endColumn: descriptionRange.startColumn + match.end,
        };
    }
    toValueRange(setting, match) {
        return {
            startLineNumber: setting.valueRange.startLineNumber,
            startColumn: setting.valueRange.startColumn + match.start + 1,
            endLineNumber: setting.valueRange.startLineNumber,
            endColumn: setting.valueRange.startColumn + match.end + 1,
        };
    }
}
class AiRelatedInformationSearchKeysProvider {
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.settingKeys = [];
        this.settingsRecord = {};
    }
    updateModel(preferencesModel) {
        if (preferencesModel === this.currentPreferencesModel) {
            return;
        }
        this.currentPreferencesModel = preferencesModel;
        this.refresh();
    }
    refresh() {
        this.settingKeys = [];
        this.settingsRecord = {};
        if (!this.currentPreferencesModel || !this.aiRelatedInformationService.isEnabled()) {
            return;
        }
        for (const group of this.currentPreferencesModel.settingsGroups) {
            if (group.id === 'mostCommonlyUsed') {
                continue;
            }
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this.settingKeys.push(setting.key);
                    this.settingsRecord[setting.key] = setting;
                }
            }
        }
    }
    getSettingKeys() {
        return this.settingKeys;
    }
    getSettingsRecord() {
        return this.settingsRecord;
    }
}
let AiRelatedInformationSearchProvider = class AiRelatedInformationSearchProvider {
    static { AiRelatedInformationSearchProvider_1 = this; }
    static { this.AI_RELATED_INFORMATION_MAX_PICKS = 5; }
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this._filter = '';
        this._keysProvider = new AiRelatedInformationSearchKeysProvider(aiRelatedInformationService);
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter || !this.aiRelatedInformationService.isEnabled()) {
            return null;
        }
        this._keysProvider.updateModel(preferencesModel);
        return {
            filterMatches: await this.getAiRelatedInformationItems(token),
            exactMatch: false,
        };
    }
    async getAiRelatedInformationItems(token) {
        const settingsRecord = this._keysProvider.getSettingsRecord();
        const filterMatches = [];
        const relatedInformation = (await this.aiRelatedInformationService.getRelatedInformation(this._filter, [RelatedInformationType.SettingInformation], token));
        relatedInformation.sort((a, b) => b.weight - a.weight);
        for (const info of relatedInformation) {
            if (filterMatches.length === AiRelatedInformationSearchProvider_1.AI_RELATED_INFORMATION_MAX_PICKS) {
                break;
            }
            const pick = info.setting;
            filterMatches.push({
                setting: settingsRecord[pick],
                matches: [settingsRecord[pick].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: info.weight,
            });
        }
        return filterMatches;
    }
};
AiRelatedInformationSearchProvider = AiRelatedInformationSearchProvider_1 = __decorate([
    __param(0, IAiRelatedInformationService)
], AiRelatedInformationSearchProvider);
class TfIdfSearchProvider {
    static { this.TF_IDF_PRE_NORMALIZE_THRESHOLD = 50; }
    static { this.TF_IDF_POST_NORMALIZE_THRESHOLD = 0.7; }
    static { this.TF_IDF_MAX_PICKS = 5; }
    constructor() {
        this._filter = '';
        this._documents = [];
        this._settingsRecord = {};
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    settingItemToEmbeddingString(item) {
        let result = `Setting Id: ${item.key}\n`;
        result += `Label: ${this.keyToLabel(item.key)}\n`;
        result += `Description: ${item.description}\n`;
        return result;
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter) {
            return null;
        }
        if (this._currentPreferencesModel !== preferencesModel) {
            // Refresh the documents and settings record
            this._currentPreferencesModel = preferencesModel;
            this._documents = [];
            this._settingsRecord = {};
            for (const group of preferencesModel.settingsGroups) {
                if (group.id === 'mostCommonlyUsed') {
                    continue;
                }
                for (const section of group.sections) {
                    for (const setting of section.settings) {
                        this._documents.push({
                            key: setting.key,
                            textChunks: [this.settingItemToEmbeddingString(setting)],
                        });
                        this._settingsRecord[setting.key] = setting;
                    }
                }
            }
        }
        return {
            filterMatches: await this.getTfIdfItems(token),
            exactMatch: false,
        };
    }
    async getTfIdfItems(token) {
        const filterMatches = [];
        const tfIdfCalculator = new TfIdfCalculator();
        tfIdfCalculator.updateDocuments(this._documents);
        const tfIdfRankings = tfIdfCalculator.calculateScores(this._filter, token);
        tfIdfRankings.sort((a, b) => b.score - a.score);
        const maxScore = tfIdfRankings[0].score;
        if (maxScore < TfIdfSearchProvider.TF_IDF_PRE_NORMALIZE_THRESHOLD) {
            // Reject all the matches.
            return [];
        }
        for (const info of tfIdfRankings) {
            if (info.score / maxScore < TfIdfSearchProvider.TF_IDF_POST_NORMALIZE_THRESHOLD ||
                filterMatches.length === TfIdfSearchProvider.TF_IDF_MAX_PICKS) {
                break;
            }
            const pick = info.key;
            filterMatches.push({
                setting: this._settingsRecord[pick],
                matches: [this._settingsRecord[pick].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: info.score,
            });
        }
        return filterMatches;
    }
}
let RemoteSearchProvider = class RemoteSearchProvider {
    constructor(aiRelatedInformationService) {
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.filter = '';
    }
    initializeSearchProviders() {
        if (this.aiRelatedInformationService.isEnabled()) {
            this.adaSearchProvider ??= new AiRelatedInformationSearchProvider(this.aiRelatedInformationService);
        }
        this.tfIdfSearchProvider ??= new TfIdfSearchProvider();
    }
    setFilter(filter) {
        this.initializeSearchProviders();
        this.filter = filter;
        if (this.adaSearchProvider) {
            this.adaSearchProvider.setFilter(filter);
        }
        this.tfIdfSearchProvider.setFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this.filter) {
            return null;
        }
        if (!this.adaSearchProvider) {
            return this.tfIdfSearchProvider.searchModel(preferencesModel, token);
        }
        // Use TF-IDF search as a fallback, ref https://github.com/microsoft/vscode/issues/224946
        let results = await this.adaSearchProvider.searchModel(preferencesModel, token);
        if (results?.filterMatches.length) {
            return results;
        }
        if (!token.isCancellationRequested) {
            results = await this.tfIdfSearchProvider.searchModel(preferencesModel, token);
            if (results?.filterMatches.length) {
                return results;
            }
        }
        return null;
    }
};
RemoteSearchProvider = __decorate([
    __param(0, IAiRelatedInformationService)
], RemoteSearchProvider);
registerSingleton(IPreferencesSearchService, PreferencesSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFNTixnQkFBZ0IsRUFFaEIsb0JBQW9CLEdBRXBCLE1BQU0scURBQXFELENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUVOLDBCQUEwQixFQUMxQixnQkFBZ0IsRUFDaEIsWUFBWSxHQUNaLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTix5QkFBeUIsR0FJekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sMkJBQTJCLEdBRTNCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFHMUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsc0JBQXNCLEdBRXRCLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBaUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkRBQTJELENB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