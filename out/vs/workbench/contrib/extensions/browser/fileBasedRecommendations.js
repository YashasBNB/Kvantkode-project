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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUJhc2VkUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZmlsZUJhc2VkUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBRU4sdUNBQXVDLEdBQ3ZDLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLDJCQUEyQixFQUFjLE1BQU0seUJBQXlCLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixlQUFlLEdBRWYsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFTdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04sMkNBQTJDLEdBRzNDLE1BQU0sa0ZBQWtGLENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0s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