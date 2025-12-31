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
import { ExtensionRecommendations, } from './extensionRecommendations.js';
import { IExtensionIgnoredRecommendationsService, } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { localize } from '../../../../nls.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, extname } from '../../../../base/common/resources.js';
import { match } from '../../../../base/common/glob.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IExtensionRecommendationNotificationService, } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { distinct } from '../../../../base/common/arrays.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
const promptedRecommendationsStorageKey = 'fileBasedRecommendations/promptedRecommendations';
const recommendationsStorageKey = 'extensionsAssistant/recommendations';
const milliSecondsInADay = 1000 * 60 * 60 * 24;
let FileBasedRecommendations = class FileBasedRecommendations extends ExtensionRecommendations {
    get recommendations() {
        const recommendations = [];
        [...this.fileBasedRecommendations.keys()]
            .sort((a, b) => {
            if (this.fileBasedRecommendations.get(a).recommendedTime ===
                this.fileBasedRecommendations.get(b).recommendedTime) {
                if (this.fileBasedImportantRecommendations.has(a)) {
                    return -1;
                }
                if (this.fileBasedImportantRecommendations.has(b)) {
                    return 1;
                }
            }
            return this.fileBasedRecommendations.get(a).recommendedTime >
                this.fileBasedRecommendations.get(b).recommendedTime
                ? -1
                : 1;
        })
            .forEach((extensionId) => {
            recommendations.push({
                extension: extensionId,
                reason: {
                    reasonId: 1 /* ExtensionRecommendationReason.File */,
                    reasonText: localize('fileBasedRecommendation', 'This extension is recommended based on the files you recently opened.'),
                },
            });
        });
        return recommendations;
    }
    get importantRecommendations() {
        return this.recommendations.filter((e) => this.fileBasedImportantRecommendations.has(e.extension));
    }
    get otherRecommendations() {
        return this.recommendations.filter((e) => !this.fileBasedImportantRecommendations.has(e.extension));
    }
    constructor(extensionsWorkbenchService, modelService, languageService, productService, storageService, extensionRecommendationNotificationService, extensionIgnoredRecommendationsService, workspaceContextService) {
        super();
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.storageService = storageService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.extensionIgnoredRecommendationsService = extensionIgnoredRecommendationsService;
        this.workspaceContextService = workspaceContextService;
        this.recommendationsByPattern = new Map();
        this.fileBasedRecommendations = new Map();
        this.fileBasedImportantRecommendations = new Set();
        this.fileOpenRecommendations = {};
        if (productService.extensionRecommendations) {
            for (const [extensionId, recommendation] of Object.entries(productService.extensionRecommendations)) {
                if (recommendation.onFileOpen) {
                    this.fileOpenRecommendations[extensionId.toLowerCase()] = recommendation.onFileOpen;
                }
            }
        }
    }
    async doActivate() {
        if (isEmptyObject(this.fileOpenRecommendations)) {
            return;
        }
        await this.extensionsWorkbenchService.whenInitialized;
        const cachedRecommendations = this.getCachedRecommendations();
        const now = Date.now();
        // Retire existing recommendations if they are older than a week or are not part of this.productService.extensionTips anymore
        Object.entries(cachedRecommendations).forEach(([key, value]) => {
            const diff = (now - value) / milliSecondsInADay;
            if (diff <= 7 && this.fileOpenRecommendations[key]) {
                this.fileBasedRecommendations.set(key.toLowerCase(), { recommendedTime: value });
            }
        });
        this._register(this.modelService.onModelAdded((model) => this.onModelAdded(model)));
        this.modelService.getModels().forEach((model) => this.onModelAdded(model));
    }
    onModelAdded(model) {
        const uri = model.uri.scheme === Schemas.vscodeNotebookCell
            ? CellUri.parse(model.uri)?.notebook
            : model.uri;
        if (!uri) {
            return;
        }
        const supportedSchemes = distinct([
            Schemas.untitled,
            Schemas.file,
            Schemas.vscodeRemote,
            ...this.workspaceContextService.getWorkspace().folders.map((folder) => folder.uri.scheme),
        ]);
        if (!uri || !supportedSchemes.includes(uri.scheme)) {
            return;
        }
        // re-schedule this bit of the operation to be off the critical path - in case glob-match is slow
        disposableTimeout(() => this.promptImportantRecommendations(uri, model), 0, this._store);
    }
    /**
     * Prompt the user to either install the recommended extension for the file type in the current editor model
     * or prompt to search the marketplace if it has extensions that can support the file type
     */
    promptImportantRecommendations(uri, model, extensionRecommendations) {
        if (model.isDisposed()) {
            return;
        }
        const pattern = extname(uri).toLowerCase();
        extensionRecommendations =
            extensionRecommendations ??
                this.recommendationsByPattern.get(pattern) ??
                this.fileOpenRecommendations;
        const extensionRecommendationEntries = Object.entries(extensionRecommendations);
        if (extensionRecommendationEntries.length === 0) {
            return;
        }
        const processedPathGlobs = new Map();
        const installed = this.extensionsWorkbenchService.local;
        const recommendationsByPattern = {};
        const matchedRecommendations = {};
        const unmatchedRecommendations = {};
        let listenOnLanguageChange = false;
        const languageId = model.getLanguageId();
        for (const [extensionId, conditions] of extensionRecommendationEntries) {
            const conditionsByPattern = [];
            const matchedConditions = [];
            const unmatchedConditions = [];
            for (const condition of conditions) {
                let languageMatched = false;
                let pathGlobMatched = false;
                const isLanguageCondition = !!condition.languages;
                const isFileContentCondition = !!condition.contentPattern;
                if (isLanguageCondition || isFileContentCondition) {
                    conditionsByPattern.push(condition);
                }
                if (isLanguageCondition) {
                    if (condition.languages.includes(languageId)) {
                        languageMatched = true;
                    }
                }
                if (condition.pathGlob) {
                    const pathGlob = condition.pathGlob;
                    if (processedPathGlobs.get(pathGlob) ??
                        match(condition.pathGlob, uri.with({ fragment: '' }).toString())) {
                        pathGlobMatched = true;
                    }
                    processedPathGlobs.set(pathGlob, pathGlobMatched);
                }
                let matched = languageMatched || pathGlobMatched;
                // If the resource has pattern (extension) and not matched, then we don't need to check the other conditions
                if (pattern && !matched) {
                    continue;
                }
                if (matched && condition.whenInstalled) {
                    if (!condition.whenInstalled.every((id) => installed.some((local) => areSameExtensions({ id }, local.identifier)))) {
                        matched = false;
                    }
                }
                if (matched && condition.whenNotInstalled) {
                    if (installed.some((local) => condition.whenNotInstalled?.some((id) => areSameExtensions({ id }, local.identifier)))) {
                        matched = false;
                    }
                }
                if (matched && isFileContentCondition) {
                    if (!model.findMatches(condition.contentPattern, false, true, false, null, false).length) {
                        matched = false;
                    }
                }
                if (matched) {
                    matchedConditions.push(condition);
                    conditionsByPattern.pop();
                }
                else {
                    if (isLanguageCondition || isFileContentCondition) {
                        unmatchedConditions.push(condition);
                        if (isLanguageCondition) {
                            listenOnLanguageChange = true;
                        }
                    }
                }
            }
            if (matchedConditions.length) {
                matchedRecommendations[extensionId] = matchedConditions;
            }
            if (unmatchedConditions.length) {
                unmatchedRecommendations[extensionId] = unmatchedConditions;
            }
            if (conditionsByPattern.length) {
                recommendationsByPattern[extensionId] = conditionsByPattern;
            }
        }
        if (pattern) {
            this.recommendationsByPattern.set(pattern, recommendationsByPattern);
        }
        if (Object.keys(unmatchedRecommendations).length) {
            if (listenOnLanguageChange) {
                const disposables = new DisposableStore();
                disposables.add(model.onDidChangeLanguage(() => {
                    // re-schedule this bit of the operation to be off the critical path - in case glob-match is slow
                    disposableTimeout(() => {
                        if (!disposables.isDisposed) {
                            this.promptImportantRecommendations(uri, model, unmatchedRecommendations);
                            disposables.dispose();
                        }
                    }, 0, disposables);
                }));
                disposables.add(model.onWillDispose(() => disposables.dispose()));
            }
        }
        if (Object.keys(matchedRecommendations).length) {
            this.promptFromRecommendations(uri, model, matchedRecommendations);
        }
    }
    promptFromRecommendations(uri, model, extensionRecommendations) {
        let isImportantRecommendationForLanguage = false;
        const importantRecommendations = new Set();
        const fileBasedRecommendations = new Set();
        for (const [extensionId, conditions] of Object.entries(extensionRecommendations)) {
            for (const condition of conditions) {
                fileBasedRecommendations.add(extensionId);
                if (condition.important) {
                    importantRecommendations.add(extensionId);
                    this.fileBasedImportantRecommendations.add(extensionId);
                }
                if (condition.languages) {
                    isImportantRecommendationForLanguage = true;
                }
            }
        }
        // Update file based recommendations
        for (const recommendation of fileBasedRecommendations) {
            const filedBasedRecommendation = this.fileBasedRecommendations.get(recommendation) || {
                recommendedTime: Date.now(),
                sources: [],
            };
            filedBasedRecommendation.recommendedTime = Date.now();
            this.fileBasedRecommendations.set(recommendation, filedBasedRecommendation);
        }
        this.storeCachedRecommendations();
        if (this.extensionRecommendationNotificationService.hasToIgnoreRecommendationNotifications()) {
            return;
        }
        const language = model.getLanguageId();
        const languageName = this.languageService.getLanguageName(language);
        if (importantRecommendations.size &&
            this.promptRecommendedExtensionForFileType(languageName && isImportantRecommendationForLanguage && language !== PLAINTEXT_LANGUAGE_ID
                ? localize('languageName', 'the {0} language', languageName)
                : basename(uri), language, [...importantRecommendations])) {
            return;
        }
    }
    promptRecommendedExtensionForFileType(name, language, recommendations) {
        recommendations = this.filterIgnoredOrNotAllowed(recommendations);
        if (recommendations.length === 0) {
            return false;
        }
        recommendations = this.filterInstalled(recommendations, this.extensionsWorkbenchService.local).filter((extensionId) => this.fileBasedImportantRecommendations.has(extensionId));
        const promptedRecommendations = language !== PLAINTEXT_LANGUAGE_ID ? this.getPromptedRecommendations()[language] : undefined;
        if (promptedRecommendations) {
            recommendations = recommendations.filter((extensionId) => promptedRecommendations.includes(extensionId));
        }
        if (recommendations.length === 0) {
            return false;
        }
        this.promptImportantExtensionsInstallNotification(recommendations, name, language);
        return true;
    }
    async promptImportantExtensionsInstallNotification(extensions, name, language) {
        try {
            const result = await this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification({ extensions, name, source: 1 /* RecommendationSource.FILE */ });
            if (result === "reacted" /* RecommendationsNotificationResult.Accepted */) {
                this.addToPromptedRecommendations(language, extensions);
            }
        }
        catch (error) {
            /* Ignore */
        }
    }
    getPromptedRecommendations() {
        return JSON.parse(this.storageService.get(promptedRecommendationsStorageKey, 0 /* StorageScope.PROFILE */, '{}'));
    }
    addToPromptedRecommendations(language, extensions) {
        const promptedRecommendations = this.getPromptedRecommendations();
        promptedRecommendations[language] = distinct([
            ...(promptedRecommendations[language] ?? []),
            ...extensions,
        ]);
        this.storageService.store(promptedRecommendationsStorageKey, JSON.stringify(promptedRecommendations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    filterIgnoredOrNotAllowed(recommendationsToSuggest) {
        const ignoredRecommendations = [
            ...this.extensionIgnoredRecommendationsService.ignoredRecommendations,
            ...this.extensionRecommendationNotificationService.ignoredRecommendations,
        ];
        return recommendationsToSuggest.filter((id) => !ignoredRecommendations.includes(id));
    }
    filterInstalled(recommendationsToSuggest, installed) {
        const installedExtensionsIds = installed.reduce((result, i) => {
            if (i.enablementState !== 1 /* EnablementState.DisabledByExtensionKind */) {
                result.add(i.identifier.id.toLowerCase());
            }
            return result;
        }, new Set());
        return recommendationsToSuggest.filter((id) => !installedExtensionsIds.has(id.toLowerCase()));
    }
    getCachedRecommendations() {
        let storedRecommendations = JSON.parse(this.storageService.get(recommendationsStorageKey, 0 /* StorageScope.PROFILE */, '[]'));
        if (Array.isArray(storedRecommendations)) {
            storedRecommendations = storedRecommendations.reduce((result, id) => {
                result[id] = Date.now();
                return result;
            }, {});
        }
        const result = {};
        Object.entries(storedRecommendations).forEach(([key, value]) => {
            if (typeof value === 'number') {
                result[key.toLowerCase()] = value;
            }
        });
        return result;
    }
    storeCachedRecommendations() {
        const storedRecommendations = {};
        this.fileBasedRecommendations.forEach((value, key) => (storedRecommendations[key] = value.recommendedTime));
        this.storageService.store(recommendationsStorageKey, JSON.stringify(storedRecommendations), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
};
FileBasedRecommendations = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, IProductService),
    __param(4, IStorageService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IExtensionIgnoredRecommendationsService),
    __param(7, IWorkspaceContextService)
], FileBasedRecommendations);
export { FileBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUJhc2VkUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2ZpbGVCYXNlZFJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUVOLHVDQUF1QyxHQUN2QyxNQUFNLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sRUFBRSwyQkFBMkIsRUFBYyxNQUFNLHlCQUF5QixDQUFBO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sZUFBZSxHQUVmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBU3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUNOLDJDQUEyQyxHQUczQyxNQUFNLGtGQUFrRixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5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