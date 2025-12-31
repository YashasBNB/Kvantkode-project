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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3ByZWZlcmVuY2VzU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBTU4sZ0JBQWdCLEVBRWhCLG9CQUFvQixHQUVwQixNQUFNLHFEQUFxRCxDQUFBO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFFTiwwQkFBMEIsRUFDMUIsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04seUJBQXlCLEdBSXpCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLDJCQUEyQixHQUUzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRzFILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHNCQUFzQixHQUV0QixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQWlCLE1BQU0sa0NBQWtDLENBQUE7QUFFakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FB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