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
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { FileAccess } from '../../../../base/common/network.js';
import { EXTENSION_INSTALL_DEP_PACK_CONTEXT, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { walkthroughs } from '../common/gettingStartedContent.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { walkthroughsExtensionPoint } from './gettingStartedExtensionPoint.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { dirname } from '../../../../base/common/path.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize, localize2 } from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { checkGlobFileExists } from '../../../services/extensions/common/workspaceContains.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DefaultIconPath } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
export const HasMultipleNewFileEntries = new RawContextKey('hasMultipleNewFileEntries', false);
export const IWalkthroughsService = createDecorator('walkthroughsService');
export const hiddenEntriesConfigurationKey = 'workbench.welcomePage.hiddenCategories';
export const walkthroughMetadataConfigurationKey = 'workbench.welcomePage.walkthroughMetadata';
const BUILT_IN_SOURCE = localize('builtin', 'Built-In');
// Show walkthrough as "new" for 7 days after first install
const DAYS = 24 * 60 * 60 * 1000;
const NEW_WALKTHROUGH_TIME = 7 * DAYS;
let WalkthroughsService = class WalkthroughsService extends Disposable {
    constructor(storageService, commandService, instantiationService, workspaceContextService, contextService, userDataSyncEnablementService, configurationService, extensionManagementService, hostService, viewsService, telemetryService, tasExperimentService, productService, layoutService) {
        super();
        this.storageService = storageService;
        this.commandService = commandService;
        this.instantiationService = instantiationService;
        this.workspaceContextService = workspaceContextService;
        this.contextService = contextService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.hostService = hostService;
        this.viewsService = viewsService;
        this.telemetryService = telemetryService;
        this.tasExperimentService = tasExperimentService;
        this.productService = productService;
        this.layoutService = layoutService;
        this._onDidAddWalkthrough = new Emitter();
        this.onDidAddWalkthrough = this._onDidAddWalkthrough.event;
        this._onDidRemoveWalkthrough = new Emitter();
        this.onDidRemoveWalkthrough = this._onDidRemoveWalkthrough.event;
        this._onDidChangeWalkthrough = new Emitter();
        this.onDidChangeWalkthrough = this._onDidChangeWalkthrough.event;
        this._onDidProgressStep = new Emitter();
        this.onDidProgressStep = this._onDidProgressStep.event;
        this.sessionEvents = new Set();
        this.completionListeners = new Map();
        this.gettingStartedContributions = new Map();
        this.steps = new Map();
        this.sessionInstalledExtensions = new Set();
        this.categoryVisibilityContextKeys = new Set();
        this.stepCompletionContextKeyExpressions = new Set();
        this.stepCompletionContextKeys = new Set();
        this.metadata = new Map(JSON.parse(this.storageService.get(walkthroughMetadataConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
        this.memento = new Memento('gettingStartedService', this.storageService);
        this.stepProgress = this.memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.initCompletionEventListeners();
        HasMultipleNewFileEntries.bindTo(this.contextService).set(false);
        this.registerWalkthroughs();
    }
    registerWalkthroughs() {
        walkthroughs.forEach(async (category, index) => {
            this._registerWalkthrough({
                ...category,
                icon: { type: 'icon', icon: category.icon },
                order: walkthroughs.length - index,
                source: BUILT_IN_SOURCE,
                when: ContextKeyExpr.deserialize(category.when) ?? ContextKeyExpr.true(),
                steps: category.content.steps.map((step, index) => {
                    return {
                        ...step,
                        completionEvents: step.completionEvents ?? [],
                        description: parseDescription(step.description),
                        category: category.id,
                        order: index,
                        when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                        media: step.media.type === 'image'
                            ? {
                                type: 'image',
                                altText: step.media.altText,
                                path: convertInternalMediaPathsToBrowserURIs(step.media.path),
                            }
                            : step.media.type === 'svg'
                                ? {
                                    type: 'svg',
                                    altText: step.media.altText,
                                    path: convertInternalMediaPathToFileURI(step.media.path).with({
                                        query: JSON.stringify({
                                            moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' +
                                                step.media.path,
                                        }),
                                    }),
                                }
                                : step.media.type === 'markdown'
                                    ? {
                                        type: 'markdown',
                                        path: convertInternalMediaPathToFileURI(step.media.path).with({
                                            query: JSON.stringify({
                                                moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' +
                                                    step.media.path,
                                            }),
                                        }),
                                        base: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                    }
                                    : {
                                        type: 'video',
                                        path: convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.path),
                                        altText: step.media.altText,
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        poster: step.media.poster
                                            ? convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.poster)
                                            : undefined,
                                    },
                    };
                }),
            });
        });
        walkthroughsExtensionPoint.setHandler((_, { added, removed }) => {
            added.map((e) => this.registerExtensionWalkthroughContributions(e.description));
            removed.map((e) => this.unregisterExtensionWalkthroughContributions(e.description));
        });
    }
    initCompletionEventListeners() {
        this._register(this.commandService.onDidExecuteCommand((command) => this.progressByEvent(`onCommand:${command.commandId}`)));
        this.extensionManagementService.getInstalled().then((installed) => {
            installed.forEach((ext) => this.progressByEvent(`extensionInstalled:${ext.identifier.id.toLowerCase()}`));
        });
        this._register(this.extensionManagementService.onDidInstallExtensions((result) => {
            if (result.some((e) => ExtensionIdentifier.equals(this.productService.defaultChatAgent?.extensionId, e.identifier.id) && !e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT])) {
                result.forEach((e) => {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                    this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
                });
                return;
            }
            for (const e of result) {
                const skipWalkthrough = e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT] ||
                    e?.context?.[EXTENSION_INSTALL_DEP_PACK_CONTEXT];
                // If the window had last focus and the install didn't specify to skip the walkthrough
                // Then add it to the sessionInstallExtensions to be opened
                if (!skipWalkthrough) {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                }
                this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
            }
        }));
        this._register(this.contextService.onDidChangeContext((event) => {
            if (event.affectsSome(this.stepCompletionContextKeys)) {
                this.stepCompletionContextKeyExpressions.forEach((expression) => {
                    if (event.affectsSome(new Set(expression.keys())) &&
                        this.contextService.contextMatchesRules(expression)) {
                        this.progressByEvent(`onContext:` + expression.serialize());
                    }
                });
            }
        }));
        this._register(this.viewsService.onDidChangeViewVisibility((e) => {
            if (e.visible) {
                this.progressByEvent('onView:' + e.id);
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            e.affectedKeys.forEach((key) => {
                this.progressByEvent('onSettingChanged:' + key);
            });
        }));
        if (this.userDataSyncEnablementService.isEnabled()) {
            this.progressByEvent('onEvent:sync-enabled');
        }
        this._register(this.userDataSyncEnablementService.onDidChangeEnablement(() => {
            if (this.userDataSyncEnablementService.isEnabled()) {
                this.progressByEvent('onEvent:sync-enabled');
            }
        }));
    }
    markWalkthroughOpened(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        const prior = this.metadata.get(id);
        if (prior && walkthrough) {
            this.metadata.set(id, {
                ...prior,
                manaullyOpened: true,
                stepIDs: walkthrough.steps.map((s) => s.id),
            });
        }
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async registerExtensionWalkthroughContributions(extension) {
        const convertExtensionPathToFileURI = (path) => path.startsWith('https://')
            ? URI.parse(path, true)
            : FileAccess.uriToFileUri(joinPath(extension.extensionLocation, path));
        const convertExtensionRelativePathsToBrowserURIs = (path) => {
            const convertPath = (path) => path.startsWith('https://')
                ? URI.parse(path, true)
                : FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, path));
            if (typeof path === 'string') {
                const converted = convertPath(path);
                return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
            }
            else {
                return {
                    hcDark: convertPath(path.hc),
                    hcLight: convertPath(path.hcLight ?? path.light),
                    light: convertPath(path.light),
                    dark: convertPath(path.dark),
                };
            }
        };
        if (!extension.contributes?.walkthroughs?.length) {
            return;
        }
        let sectionToOpen;
        let sectionToOpenIndex = Math.min(); // '+Infinity';
        await Promise.all(extension.contributes?.walkthroughs?.map(async (walkthrough, index) => {
            const categoryID = extension.identifier.value + '#' + walkthrough.id;
            const isNewlyInstalled = !this.metadata.get(categoryID);
            if (isNewlyInstalled) {
                this.metadata.set(categoryID, {
                    firstSeen: +new Date(),
                    stepIDs: walkthrough.steps?.map((s) => s.id) ?? [],
                    manaullyOpened: false,
                });
            }
            const override = await Promise.race([
                this.tasExperimentService?.getTreatment(`gettingStarted.overrideCategory.${extension.identifier.value + '.' + walkthrough.id}.when`),
                new Promise((resolve) => setTimeout(() => resolve(walkthrough.when), 5000)),
            ]);
            if (this.sessionInstalledExtensions.has(extension.identifier.value.toLowerCase()) &&
                this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true())) {
                this.sessionInstalledExtensions.delete(extension.identifier.value.toLowerCase());
                if (index < sectionToOpenIndex && isNewlyInstalled) {
                    sectionToOpen = categoryID;
                    sectionToOpenIndex = index;
                }
            }
            const steps = (walkthrough.steps ?? []).map((step, index) => {
                const description = parseDescription(step.description || '');
                const fullyQualifiedID = extension.identifier.value + '#' + walkthrough.id + '#' + step.id;
                let media;
                if (!step.media) {
                    throw Error('missing media in walkthrough step: ' + walkthrough.id + '@' + step.id);
                }
                if (step.media.image) {
                    const altText = step.media.altText;
                    if (altText === undefined) {
                        console.error('Walkthrough item:', fullyQualifiedID, 'is missing altText for its media element.');
                    }
                    media = {
                        type: 'image',
                        altText,
                        path: convertExtensionRelativePathsToBrowserURIs(step.media.image),
                    };
                }
                else if (step.media.markdown) {
                    media = {
                        type: 'markdown',
                        path: convertExtensionPathToFileURI(step.media.markdown),
                        base: convertExtensionPathToFileURI(dirname(step.media.markdown)),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                    };
                }
                else if (step.media.svg) {
                    media = {
                        type: 'svg',
                        path: convertExtensionPathToFileURI(step.media.svg),
                        altText: step.media.svg,
                    };
                }
                else if (step.media.video) {
                    const baseURI = FileAccess.uriToFileUri(extension.extensionLocation);
                    media = {
                        type: 'video',
                        path: convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.video),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                        altText: step.media.altText,
                        poster: step.media.poster
                            ? convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.poster)
                            : undefined,
                    };
                }
                // Throw error for unknown walkthrough format
                else {
                    throw new Error('Unknown walkthrough format detected for ' + fullyQualifiedID);
                }
                return {
                    description,
                    media,
                    completionEvents: step.completionEvents?.filter((x) => typeof x === 'string') ?? [],
                    id: fullyQualifiedID,
                    title: step.title,
                    when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                    category: categoryID,
                    order: index,
                };
            });
            let isFeatured = false;
            if (walkthrough.featuredFor) {
                const folders = this.workspaceContextService.getWorkspace().folders.map((f) => f.uri);
                const token = new CancellationTokenSource();
                setTimeout(() => token.cancel(), 2000);
                isFeatured = await this.instantiationService.invokeFunction((a) => checkGlobFileExists(a, folders, walkthrough.featuredFor, token.token));
            }
            const iconStr = walkthrough.icon ?? extension.icon;
            const walkthoughDescriptor = {
                description: walkthrough.description,
                title: walkthrough.title,
                id: categoryID,
                isFeatured,
                source: extension.displayName ?? extension.name,
                order: 0,
                walkthroughPageTitle: extension.displayName ?? extension.name,
                steps,
                icon: {
                    type: 'image',
                    path: iconStr
                        ? FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, iconStr)).toString(true)
                        : DefaultIconPath,
                },
                when: ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true(),
            };
            this._registerWalkthrough(walkthoughDescriptor);
            this._onDidAddWalkthrough.fire(this.resolveWalkthrough(walkthoughDescriptor));
        }));
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const hadLastFoucs = await this.hostService.hadLastFocus();
        if (hadLastFoucs &&
            sectionToOpen &&
            this.configurationService.getValue('workbench.welcomePage.walkthroughs.openOnInstall')) {
            this.telemetryService.publicLog2('gettingStarted.didAutoOpenWalkthrough', { id: sectionToOpen });
            this.commandService.executeCommand('workbench.action.openWalkthrough', sectionToOpen, {
                inactive: this.layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */), // do not steal the active editor away
            });
        }
    }
    unregisterExtensionWalkthroughContributions(extension) {
        if (!extension.contributes?.walkthroughs?.length) {
            return;
        }
        extension.contributes?.walkthroughs?.forEach((section) => {
            const categoryID = extension.identifier.value + '#' + section.id;
            section.steps.forEach((step) => {
                const fullyQualifiedID = extension.identifier.value + '#' + section.id + '#' + step.id;
                this.steps.delete(fullyQualifiedID);
            });
            this.gettingStartedContributions.delete(categoryID);
            this._onDidRemoveWalkthrough.fire(categoryID);
        });
    }
    getWalkthrough(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        if (!walkthrough) {
            throw Error('Trying to get unknown walkthrough: ' + id);
        }
        return this.resolveWalkthrough(walkthrough);
    }
    getWalkthroughs() {
        const registeredCategories = [...this.gettingStartedContributions.values()];
        const categoriesWithCompletion = registeredCategories
            .map((category) => {
            return {
                ...category,
                content: {
                    type: 'steps',
                    steps: category.steps,
                },
            };
        })
            .filter((category) => category.content.type !== 'steps' || category.content.steps.length)
            .map((category) => this.resolveWalkthrough(category));
        return categoriesWithCompletion;
    }
    resolveWalkthrough(category) {
        const stepsWithProgress = category.steps.map((step) => this.getStepProgress(step));
        const hasOpened = this.metadata.get(category.id)?.manaullyOpened;
        const firstSeenDate = this.metadata.get(category.id)?.firstSeen;
        const isNew = firstSeenDate && firstSeenDate > +new Date() - NEW_WALKTHROUGH_TIME;
        const lastStepIDs = this.metadata.get(category.id)?.stepIDs;
        const rawCategory = this.gettingStartedContributions.get(category.id);
        if (!rawCategory) {
            throw Error('Could not find walkthrough with id ' + category.id);
        }
        const currentStepIds = rawCategory.steps.map((s) => s.id);
        const hasNewSteps = lastStepIDs &&
            (currentStepIds.length !== lastStepIDs.length ||
                currentStepIds.some((id, index) => id !== lastStepIDs[index]));
        let recencyBonus = 0;
        if (firstSeenDate) {
            const currentDate = +new Date();
            const timeSinceFirstSeen = currentDate - firstSeenDate;
            recencyBonus = Math.max(0, (NEW_WALKTHROUGH_TIME - timeSinceFirstSeen) / NEW_WALKTHROUGH_TIME);
        }
        return {
            ...category,
            recencyBonus,
            steps: stepsWithProgress,
            newItems: !!hasNewSteps,
            newEntry: !!(isNew && !hasOpened),
        };
    }
    getStepProgress(step) {
        return {
            ...step,
            done: false,
            ...this.stepProgress[step.id],
        };
    }
    progressStep(id) {
        const oldProgress = this.stepProgress[id];
        if (!oldProgress || oldProgress.done !== true) {
            this.stepProgress[id] = { done: true };
            this.memento.saveMemento();
            const step = this.getStep(id);
            if (!step) {
                throw Error('Tried to progress unknown step');
            }
            this._onDidProgressStep.fire(this.getStepProgress(step));
        }
    }
    deprogressStep(id) {
        delete this.stepProgress[id];
        this.memento.saveMemento();
        const step = this.getStep(id);
        this._onDidProgressStep.fire(this.getStepProgress(step));
    }
    progressByEvent(event) {
        if (this.sessionEvents.has(event)) {
            return;
        }
        this.sessionEvents.add(event);
        this.completionListeners.get(event)?.forEach((id) => this.progressStep(id));
    }
    registerWalkthrough(walkthoughDescriptor) {
        this._registerWalkthrough({
            ...walkthoughDescriptor,
            steps: walkthoughDescriptor.steps.map((step) => ({
                ...step,
                description: parseDescription(step.description),
            })),
        });
    }
    _registerWalkthrough(walkthroughDescriptor) {
        const oldCategory = this.gettingStartedContributions.get(walkthroughDescriptor.id);
        if (oldCategory) {
            console.error(`Skipping attempt to overwrite walkthrough. (${walkthroughDescriptor.id})`);
            return;
        }
        this.gettingStartedContributions.set(walkthroughDescriptor.id, walkthroughDescriptor);
        walkthroughDescriptor.steps.forEach((step) => {
            if (this.steps.has(step.id)) {
                throw Error('Attempting to register step with id ' + step.id + ' twice. Second is dropped.');
            }
            this.steps.set(step.id, step);
            step.when.keys().forEach((key) => this.categoryVisibilityContextKeys.add(key));
            this.registerDoneListeners(step);
        });
        walkthroughDescriptor.when.keys().forEach((key) => this.categoryVisibilityContextKeys.add(key));
    }
    registerDoneListeners(step) {
        if (step.doneOn) {
            console.error(`wakthrough step`, step, `uses deprecated 'doneOn' property. Adopt 'completionEvents' to silence this warning`);
            return;
        }
        if (!step.completionEvents.length) {
            step.completionEvents = coalesce(step.description
                .filter((linkedText) => linkedText.nodes.length === 1) // only buttons
                .flatMap((linkedText) => linkedText.nodes
                .filter((node) => typeof node !== 'string')
                .map(({ href }) => {
                if (href.startsWith('command:')) {
                    return ('onCommand:' +
                        href.slice('command:'.length, href.includes('?') ? href.indexOf('?') : undefined));
                }
                if (href.startsWith('https://') || href.startsWith('http://')) {
                    return 'onLink:' + href;
                }
                return undefined;
            })));
        }
        if (!step.completionEvents.length) {
            step.completionEvents.push('stepSelected');
        }
        for (let event of step.completionEvents) {
            const [_, eventType, argument] = /^([^:]*):?(.*)$/.exec(event) ?? [];
            if (!eventType) {
                console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                continue;
            }
            switch (eventType) {
                case 'onLink':
                case 'onEvent':
                case 'onView':
                case 'onSettingChanged':
                    break;
                case 'onContext': {
                    const expression = ContextKeyExpr.deserialize(argument);
                    if (expression) {
                        this.stepCompletionContextKeyExpressions.add(expression);
                        expression.keys().forEach((key) => this.stepCompletionContextKeys.add(key));
                        event = eventType + ':' + expression.serialize();
                        if (this.contextService.contextMatchesRules(expression)) {
                            this.sessionEvents.add(event);
                        }
                    }
                    else {
                        console.error('Unable to parse context key expression:', expression, 'in walkthrough step', step.id);
                    }
                    break;
                }
                case 'onStepSelected':
                case 'stepSelected':
                    event = 'stepSelected:' + step.id;
                    break;
                case 'onCommand':
                    event = eventType + ':' + argument.replace(/^toSide:/, '');
                    break;
                case 'onExtensionInstalled':
                case 'extensionInstalled':
                    event = 'extensionInstalled:' + argument.toLowerCase();
                    break;
                default:
                    console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                    continue;
            }
            this.registerCompletionListener(event, step);
        }
    }
    registerCompletionListener(event, step) {
        if (!this.completionListeners.has(event)) {
            this.completionListeners.set(event, new Set());
        }
        this.completionListeners.get(event)?.add(step.id);
    }
    getStep(id) {
        const step = this.steps.get(id);
        if (!step) {
            throw Error('Attempting to access step which does not exist in registry ' + id);
        }
        return step;
    }
};
WalkthroughsService = __decorate([
    __param(0, IStorageService),
    __param(1, ICommandService),
    __param(2, IInstantiationService),
    __param(3, IWorkspaceContextService),
    __param(4, IContextKeyService),
    __param(5, IUserDataSyncEnablementService),
    __param(6, IConfigurationService),
    __param(7, IExtensionManagementService),
    __param(8, IHostService),
    __param(9, IViewsService),
    __param(10, ITelemetryService),
    __param(11, IWorkbenchAssignmentService),
    __param(12, IProductService),
    __param(13, IWorkbenchLayoutService)
], WalkthroughsService);
export { WalkthroughsService };
export const parseDescription = (desc) => desc
    .split('\n')
    .filter((x) => x)
    .map((text) => parseLinkedText(text));
export const convertInternalMediaPathToFileURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asFileUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathToBrowserURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asBrowserUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathsToBrowserURIs = (path) => {
    if (typeof path === 'string') {
        const converted = convertInternalMediaPathToBrowserURI(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertInternalMediaPathToBrowserURI(path.hc),
            hcLight: convertInternalMediaPathToBrowserURI(path.hcLight ?? path.light),
            light: convertInternalMediaPathToBrowserURI(path.light),
            dark: convertInternalMediaPathToBrowserURI(path.dark),
        };
    }
};
const convertRelativeMediaPathsToWebviewURIs = (basePath, path) => {
    const convertPath = (path) => path.startsWith('https://') ? URI.parse(path, true) : asWebviewUri(joinPath(basePath, path));
    if (typeof path === 'string') {
        const converted = convertPath(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertPath(path.hc),
            hcLight: convertPath(path.hcLight ?? path.light),
            light: convertPath(path.light),
            dark: convertPath(path.dark),
        };
    }
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'resetGettingStartedProgress',
            category: localize2('developer', 'Developer'),
            title: localize2('resetWelcomePageWalkthroughProgress', 'Reset Welcome Page Walkthrough Progress'),
            f1: true,
            metadata: {
                description: localize2('resetGettingStartedProgressDescription', 'Reset the progress of all Walkthrough steps on the Welcome Page to make them appear as if they are being viewed for the first time, providing a fresh start to the getting started experience.'),
            },
        });
    }
    run(accessor) {
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const storageService = accessor.get(IStorageService);
        storageService.store(hiddenEntriesConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const memento = new Memento('gettingStartedService', accessor.get(IStorageService));
        const record = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        for (const key in record) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
                try {
                    gettingStartedService.deprogressStep(key);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        memento.saveMemento();
    }
});
registerSingleton(IWalkthroughsService, WalkthroughsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLDBDQUEwQyxFQUMxQywyQkFB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