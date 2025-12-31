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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9nZXR0aW5nU3RhcnRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLENBQUMsRUFFRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxLQUFLLEdBQ0wsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVwRixPQUFPLEVBQUUsS0FBSyxFQUFF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