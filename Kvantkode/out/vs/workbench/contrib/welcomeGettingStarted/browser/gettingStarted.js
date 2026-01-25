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
var GettingStartedPage_1;
import { $, addDisposableListener, append, clearNode, reset, } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { coalesce, equals } from '../../../../base/common/arrays.js';
import { Delayer, Throttler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { isMacintosh, OS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/gettingStarted.css';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, WillSaveStateReason, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService, firstSessionDateStorageKey, } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles, defaultToggleStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService, isRecentFolder, isRecentWorkspace, } from '../../../../platform/workspaces/common/workspaces.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { OpenFileFolderAction, OpenFolderAction, OpenFolderViaWorkspaceAction, } from '../../../browser/actions/workspaceActions.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import './gettingStartedColors.js';
import { GettingStartedDetailsRenderer } from './gettingStartedDetailsRenderer.js';
import { gettingStartedCheckedCodicon, gettingStartedUncheckedCodicon, } from './gettingStartedIcons.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { IWalkthroughsService, hiddenEntriesConfigurationKey, parseDescription, } from './gettingStartedService.js';
import { restoreWalkthroughsConfigurationKey, } from './startupPage.js';
import { startEntries } from '../common/gettingStartedContent.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { GettingStartedIndexList } from './gettingStartedList.js';
import { AccessibleViewAction } from '../../accessibility/browser/accessibleViewActions.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
const SLIDE_TRANSITION_TIME_MS = 250;
const configurationKey = 'workbench.startupEditor';
export const allWalkthroughsHiddenContext = new RawContextKey('allWalkthroughsHidden', false);
export const inWelcomeContext = new RawContextKey('inWelcome', false);
const parsedStartEntries = startEntries.map((e, i) => ({
    command: e.content.command,
    description: e.description,
    icon: { type: 'icon', icon: e.icon },
    id: e.id,
    order: i,
    title: e.title,
    when: ContextKeyExpr.deserialize(e.when) ?? ContextKeyExpr.true(),
}));
const REDUCED_MOTION_KEY = 'workbench.welcomePage.preferReducedMotion';
let GettingStartedPage = class GettingStartedPage extends EditorPane {
    static { GettingStartedPage_1 = this; }
    static { this.ID = 'gettingStartedPage'; }
    constructor(group, commandService, productService, keybindingService, gettingStartedService, configurationService, telemetryService, languageService, fileService, openerService, themeService, storageService, extensionService, instantiationService, notificationService, groupsService, contextService, quickInputService, workspacesService, labelService, hostService, webviewService, workspaceContextService, accessibilityService) {
        super(GettingStartedPage_1.ID, group, telemetryService, themeService, storageService);
        this.commandService = commandService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.gettingStartedService = gettingStartedService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.groupsService = groupsService;
        this.quickInputService = quickInputService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.webviewService = webviewService;
        this.workspaceContextService = workspaceContextService;
        this.accessibilityService = accessibilityService;
        this.inProgressScroll = Promise.resolve();
        this.dispatchListeners = new DisposableStore();
        this.stepDisposables = new DisposableStore();
        this.detailsPageDisposables = new DisposableStore();
        this.mediaDisposables = new DisposableStore();
        this.buildSlideThrottle = new Throttler();
        this.hasScrolledToFirstCategory = false;
        this.showFeaturedWalkthrough = true;
        this.currentMediaComponent = undefined;
        this.currentMediaType = undefined;
        this.container = $('.gettingStartedContainer', {
            role: 'document',
            tabindex: 0,
            'aria-label': localize('welcomeAriaLabel', 'Overview of how to get up to speed with your editor.'),
        });
        this.stepMediaComponent = $('.getting-started-media');
        this.stepMediaComponent.id = generateUuid();
        this.categoriesSlideDisposables = this._register(new DisposableStore());
        this.detailsRenderer = new GettingStartedDetailsRenderer(this.fileService, this.notificationService, this.extensionService, this.languageService);
        this.contextService = this._register(contextService.createScoped(this.container));
        inWelcomeContext.bindTo(this.contextService).set(true);
        this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        this._register(this.dispatchListeners);
        this.buildSlideThrottle = new Throttler();
        const rerender = () => {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
            if (this.currentWalkthrough) {
                const existingSteps = this.currentWalkthrough.steps.map((step) => step.id);
                const newCategory = this.gettingStartedCategories.find((category) => this.currentWalkthrough?.id === category.id);
                if (newCategory) {
                    const newSteps = newCategory.steps.map((step) => step.id);
                    if (!equals(newSteps, existingSteps)) {
                        this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
                    }
                }
            }
            else {
                this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
            }
        };
        this._register(this.gettingStartedService.onDidAddWalkthrough(rerender));
        this._register(this.gettingStartedService.onDidRemoveWalkthrough(rerender));
        this.recentlyOpened = this.workspacesService.getRecentlyOpened();
        this._register(workspacesService.onDidChangeRecentlyOpened(() => {
            this.recentlyOpened = workspacesService.getRecentlyOpened();
            rerender();
        }));
        this._register(this.gettingStartedService.onDidChangeWalkthrough((category) => {
            const ourCategory = this.gettingStartedCategories.find((c) => c.id === category.id);
            if (!ourCategory) {
                return;
            }
            ourCategory.title = category.title;
            ourCategory.description = category.description;
            this.container
                .querySelectorAll(`[x-category-title-for="${category.id}"]`)
                .forEach((step) => (step.innerText = ourCategory.title));
            this.container
                .querySelectorAll(`[x-category-description-for="${category.id}"]`)
                .forEach((step) => (step.innerText = ourCategory.description));
        }));
        this._register(this.gettingStartedService.onDidProgressStep((step) => {
            const category = this.gettingStartedCategories.find((category) => category.id === step.category);
            if (!category) {
                throw Error('Could not find category with ID: ' + step.category);
            }
            const ourStep = category.steps.find((_step) => _step.id === step.id);
            if (!ourStep) {
                throw Error('Could not find step with ID: ' + step.id);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            if (!ourStep.done && stats.stepsComplete === stats.stepsTotal - 1) {
                this.hideCategory(category.id);
            }
            this._register(this.configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(REDUCED_MOTION_KEY)) {
                    this.container.classList.toggle('animatable', this.shouldAnimate());
                }
            }));
            ourStep.done = step.done;
            if (category.id === this.currentWalkthrough?.id) {
                const badgeelements = assertIsDefined(this.window.document.querySelectorAll(`[data-done-step-id="${step.id}"]`));
                badgeelements.forEach((badgeelement) => {
                    if (step.done) {
                        badgeelement.setAttribute('aria-checked', 'true');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'true');
                        badgeelement.classList.remove(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.classList.add('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepDone', 'Checkbox for Step {0}: Completed', step.title));
                    }
                    else {
                        badgeelement.setAttribute('aria-checked', 'false');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'false');
                        badgeelement.classList.remove('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.classList.add(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepNotDone', 'Checkbox for Step {0}: Not completed', step.title));
                    }
                });
            }
            this.updateCategoryProgress();
        }));
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason !== WillSaveStateReason.SHUTDOWN) {
                return;
            }
            if (this.workspaceContextService.getWorkspace().folders.length !== 0) {
                return;
            }
            if (!this.editorInput ||
                !this.currentWalkthrough ||
                !this.editorInput.selectedCategory ||
                !this.editorInput.selectedStep) {
                return;
            }
            const editorPane = this.groupsService.activeGroup.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage_1)) {
                return;
            }
            // Save the state of the walkthrough so we can restore it on reload
            const restoreData = {
                folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id,
                category: this.editorInput.selectedCategory,
                step: this.editorInput.selectedStep,
            };
            this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }));
    }
    // remove when 'workbench.welcomePage.preferReducedMotion' deprecated
    shouldAnimate() {
        if (this.configurationService.getValue(REDUCED_MOTION_KEY)) {
            return false;
        }
        if (this.accessibilityService.isMotionReduced()) {
            return false;
        }
        return true;
    }
    getWalkthroughCompletionStats(walkthrough) {
        const activeSteps = walkthrough.steps.filter((s) => this.contextService.contextMatchesRules(s.when));
        return {
            stepsComplete: activeSteps.filter((s) => s.done).length,
            stepsTotal: activeSteps.length,
        };
    }
    async setInput(newInput, options, context, token) {
        this.container.classList.remove('animatable');
        this.editorInput = newInput;
        await super.setInput(newInput, options, context, token);
        await this.buildCategoriesSlide();
        if (this.shouldAnimate()) {
            setTimeout(() => this.container.classList.add('animatable'), 0);
        }
    }
    async makeCategoryVisibleWhenAvailable(categoryID, stepId) {
        this.scrollToCategory(categoryID, stepId);
    }
    registerDispatchListeners() {
        this.dispatchListeners.clear();
        this.container.querySelectorAll('[x-dispatch]').forEach((element) => {
            const dispatch = element.getAttribute('x-dispatch') ?? '';
            let command, argument;
            if (dispatch.startsWith('openLink:https')) {
                ;
                [command, argument] = ['openLink', dispatch.replace('openLink:', '')];
            }
            else {
                ;
                [command, argument] = dispatch.split(':');
            }
            if (command) {
                this.dispatchListeners.add(addDisposableListener(element, 'click', (e) => {
                    e.stopPropagation();
                    this.runDispatchCommand(command, argument);
                }));
                this.dispatchListeners.add(addDisposableListener(element, 'keyup', (e) => {
                    const keyboardEvent = new StandardKeyboardEvent(e);
                    e.stopPropagation();
                    switch (keyboardEvent.keyCode) {
                        case 3 /* KeyCode.Enter */:
                        case 10 /* KeyCode.Space */:
                            this.runDispatchCommand(command, argument);
                            return;
                    }
                }));
            }
        });
    }
    async runDispatchCommand(command, argument) {
        this.commandService.executeCommand('workbench.action.keepEditor');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command, argument, walkthroughId: this.currentWalkthrough?.id });
        switch (command) {
            case 'scrollPrev': {
                this.scrollPrev();
                break;
            }
            case 'skip': {
                this.runSkip();
                break;
            }
            case 'showMoreRecents': {
                this.commandService.executeCommand(OpenRecentAction.ID);
                break;
            }
            case 'seeAllWalkthroughs': {
                await this.openWalkthroughSelector();
                break;
            }
            case 'openFolder': {
                if (this.contextService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                }
                else {
                    this.commandService.executeCommand(isMacintosh
                        ? 'workbench.action.files.openFileFolder'
                        : 'workbench.action.files.openFolder');
                }
                break;
            }
            case 'selectCategory': {
                this.scrollToCategory(argument);
                this.gettingStartedService.markWalkthroughOpened(argument);
                break;
            }
            case 'selectStartEntry': {
                const selected = startEntries.find((e) => e.id === argument);
                if (selected) {
                    this.runStepCommand(selected.content.command);
                }
                else {
                    throw Error('could not find start entry with id: ' + argument);
                }
                break;
            }
            case 'hideCategory': {
                this.hideCategory(argument);
                break;
            }
            // Use selectTask over selectStep to keep telemetry consistant:https://github.com/microsoft/vscode/issues/122256
            case 'selectTask': {
                this.selectStep(argument);
                break;
            }
            case 'toggleStepCompletion': {
                this.toggleStepCompletion(argument);
                break;
            }
            case 'allDone': {
                this.markAllStepsComplete();
                break;
            }
            case 'nextSection': {
                const next = this.currentWalkthrough?.next;
                if (next) {
                    this.prevWalkthrough = this.currentWalkthrough;
                    this.scrollToCategory(next);
                }
                else {
                    console.error('Error scrolling to next section of', this.currentWalkthrough);
                }
                break;
            }
            case 'openLink': {
                this.openerService.open(argument);
                break;
            }
            default: {
                console.error('Dispatch to', command, argument, 'not defined');
                break;
            }
        }
    }
    hideCategory(categoryId) {
        const selectedCategory = this.gettingStartedCategories.find((category) => category.id === categoryId);
        if (!selectedCategory) {
            throw Error('Could not find category with ID ' + categoryId);
        }
        this.setHiddenCategories([...this.getHiddenCategories().add(categoryId)]);
        this.gettingStartedList?.rerender();
    }
    markAllStepsComplete() {
        if (this.currentWalkthrough) {
            this.currentWalkthrough?.steps.forEach((step) => {
                if (!step.done) {
                    this.gettingStartedService.progressStep(step.id);
                }
            });
            this.hideCategory(this.currentWalkthrough?.id);
            this.scrollPrev();
        }
        else {
            throw Error('No walkthrough opened');
        }
    }
    toggleStepCompletion(argument) {
        const stepToggle = assertIsDefined(this.currentWalkthrough?.steps.find((step) => step.id === argument));
        if (stepToggle.done) {
            this.gettingStartedService.deprogressStep(argument);
        }
        else {
            this.gettingStartedService.progressStep(argument);
        }
    }
    async openWalkthroughSelector() {
        const selection = await this.quickInputService.pick(this.gettingStartedCategories
            .filter((c) => this.contextService.contextMatchesRules(c.when))
            .map((x) => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        })), {
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true,
            title: localize('pickWalkthroughs', 'Open Walkthrough...'),
        });
        if (selection) {
            this.runDispatchCommand('selectCategory', selection.id);
        }
    }
    getHiddenCategories() {
        return new Set(JSON.parse(this.storageService.get(hiddenEntriesConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
    }
    setHiddenCategories(hidden) {
        this.storageService.store(hiddenEntriesConfigurationKey, JSON.stringify(hidden), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async buildMediaComponent(stepId, forceRebuild = false) {
        if (!this.currentWalkthrough) {
            throw Error('no walkthrough selected');
        }
        const stepToExpand = assertIsDefined(this.currentWalkthrough.steps.find((step) => step.id === stepId));
        if (!forceRebuild && this.currentMediaComponent === stepId) {
            return;
        }
        this.currentMediaComponent = stepId;
        this.stepDisposables.clear();
        this.stepDisposables.add({
            dispose: () => {
                this.currentMediaComponent = undefined;
            },
        });
        if (this.currentMediaType !== stepToExpand.media.type) {
            this.currentMediaType = stepToExpand.media.type;
            this.mediaDisposables.add(toDisposable(() => {
                this.currentMediaType = undefined;
            }));
            clearNode(this.stepMediaComponent);
            if (stepToExpand.media.type === 'svg') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({
                    title: undefined,
                    options: { disableServiceWorker: true },
                    contentOptions: {},
                    extension: undefined,
                }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'markdown') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({
                    options: {},
                    contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true },
                    title: '',
                    extension: undefined,
                }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'video') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({
                    options: {},
                    contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true },
                    title: '',
                    extension: undefined,
                }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
        }
        if (stepToExpand.media.type === 'image') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const mediaElement = $('img');
            clearNode(this.stepMediaComponent);
            this.stepMediaComponent.appendChild(mediaElement);
            mediaElement.setAttribute('alt', media.altText);
            this.updateMediaSourceForColorMode(mediaElement, media.path);
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description
                    .map((lt) => lt.nodes
                    .filter((node) => typeof node !== 'string')
                    .map((node) => node.href))
                    .flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', {
                            command: 'runStepAction',
                            argument: href,
                            walkthroughId: this.currentWalkthrough?.id,
                        });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(() => this.updateMediaSourceForColorMode(mediaElement, media.path)));
        }
        else if (stepToExpand.media.type === 'svg') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            this.webview.setHtml(await this.detailsRenderer.renderSVG(media.path));
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => {
                isDisposed = true;
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const body = await this.detailsRenderer.renderSVG(media.path);
                if (!isDisposed) {
                    // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description
                    .map((lt) => lt.nodes
                    .filter((node) => typeof node !== 'string')
                    .map((node) => node.href))
                    .flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', {
                            command: 'runStepAction',
                            argument: href,
                            walkthroughId: this.currentWalkthrough?.id,
                        });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.webview.onDidClickLink((link) => {
                if (matchesScheme(link, Schemas.https) ||
                    matchesScheme(link, Schemas.http) ||
                    matchesScheme(link, Schemas.command)) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
        }
        else if (stepToExpand.media.type === 'markdown') {
            this.stepsContent.classList.remove('image');
            this.stepsContent.classList.add('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const rawHTML = await this.detailsRenderer.renderMarkdown(media.path, media.base);
            this.webview.setHtml(rawHTML);
            const serializedContextKeyExprs = rawHTML
                .match(/checked-on=\"([^'][^"]*)\"/g)
                ?.map((attr) => attr.slice('checked-on="'.length, -1).replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
            const postTrueKeysMessage = () => {
                const enabledContextKeys = serializedContextKeyExprs?.filter((expr) => this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(expr)));
                if (enabledContextKeys) {
                    this.webview.postMessage({
                        enabledContextKeys,
                    });
                }
            };
            if (serializedContextKeyExprs) {
                const contextKeyExprs = coalesce(serializedContextKeyExprs.map((expr) => ContextKeyExpr.deserialize(expr)));
                const watchingKeys = new Set(contextKeyExprs.flatMap((expr) => expr.keys()));
                this.stepDisposables.add(this.contextService.onDidChangeContext((e) => {
                    if (e.affectsSome(watchingKeys)) {
                        postTrueKeysMessage();
                    }
                }));
            }
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => {
                isDisposed = true;
            }));
            this.stepDisposables.add(this.webview.onDidClickLink((link) => {
                if (matchesScheme(link, Schemas.https) ||
                    matchesScheme(link, Schemas.http) ||
                    matchesScheme(link, Schemas.command)) {
                    const toSide = link.startsWith('command:toSide:');
                    if (toSide) {
                        link = link.replace('command:toSide:', 'command:');
                        this.focusSideEditorGroup();
                    }
                    this.openerService.open(link, { allowCommands: true, openToSide: toSide });
                }
            }));
            if (rawHTML.indexOf('<code>') >= 0) {
                // Render again when Theme changes since syntax highlighting of code blocks may have changed
                this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                    const body = await this.detailsRenderer.renderMarkdown(media.path, media.base);
                    if (!isDisposed) {
                        // Make sure we weren't disposed of in the meantime
                        this.webview.setHtml(body);
                        postTrueKeysMessage();
                    }
                }));
            }
            const layoutDelayer = new Delayer(50);
            this.layoutMarkdown = () => {
                layoutDelayer.trigger(() => {
                    this.webview.postMessage({ layoutMeNow: true });
                });
            };
            this.stepDisposables.add(layoutDelayer);
            this.stepDisposables.add({ dispose: () => (this.layoutMarkdown = undefined) });
            postTrueKeysMessage();
            this.stepDisposables.add(this.webview.onMessage(async (e) => {
                const message = e.message;
                if (message.startsWith('command:')) {
                    this.openerService.open(message, { allowCommands: true });
                }
                else if (message.startsWith('setTheme:')) {
                    const themeId = message.slice('setTheme:'.length);
                    const theme = (await this.themeService.getColorThemes()).find((theme) => theme.settingsId === themeId);
                    if (theme) {
                        this.themeService.setColorTheme(theme.id, 2 /* ConfigurationTarget.USER */);
                    }
                }
                else {
                    console.error('Unexpected message', message);
                }
            }));
        }
        else if (stepToExpand.media.type === 'video') {
            this.stepsContent.classList.add('video');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('image');
            const media = stepToExpand.media;
            const themeType = this.themeService.getColorTheme().type;
            const videoPath = media.path[themeType];
            const videoPoster = media.poster ? media.poster[themeType] : undefined;
            const altText = media.altText
                ? media.altText
                : localize('videoAltText', 'Video for {0}', stepToExpand.title);
            const rawHTML = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
            this.webview.setHtml(rawHTML);
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => {
                isDisposed = true;
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const themeType = this.themeService.getColorTheme().type;
                const videoPath = media.path[themeType];
                const videoPoster = media.poster ? media.poster[themeType] : undefined;
                const body = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
                if (!isDisposed) {
                    // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
        }
    }
    async selectStepLoose(id) {
        // Allow passing in id with a category appended or with just the id of the step
        if (id.startsWith(`${this.editorInput.selectedCategory}#`)) {
            this.selectStep(id);
        }
        else {
            const toSelect = this.editorInput.selectedCategory + '#' + id;
            this.selectStep(toSelect);
        }
    }
    provideScreenReaderUpdate() {
        if (this.configurationService.getValue("accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */)) {
            const kbLabel = this.keybindingService
                .lookupKeybinding(AccessibleViewAction.id)
                ?.getAriaLabel();
            return kbLabel
                ? localize('acessibleViewHint', 'Inspect this in the accessible view ({0}).\n', kbLabel)
                : localize('acessibleViewHintNoKbOpen', 'Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.\n');
        }
        return '';
    }
    async selectStep(id, delayFocus = true) {
        if (id) {
            let stepElement = this.container.querySelector(`[data-step-id="${id}"]`);
            if (!stepElement) {
                // Selected an element that is not in-context, just fallback to whatever.
                stepElement = this.container.querySelector(`[data-step-id]`);
                if (!stepElement) {
                    // No steps around... just ignore.
                    return;
                }
                id = assertIsDefined(stepElement.getAttribute('data-step-id'));
            }
            stepElement.parentElement?.querySelectorAll('.expanded').forEach((node) => {
                if (node.getAttribute('data-step-id') !== id) {
                    node.classList.remove('expanded');
                    node.setAttribute('aria-expanded', 'false');
                    const codiconElement = node.querySelector('.codicon');
                    if (codiconElement) {
                        codiconElement.removeAttribute('tabindex');
                    }
                }
            });
            setTimeout(() => stepElement.focus(), delayFocus && this.shouldAnimate() ? SLIDE_TRANSITION_TIME_MS : 0);
            this.editorInput.selectedStep = id;
            stepElement.classList.add('expanded');
            stepElement.setAttribute('aria-expanded', 'true');
            this.buildMediaComponent(id, true);
            const codiconElement = stepElement.querySelector('.codicon');
            if (codiconElement) {
                codiconElement.setAttribute('tabindex', '0');
            }
            this.gettingStartedService.progressByEvent('stepSelected:' + id);
            const step = this.currentWalkthrough?.steps?.find((step) => step.id === id);
            if (step) {
                stepElement.setAttribute('aria-label', `${this.provideScreenReaderUpdate()} ${step.title}`);
            }
        }
        else {
            this.editorInput.selectedStep = undefined;
        }
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateMediaSourceForColorMode(element, sources) {
        const themeType = this.themeService.getColorTheme().type;
        const src = sources[themeType].toString(true).replace(/ /g, '%20');
        element.srcset = src.toLowerCase().endsWith('.svg') ? src : src + ' 1.5x';
    }
    createEditor(parent) {
        if (this.detailsPageScrollbar) {
            this.detailsPageScrollbar.dispose();
        }
        if (this.categoriesPageScrollbar) {
            this.categoriesPageScrollbar.dispose();
        }
        this.categoriesSlide = $('.gettingStartedSlideCategories.gettingStartedSlide');
        const prevButton = $('button.prev-button.button-link', { 'x-dispatch': 'scrollPrev' }, $('span.scroll-button.codicon.codicon-chevron-left'), $('span.moreText', {}, localize('goBack', 'Go Back')));
        this.stepsSlide = $('.gettingStartedSlideDetails.gettingStartedSlide', {}, prevButton);
        this.stepsContent = $('.gettingStartedDetailsContent', {});
        this.detailsPageScrollbar = this._register(new DomScrollableElement(this.stepsContent, {
            className: 'full-height-scrollable',
            vertical: 2 /* ScrollbarVisibility.Hidden */,
        }));
        this.categoriesPageScrollbar = this._register(new DomScrollableElement(this.categoriesSlide, {
            className: 'full-height-scrollable categoriesScrollbar',
            vertical: 2 /* ScrollbarVisibility.Hidden */,
        }));
        this.stepsSlide.appendChild(this.detailsPageScrollbar.getDomNode());
        const gettingStartedPage = $('.gettingStarted', {}, this.categoriesPageScrollbar.getDomNode(), this.stepsSlide);
        this.container.appendChild(gettingStartedPage);
        this.categoriesPageScrollbar.scanDomNode();
        this.detailsPageScrollbar.scanDomNode();
        parent.appendChild(this.container);
    }
    async buildCategoriesSlide() {
        this.categoriesSlideDisposables.clear();
        const showOnStartupCheckbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'getting-started-checkbox',
            isChecked: this.configurationService.getValue(configurationKey) === 'welcomePage',
            title: localize('checkboxTitle', 'When checked, this page will be shown on startup.'),
            ...defaultToggleStyles,
        });
        showOnStartupCheckbox.domNode.id = 'showOnStartup';
        const showOnStartupLabel = $('label.caption', { for: 'showOnStartup' }, localize('welcomePage.showOnStartup', 'Show welcome page on startup'));
        const onShowOnStartupChanged = () => {
            if (showOnStartupCheckbox.checked) {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', {
                    command: 'showOnStartupChecked',
                    argument: undefined,
                    walkthroughId: this.currentWalkthrough?.id,
                });
                this.configurationService.updateValue(configurationKey, 'welcomePage');
            }
            else {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', {
                    command: 'showOnStartupUnchecked',
                    argument: undefined,
                    walkthroughId: this.currentWalkthrough?.id,
                });
                this.configurationService.updateValue(configurationKey, 'none');
            }
        };
        this.categoriesSlideDisposables.add(showOnStartupCheckbox);
        this.categoriesSlideDisposables.add(showOnStartupCheckbox.onChange(() => {
            onShowOnStartupChanged();
        }));
        this.categoriesSlideDisposables.add(addDisposableListener(showOnStartupLabel, 'click', () => {
            showOnStartupCheckbox.checked = !showOnStartupCheckbox.checked;
            onShowOnStartupChanged();
        }));
        const header = $('.header', {}, $('h1.product-name.caption', {}, this.productService.nameLong), $('p.subtitle.description', {}, localize({
            key: 'gettingStarted.editingEvolved',
            comment: ['Shown as subtitle on the Welcome page.'],
        }, 'Editing evolved')));
        const leftColumn = $('.categories-column.categories-column-left', {});
        const rightColumn = $('.categories-column.categories-column-right', {});
        const startList = this.buildStartList();
        const recentList = this.buildRecentlyOpenedList();
        const gettingStartedList = this.buildGettingStartedWalkthroughsList();
        const footer = $('.footer', {}, $('p.showOnStartup', {}, showOnStartupCheckbox.domNode, showOnStartupLabel));
        const layoutLists = () => {
            if (gettingStartedList.itemCount) {
                this.container.classList.remove('noWalkthroughs');
                reset(rightColumn, gettingStartedList.getDomElement());
            }
            else {
                this.container.classList.add('noWalkthroughs');
                reset(rightColumn);
            }
            setTimeout(() => this.categoriesPageScrollbar?.scanDomNode(), 50);
            layoutRecentList();
        };
        const layoutRecentList = () => {
            if (this.container.classList.contains('noWalkthroughs')) {
                recentList.setLimit(10);
                reset(leftColumn, startList.getDomElement());
                reset(rightColumn, recentList.getDomElement());
            }
            else {
                recentList.setLimit(5);
                reset(leftColumn, startList.getDomElement(), recentList.getDomElement());
            }
        };
        gettingStartedList.onDidChange(layoutLists);
        layoutLists();
        reset(this.categoriesSlide, $('.gettingStartedCategoriesContainer', {}, header, leftColumn, rightColumn, footer));
        this.categoriesPageScrollbar?.scanDomNode();
        this.updateCategoryProgress();
        this.registerDispatchListeners();
        if (this.editorInput.selectedCategory) {
            this.currentWalkthrough = this.gettingStartedCategories.find((category) => category.id === this.editorInput.selectedCategory);
            if (!this.currentWalkthrough) {
                this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
                this.currentWalkthrough = this.gettingStartedCategories.find((category) => category.id === this.editorInput.selectedCategory);
                if (this.currentWalkthrough) {
                    this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                    this.setSlide('details');
                    return;
                }
            }
            else {
                this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                this.setSlide('details');
                return;
            }
        }
        const someStepsComplete = this.gettingStartedCategories.some((category) => category.steps.find((s) => s.done));
        if (this.editorInput.showTelemetryNotice && this.productService.openToWelcomeMainPage) {
            const telemetryNotice = $('p.telemetry-notice');
            this.buildTelemetryFooter(telemetryNotice);
            footer.appendChild(telemetryNotice);
        }
        else if (!this.productService.openToWelcomeMainPage &&
            !someStepsComplete &&
            !this.hasScrolledToFirstCategory &&
            this.showFeaturedWalkthrough) {
            const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) ||
                new Date().toUTCString();
            const daysSinceFirstSession = (+new Date() - +new Date(firstSessionDateString)) / 1000 / 60 / 60 / 24;
            const fistContentBehaviour = daysSinceFirstSession < 1 ? 'openToFirstCategory' : 'index';
            if (fistContentBehaviour === 'openToFirstCategory') {
                const first = this.gettingStartedCategories.filter((c) => !c.when || this.contextService.contextMatchesRules(c.when))[0];
                if (first) {
                    this.hasScrolledToFirstCategory = true;
                    this.currentWalkthrough = first;
                    this.editorInput.selectedCategory = this.currentWalkthrough?.id;
                    this.editorInput.walkthroughPageTitle = this.currentWalkthrough.walkthroughPageTitle;
                    this.buildCategorySlide(this.editorInput.selectedCategory, undefined);
                    this.setSlide('details', true /* firstLaunch */);
                    return;
                }
            }
        }
        this.setSlide('categories');
    }
    buildRecentlyOpenedList() {
        const renderRecent = (recent) => {
            let fullPath;
            let windowOpenable;
            if (isRecentFolder(recent)) {
                windowOpenable = { folderUri: recent.folderUri };
                fullPath =
                    recent.label ||
                        this.labelService.getWorkspaceLabel(recent.folderUri, { verbose: 2 /* Verbosity.LONG */ });
            }
            else {
                fullPath =
                    recent.label ||
                        this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
                windowOpenable = { workspaceUri: recent.workspace.configPath };
            }
            const { name, parentPath } = splitRecentLabel(fullPath);
            const li = $('li');
            const link = $('button.button-link');
            link.innerText = name;
            link.title = fullPath;
            link.setAttribute('aria-label', localize('welcomePage.openFolderWithPath', 'Open folder {0} with path {1}', name, parentPath));
            link.addEventListener('click', (e) => {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', {
                    command: 'openRecent',
                    argument: undefined,
                    walkthroughId: this.currentWalkthrough?.id,
                });
                this.hostService.openWindow([windowOpenable], {
                    forceNewWindow: e.ctrlKey || e.metaKey,
                    remoteAuthority: recent.remoteAuthority || null, // local window if remoteAuthority is not set or can not be deducted from the openable
                });
                e.preventDefault();
                e.stopPropagation();
            });
            li.appendChild(link);
            const span = $('span');
            span.classList.add('path');
            span.classList.add('detail');
            span.innerText = parentPath;
            span.title = fullPath;
            li.appendChild(span);
            return li;
        };
        if (this.recentlyOpenedList) {
            this.recentlyOpenedList.dispose();
        }
        const recentlyOpenedList = (this.recentlyOpenedList = new GettingStartedIndexList({
            title: localize('recent', 'Recent'),
            klass: 'recently-opened',
            limit: 5,
            empty: $('.empty-recent', {}, localize('noRecents', 'You have no recent folders,'), $('button.button-link', { 'x-dispatch': 'openFolder' }, localize('openFolder', 'open a folder')), localize('toStart', 'to start.')),
            more: $('.more', {}, $('button.button-link', {
                'x-dispatch': 'showMoreRecents',
                title: localize('show more recents', 'Show All Recent Folders {0}', this.getKeybindingLabel(OpenRecentAction.ID)),
            }, localize('showAll', 'More...'))),
            renderElement: renderRecent,
            contextService: this.contextService,
        }));
        recentlyOpenedList.onDidChange(() => this.registerDispatchListeners());
        this.recentlyOpened
            .then(({ workspaces }) => {
            // Filter out the current workspace
            const workspacesWithID = workspaces
                .filter((recent) => !this.workspaceContextService.isCurrentWorkspace(isRecentWorkspace(recent) ? recent.workspace : recent.folderUri))
                .map((recent) => ({
                ...recent,
                id: isRecentWorkspace(recent) ? recent.workspace.id : recent.folderUri.toString(),
            }));
            const updateEntries = () => {
                recentlyOpenedList.setEntries(workspacesWithID);
            };
            updateEntries();
            recentlyOpenedList.register(this.labelService.onDidChangeFormatters(() => updateEntries()));
        })
            .catch(onUnexpectedError);
        return recentlyOpenedList;
    }
    buildStartList() {
        const renderStartEntry = (entry) => $('li', {}, $('button.button-link', {
            'x-dispatch': 'selectStartEntry:' + entry.id,
            title: entry.description + ' ' + this.getKeybindingLabel(entry.command),
        }, this.iconWidgetFor(entry), $('span', {}, entry.title)));
        if (this.startList) {
            this.startList.dispose();
        }
        const startList = (this.startList = new GettingStartedIndexList({
            title: localize('start', 'Start'),
            klass: 'start-container',
            limit: 10,
            renderElement: renderStartEntry,
            rankElement: (e) => -e.order,
            contextService: this.contextService,
        }));
        startList.setEntries(parsedStartEntries);
        startList.onDidChange(() => this.registerDispatchListeners());
        return startList;
    }
    buildGettingStartedWalkthroughsList() {
        const renderGetttingStaredWalkthrough = (category) => {
            const renderNewBadge = (category.newItems || category.newEntry) && !category.isFeatured;
            const newBadge = $('.new-badge', {});
            if (category.newEntry) {
                reset(newBadge, $('.new-category', {}, localize('new', 'New')));
            }
            else if (category.newItems) {
                reset(newBadge, $('.new-items', {}, localize({
                    key: 'newItems',
                    comment: [
                        'Shown when a list of items has changed based on an update from a remote source',
                    ],
                }, 'Updated')));
            }
            const featuredBadge = $('.featured-badge', {});
            const descriptionContent = $('.description-content', {});
            if (category.isFeatured && this.showFeaturedWalkthrough) {
                reset(featuredBadge, $('.featured', {}, $('span.featured-icon.codicon.codicon-star-full')));
                reset(descriptionContent, ...renderLabelWithIcons(category.description));
            }
            const titleContent = $('h3.category-title.max-lines-3', {
                'x-category-title-for': category.id,
            });
            reset(titleContent, ...renderLabelWithIcons(category.title));
            return $('button.getting-started-category' +
                (category.isFeatured && this.showFeaturedWalkthrough ? '.featured' : ''), {
                'x-dispatch': 'selectCategory:' + category.id,
                title: category.description,
            }, featuredBadge, $('.main-content', {}, this.iconWidgetFor(category), titleContent, renderNewBadge ? newBadge : $('.no-badge'), $('a.codicon.codicon-close.hide-category-button', {
                tabindex: 0,
                'x-dispatch': 'hideCategory:' + category.id,
                title: localize('close', 'Hide'),
                role: 'button',
                'aria-label': localize('closeAriaLabel', 'Hide'),
            })), descriptionContent, $('.category-progress', { 'x-data-category-id': category.id }, $('.progress-bar-outer', { role: 'progressbar' }, $('.progress-bar-inner'))));
        };
        if (this.gettingStartedList) {
            this.gettingStartedList.dispose();
        }
        const rankWalkthrough = (e) => {
            let rank = e.order;
            if (e.isFeatured) {
                rank += 7;
            }
            if (e.newEntry) {
                rank += 3;
            }
            if (e.newItems) {
                rank += 2;
            }
            if (e.recencyBonus) {
                rank += 4 * e.recencyBonus;
            }
            if (this.getHiddenCategories().has(e.id)) {
                rank = null;
            }
            return rank;
        };
        const gettingStartedList = (this.gettingStartedList = new GettingStartedIndexList({
            title: localize('walkthroughs', 'Walkthroughs'),
            klass: 'getting-started',
            limit: 5,
            footer: $('span.button-link.see-all-walkthroughs', { 'x-dispatch': 'seeAllWalkthroughs', tabindex: 0 }, localize('showAll', 'More...')),
            renderElement: renderGetttingStaredWalkthrough,
            rankElement: rankWalkthrough,
            contextService: this.contextService,
        }));
        gettingStartedList.onDidChange(() => {
            const hidden = this.getHiddenCategories();
            const someWalkthroughsHidden = hidden.size ||
                gettingStartedList.itemCount <
                    this.gettingStartedCategories.filter((c) => this.contextService.contextMatchesRules(c.when)).length;
            this.container.classList.toggle('someWalkthroughsHidden', !!someWalkthroughsHidden);
            this.registerDispatchListeners();
            allWalkthroughsHiddenContext
                .bindTo(this.contextService)
                .set(gettingStartedList.itemCount === 0);
            this.updateCategoryProgress();
        });
        gettingStartedList.setEntries(this.gettingStartedCategories);
        allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
        return gettingStartedList;
    }
    layout(size) {
        this.detailsScrollbar?.scanDomNode();
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.startList?.layout(size);
        this.gettingStartedList?.layout(size);
        this.recentlyOpenedList?.layout(size);
        if (this.editorInput?.selectedStep && this.currentMediaType) {
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
        }
        this.layoutMarkdown?.();
        this.container.classList.toggle('height-constrained', size.height <= 600);
        this.container.classList.toggle('width-constrained', size.width <= 400);
        this.container.classList.toggle('width-semi-constrained', size.width <= 950);
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateCategoryProgress() {
        this.window.document.querySelectorAll('.category-progress').forEach((element) => {
            const categoryID = element.getAttribute('x-data-category-id');
            const category = this.gettingStartedCategories.find((category) => category.id === categoryID);
            if (!category) {
                throw Error('Could not find category with ID ' + categoryID);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            const bar = assertIsDefined(element.querySelector('.progress-bar-inner'));
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuenow', '' + stats.stepsComplete);
            bar.setAttribute('aria-valuemax', '' + stats.stepsTotal);
            const progress = (stats.stepsComplete / stats.stepsTotal) * 100;
            bar.style.width = `${progress}%`;
            element.parentElement.classList.toggle('no-progress', stats.stepsComplete === 0);
            if (stats.stepsTotal === stats.stepsComplete) {
                bar.title = localize('gettingStarted.allStepsComplete', 'All {0} steps complete!', stats.stepsComplete);
            }
            else {
                bar.title = localize('gettingStarted.someStepsComplete', '{0} of {1} steps complete', stats.stepsComplete, stats.stepsTotal);
            }
        });
    }
    async scrollToCategory(categoryID, stepId) {
        if (!this.gettingStartedCategories.some((c) => c.id === categoryID)) {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        }
        const ourCategory = this.gettingStartedCategories.find((c) => c.id === categoryID);
        if (!ourCategory) {
            throw Error('Could not find category with ID: ' + categoryID);
        }
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            reset(this.stepsContent);
            this.editorInput.selectedCategory = categoryID;
            this.editorInput.selectedStep = stepId;
            this.editorInput.walkthroughPageTitle = ourCategory.walkthroughPageTitle;
            this.currentWalkthrough = ourCategory;
            this.buildCategorySlide(categoryID, stepId);
            this.setSlide('details');
        });
    }
    iconWidgetFor(category) {
        const widget = category.icon.type === 'icon'
            ? $(ThemeIcon.asCSSSelector(category.icon.icon))
            : $('img.category-icon', { src: category.icon.path });
        widget.classList.add('icon-widget');
        return widget;
    }
    focusSideEditorGroup() {
        const fullSize = this.groupsService.getPart(this.group).contentDimension;
        if (!fullSize || fullSize.width <= 700) {
            return;
        }
        if (this.groupsService.count === 1) {
            const sideGroup = this.groupsService.addGroup(this.groupsService.groups[0], 3 /* GroupDirection.RIGHT */);
            this.groupsService.activateGroup(sideGroup);
            const gettingStartedSize = Math.floor(fullSize.width / 2);
            const gettingStartedGroup = this.groupsService
                .getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)
                .find((group) => group.activeEditor instanceof GettingStartedInput);
            this.groupsService.setSize(assertIsDefined(gettingStartedGroup), {
                width: gettingStartedSize,
                height: fullSize.height,
            });
        }
        const nonGettingStartedGroup = this.groupsService
            .getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)
            .find((group) => !(group.activeEditor instanceof GettingStartedInput));
        if (nonGettingStartedGroup) {
            this.groupsService.activateGroup(nonGettingStartedGroup);
            nonGettingStartedGroup.focus();
        }
    }
    runStepCommand(href) {
        const isCommand = href.startsWith('command:');
        const toSide = href.startsWith('command:toSide:');
        const command = href.replace(/command:(toSide:)?/, 'command:');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
        if (toSide) {
            this.focusSideEditorGroup();
        }
        if (isCommand) {
            const commandURI = URI.parse(command);
            // execute as command
            let args = [];
            try {
                args = parse(decodeURIComponent(commandURI.query));
            }
            catch {
                // ignore and retry
                try {
                    args = parse(commandURI.query);
                }
                catch {
                    // ignore error
                }
            }
            if (!Array.isArray(args)) {
                args = [args];
            }
            // If a step is requesting the OpenFolder action to be executed in an empty workspace...
            if ((commandURI.path === OpenFileFolderAction.ID.toString() ||
                commandURI.path === OpenFolderAction.ID.toString()) &&
                this.workspaceContextService.getWorkspace().folders.length === 0) {
                const selectedStepIndex = this.currentWalkthrough?.steps.findIndex((step) => step.id === this.editorInput.selectedStep);
                // and there are a few more steps after this step which are yet to be completed...
                if (selectedStepIndex !== undefined &&
                    selectedStepIndex > -1 &&
                    this.currentWalkthrough?.steps.slice(selectedStepIndex + 1).some((step) => !step.done)) {
                    const restoreData = {
                        folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id,
                        category: this.editorInput.selectedCategory,
                        step: this.editorInput.selectedStep,
                    };
                    // save state to restore after reload
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            this.commandService.executeCommand(commandURI.path, ...args).then((result) => {
                const toOpen = result?.openFolder;
                if (toOpen) {
                    if (!URI.isUri(toOpen)) {
                        console.warn('Warn: Running walkthrough command', href, 'yielded non-URI `openFolder` result', toOpen, '. It will be disregarded.');
                        return;
                    }
                    const restoreData = {
                        folder: toOpen.toString(),
                        category: this.editorInput.selectedCategory,
                        step: this.editorInput.selectedStep,
                    };
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                    this.hostService.openWindow([{ folderUri: toOpen }]);
                }
            });
        }
        else {
            this.openerService.open(command, { allowCommands: true });
        }
        if (!isCommand && (href.startsWith('https://') || href.startsWith('http://'))) {
            this.gettingStartedService.progressByEvent('onLink:' + href);
        }
    }
    buildMarkdownDescription(container, text) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        for (const linkedText of text) {
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = append(container, $('.button-container'));
                const button = new Button(buttonContainer, {
                    title: node.title,
                    supportIcons: true,
                    ...defaultButtonStyles,
                });
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                button.label = node.label;
                button.onDidClick((e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.runStepCommand(node.href);
                }, null, this.detailsPageDisposables);
                if (isCommand) {
                    const keybinding = this.getKeyBinding(command);
                    if (keybinding) {
                        const shortcutMessage = $('span.shortcut-message', {}, localize('gettingStarted.keyboardTip', 'Tip: Use keyboard shortcut '));
                        container.appendChild(shortcutMessage);
                        const label = new KeybindingLabel(shortcutMessage, OS, {
                            ...defaultKeybindingLabelStyles,
                        });
                        label.set(keybinding);
                        this.detailsPageDisposables.add(label);
                    }
                }
                this.detailsPageDisposables.add(button);
            }
            else {
                const p = append(container, $('p'));
                for (const node of linkedText.nodes) {
                    if (typeof node === 'string') {
                        const labelWithIcon = renderLabelWithIcons(node);
                        for (const element of labelWithIcon) {
                            if (typeof element === 'string') {
                                p.appendChild(renderFormattedText(element, { inline: true, renderCodeSegments: true }));
                            }
                            else {
                                p.appendChild(element);
                            }
                        }
                    }
                    else {
                        const nodeWithTitle = matchesScheme(node.href, Schemas.http) || matchesScheme(node.href, Schemas.https)
                            ? { ...node, title: node.href }
                            : node;
                        const link = this.instantiationService.createInstance(Link, p, nodeWithTitle, {
                            opener: (href) => this.runStepCommand(href),
                        });
                        this.detailsPageDisposables.add(link);
                    }
                }
            }
        }
        return container;
    }
    clearInput() {
        this.stepDisposables.clear();
        super.clearInput();
    }
    buildCategorySlide(categoryID, selectedStep) {
        if (this.detailsScrollbar) {
            this.detailsScrollbar.dispose();
        }
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            // Remove internal extension id specifier from exposed id's
            this.extensionService.activateByEvent(`onWalkthrough:${categoryID.replace(/[^#]+#/, '')}`);
        });
        this.detailsPageDisposables.clear();
        this.mediaDisposables.clear();
        const category = this.gettingStartedCategories.find((category) => category.id === categoryID);
        if (!category) {
            throw Error('could not find category with ID ' + categoryID);
        }
        const descriptionContainer = $('.category-description.description.max-lines-3', {
            'x-category-description-for': category.id,
        });
        this.buildMarkdownDescription(descriptionContainer, parseDescription(category.description));
        const categoryDescriptorComponent = $('.getting-started-category', {}, $('.category-description-container', {}, $('h2.category-title.max-lines-3', { 'x-category-title-for': category.id }, ...renderLabelWithIcons(category.title)), descriptionContainer));
        const stepListContainer = $('.step-list-container');
        this.detailsPageDisposables.add(addDisposableListener(stepListContainer, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            const currentStepIndex = () => category.steps.findIndex((e) => e.id === this.editorInput.selectedStep);
            if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                const toExpand = category.steps.filter((step, index) => index < currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand.length) {
                    this.selectStep(toExpand[toExpand.length - 1].id, false);
                }
            }
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                const toExpand = category.steps.find((step, index) => index > currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand) {
                    this.selectStep(toExpand.id, false);
                }
            }
        }));
        let renderedSteps = undefined;
        const contextKeysToWatch = new Set(category.steps.flatMap((step) => step.when.keys()));
        const buildStepList = () => {
            category.steps.sort((a, b) => a.order - b.order);
            const toRender = category.steps.filter((step) => this.contextService.contextMatchesRules(step.when));
            if (equals(renderedSteps, toRender, (a, b) => a.id === b.id)) {
                return;
            }
            renderedSteps = toRender;
            reset(stepListContainer, ...renderedSteps.map((step) => {
                const codicon = $('.codicon' +
                    (step.done
                        ? '.complete' + ThemeIcon.asCSSSelector(gettingStartedCheckedCodicon)
                        : ThemeIcon.asCSSSelector(gettingStartedUncheckedCodicon)), {
                    'data-done-step-id': step.id,
                    'x-dispatch': 'toggleStepCompletion:' + step.id,
                    role: 'checkbox',
                    'aria-checked': step.done ? 'true' : 'false',
                    'aria-label': step.done
                        ? localize('stepDone', 'Checkbox for Step {0}: Completed', step.title)
                        : localize('stepNotDone', 'Checkbox for Step {0}: Not completed', step.title),
                });
                const container = $('.step-description-container', { 'x-step-description-for': step.id });
                this.buildMarkdownDescription(container, step.description);
                const stepTitle = $('h3.step-title.max-lines-3', { 'x-step-title-for': step.id });
                reset(stepTitle, ...renderLabelWithIcons(step.title));
                const stepDescription = $('.step-container', {}, stepTitle, container);
                if (step.media.type === 'image') {
                    stepDescription.appendChild($('.image-description', {
                        'aria-label': localize('imageShowing', 'Image showing {0}', step.media.altText),
                    }));
                }
                else if (step.media.type === 'video') {
                    stepDescription.appendChild($('.video-description', {
                        'aria-label': localize('videoShowing', 'Video showing {0}', step.media.altText),
                    }));
                }
                return $('button.getting-started-step', {
                    'x-dispatch': 'selectTask:' + step.id,
                    'data-step-id': step.id,
                    'aria-expanded': 'false',
                    'aria-checked': step.done ? 'true' : 'false',
                    role: 'button',
                }, codicon, stepDescription);
            }));
        };
        buildStepList();
        this.detailsPageDisposables.add(this.contextService.onDidChangeContext((e) => {
            if (e.affectsSome(contextKeysToWatch) && this.currentWalkthrough) {
                buildStepList();
                this.registerDispatchListeners();
                this.selectStep(this.editorInput.selectedStep, false);
            }
        }));
        const showNextCategory = this.gettingStartedCategories.find((_category) => _category.id === category.next);
        const stepsContainer = $('.getting-started-detail-container', { role: 'list' }, stepListContainer, $('.done-next-container', {}, $('button.button-link.all-done', { 'x-dispatch': 'allDone' }, $('span.codicon.codicon-check-all'), localize('allDone', 'Mark Done')), ...(showNextCategory
            ? [
                $('button.button-link.next', { 'x-dispatch': 'nextSection' }, localize('nextOne', 'Next Section'), $('span.codicon.codicon-arrow-right')),
            ]
            : [])));
        this.detailsScrollbar = this._register(new DomScrollableElement(stepsContainer, { className: 'steps-container' }));
        const stepListComponent = this.detailsScrollbar.getDomNode();
        const categoryFooter = $('.getting-started-footer');
        if (this.editorInput.showTelemetryNotice &&
            getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ &&
            this.productService.enableTelemetry) {
            this.buildTelemetryFooter(categoryFooter);
        }
        reset(this.stepsContent, categoryDescriptorComponent, stepListComponent, this.stepMediaComponent, categoryFooter);
        const toExpand = category.steps.find((step) => this.contextService.contextMatchesRules(step.when) && !step.done) ?? category.steps[0];
        this.selectStep(selectedStep ?? toExpand.id, !selectedStep);
        this.detailsScrollbar.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.registerDispatchListeners();
    }
    buildTelemetryFooter(parent) {
        const mdRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        const privacyStatementCopy = localize('privacy statement', 'privacy statement');
        const privacyStatementButton = `[${privacyStatementCopy}](command:workbench.action.openPrivacyStatementUrl)`;
        const optOutCopy = localize('optOut', 'opt out');
        const optOutButton = `[${optOutCopy}](command:settings.filterByTelemetry)`;
        const text = localize({
            key: 'footer',
            comment: [
                'fist substitution is "vs code", second is "privacy statement", third is "opt out".',
            ],
        }, '{0} collects usage data. Read our {1} and learn how to {2}.', this.productService.nameShort, privacyStatementButton, optOutButton);
        parent.append(mdRenderer.render({ value: text, isTrusted: true }).element);
    }
    getKeybindingLabel(command) {
        command = command.replace(/^command:/, '');
        const label = this.keybindingService.lookupKeybinding(command)?.getLabel();
        if (!label) {
            return '';
        }
        else {
            return `(${label})`;
        }
    }
    getKeyBinding(command) {
        command = command.replace(/^command:/, '');
        return this.keybindingService.lookupKeybinding(command);
    }
    async scrollPrev() {
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            if (this.prevWalkthrough && this.prevWalkthrough !== this.currentWalkthrough) {
                this.currentWalkthrough = this.prevWalkthrough;
                this.prevWalkthrough = undefined;
                this.makeCategoryVisibleWhenAvailable(this.currentWalkthrough.id);
            }
            else {
                this.currentWalkthrough = undefined;
                this.editorInput.selectedCategory = undefined;
                this.editorInput.selectedStep = undefined;
                this.editorInput.showTelemetryNotice = false;
                this.editorInput.walkthroughPageTitle = undefined;
                if (this.gettingStartedCategories.length !== this.gettingStartedList?.itemCount) {
                    // extensions may have changed in the time since we last displayed the walkthrough list
                    // rebuild the list
                    this.buildCategoriesSlide();
                }
                this.selectStep(undefined);
                this.setSlide('categories');
                this.container.focus();
            }
        });
    }
    runSkip() {
        this.commandService.executeCommand('workbench.action.closeActiveEditor');
    }
    escape() {
        if (this.editorInput.selectedCategory) {
            this.scrollPrev();
        }
        else {
            this.runSkip();
        }
    }
    setSlide(toEnable, firstLaunch = false) {
        const slideManager = assertIsDefined(this.container.querySelector('.gettingStarted'));
        if (toEnable === 'categories') {
            slideManager.classList.remove('showDetails');
            slideManager.classList.add('showCategories');
            this.container.querySelector('.prev-button.button-link').style.display =
                'none';
            this.container
                .querySelector('.gettingStartedSlideDetails')
                .querySelectorAll('button')
                .forEach((button) => (button.disabled = true));
            this.container
                .querySelector('.gettingStartedSlideCategories')
                .querySelectorAll('button')
                .forEach((button) => (button.disabled = false));
            this.container
                .querySelector('.gettingStartedSlideCategories')
                .querySelectorAll('input')
                .forEach((button) => (button.disabled = false));
        }
        else {
            slideManager.classList.add('showDetails');
            slideManager.classList.remove('showCategories');
            const prevButton = this.container.querySelector('.prev-button.button-link');
            prevButton.style.display =
                this.editorInput.showWelcome || this.prevWalkthrough ? 'block' : 'none';
            const moreTextElement = prevButton.querySelector('.moreText');
            moreTextElement.textContent = firstLaunch
                ? localize('welcome', 'Welcome')
                : localize('goBack', 'Go Back');
            this.container
                .querySelector('.gettingStartedSlideDetails')
                .querySelectorAll('button')
                .forEach((button) => (button.disabled = false));
            this.container
                .querySelector('.gettingStartedSlideCategories')
                .querySelectorAll('button')
                .forEach((button) => (button.disabled = true));
            this.container
                .querySelector('.gettingStartedSlideCategories')
                .querySelectorAll('input')
                .forEach((button) => (button.disabled = true));
        }
    }
    focus() {
        super.focus();
        const active = this.container.ownerDocument.activeElement;
        let parent = this.container.parentElement;
        while (parent && parent !== active) {
            parent = parent.parentElement;
        }
        if (parent) {
            // Only set focus if there is no other focued element outside this chain.
            // This prevents us from stealing back focus from other focused elements such as quick pick due to delayed load.
            this.container.focus();
        }
    }
};
GettingStartedPage = GettingStartedPage_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IProductService),
    __param(3, IKeybindingService),
    __param(4, IWalkthroughsService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, ILanguageService),
    __param(8, IFileService),
    __param(9, IOpenerService),
    __param(10, IWorkbenchThemeService),
    __param(11, IStorageService),
    __param(12, IExtensionService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IEditorGroupsService),
    __param(16, IContextKeyService),
    __param(17, IQuickInputService),
    __param(18, IWorkspacesService),
    __param(19, ILabelService),
    __param(20, IHostService),
    __param(21, IWebviewService),
    __param(22, IWorkspaceContextService),
    __param(23, IAccessibilityService)
], GettingStartedPage);
export { GettingStartedPage };
export class GettingStartedInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return JSON.stringify({
            selectedCategory: editorInput.selectedCategory,
            selectedStep: editorInput.selectedStep,
        });
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction((accessor) => {
            try {
                const { selectedCategory, selectedStep } = JSON.parse(serializedEditorInput);
                return new GettingStartedInput({ selectedCategory, selectedStep });
            }
            catch { }
            return new GettingStartedInput({});
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sQ0FBQyxFQUVELHFCQUFxQixFQUNyQixNQUFNLEVBQ04sU0FBUyxFQUNULEtBQUssR0FDTCxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXBGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDakgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZUFBZSxFQUdmLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixpQkFBaUIsRUFFakIsMEJBQTBCLEdBQzFCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDM0YsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw0QkFBNEIsRUFDNUIsbUJBQW1CLEdBQ25CLE1BQU0scURBQXFELENBQUE7QUFFNUQsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qiw4QkFBOEIsR0FDOUIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBSU4sa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCxpQkFBaUIsR0FDakIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQiw0QkFBNEIsR0FDNUIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFdEUsT0FBTyxFQUFtQixlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xGLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsOEJBQThCLEdBQzlCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUdOLG9CQUFvQixFQUNwQiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEdBQ2hCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUVOLG1DQUFtQyxHQUNuQyxNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBSU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRWpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUdoRyxNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQTtBQUNwQyxNQUFNLGdCQUFnQixHQUFHLHlCQUF5QixDQUFBO0FBRWxELE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLElBQUksYUFBYSxDQUM1RCx1QkFBdUIsRUFDdkIsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFZOUUsTUFBTSxrQkFBa0IsR0FBNkIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDaEYsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTztJQUMxQixXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVc7SUFDMUIsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtJQUNwQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7SUFDUixLQUFLLEVBQUUsQ0FBQztJQUNSLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztJQUNkLElBQUksRUFBRSxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFO0NBQ2pFLENBQUMsQ0FBQyxDQUFBO0FBOEJILE1BQU0sa0JBQWtCLEdBQUcsMkNBQTJDLENBQUE7QUFDL0QsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVOzthQUMxQixPQUFFLEdBQUcsb0JBQW9CLEFBQXZCLENBQXVCO0lBK0NoRCxZQUNDLEtBQW1CLEVBQ0YsY0FBZ0QsRUFDaEQsY0FBZ0QsRUFDN0MsaUJBQXNELEVBQ3BELHFCQUE0RCxFQUMzRCxvQkFBNEQsRUFDaEUsZ0JBQW1DLEVBQ3BDLGVBQWtELEVBQ3RELFdBQTBDLEVBQ3hDLGFBQThDLEVBQ3RDLFlBQWdFLEVBQ3ZFLGNBQXVDLEVBQ3JDLGdCQUFvRCxFQUNoRCxvQkFBNEQsRUFDN0QsbUJBQTBELEVBQzFELGFBQW9ELEVBQ3RELGNBQWtDLEVBQ2xDLGlCQUE2QyxFQUM3QyxpQkFBc0QsRUFDM0QsWUFBNEMsRUFDN0MsV0FBMEMsRUFDdkMsY0FBZ0QsRUFDdkMsdUJBQWtFLEVBQ3JFLG9CQUE0RDtRQUVuRixLQUFLLENBQUMsb0JBQWtCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7UUF4QmpELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXNCO1FBQzFDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFaEQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3JDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNWLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQUMvRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDcEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUMvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzVDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDekMsa0JBQWEsR0FBYixhQUFhLENBQXNCO1FBRTlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMxQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUM1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN0QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDdEIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNwRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBcEU1RSxxQkFBZ0IsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFM0Isc0JBQWlCLEdBQW9CLElBQUksZUFBZSxFQUFFLENBQUE7UUFDMUQsb0JBQWUsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN4RCwyQkFBc0IsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUMvRCxxQkFBZ0IsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQWVsRSx1QkFBa0IsR0FBYyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBTS9DLCtCQUEwQixHQUFHLEtBQUssQ0FBQTtRQWdCbEMsNEJBQXVCLEdBQUcsSUFBSSxDQUFBO1FBd2M5QiwwQkFBcUIsR0FBdUIsU0FBUyxDQUFBO1FBQ3JELHFCQUFnQixHQUF1QixTQUFTLENBQUE7UUEzYXZELElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixFQUFFO1lBQzlDLElBQUksRUFBRSxVQUFVO1lBQ2hCLFFBQVEsRUFBRSxDQUFDO1lBQ1gsWUFBWSxFQUFFLFFBQVEsQ0FDckIsa0JBQWtCLEVBQ2xCLHNEQUFzRCxDQUN0RDtTQUNELENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFBO1FBRTNDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUV2RSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksNkJBQTZCLENBQ3ZELElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsZUFBZSxDQUNwQixDQUFBO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDakYsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdEQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUU1RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBRXpDLE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRTtZQUNyQixJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQzVFLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzdCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQ3JELENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQ3pELENBQUE7Z0JBQ0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO29CQUNqRSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1lBQ2pFLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFM0UsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUNoRSxJQUFJLENBQUMsU0FBUyxDQUNiLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRTtZQUNoRCxJQUFJLENBQUMsY0FBYyxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDM0QsUUFBUSxFQUFFLENBQUE7UUFDWCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNuRixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU07WUFDUCxDQUFDO1lBRUQsV0FBVyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFBO1lBQ2xDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQTtZQUU5QyxJQUFJLENBQUMsU0FBUztpQkFDWixnQkFBZ0IsQ0FBaUIsMEJBQTBCLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQztpQkFDM0UsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFFLElBQXVCLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQzdFLElBQUksQ0FBQyxTQUFTO2lCQUNaLGdCQUFnQixDQUFpQixnQ0FBZ0MsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDO2lCQUNqRixPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUUsSUFBdUIsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDcEYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FDbEQsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FDM0MsQ0FBQTtZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixNQUFNLEtBQUssQ0FBQyxtQ0FBbUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDakUsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNwRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxLQUFLLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMvQixDQUFDO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDeEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO29CQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO2dCQUNwRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUV4QixJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FDekUsQ0FBQTtnQkFDRCxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7b0JBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNmLFlBQVksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO3dCQUNqRCxZQUFZLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUE7d0JBQ2hFLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUM1QixHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUM3RCxDQUFBO3dCQUNELFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUN6QixVQUFVLEVBQ1YsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLENBQUMsQ0FDM0QsQ0FBQTt3QkFDRCxZQUFZLENBQUMsWUFBWSxDQUN4QixZQUFZLEVBQ1osUUFBUSxDQUFDLFVBQVUsRUFBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQ3BFLENBQUE7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFlBQVksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFBO3dCQUNsRCxZQUFZLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUE7d0JBQ2pFLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUM1QixVQUFVLEVBQ1YsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLENBQUMsQ0FDM0QsQ0FBQTt3QkFDRCxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDekIsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsOEJBQThCLENBQUMsQ0FDN0QsQ0FBQTt3QkFDRCxZQUFZLENBQUMsWUFBWSxDQUN4QixZQUFZLEVBQ1osUUFBUSxDQUFDLGFBQWEsRUFBRSxzQ0FBc0MsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQzNFLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDL0MsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQ0MsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDakIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCO2dCQUN4QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO2dCQUNsQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUM3QixDQUFDO2dCQUNGLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUE7WUFDbEUsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLG9CQUFrQixDQUFDLEVBQUUsQ0FBQztnQkFDakQsT0FBTTtZQUNQLENBQUM7WUFFRCxtRUFBbUU7WUFDbkUsTUFBTSxXQUFXLEdBQTBDO2dCQUMxRCxNQUFNLEVBQUUsOEJBQThCLENBQUMsRUFBRTtnQkFDekMsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO2dCQUMzQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO2FBQ25DLENBQUE7WUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsbUNBQW1DLEVBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLDhEQUczQixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxxRUFBcUU7SUFDN0QsYUFBYTtRQUNwQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQzVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7WUFDakQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sNkJBQTZCLENBQUMsV0FBaUM7UUFJdEUsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNsRCxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDL0MsQ0FBQTtRQUNELE9BQU87WUFDTixhQUFhLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU07WUFDdkQsVUFBVSxFQUFFLFdBQVcsQ0FBQyxNQUFNO1NBQzlCLENBQUE7SUFDRixDQUFDO0lBRVEsS0FBSyxDQUFDLFFBQVEsQ0FDdEIsUUFBNkIsRUFDN0IsT0FBbUMsRUFDbkMsT0FBMkIsRUFDM0IsS0FBd0I7UUFFeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFBO1FBQzNCLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQ2pDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7WUFDMUIsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFrQixFQUFFLE1BQWU7UUFDekUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUU5QixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ25FLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3pELElBQUksT0FBTyxFQUFFLFFBQVEsQ0FBQTtZQUNyQixJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxDQUFDO2dCQUFBLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLENBQUM7Z0JBQUEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1lBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUN6QixxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzdDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDbkIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDM0MsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUN6QixxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzdDLE1BQU0sYUFBYSxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2xELENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDbkIsUUFBUSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQy9CLDJCQUFtQjt3QkFDbkI7NEJBQ0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTs0QkFDMUMsT0FBTTtvQkFDUixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQWUsRUFBRSxRQUFnQjtRQUNqRSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLCtCQUErQixFQUMvQixFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FDakUsQ0FBQTtRQUNELFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7Z0JBQ2pCLE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNiLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDZCxNQUFLO1lBQ04sQ0FBQztZQUNELEtBQUssaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkQsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLG9CQUFvQixDQUFDLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtnQkFDcEMsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLElBQ0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FDdEMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FDaEUsRUFDQSxDQUFDO29CQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNwRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQ2pDLFdBQVc7d0JBQ1YsQ0FBQyxDQUFDLHVDQUF1Qzt3QkFDekMsQ0FBQyxDQUFDLG1DQUFtQyxDQUN0QyxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMvQixJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFELE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUE7Z0JBQzVELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUM5QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxLQUFLLENBQUMsc0NBQXNDLEdBQUcsUUFBUSxDQUFDLENBQUE7Z0JBQy9ELENBQUM7Z0JBQ0QsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzNCLE1BQUs7WUFDTixDQUFDO1lBQ0QsZ0hBQWdIO1lBQ2hILEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDekIsTUFBSztZQUNOLENBQUM7WUFDRCxLQUFLLHNCQUFzQixDQUFDLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNuQyxNQUFLO1lBQ04sQ0FBQztZQUNELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7Z0JBQzNCLE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFBO2dCQUMxQyxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFBO29CQUM5QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzVCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUM3RSxDQUFDO2dCQUNELE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDakMsTUFBSztZQUNOLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzlELE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsVUFBa0I7UUFDdEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUMxRCxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxVQUFVLENBQ3hDLENBQUE7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixNQUFNLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxVQUFVLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ2pELENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUFnQjtRQUM1QyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQ2pDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUNuRSxDQUFBO1FBQ0QsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsdUJBQXVCO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FDbEQsSUFBSSxDQUFDLHdCQUF3QjthQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNaLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNSLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztZQUNkLE1BQU0sRUFBRSxDQUFDLENBQUMsV0FBVztZQUNyQixXQUFXLEVBQUUsQ0FBQyxDQUFDLE1BQU07U0FDckIsQ0FBQyxDQUFDLEVBQ0o7WUFDQyxXQUFXLEVBQUUsS0FBSztZQUNsQixrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUM7U0FDMUQsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsT0FBTyxJQUFJLEdBQUcsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUNULElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDZCQUE2QixnQ0FBd0IsSUFBSSxDQUFDLENBQ2xGLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxNQUFnQjtRQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsNkJBQTZCLEVBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDJEQUd0QixDQUFBO0lBQ0YsQ0FBQztJQUlPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxNQUFjLEVBQUUsZUFBd0IsS0FBSztRQUM5RSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsTUFBTSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBQ0QsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUNuQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsQ0FDaEUsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzVELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLE1BQU0sQ0FBQTtRQUVuQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtZQUN2QyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFFL0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDeEIsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDakIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtZQUNsQyxDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBRWxDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQztvQkFDeEMsS0FBSyxFQUFFLFNBQVM7b0JBQ2hCLE9BQU8sRUFBRSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRTtvQkFDdkMsY0FBYyxFQUFFLEVBQUU7b0JBQ2xCLFNBQVMsRUFBRSxTQUFTO2lCQUNwQixDQUFDLENBQ0YsQ0FBQTtnQkFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNELENBQUM7aUJBQU0sSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDO29CQUN4QyxPQUFPLEVBQUUsRUFBRTtvQkFDWCxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRTtvQkFDckYsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsU0FBUyxFQUFFLFNBQVM7aUJBQ3BCLENBQUMsQ0FDRixDQUFBO2dCQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0QsQ0FBQztpQkFBTSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNoRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUM7b0JBQ3hDLE9BQU8sRUFBRSxFQUFFO29CQUNYLGNBQWMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFO29CQUNyRixLQUFLLEVBQUUsRUFBRTtvQkFDVCxTQUFTLEVBQUUsU0FBUztpQkFDcEIsQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFM0MsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQTtZQUNoQyxNQUFNLFlBQVksR0FBRyxDQUFDLENBQW1CLEtBQUssQ0FBQyxDQUFBO1lBQy9DLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUNsQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2pELFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUU1RCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQzVELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXO3FCQUNwQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUNYLEVBQUUsQ0FBQyxLQUFLO3FCQUNOLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBaUIsRUFBRSxDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQztxQkFDekQsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzFCO3FCQUNBLElBQUksRUFBRSxDQUFBO2dCQUNSLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNyQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsK0JBQStCLEVBQUU7NEJBQ2xDLE9BQU8sRUFBRSxlQUFlOzRCQUN4QixRQUFRLEVBQUUsSUFBSTs0QkFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7eUJBQzFDLENBQUMsQ0FBQTt3QkFDRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDOUIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUM1QyxJQUFJLENBQUMsNkJBQTZCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FDNUQsQ0FDRCxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFM0MsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQTtZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRXRFLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtZQUN0QixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDakIsVUFBVSxHQUFHLElBQUksQ0FBQTtZQUNsQixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xELHVDQUF1QztnQkFDdkMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzdELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDakIsbURBQW1EO29CQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQzVELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXO3FCQUNwQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUNYLEVBQUUsQ0FBQyxLQUFLO3FCQUNOLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBaUIsRUFBRSxDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQztxQkFDekQsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzFCO3FCQUNBLElBQUksRUFBRSxDQUFBO2dCQUNSLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNyQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsK0JBQStCLEVBQUU7NEJBQ2xDLE9BQU8sRUFBRSxlQUFlOzRCQUN4QixRQUFRLEVBQUUsSUFBSTs0QkFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7eUJBQzFDLENBQUMsQ0FBQTt3QkFDRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDOUIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNwQyxJQUNDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQztvQkFDbEMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNqQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFDbkMsQ0FBQztvQkFDRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDdkQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUUzQyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFBO1lBRWhDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFN0IsTUFBTSx5QkFBeUIsR0FBRyxPQUFPO2lCQUN2QyxLQUFLLENBQUMsNkJBQTZCLENBQUM7Z0JBQ3JDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDZCxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQ25GLENBQUE7WUFFRixNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtnQkFDaEMsTUFBTSxrQkFBa0IsR0FBRyx5QkFBeUIsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNyRSxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDekUsQ0FBQTtnQkFDRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO3dCQUN4QixrQkFBa0I7cUJBQ2xCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQyxDQUFBO1lBRUQsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO2dCQUMvQixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQy9CLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUN6RSxDQUFBO2dCQUNELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBRTVFLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzVDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO3dCQUNqQyxtQkFBbUIsRUFBRSxDQUFBO29CQUN0QixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUNqQixVQUFVLEdBQUcsSUFBSSxDQUFBO1lBQ2xCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsSUFDQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUM7b0JBQ2xDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDakMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQ25DLENBQUM7b0JBQ0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO29CQUNqRCxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFBO3dCQUNsRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtvQkFDNUIsQ0FBQztvQkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO2dCQUMzRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsNEZBQTRGO2dCQUM1RixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDOUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNqQixtREFBbUQ7d0JBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUMxQixtQkFBbUIsRUFBRSxDQUFBO29CQUN0QixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLEVBQUU7Z0JBQzFCLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUNoRCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQTtZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFOUUsbUJBQW1CLEVBQUUsQ0FBQTtZQUVyQixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNsQyxNQUFNLE9BQU8sR0FBVyxDQUFDLENBQUMsT0FBaUIsQ0FBQTtnQkFDM0MsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUMxRCxDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUM1QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDakQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQzVELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FDdkMsQ0FBQTtvQkFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLG1DQUEyQixDQUFBO29CQUNwRSxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRTNDLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUE7WUFFaEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUE7WUFDeEQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN2QyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDdEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU87Z0JBQzVCLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTztnQkFDZixDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN2RixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUU3QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUE7WUFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQ3ZCLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pCLFVBQVUsR0FBRyxJQUFJLENBQUE7WUFDbEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNsRCx1Q0FBdUM7Z0JBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFBO2dCQUN4RCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUN2QyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ3RFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFFcEYsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNqQixtREFBbUQ7b0JBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFVO1FBQy9CLCtFQUErRTtRQUMvRSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUE7WUFDN0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLHlGQUE2QyxFQUFFLENBQUM7WUFDckYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQjtpQkFDcEMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxFQUFFLFlBQVksRUFBRSxDQUFBO1lBQ2pCLE9BQU8sT0FBTztnQkFDYixDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDhDQUE4QyxFQUFFLE9BQU8sQ0FBQztnQkFDeEYsQ0FBQyxDQUFDLFFBQVEsQ0FDUiwyQkFBMkIsRUFDM0IsK0hBQStILENBQy9ILENBQUE7UUFDSixDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFzQixFQUFFLFVBQVUsR0FBRyxJQUFJO1FBQ2pFLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBaUIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDeEYsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQix5RUFBeUU7Z0JBQ3pFLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBaUIsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDNUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQixrQ0FBa0M7b0JBQ2xDLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxFQUFFLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtZQUMvRCxDQUFDO1lBQ0QsV0FBVyxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBYyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDdEYsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO29CQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBQzNDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ3JELElBQUksY0FBYyxFQUFFLENBQUM7d0JBQ3BCLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQzNDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsVUFBVSxDQUNULEdBQUcsRUFBRSxDQUFFLFdBQTJCLENBQUMsS0FBSyxFQUFFLEVBQzFDLFVBQVUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ2pFLENBQUE7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUE7WUFFbEMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckMsV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsQyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzVELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLGNBQWMsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQzdDLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUNoRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMzRSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLFdBQVcsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDNUYsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFBO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFDeEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFTyw2QkFBNkIsQ0FDcEMsT0FBeUIsRUFDekIsT0FBNkQ7UUFFN0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUE7UUFDeEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFBO0lBQzFFLENBQUM7SUFFUyxZQUFZLENBQUMsTUFBbUI7UUFDekMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FDbkIsZ0NBQWdDLEVBQ2hDLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxFQUM5QixDQUFDLENBQUMsaURBQWlELENBQUMsRUFDcEQsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsaURBQWlELEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXRGLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLCtCQUErQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTFELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6QyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDM0MsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxRQUFRLG9DQUE0QjtTQUNwQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDOUMsU0FBUyxFQUFFLDRDQUE0QztZQUN2RCxRQUFRLG9DQUE0QjtTQUNwQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRW5FLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUMzQixpQkFBaUIsRUFDakIsRUFBRSxFQUNGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsRUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CO1FBQ2pDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDO1lBQ3hDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztZQUNuQixlQUFlLEVBQUUsMEJBQTBCO1lBQzNDLFNBQVMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssYUFBYTtZQUNqRixLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxtREFBbUQsQ0FBQztZQUNyRixHQUFHLG1CQUFtQjtTQUN0QixDQUFDLENBQUE7UUFDRixxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLGVBQWUsQ0FBQTtRQUNsRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FDM0IsZUFBZSxFQUNmLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxFQUN4QixRQUFRLENBQUMsMkJBQTJCLEVBQUUsOEJBQThCLENBQUMsQ0FDckUsQ0FBQTtRQUNELE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxFQUFFO1lBQ25DLElBQUkscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBRzlCLCtCQUErQixFQUFFO29CQUNsQyxPQUFPLEVBQUUsc0JBQXNCO29CQUMvQixRQUFRLEVBQUUsU0FBUztvQkFDbkIsYUFBYSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO2lCQUMxQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUN2RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsK0JBQStCLEVBQUU7b0JBQ2xDLE9BQU8sRUFBRSx3QkFBd0I7b0JBQ2pDLFFBQVEsRUFBRSxTQUFTO29CQUNuQixhQUFhLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUU7aUJBQzFDLENBQUMsQ0FBQTtnQkFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hFLENBQUM7UUFDRixDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDMUQsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FDbEMscUJBQXFCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNuQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUNsQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELHFCQUFxQixDQUFDLE9BQU8sR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQTtZQUM5RCxzQkFBc0IsRUFBRSxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQ2YsU0FBUyxFQUNULEVBQUUsRUFDRixDQUFDLENBQUMseUJBQXlCLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQzlELENBQUMsQ0FDQSx3QkFBd0IsRUFDeEIsRUFBRSxFQUNGLFFBQVEsQ0FDUDtZQUNDLEdBQUcsRUFBRSwrQkFBK0I7WUFDcEMsT0FBTyxFQUFFLENBQUMsd0NBQXdDLENBQUM7U0FDbkQsRUFDRCxpQkFBaUIsQ0FDakIsQ0FDRCxDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLDRDQUE0QyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXZFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUNqRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxDQUFBO1FBRXJFLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FDZixTQUFTLEVBQ1QsRUFBRSxFQUNGLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLEVBQUUscUJBQXFCLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQzNFLENBQUE7UUFFRCxNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQ2pELEtBQUssQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUN2RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzlDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNuQixDQUFDO1lBQ0QsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNqRSxnQkFBZ0IsRUFBRSxDQUFBO1FBQ25CLENBQUMsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxFQUFFO1lBQzdCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDekQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkIsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtnQkFDNUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEIsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDekUsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMzQyxXQUFXLEVBQUUsQ0FBQTtRQUViLEtBQUssQ0FDSixJQUFJLENBQUMsZUFBZSxFQUNwQixDQUFDLENBQUMsb0NBQW9DLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUNwRixDQUFBO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxDQUFBO1FBRTNDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBRWhDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUMzRCxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUMvRCxDQUFBO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxDQUFBO2dCQUM1RSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FDM0QsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDL0QsQ0FBQTtnQkFDRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUN6RixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUN4QixPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDekYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDeEIsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDekUsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDbEMsQ0FBQTtRQUNELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDdkYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEMsQ0FBQzthQUFNLElBQ04sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQjtZQUMxQyxDQUFDLGlCQUFpQjtZQUNsQixDQUFDLElBQUksQ0FBQywwQkFBMEI7WUFDaEMsSUFBSSxDQUFDLHVCQUF1QixFQUMzQixDQUFDO1lBQ0YsTUFBTSxzQkFBc0IsR0FDM0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLG9DQUEyQjtnQkFDN0UsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUN6QixNQUFNLHFCQUFxQixHQUMxQixDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7WUFDeEUsTUFBTSxvQkFBb0IsR0FBRyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFFeEYsSUFBSSxvQkFBb0IsS0FBSyxxQkFBcUIsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUNqRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNKLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQTtvQkFDdEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtvQkFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFBO29CQUMvRCxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQTtvQkFDcEYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7b0JBQ3JFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO29CQUNoRCxPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixNQUFNLFlBQVksR0FBRyxDQUFDLE1BQW1CLEVBQUUsRUFBRTtZQUM1QyxJQUFJLFFBQWdCLENBQUE7WUFDcEIsSUFBSSxjQUErQixDQUFBO1lBQ25DLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLGNBQWMsR0FBRyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUE7Z0JBQ2hELFFBQVE7b0JBQ1AsTUFBTSxDQUFDLEtBQUs7d0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxDQUFDLENBQUE7WUFDcEYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVE7b0JBQ1AsTUFBTSxDQUFDLEtBQUs7d0JBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxDQUFDLENBQUE7Z0JBQ25GLGNBQWMsR0FBRyxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQy9ELENBQUM7WUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXZELE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUVwQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQTtZQUNyQixJQUFJLENBQUMsWUFBWSxDQUNoQixZQUFZLEVBQ1osUUFBUSxDQUNQLGdDQUFnQyxFQUNoQywrQkFBK0IsRUFDL0IsSUFBSSxFQUNKLFVBQVUsQ0FDVixDQUNELENBQUE7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBRzlCLCtCQUErQixFQUFFO29CQUNsQyxPQUFPLEVBQUUsWUFBWTtvQkFDckIsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLGFBQWEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtpQkFDMUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQzdDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPO29CQUN0QyxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUUsc0ZBQXNGO2lCQUN2SSxDQUFDLENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO2dCQUNsQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDcEIsQ0FBQyxDQUFDLENBQUE7WUFDRixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRXBCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQTtZQUMzQixJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQTtZQUNyQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRXBCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEMsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUNqRixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDbkMsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssRUFBRSxDQUFDLENBQ1AsZUFBZSxFQUNmLEVBQUUsRUFDRixRQUFRLENBQUMsV0FBVyxFQUFFLDZCQUE2QixDQUFDLEVBQ3BELENBQUMsQ0FDQSxvQkFBb0IsRUFDcEIsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEVBQzlCLFFBQVEsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQ3ZDLEVBQ0QsUUFBUSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FDaEM7WUFFRCxJQUFJLEVBQUUsQ0FBQyxDQUNOLE9BQU8sRUFDUCxFQUFFLEVBQ0YsQ0FBQyxDQUNBLG9CQUFvQixFQUNwQjtnQkFDQyxZQUFZLEVBQUUsaUJBQWlCO2dCQUMvQixLQUFLLEVBQUUsUUFBUSxDQUNkLG1CQUFtQixFQUNuQiw2QkFBNkIsRUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUM1QzthQUNELEVBQ0QsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDOUIsQ0FDRDtZQUNELGFBQWEsRUFBRSxZQUFZO1lBQzNCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztTQUNuQyxDQUFDLENBQUMsQ0FBQTtRQUVILGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxjQUFjO2FBQ2pCLElBQUksQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTtZQUN4QixtQ0FBbUM7WUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVO2lCQUNqQyxNQUFNLENBQ04sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNWLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGtCQUFrQixDQUMvQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDL0QsQ0FDRjtpQkFDQSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pCLEdBQUcsTUFBTTtnQkFDVCxFQUFFLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTthQUNqRixDQUFDLENBQUMsQ0FBQTtZQUVKLE1BQU0sYUFBYSxHQUFHLEdBQUcsRUFBRTtnQkFDMUIsa0JBQWtCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDaEQsQ0FBQyxDQUFBO1lBRUQsYUFBYSxFQUFFLENBQUE7WUFDZixrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUYsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFMUIsT0FBTyxrQkFBa0IsQ0FBQTtJQUMxQixDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLGdCQUFnQixHQUFHLENBQUMsS0FBNkIsRUFBZSxFQUFFLENBQ3ZFLENBQUMsQ0FDQSxJQUFJLEVBQ0osRUFBRSxFQUNGLENBQUMsQ0FDQSxvQkFBb0IsRUFDcEI7WUFDQyxZQUFZLEVBQUUsbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEVBQUU7WUFDNUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxXQUFXLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO1NBQ3ZFLEVBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFDekIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUMxQixDQUNELENBQUE7UUFFRixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQztZQUMvRCxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7WUFDakMsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsRUFBRTtZQUNULGFBQWEsRUFBRSxnQkFBZ0I7WUFDL0IsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQzVCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztTQUNuQyxDQUFDLENBQUMsQ0FBQTtRQUVILFNBQVMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN4QyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUE7UUFDN0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG1DQUFtQztRQUMxQyxNQUFNLCtCQUErQixHQUFHLENBQUMsUUFBOEIsRUFBZSxFQUFFO1lBQ3ZGLE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFBO1lBQ3ZGLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDcEMsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEUsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsS0FBSyxDQUNKLFFBQVEsRUFDUixDQUFDLENBQ0EsWUFBWSxFQUNaLEVBQUUsRUFDRixRQUFRLENBQ1A7b0JBQ0MsR0FBRyxFQUFFLFVBQVU7b0JBQ2YsT0FBTyxFQUFFO3dCQUNSLGdGQUFnRjtxQkFDaEY7aUJBQ0QsRUFDRCxTQUFTLENBQ1QsQ0FDRCxDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzlDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRXhELElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDekQsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzNGLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsK0JBQStCLEVBQUU7Z0JBQ3ZELHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxFQUFFO2FBQ25DLENBQUMsQ0FBQTtZQUNGLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUU1RCxPQUFPLENBQUMsQ0FDUCxpQ0FBaUM7Z0JBQ2hDLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQ3pFO2dCQUNDLFlBQVksRUFBRSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsRUFBRTtnQkFDN0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXO2FBQzNCLEVBQ0QsYUFBYSxFQUNiLENBQUMsQ0FDQSxlQUFlLEVBQ2YsRUFBRSxFQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQzVCLFlBQVksRUFDWixjQUFjLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUMxQyxDQUFDLENBQUMsOENBQThDLEVBQUU7Z0JBQ2pELFFBQVEsRUFBRSxDQUFDO2dCQUNYLFlBQVksRUFBRSxlQUFlLEdBQUcsUUFBUSxDQUFDLEVBQUU7Z0JBQzNDLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQztnQkFDaEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsWUFBWSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7YUFDaEQsQ0FBQyxDQUNGLEVBQ0Qsa0JBQWtCLEVBQ2xCLENBQUMsQ0FDQSxvQkFBb0IsRUFDcEIsRUFBRSxvQkFBb0IsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQ3JDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUMzRSxDQUNELENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUF1QixFQUFFLEVBQUU7WUFDbkQsSUFBSSxJQUFJLEdBQWtCLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFFakMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksSUFBSSxDQUFDLENBQUE7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksSUFBSSxDQUFDLENBQUE7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksSUFBSSxDQUFDLENBQUE7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQTtZQUMzQixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLElBQUksR0FBRyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUE7UUFFRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksdUJBQXVCLENBQUM7WUFDakYsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDO1lBQy9DLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsQ0FBQyxDQUNSLHVDQUF1QyxFQUN2QyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQ25ELFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQzlCO1lBQ0QsYUFBYSxFQUFFLCtCQUErQjtZQUM5QyxXQUFXLEVBQUUsZUFBZTtZQUM1QixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7U0FDbkMsQ0FBQyxDQUFDLENBQUE7UUFFSCxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sc0JBQXNCLEdBQzNCLE1BQU0sQ0FBQyxJQUFJO2dCQUNYLGtCQUFrQixDQUFDLFNBQVM7b0JBQzNCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMxQyxJQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDL0MsQ0FBQyxNQUFNLENBQUE7WUFDVixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUE7WUFDbkYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDaEMsNEJBQTRCO2lCQUMxQixNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztpQkFDM0IsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUM1RCw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFaEcsT0FBTyxrQkFBa0IsQ0FBQTtJQUMxQixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQWU7UUFDckIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxDQUFBO1FBRXBDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFFeEMsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXJDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxZQUFZLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzdCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFBO1FBRXZCLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBRTVFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLENBQUE7UUFDeEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMvRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQTtZQUM3RixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxLQUFLLENBQUMsa0NBQWtDLEdBQUcsVUFBVSxDQUFDLENBQUE7WUFDN0QsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUxRCxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFtQixDQUFBO1lBQzNGLEdBQUcsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3RDLEdBQUcsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDM0QsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN4RCxNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtZQUMvRCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLFFBQVEsR0FBRyxDQUUvQjtZQUFDLE9BQU8sQ0FBQyxhQUE2QixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQ3ZELGFBQWEsRUFDYixLQUFLLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FDekIsQ0FBQTtZQUVELElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzlDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUNuQixpQ0FBaUMsRUFDakMseUJBQXlCLEVBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQ25CLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsR0FBRyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQ25CLGtDQUFrQyxFQUNsQywyQkFBMkIsRUFDM0IsS0FBSyxDQUFDLGFBQWEsRUFDbkIsS0FBSyxDQUFDLFVBQVUsQ0FDaEIsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxNQUFlO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUM3RSxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQTtRQUNsRixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsTUFBTSxLQUFLLENBQUMsbUNBQW1DLEdBQUcsVUFBVSxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzdELEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUE7WUFDOUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFBO1lBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFBO1lBQ3hFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxXQUFXLENBQUE7WUFDckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGFBQWEsQ0FDcEIsUUFBNEU7UUFFNUUsTUFBTSxNQUFNLEdBQ1gsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTTtZQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNuQyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFBO1FBQ3hFLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLEtBQUssSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUN4QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQzVDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywrQkFFNUIsQ0FBQTtZQUNELElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBRXpELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGFBQWE7aUJBQzVDLFNBQVMsMENBQWtDO2lCQUMzQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtZQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRTtnQkFDaEUsS0FBSyxFQUFFLGtCQUFrQjtnQkFDekIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ3ZCLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxhQUFhO2FBQy9DLFNBQVMsMENBQWtDO2FBQzNDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLFlBQVksbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3hELHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBQ08sY0FBYyxDQUFDLElBQVk7UUFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU5RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUMvQiwrQkFBK0IsRUFDL0IsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FDeEYsQ0FBQTtRQUVELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFckMscUJBQXFCO1lBQ3JCLElBQUksSUFBSSxHQUFRLEVBQUUsQ0FBQTtZQUNsQixJQUFJLENBQUM7Z0JBQ0osSUFBSSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLG1CQUFtQjtnQkFDbkIsSUFBSSxDQUFDO29CQUNKLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMvQixDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixlQUFlO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2QsQ0FBQztZQUVELHdGQUF3RjtZQUN4RixJQUNDLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO2dCQUN0RCxVQUFVLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDcEQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUMvRCxDQUFDO2dCQUNGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxTQUFTLENBQ2pFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUNuRCxDQUFBO2dCQUVELGtGQUFrRjtnQkFDbEYsSUFDQyxpQkFBaUIsS0FBSyxTQUFTO29CQUMvQixpQkFBaUIsR0FBRyxDQUFDLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3JGLENBQUM7b0JBQ0YsTUFBTSxXQUFXLEdBQTBDO3dCQUMxRCxNQUFNLEVBQUUsOEJBQThCLENBQUMsRUFBRTt3QkFDekMsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO3dCQUMzQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO3FCQUNuQyxDQUFBO29CQUVELHFDQUFxQztvQkFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLG1DQUFtQyxFQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyw4REFHM0IsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDNUUsTUFBTSxNQUFNLEdBQVEsTUFBTSxFQUFFLFVBQVUsQ0FBQTtnQkFDdEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3dCQUN4QixPQUFPLENBQUMsSUFBSSxDQUNYLG1DQUFtQyxFQUNuQyxJQUFJLEVBQ0oscUNBQXFDLEVBQ3JDLE1BQU0sRUFDTiwyQkFBMkIsQ0FDM0IsQ0FBQTt3QkFDRCxPQUFNO29CQUNQLENBQUM7b0JBQ0QsTUFBTSxXQUFXLEdBQTBDO3dCQUMxRCxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTt3QkFDekIsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO3dCQUMzQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO3FCQUNuQyxDQUFBO29CQUNELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixtQ0FBbUMsRUFDbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsOERBRzNCLENBQUE7b0JBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JELENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQy9FLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQzdELENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQUMsU0FBc0IsRUFBRSxJQUFrQjtRQUMxRSxPQUFPLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM3QixTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzlCLENBQUM7UUFFRCxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQy9CLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDOUUsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO2dCQUNqRSxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUU7b0JBQzFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztvQkFDakIsWUFBWSxFQUFFLElBQUk7b0JBQ2xCLEdBQUcsbUJBQW1CO2lCQUN0QixDQUFDLENBQUE7Z0JBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUVuRSxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7Z0JBQ3pCLE1BQU0sQ0FBQyxVQUFVLENBQ2hCLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ0wsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO29CQUNuQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7b0JBQ2xCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMvQixDQUFDLEVBQ0QsSUFBSSxFQUNKLElBQUksQ0FBQyxzQkFBc0IsQ0FDM0IsQ0FBQTtnQkFFRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQzlDLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQ2hCLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FDeEIsdUJBQXVCLEVBQ3ZCLEVBQUUsRUFDRixRQUFRLENBQUMsNEJBQTRCLEVBQUUsNkJBQTZCLENBQUMsQ0FDckUsQ0FBQTt3QkFDRCxTQUFTLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFBO3dCQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxFQUFFOzRCQUN0RCxHQUFHLDRCQUE0Qjt5QkFDL0IsQ0FBQyxDQUFBO3dCQUNGLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7d0JBQ3JCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3ZDLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNuQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDOUIsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ2hELEtBQUssTUFBTSxPQUFPLElBQUksYUFBYSxFQUFFLENBQUM7NEJBQ3JDLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7Z0NBQ2pDLENBQUMsQ0FBQyxXQUFXLENBQ1osbUJBQW1CLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUN4RSxDQUFBOzRCQUNGLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBOzRCQUN2QixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE1BQU0sYUFBYSxHQUNsQixhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQzs0QkFDaEYsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBQy9CLENBQUMsQ0FBQyxJQUFJLENBQUE7d0JBQ1IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRTs0QkFDN0UsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQzt5QkFDM0MsQ0FBQyxDQUFBO3dCQUNGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3RDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVRLFVBQVU7UUFDbEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM1QixLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDbkIsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFVBQWtCLEVBQUUsWUFBcUI7UUFDbkUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDbkUsMkRBQTJEO1lBQzNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQTtRQUM3RixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxVQUFVLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsK0NBQStDLEVBQUU7WUFDL0UsNEJBQTRCLEVBQUUsUUFBUSxDQUFDLEVBQUU7U0FDekMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRTNGLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxDQUNwQywyQkFBMkIsRUFDM0IsRUFBRSxFQUNGLENBQUMsQ0FDQSxpQ0FBaUMsRUFDakMsRUFBRSxFQUNGLENBQUMsQ0FDQSwrQkFBK0IsRUFDL0IsRUFBRSxzQkFBc0IsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQ3ZDLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUN2QyxFQUNELG9CQUFvQixDQUNwQixDQUNELENBQUE7UUFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBRW5ELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQzlCLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pELE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLEVBQUUsQ0FDN0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUV4RSxJQUFJLEtBQUssQ0FBQyxPQUFPLDZCQUFvQixFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUNyQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUNmLEtBQUssR0FBRyxnQkFBZ0IsRUFBRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNqRixDQUFBO2dCQUNELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDekQsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLCtCQUFzQixFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNuQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUNmLEtBQUssR0FBRyxnQkFBZ0IsRUFBRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNqRixDQUFBO2dCQUNELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLGFBQWEsR0FBMkMsU0FBUyxDQUFBO1FBRXJFLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRGLE1BQU0sYUFBYSxHQUFHLEdBQUcsRUFBRTtZQUMxQixRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDL0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ2xELENBQUE7WUFFRCxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsT0FBTTtZQUNQLENBQUM7WUFFRCxhQUFhLEdBQUcsUUFBUSxDQUFBO1lBRXhCLEtBQUssQ0FDSixpQkFBaUIsRUFDakIsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FDaEIsVUFBVTtvQkFDVCxDQUFDLElBQUksQ0FBQyxJQUFJO3dCQUNULENBQUMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyw0QkFBNEIsQ0FBQzt3QkFDckUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsOEJBQThCLENBQUMsQ0FBQyxFQUM1RDtvQkFDQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsRUFBRTtvQkFDNUIsWUFBWSxFQUFFLHVCQUF1QixHQUFHLElBQUksQ0FBQyxFQUFFO29CQUMvQyxJQUFJLEVBQUUsVUFBVTtvQkFDaEIsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTztvQkFDNUMsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJO3dCQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO3dCQUN0RSxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxzQ0FBc0MsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO2lCQUM5RSxDQUNELENBQUE7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLDZCQUE2QixFQUFFLEVBQUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ3pGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUUxRCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakYsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO2dCQUVyRCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFFdEUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztvQkFDakMsZUFBZSxDQUFDLFdBQVcsQ0FDMUIsQ0FBQyxDQUFDLG9CQUFvQixFQUFFO3dCQUN2QixZQUFZLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztxQkFDL0UsQ0FBQyxDQUNGLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO29CQUN4QyxlQUFlLENBQUMsV0FBVyxDQUMxQixDQUFDLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZCLFlBQVksRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO3FCQUMvRSxDQUFDLENBQ0YsQ0FBQTtnQkFDRixDQUFDO2dCQUVELE9BQU8sQ0FBQyxDQUNQLDZCQUE2QixFQUM3QjtvQkFDQyxZQUFZLEVBQUUsYUFBYSxHQUFHLElBQUksQ0FBQyxFQUFFO29CQUNyQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQ3ZCLGVBQWUsRUFBRSxPQUFPO29CQUN4QixjQUFjLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPO29CQUM1QyxJQUFJLEVBQUUsUUFBUTtpQkFDZCxFQUNELE9BQU8sRUFDUCxlQUFlLENBQ2YsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxhQUFhLEVBQUUsQ0FBQTtRQUVmLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQzlCLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM1QyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDbEUsYUFBYSxFQUFFLENBQUE7Z0JBQ2YsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQzFELENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQzdDLENBQUE7UUFFRCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQ3ZCLG1DQUFtQyxFQUNuQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFDaEIsaUJBQWlCLEVBQ2pCLENBQUMsQ0FDQSxzQkFBc0IsRUFDdEIsRUFBRSxFQUNGLENBQUMsQ0FDQSw2QkFBNkIsRUFDN0IsRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEVBQzNCLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUNuQyxRQUFRLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUNoQyxFQUNELEdBQUcsQ0FBQyxnQkFBZ0I7WUFDbkIsQ0FBQyxDQUFDO2dCQUNBLENBQUMsQ0FDQSx5QkFBeUIsRUFDekIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLEVBQy9CLFFBQVEsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQ25DLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUNyQzthQUNEO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUNOLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyQyxJQUFJLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQzFFLENBQUE7UUFDRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUU1RCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNuRCxJQUNDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CO1lBQ3BDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBd0I7WUFDcEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQ2xDLENBQUM7WUFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUVELEtBQUssQ0FDSixJQUFJLENBQUMsWUFBWSxFQUNqQiwyQkFBMkIsRUFDM0IsaUJBQWlCLEVBQ2pCLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsY0FBYyxDQUNkLENBQUE7UUFFRCxNQUFNLFFBQVEsR0FDYixRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbEIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDMUUsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUUzRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxDQUFBO1FBRXhDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxNQUFtQjtRQUMvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWpGLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLG9CQUFvQixxREFBcUQsQ0FBQTtRQUU1RyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksVUFBVSx1Q0FBdUMsQ0FBQTtRQUUxRSxNQUFNLElBQUksR0FBRyxRQUFRLENBQ3BCO1lBQ0MsR0FBRyxFQUFFLFFBQVE7WUFDYixPQUFPLEVBQUU7Z0JBQ1Isb0ZBQW9GO2FBQ3BGO1NBQ0QsRUFDRCw2REFBNkQsRUFDN0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQzdCLHNCQUFzQixFQUN0QixZQUFZLENBQ1osQ0FBQTtRQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQWU7UUFDekMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUMxRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLEtBQUssR0FBRyxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQWU7UUFDcEMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN2QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM3RCxJQUFJLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDOUUsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7Z0JBQzlDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO2dCQUNoQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2xFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO2dCQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtnQkFDN0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFBO2dCQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtnQkFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUE7Z0JBRWpELElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLENBQUM7b0JBQ2pGLHVGQUF1RjtvQkFDdkYsbUJBQW1CO29CQUNuQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtnQkFDNUIsQ0FBQztnQkFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsTUFBTTtRQUNMLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNsQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUSxDQUFDLFFBQWtDLEVBQUUsY0FBdUIsS0FBSztRQUNoRixNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLElBQUksUUFBUSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQy9CLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzVDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQW9CLDBCQUEwQixDQUFFLENBQUMsS0FBSyxDQUFDLE9BQU87Z0JBQ3pGLE1BQU0sQ0FBQTtZQUNQLElBQUksQ0FBQyxTQUFTO2lCQUNaLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBRTtpQkFDN0MsZ0JBQWdCLENBQUMsUUFBUSxDQUFDO2lCQUMxQixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxTQUFTO2lCQUNaLGFBQWEsQ0FBQyxnQ0FBZ0MsQ0FBRTtpQkFDaEQsZ0JBQWdCLENBQUMsUUFBUSxDQUFDO2lCQUMxQixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxTQUFTO2lCQUNaLGFBQWEsQ0FBQyxnQ0FBZ0MsQ0FBRTtpQkFDaEQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO2lCQUN6QixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2pELENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDekMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUMvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBb0IsMEJBQTBCLENBQUMsQ0FBQTtZQUM5RixVQUFXLENBQUMsS0FBSyxDQUFDLE9BQU87Z0JBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1lBRXhFLE1BQU0sZUFBZSxHQUFHLFVBQVcsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDOUQsZUFBZ0IsQ0FBQyxXQUFXLEdBQUcsV0FBVztnQkFDekMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO2dCQUNoQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUVoQyxJQUFJLENBQUMsU0FBUztpQkFDWixhQUFhLENBQUMsNkJBQTZCLENBQUU7aUJBQzdDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztpQkFDMUIsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNoRCxJQUFJLENBQUMsU0FBUztpQkFDWixhQUFhLENBQUMsZ0NBQWdDLENBQUU7aUJBQ2hELGdCQUFnQixDQUFDLFFBQVEsQ0FBQztpQkFDMUIsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsU0FBUztpQkFDWixhQUFhLENBQUMsZ0NBQWdDLENBQUU7aUJBQ2hELGdCQUFnQixDQUFDLE9BQU8sQ0FBQztpQkFDekIsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVRLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFYixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUE7UUFFekQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUE7UUFDekMsT0FBTyxNQUFNLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLE1BQU0sR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1oseUVBQXlFO1lBQ3pFLGdIQUFnSDtZQUNoSCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDOztBQTdpRVcsa0JBQWtCO0lBa0Q1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxjQUFjLENBQUE7SUFDZCxZQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSxlQUFlLENBQUE7SUFDZixZQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFlBQUEscUJBQXFCLENBQUE7R0F4RVgsa0JBQWtCLENBOGlFOUI7O0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQUNsQyxZQUFZLENBQUMsV0FBZ0M7UUFDbkQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sU0FBUyxDQUFDLFdBQWdDO1FBQ2hELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNyQixnQkFBZ0IsRUFBRSxXQUFXLENBQUMsZ0JBQWdCO1lBQzlDLFlBQVksRUFBRSxXQUFXLENBQUMsWUFBWTtTQUN0QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sV0FBVyxDQUNqQixvQkFBMkMsRUFDM0MscUJBQTZCO1FBRTdCLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDdkQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQzVFLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7WUFDbkUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUM7WUFDVixPQUFPLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==