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
var ViewPane_1;
import './media/paneviewlet.css';
import * as nls from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { asCssVariable, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { after, append, $, trackFocus, EventType, addDisposableListener, Dimension, reset, isAncestorOfActiveElement, isActiveElement, } from '../../../../base/browser/dom.js';
import { createCSSRule } from '../../../../base/browser/domStylesheets.js';
import { asCssValueWithDefault, asCSSUrl } from '../../../../base/browser/cssValue.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Action } from '../../../../base/common/actions.js';
import { prepareActions, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Pane } from '../../../../base/browser/ui/splitview/paneview.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ViewContainerExtensions, IViewDescriptorService, defaultViewIcon, ViewContainerLocationToString, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuId, Action2, SubmenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { AbstractProgressScope, ScopedProgressIndicator, } from '../../../services/progress/browser/progressIndicator.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { URI } from '../../../../base/common/uri.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { CompositeMenuActions } from '../../actions.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { FilterWidget } from './viewFilter.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultButtonStyles, defaultProgressBarStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { PANEL_BACKGROUND, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_STICKY_SCROLL_BACKGROUND, PANEL_STICKY_SCROLL_BORDER, PANEL_STICKY_SCROLL_SHADOW, SIDE_BAR_BACKGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BORDER, SIDE_BAR_STICKY_SCROLL_SHADOW, } from '../../../common/theme.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
export var ViewPaneShowActions;
(function (ViewPaneShowActions) {
    /** Show the actions when the view is hovered. This is the default behavior. */
    ViewPaneShowActions[ViewPaneShowActions["Default"] = 0] = "Default";
    /** Always shows the actions when the view is expanded */
    ViewPaneShowActions[ViewPaneShowActions["WhenExpanded"] = 1] = "WhenExpanded";
    /** Always shows the actions */
    ViewPaneShowActions[ViewPaneShowActions["Always"] = 2] = "Always";
})(ViewPaneShowActions || (ViewPaneShowActions = {}));
export const VIEWPANE_FILTER_ACTION = new Action('viewpane.action.filter');
const viewPaneContainerExpandedIcon = registerIcon('view-pane-container-expanded', Codicon.chevronDown, nls.localize('viewPaneContainerExpandedIcon', 'Icon for an expanded view pane container.'));
const viewPaneContainerCollapsedIcon = registerIcon('view-pane-container-collapsed', Codicon.chevronRight, nls.localize('viewPaneContainerCollapsedIcon', 'Icon for a collapsed view pane container.'));
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
let ViewWelcomeController = class ViewWelcomeController {
    get enabled() {
        return this._enabled;
    }
    constructor(container, delegate, instantiationService, openerService, contextKeyService, lifecycleService) {
        this.container = container;
        this.delegate = delegate;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.contextKeyService = contextKeyService;
        this.items = [];
        this._enabled = false;
        this.disposables = new DisposableStore();
        this.enabledDisposables = this.disposables.add(new DisposableStore());
        this.renderDisposables = this.disposables.add(new DisposableStore());
        this.disposables.add(Event.runAndSubscribe(this.delegate.onDidChangeViewWelcomeState, () => this.onDidChangeViewWelcomeState()));
        this.disposables.add(lifecycleService.onWillShutdown(() => this.dispose())); // Fixes https://github.com/microsoft/vscode/issues/208878
    }
    layout(height, width) {
        if (!this._enabled) {
            return;
        }
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
        this.element.classList.toggle('wide', width > 640);
        this.scrollableElement.scanDomNode();
    }
    focus() {
        if (!this._enabled) {
            return;
        }
        this.element.focus();
    }
    onDidChangeViewWelcomeState() {
        const enabled = this.delegate.shouldShowWelcome();
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        if (!enabled) {
            this.enabledDisposables.clear();
            return;
        }
        this.container.classList.add('welcome');
        const viewWelcomeContainer = append(this.container, $('.welcome-view'));
        this.element = $('.welcome-view-content', { tabIndex: 0 });
        this.scrollableElement = new DomScrollableElement(this.element, {
            alwaysConsumeMouseWheel: true,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 3 /* ScrollbarVisibility.Visible */,
        });
        append(viewWelcomeContainer, this.scrollableElement.getDomNode());
        this.enabledDisposables.add(toDisposable(() => {
            this.container.classList.remove('welcome');
            this.scrollableElement.dispose();
            viewWelcomeContainer.remove();
            this.scrollableElement = undefined;
            this.element = undefined;
        }));
        this.contextKeyService.onDidChangeContext(this.onDidChangeContext, this, this.enabledDisposables);
        Event.chain(viewsRegistry.onDidChangeViewWelcomeContent, ($) => $.filter((id) => id === this.delegate.id))(this.onDidChangeViewWelcomeContent, this, this.enabledDisposables);
        this.onDidChangeViewWelcomeContent();
    }
    onDidChangeViewWelcomeContent() {
        const descriptors = viewsRegistry.getViewWelcomeContent(this.delegate.id);
        this.items = [];
        for (const descriptor of descriptors) {
            if (descriptor.when === 'default') {
                this.defaultItem = { descriptor, visible: true };
            }
            else {
                const visible = descriptor.when
                    ? this.contextKeyService.contextMatchesRules(descriptor.when)
                    : true;
                this.items.push({ descriptor, visible });
            }
        }
        this.render();
    }
    onDidChangeContext() {
        let didChange = false;
        for (const item of this.items) {
            if (!item.descriptor.when || item.descriptor.when === 'default') {
                continue;
            }
            const visible = this.contextKeyService.contextMatchesRules(item.descriptor.when);
            if (item.visible === visible) {
                continue;
            }
            item.visible = visible;
            didChange = true;
        }
        if (didChange) {
            this.render();
        }
    }
    render() {
        this.renderDisposables.clear();
        this.element.innerText = '';
        const contents = this.getContentDescriptors();
        if (contents.length === 0) {
            this.container.classList.remove('welcome');
            this.scrollableElement.scanDomNode();
            return;
        }
        let buttonsCount = 0;
        for (const { content, precondition, renderSecondaryButtons } of contents) {
            const lines = content.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) {
                    continue;
                }
                const linkedText = parseLinkedText(line);
                if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                    const node = linkedText.nodes[0];
                    const buttonContainer = append(this.element, $('.button-container'));
                    const button = new Button(buttonContainer, {
                        title: node.title,
                        supportIcons: true,
                        secondary: renderSecondaryButtons && buttonsCount > 0 ? true : false,
                        ...defaultButtonStyles,
                    });
                    button.label = node.label;
                    button.onDidClick((_) => {
                        this.openerService.open(node.href, { allowCommands: true });
                    }, null, this.renderDisposables);
                    this.renderDisposables.add(button);
                    buttonsCount++;
                    if (precondition) {
                        const updateEnablement = () => (button.enabled = this.contextKeyService.contextMatchesRules(precondition));
                        updateEnablement();
                        const keys = new Set(precondition.keys());
                        const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, (e) => e.affectsSome(keys));
                        onDidChangeContext(updateEnablement, null, this.renderDisposables);
                    }
                }
                else {
                    const p = append(this.element, $('p'));
                    for (const node of linkedText.nodes) {
                        if (typeof node === 'string') {
                            append(p, ...renderLabelWithIcons(node));
                        }
                        else {
                            const link = this.renderDisposables.add(this.instantiationService.createInstance(Link, p, node, {}));
                            if (precondition && node.href.startsWith('command:')) {
                                const updateEnablement = () => (link.enabled = this.contextKeyService.contextMatchesRules(precondition));
                                updateEnablement();
                                const keys = new Set(precondition.keys());
                                const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, (e) => e.affectsSome(keys));
                                onDidChangeContext(updateEnablement, null, this.renderDisposables);
                            }
                        }
                    }
                }
            }
        }
        this.container.classList.add('welcome');
        this.scrollableElement.scanDomNode();
    }
    getContentDescriptors() {
        const visibleItems = this.items.filter((v) => v.visible);
        if (visibleItems.length === 0 && this.defaultItem) {
            return [this.defaultItem.descriptor];
        }
        return visibleItems.map((v) => v.descriptor);
    }
    dispose() {
        this.disposables.dispose();
    }
};
ViewWelcomeController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IOpenerService),
    __param(4, IContextKeyService),
    __param(5, ILifecycleService)
], ViewWelcomeController);
let ViewPane = class ViewPane extends Pane {
    static { ViewPane_1 = this; }
    static { this.AlwaysShowActionsConfig = 'workbench.view.alwaysShowHeaderActions'; }
    get title() {
        return this._title;
    }
    get titleDescription() {
        return this._titleDescription;
    }
    get singleViewPaneContainerTitle() {
        return this._singleViewPaneContainerTitle;
    }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewInformationService) {
        super({
            ...options,
            ...{
                orientation: viewDescriptorService.getViewLocationById(options.id) === 1 /* ViewContainerLocation.Panel */
                    ? 1 /* Orientation.HORIZONTAL */
                    : 0 /* Orientation.VERTICAL */,
            },
        });
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.viewDescriptorService = viewDescriptorService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.accessibleViewInformationService = accessibleViewInformationService;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeBodyVisibility = this._register(new Emitter());
        this.onDidChangeBodyVisibility = this._onDidChangeBodyVisibility.event;
        this._onDidChangeTitleArea = this._register(new Emitter());
        this.onDidChangeTitleArea = this._onDidChangeTitleArea.event;
        this._onDidChangeViewWelcomeState = this._register(new Emitter());
        this.onDidChangeViewWelcomeState = this._onDidChangeViewWelcomeState.event;
        this._isVisible = false;
        this.headerActionViewItems = this._register(new DisposableMap());
        this.id = options.id;
        this._title = options.title;
        this._titleDescription = options.titleDescription;
        this._singleViewPaneContainerTitle = options.singleViewPaneContainerTitle;
        this.showActions = options.showActions ?? ViewPaneShowActions.Default;
        this.scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this.scopedContextKeyService.createKey('view', this.id);
        const viewLocationKey = this.scopedContextKeyService.createKey('viewLocation', ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)));
        this._register(Event.filter(viewDescriptorService.onDidChangeLocation, (e) => e.views.some((view) => view.id === this.id))(() => viewLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)))));
        const childInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.menuActions = this._register(childInstantiationService.createInstance(CompositeMenuActions, options.titleMenuId ?? MenuId.ViewTitle, MenuId.ViewTitleContext, { shouldForwardArgs: !options.donotForwardArgs, renderShortTitle: true }));
        this._register(this.menuActions.onDidChange(() => this.updateActions()));
    }
    get headerVisible() {
        return super.headerVisible;
    }
    set headerVisible(visible) {
        super.headerVisible = visible;
        this.element.classList.toggle('merged-header', !visible);
    }
    setVisible(visible) {
        if (this._isVisible !== visible) {
            this._isVisible = visible;
            if (this.isExpanded()) {
                this._onDidChangeBodyVisibility.fire(visible);
            }
        }
    }
    isVisible() {
        return this._isVisible;
    }
    isBodyVisible() {
        return this._isVisible && this.isExpanded();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed) {
            this._onDidChangeBodyVisibility.fire(expanded);
        }
        this.updateTwistyIcon();
        return changed;
    }
    render() {
        super.render();
        const focusTracker = trackFocus(this.element);
        this._register(focusTracker);
        this._register(focusTracker.onDidFocus(() => this._onDidFocus.fire()));
        this._register(focusTracker.onDidBlur(() => this._onDidBlur.fire()));
    }
    renderHeader(container) {
        this.headerContainer = container;
        this.twistiesContainer = append(container, $(`.twisty-container${ThemeIcon.asCSSSelector(this.getTwistyIcon(this.isExpanded()))}`));
        this.renderHeaderTitle(container, this.title);
        const actions = append(container, $('.actions'));
        actions.classList.toggle('show-always', this.showActions === ViewPaneShowActions.Always);
        actions.classList.toggle('show-expanded', this.showActions === ViewPaneShowActions.WhenExpanded);
        this.toolbar = this.instantiationService.createInstance(WorkbenchToolBar, actions, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                const item = this.createActionViewItem(action, options);
                if (item) {
                    this.headerActionViewItems.set(item.action.id, item);
                }
                return item;
            },
            ariaLabel: nls.localize('viewToolbarAriaLabel', '{0} actions', this.title),
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            renderDropdownAsChildElement: true,
            actionRunner: this.getActionRunner(),
            resetMenu: this.menuActions.menuId,
        });
        this._register(this.toolbar);
        this.setActions();
        this._register(addDisposableListener(actions, EventType.CLICK, (e) => e.preventDefault()));
        const viewContainerModel = this.viewDescriptorService.getViewContainerByViewId(this.id);
        if (viewContainerModel) {
            this._register(this.viewDescriptorService
                .getViewContainerModel(viewContainerModel)
                .onDidChangeContainerInfo(({ title }) => this.updateTitle(this.title)));
        }
        else {
            console.error(`View container model not found for view ${this.id}`);
        }
        const onDidRelevantConfigurationChange = Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration(ViewPane_1.AlwaysShowActionsConfig));
        this._register(onDidRelevantConfigurationChange(this.updateActionsVisibility, this));
        this.updateActionsVisibility();
    }
    updateHeader() {
        super.updateHeader();
        this.updateTwistyIcon();
    }
    updateTwistyIcon() {
        if (this.twistiesContainer) {
            this.twistiesContainer.classList.remove(...ThemeIcon.asClassNameArray(this.getTwistyIcon(!this._expanded)));
            this.twistiesContainer.classList.add(...ThemeIcon.asClassNameArray(this.getTwistyIcon(this._expanded)));
        }
    }
    getTwistyIcon(expanded) {
        return expanded ? viewPaneContainerExpandedIcon : viewPaneContainerCollapsedIcon;
    }
    style(styles) {
        super.style(styles);
        const icon = this.getIcon();
        if (this.iconContainer) {
            const fgColor = asCssValueWithDefault(styles.headerForeground, asCssVariable(foreground));
            if (URI.isUri(icon)) {
                // Apply background color to activity bar item provided with iconUrls
                this.iconContainer.style.backgroundColor = fgColor;
                this.iconContainer.style.color = '';
            }
            else {
                // Apply foreground color to activity bar items provided with codicons
                this.iconContainer.style.color = fgColor;
                this.iconContainer.style.backgroundColor = '';
            }
        }
    }
    getIcon() {
        return (this.viewDescriptorService.getViewDescriptorById(this.id)?.containerIcon || defaultViewIcon);
    }
    renderHeaderTitle(container, title) {
        this.iconContainer = append(container, $('.icon', undefined));
        const icon = this.getIcon();
        let cssClass = undefined;
        if (URI.isUri(icon)) {
            cssClass = `view-${this.id.replace(/[\.\:]/g, '-')}`;
            const iconClass = `.pane-header .icon.${cssClass}`;
            createCSSRule(iconClass, `
				mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				mask-size: 24px;
				-webkit-mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				-webkit-mask-size: 16px;
			`);
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            cssClass = ThemeIcon.asClassName(icon);
        }
        if (cssClass) {
            this.iconContainer.classList.add(...cssClass.split(' '));
        }
        const calculatedTitle = this.calculateTitle(title);
        this.titleContainer = append(container, $('h3.title', {}, calculatedTitle));
        this.titleContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleContainer, calculatedTitle));
        if (this._titleDescription) {
            this.setTitleDescription(this._titleDescription);
        }
        this.iconContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.iconContainer, calculatedTitle));
        this.iconContainer.setAttribute('aria-label', this._getAriaLabel(calculatedTitle, this._titleDescription));
    }
    _getAriaLabel(title, description) {
        const viewHasAccessibilityHelpContent = this.viewDescriptorService.getViewDescriptorById(this.id)?.accessibilityHelpContent;
        const accessibleViewHasShownForView = this.accessibleViewInformationService?.hasShownAccessibleView(this.id);
        if (!viewHasAccessibilityHelpContent || accessibleViewHasShownForView) {
            if (description) {
                return `${title} - ${description}`;
            }
            else {
                return title;
            }
        }
        return nls.localize('viewAccessibilityHelp', 'Use Alt+F1 for accessibility help {0}', title);
    }
    updateTitle(title) {
        const calculatedTitle = this.calculateTitle(title);
        if (this.titleContainer) {
            this.titleContainer.textContent = calculatedTitle;
            this.titleContainerHover?.update(calculatedTitle);
        }
        this.updateAriaHeaderLabel(calculatedTitle, this._titleDescription);
        this._title = title;
        this._onDidChangeTitleArea.fire();
    }
    updateAriaHeaderLabel(title, description) {
        const ariaLabel = this._getAriaLabel(title, description);
        if (this.iconContainer) {
            this.iconContainerHover?.update(title);
            this.iconContainer.setAttribute('aria-label', ariaLabel);
        }
        this.ariaHeaderLabel = this.getAriaHeaderLabel(ariaLabel);
    }
    setTitleDescription(description) {
        if (this.titleDescriptionContainer) {
            this.titleDescriptionContainer.textContent = description ?? '';
            this.titleDescriptionContainerHover?.update(description ?? '');
        }
        else if (description && this.titleContainer) {
            this.titleDescriptionContainer = after(this.titleContainer, $('span.description', {}, description));
            this.titleDescriptionContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleDescriptionContainer, description));
        }
    }
    updateTitleDescription(description) {
        this.setTitleDescription(description);
        this.updateAriaHeaderLabel(this._title, description);
        this._titleDescription = description;
        this._onDidChangeTitleArea.fire();
    }
    calculateTitle(title) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(this.id);
        const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.id);
        const isDefault = this.viewDescriptorService.getDefaultContainerById(this.id) === viewContainer;
        if (!isDefault &&
            viewDescriptor?.containerTitle &&
            model.title !== viewDescriptor.containerTitle) {
            return `${viewDescriptor.containerTitle}: ${title}`;
        }
        return title;
    }
    renderBody(container) {
        this.viewWelcomeController = this._register(this.instantiationService.createInstance(ViewWelcomeController, container, this));
    }
    layoutBody(height, width) {
        this.viewWelcomeController.layout(height, width);
    }
    onDidScrollRoot() {
        // noop
    }
    getProgressIndicator() {
        if (this.progressBar === undefined) {
            // Progress bar
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
        }
        if (this.progressIndicator === undefined) {
            const that = this;
            this.progressIndicator = this._register(new ScopedProgressIndicator(assertIsDefined(this.progressBar), new (class extends AbstractProgressScope {
                constructor() {
                    super(that.id, that.isBodyVisible());
                    this._register(that.onDidChangeBodyVisibility((isVisible) => isVisible ? this.onScopeOpened(that.id) : this.onScopeClosed(that.id)));
                }
            })()));
        }
        return this.progressIndicator;
    }
    getProgressLocation() {
        return this.viewDescriptorService.getViewContainerByViewId(this.id).id;
    }
    getLocationBasedColors() {
        return getLocationBasedViewColors(this.viewDescriptorService.getViewLocationById(this.id));
    }
    focus() {
        if (this.viewWelcomeController.enabled) {
            this.viewWelcomeController.focus();
        }
        else if (this.element) {
            this.element.focus();
        }
        if (isActiveElement(this.element) || isAncestorOfActiveElement(this.element)) {
            this._onDidFocus.fire();
        }
    }
    setActions() {
        if (this.toolbar) {
            const primaryActions = [...this.menuActions.getPrimaryActions()];
            if (this.shouldShowFilterInHeader()) {
                primaryActions.unshift(VIEWPANE_FILTER_ACTION);
            }
            this.toolbar.setActions(prepareActions(primaryActions), prepareActions(this.menuActions.getSecondaryActions()));
            this.toolbar.context = this.getActionsContext();
        }
    }
    updateActionsVisibility() {
        if (!this.headerContainer) {
            return;
        }
        const shouldAlwaysShowActions = this.configurationService.getValue('workbench.view.alwaysShowHeaderActions');
        this.headerContainer.classList.toggle('actions-always-visible', shouldAlwaysShowActions);
    }
    updateActions() {
        this.setActions();
        this._onDidChangeTitleArea.fire();
    }
    createActionViewItem(action, options) {
        if (action.id === VIEWPANE_FILTER_ACTION.id) {
            const that = this;
            return new (class extends BaseActionViewItem {
                constructor() {
                    super(null, action);
                }
                setFocusable() {
                    /* noop input elements are focusable by default */
                }
                get trapsArrowNavigation() {
                    return true;
                }
                render(container) {
                    container.classList.add('viewpane-filter-container');
                    const filter = that.getFilterWidget();
                    append(container, filter.element);
                    filter.relayout();
                }
            })();
        }
        return createActionViewItem(this.instantiationService, action, {
            ...options,
            ...{ menuAsChild: action instanceof SubmenuItemAction },
        });
    }
    getActionsContext() {
        return undefined;
    }
    getActionRunner() {
        return undefined;
    }
    getOptimalWidth() {
        return 0;
    }
    saveState() {
        // Subclasses to implement for saving state
    }
    shouldShowWelcome() {
        return false;
    }
    getFilterWidget() {
        return undefined;
    }
    shouldShowFilterInHeader() {
        return false;
    }
};
ViewPane = ViewPane_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], ViewPane);
export { ViewPane };
let FilterViewPane = class FilterViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService);
        const childInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.filterWidget = this._register(childInstantiationService.createInstance(FilterWidget, options.filterOptions));
    }
    getFilterWidget() {
        return this.filterWidget;
    }
    renderBody(container) {
        super.renderBody(container);
        this.filterContainer = append(container, $('.viewpane-filter-container'));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.dimension = new Dimension(width, height);
        const wasFilterShownInHeader = !this.filterContainer?.hasChildNodes();
        const shouldShowFilterInHeader = this.shouldShowFilterInHeader();
        if (wasFilterShownInHeader !== shouldShowFilterInHeader) {
            if (shouldShowFilterInHeader) {
                reset(this.filterContainer);
            }
            this.updateActions();
            if (!shouldShowFilterInHeader) {
                append(this.filterContainer, this.filterWidget.element);
            }
        }
        if (!shouldShowFilterInHeader) {
            height = height - 44;
        }
        this.filterWidget.layout(width);
        this.layoutBodyContent(height, width);
    }
    shouldShowFilterInHeader() {
        return !(this.dimension && this.dimension.width < 600 && this.dimension.height > 100);
    }
};
FilterViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], FilterViewPane);
export { FilterViewPane };
export function getLocationBasedViewColors(location) {
    let background, overlayBackground, stickyScrollBackground, stickyScrollBorder, stickyScrollShadow;
    switch (location) {
        case 1 /* ViewContainerLocation.Panel */:
            background = PANEL_BACKGROUND;
            overlayBackground = PANEL_SECTION_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = PANEL_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = PANEL_STICKY_SCROLL_BORDER;
            stickyScrollShadow = PANEL_STICKY_SCROLL_SHADOW;
            break;
        case 0 /* ViewContainerLocation.Sidebar */:
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
        default:
            background = SIDE_BAR_BACKGROUND;
            overlayBackground = SIDE_BAR_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = SIDE_BAR_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = SIDE_BAR_STICKY_SCROLL_BORDER;
            stickyScrollShadow = SIDE_BAR_STICKY_SCROLL_SHADOW;
    }
    return {
        background,
        overlayBackground,
        listOverrideStyles: {
            listBackground: background,
            treeStickyScrollBackground: stickyScrollBackground,
            treeStickyScrollBorder: stickyScrollBorder,
            treeStickyScrollShadow: stickyScrollShadow,
        },
    };
}
export class ViewAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.desc = desc;
    }
    run(accessor, ...args) {
        const view = accessor.get(IViewsService).getActiveViewWithId(this.desc.viewId);
        if (view) {
            return this.runInView(accessor, view, ...args);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy92aWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RixPQUFPLEVBQ04sS0FBSyxFQUNMLE1BQU0sRUFDTixDQUFDLEVBQ0QsVUFBVSxFQUNWLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsU0FBUyxFQUNULEtBQUssRUFDTCx5QkFBeUIsRUFDekIsZUFBZSxHQUNmLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUEwQixNQUFNLG9DQUFvQyxDQUFBO0FBQ25GLE9BQU8sRUFHTixjQUFjLEdBQ2QsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQWdCLElBQUksRUFBZSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEVBRXJDLHNCQUFzQixFQUl0QixlQUFlLEVBQ2YsNkJBQTZCLEdBQzdCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQWlCLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixNQUFNLEVBQ04sT0FBTyxFQUVQLGlCQUFpQixHQUNqQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDcEYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQix1QkFBdUIsR0FDdkIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUF3QixNQUFNLGlCQUFpQixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsd0JBQXdCLEdBQ3hCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTNFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsc0NBQXNDLEVBQ3RDLDhCQUE4QixFQUM5QiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLG1CQUFtQixFQUNuQixpQ0FBaUMsRUFDakMsaUNBQWlDLEVBQ2pDLDZCQUE2QixFQUM3Qiw2QkFBNkIsR0FDN0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUUxRixNQUFNLENBQU4sSUFBWSxtQkFTWDtBQVRELFdBQVksbUJBQW1CO0lBQzlCLCtFQUErRTtJQUMvRSxtRUFBTyxDQUFBO0lBRVAseURBQXlEO0lBQ3pELDZFQUFZLENBQUE7SUFFWiwrQkFBK0I7SUFDL0IsaUVBQU0sQ0FBQTtBQUNQLENBQUMsRUFUVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBUzlCO0FBZUQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtBQUUxRSxNQUFNLDZCQUE2QixHQUFHLFlBQVksQ0FDakQsOEJBQThCLEVBQzlCLE9BQU8sQ0FBQyxXQUFXLEVBQ25CLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsMkNBQTJDLENBQUMsQ0FDMUYsQ0FBQTtBQUNELE1BQU0sOEJBQThCLEdBQUcsWUFBWSxDQUNsRCwrQkFBK0IsRUFDL0IsT0FBTyxDQUFDLFlBQVksRUFDcEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSwyQ0FBMkMsQ0FBQyxDQUMzRixDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUE7QUFheEYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFJMUIsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFTRCxZQUNrQixTQUFzQixFQUN0QixRQUE4QixFQUN4QixvQkFBbUQsRUFDMUQsYUFBdUMsRUFDbkMsaUJBQTZDLEVBQzlDLGdCQUFtQztRQUxyQyxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBQ2hCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDaEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFsQjFELFVBQUssR0FBWSxFQUFFLENBQUE7UUFLbkIsYUFBUSxHQUFZLEtBQUssQ0FBQTtRQUloQixnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVUvRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FDbkIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRSxDQUNyRSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FDbEMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQywwREFBMEQ7SUFDdkksQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUE7UUFDMUMsSUFBSSxDQUFDLE9BQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUE7UUFDeEMsSUFBSSxDQUFDLE9BQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLGlCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVPLDJCQUEyQjtRQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFakQsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQy9CLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFFdkIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQy9CLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQy9ELHVCQUF1QixFQUFFLElBQUk7WUFDN0IsVUFBVSxvQ0FBNEI7WUFDdEMsUUFBUSxxQ0FBNkI7U0FDckMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRWpFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQzFCLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyxpQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNqQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFBO1FBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQ3hDLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxFQUNKLElBQUksQ0FBQyxrQkFBa0IsQ0FDdkIsQ0FBQTtRQUNELEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLDZCQUE2QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDOUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQ3pDLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXpFLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBRWYsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFBO1lBQ2pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsSUFBSTtvQkFDOUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO29CQUM3RCxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUVyQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pFLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFaEYsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBQ3RCLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLE9BQVEsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBRTVCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBRTdDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLGlCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLEtBQUssTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUMxRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRWpDLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBRWxCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWCxTQUFRO2dCQUNULENBQUM7Z0JBRUQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUV4QyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQzlFLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2hDLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBUSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7b0JBQ3JFLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRTt3QkFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO3dCQUNqQixZQUFZLEVBQUUsSUFBSTt3QkFDbEIsU0FBUyxFQUFFLHNCQUFzQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSzt3QkFDcEUsR0FBRyxtQkFBbUI7cUJBQ3RCLENBQUMsQ0FBQTtvQkFDRixNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7b0JBQ3pCLE1BQU0sQ0FBQyxVQUFVLENBQ2hCLENBQUMsQ0FBQyxFQUFFLEVBQUU7d0JBQ0wsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO29CQUM1RCxDQUFDLEVBQ0QsSUFBSSxFQUNKLElBQUksQ0FBQyxpQkFBaUIsQ0FDdEIsQ0FBQTtvQkFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNsQyxZQUFZLEVBQUUsQ0FBQTtvQkFFZCxJQUFJLFlBQVksRUFBRSxDQUFDO3dCQUNsQixNQUFNLGdCQUFnQixHQUFHLEdBQUcsRUFBRSxDQUM3QixDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7d0JBQzVFLGdCQUFnQixFQUFFLENBQUE7d0JBRWxCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO3dCQUN6QyxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQzFCLENBQUE7d0JBQ0Qsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO29CQUNuRSxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFFdkMsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ3JDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7NEJBQzlCLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO3dCQUN6QyxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FDM0QsQ0FBQTs0QkFFRCxJQUFJLFlBQVksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dDQUN0RCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsRUFBRSxDQUM3QixDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7Z0NBQzFFLGdCQUFnQixFQUFFLENBQUE7Z0NBRWxCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dDQUN6QyxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFDekMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQzFCLENBQUE7Z0NBQ0Qsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBOzRCQUNuRSxDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLGlCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV4RCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuRCxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzNCLENBQUM7Q0FDRCxDQUFBO0FBaFBLLHFCQUFxQjtJQWtCeEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtHQXJCZCxxQkFBcUIsQ0FnUDFCO0FBRU0sSUFBZSxRQUFRLEdBQXZCLE1BQWUsUUFBUyxTQUFRLElBQUk7O2FBQ2xCLDRCQUF1QixHQUFHLHdDQUF3QyxBQUEzQyxDQUEyQztJQXFCMUYsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFHRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBR0QsSUFBVyw0QkFBNEI7UUFDdEMsT0FBTyxJQUFJLENBQUMsNkJBQTZCLENBQUE7SUFDMUMsQ0FBQztJQXlCRCxZQUNDLE9BQXlCLEVBQ0wsaUJBQStDLEVBQzlDLGtCQUFpRCxFQUMvQyxvQkFBOEQsRUFDakUsaUJBQStDLEVBQzNDLHFCQUF1RCxFQUN4RCxvQkFBcUQsRUFDNUQsYUFBdUMsRUFDeEMsWUFBcUMsRUFDckMsWUFBOEMsRUFDMUMsZ0NBQW9FO1FBRXZGLEtBQUssQ0FBQztZQUNMLEdBQUcsT0FBTztZQUNWLEdBQUc7Z0JBQ0YsV0FBVyxFQUNWLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsd0NBQWdDO29CQUNwRixDQUFDO29CQUNELENBQUMsNkJBQXFCO2FBQ3hCO1NBQ0QsQ0FBQyxDQUFBO1FBbkI0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3BDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDNUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN2RCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDOUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNsRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDOUIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDMUMscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFvQztRQW5FaEYsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNoRCxlQUFVLEdBQWdCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBRWpELGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMvQyxjQUFTLEdBQWdCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRS9DLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQ2xFLDhCQUF5QixHQUFtQixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRWhGLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVELHlCQUFvQixHQUFnQixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBRW5FLGlDQUE0QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ25FLGdDQUEyQixHQUFnQixJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO1FBRW5GLGVBQVUsR0FBWSxLQUFLLENBQUE7UUFtQ2xCLDBCQUFxQixHQUEyQyxJQUFJLENBQUMsU0FBUyxDQUM5RixJQUFJLGFBQWEsRUFBRSxDQUNuQixDQUFBO1FBMkJBLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDM0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNqRCxJQUFJLENBQUMsNkJBQTZCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFBO1FBQ3pFLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLENBQUE7UUFFckUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzNGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUM3RCxjQUFjLEVBQ2QsNkJBQTZCLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQ2xGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUM3RCxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQzNDLENBQUMsR0FBRyxFQUFFLENBQ04sZUFBZSxDQUFDLEdBQUcsQ0FDbEIsNkJBQTZCLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQ2xGLENBQ0QsQ0FDRCxDQUFBO1FBRUQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUNwQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FDekUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoQyx5QkFBeUIsQ0FBQyxjQUFjLENBQ3ZDLG9CQUFvQixFQUNwQixPQUFPLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQ3ZDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDdkIsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FDeEUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFhLGFBQWE7UUFDekIsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFhLGFBQWEsQ0FBQyxPQUFnQjtRQUMxQyxLQUFLLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFnQjtRQUMxQixJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUE7WUFFekIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUM1QyxDQUFDO0lBRVEsV0FBVyxDQUFDLFFBQWlCO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVRLE1BQU07UUFDZCxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFZCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRVMsWUFBWSxDQUFDLFNBQXNCO1FBQzVDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1FBRWhDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQzlCLFNBQVMsRUFDVCxDQUFDLENBQUMsb0JBQW9CLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDdkYsQ0FBQTtRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTdDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxXQUFXLEtBQUssbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEYsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxXQUFXLEtBQUssbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRTtZQUNsRixXQUFXLHVDQUErQjtZQUMxQyxzQkFBc0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFDdkQsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNyRCxDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzFFLGFBQWEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0UsNEJBQTRCLEVBQUUsSUFBSTtZQUNsQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNO1NBQ2xDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUVqQixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RixJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCO2lCQUN4QixxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQztpQkFDekMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUN2RSxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwRSxDQUFDO1FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQ2xELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsVUFBUSxDQUFDLHVCQUF1QixDQUFDLENBQy9ELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFa0IsWUFBWTtRQUM5QixLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFDeEIsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUN0QyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQ2xFLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDbkMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FDakUsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRVMsYUFBYSxDQUFDLFFBQWlCO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUE7SUFDakYsQ0FBQztJQUVRLEtBQUssQ0FBQyxNQUFtQjtRQUNqQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRW5CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDekYsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3JCLHFFQUFxRTtnQkFDckUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQTtnQkFDbEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQTtZQUNwQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asc0VBQXNFO2dCQUN0RSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFBO2dCQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLE9BQU87UUFDZCxPQUFPLENBQ04sSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxhQUFhLElBQUksZUFBZSxDQUMzRixDQUFBO0lBQ0YsQ0FBQztJQUVTLGlCQUFpQixDQUFDLFNBQXNCLEVBQUUsS0FBYTtRQUNoRSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUUzQixJQUFJLFFBQVEsR0FBdUIsU0FBUyxDQUFBO1FBQzVDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3JCLFFBQVEsR0FBRyxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFBO1lBQ3BELE1BQU0sU0FBUyxHQUFHLHNCQUFzQixRQUFRLEVBQUUsQ0FBQTtZQUVsRCxhQUFhLENBQ1osU0FBUyxFQUNUO1lBQ1EsUUFBUSxDQUFDLElBQUksQ0FBQzs7b0JBRU4sUUFBUSxDQUFDLElBQUksQ0FBQzs7SUFFOUIsQ0FDQSxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hDLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUNsQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFDaEMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsZUFBZSxDQUNmLENBQ0QsQ0FBQTtRQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FDbEMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQ2xCLGVBQWUsQ0FDZixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FDOUIsWUFBWSxFQUNaLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxLQUFhLEVBQUUsV0FBK0I7UUFDbkUsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQ3ZGLElBQUksQ0FBQyxFQUFFLENBQ1AsRUFBRSx3QkFBd0IsQ0FBQTtRQUMzQixNQUFNLDZCQUE2QixHQUNsQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQywrQkFBK0IsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO1lBQ3ZFLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sR0FBRyxLQUFLLE1BQU0sV0FBVyxFQUFFLENBQUE7WUFDbkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdUNBQXVDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDN0YsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFhO1FBQ2xDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEQsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFBO1lBQ2pELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFbkUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxLQUFhLEVBQUUsV0FBK0I7UUFDM0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxXQUErQjtRQUMxRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLEdBQUcsV0FBVyxJQUFJLEVBQUUsQ0FBQTtZQUM5RCxJQUFJLENBQUMsOEJBQThCLEVBQUUsTUFBTSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvRCxDQUFDO2FBQU0sSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQ3JDLElBQUksQ0FBQyxjQUFjLEVBQ25CLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQ3RDLENBQUE7WUFDRCxJQUFJLENBQUMsOEJBQThCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FDbEMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQ2hDLElBQUksQ0FBQyx5QkFBeUIsRUFDOUIsV0FBVyxDQUNYLENBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRVMsc0JBQXNCLENBQUMsV0FBZ0M7UUFDaEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxXQUFXLENBQUE7UUFDcEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFTyxjQUFjLENBQUMsS0FBYTtRQUNuQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFBO1FBQ25GLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUM3RSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssYUFBYSxDQUFBO1FBRS9GLElBQ0MsQ0FBQyxTQUFTO1lBQ1YsY0FBYyxFQUFFLGNBQWM7WUFDOUIsS0FBSyxDQUFDLEtBQUssS0FBSyxjQUFjLENBQUMsY0FBYyxFQUM1QyxDQUFDO1lBQ0YsT0FBTyxHQUFHLGNBQWMsQ0FBQyxjQUFjLEtBQUssS0FBSyxFQUFFLENBQUE7UUFDcEQsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLFVBQVUsQ0FBQyxTQUFzQjtRQUMxQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQ2hGLENBQUE7SUFDRixDQUFDO0lBRVMsVUFBVSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQ2pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTztJQUNSLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLGVBQWU7WUFDZixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7WUFDMUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN0QyxJQUFJLHVCQUF1QixDQUMxQixlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUNqQyxJQUFJLENBQUMsS0FBTSxTQUFRLHFCQUFxQjtnQkFDdkM7b0JBQ0MsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7b0JBQ3BDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDNUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQ3JFLENBQ0QsQ0FBQTtnQkFDRixDQUFDO2FBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFUyxtQkFBbUI7UUFDNUIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFDLEVBQUUsQ0FBQTtJQUN4RSxDQUFDO0lBRVMsc0JBQXNCO1FBQy9CLE9BQU8sMEJBQTBCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25DLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDOUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFVBQVU7UUFDakIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1lBQ2hFLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsQ0FBQztnQkFDckMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FDdEIsY0FBYyxDQUFDLGNBQWMsQ0FBQyxFQUM5QixjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQ3RELENBQUE7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUNqRSx3Q0FBd0MsQ0FDeEMsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFFUyxhQUFhO1FBQ3RCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVELG9CQUFvQixDQUNuQixNQUFlLEVBQ2YsT0FBNEM7UUFFNUMsSUFBSSxNQUFNLENBQUMsRUFBRSxLQUFLLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtZQUNqQixPQUFPLElBQUksQ0FBQyxLQUFNLFNBQVEsa0JBQWtCO2dCQUMzQztvQkFDQyxLQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUNwQixDQUFDO2dCQUNRLFlBQVk7b0JBQ3BCLGtEQUFrRDtnQkFDbkQsQ0FBQztnQkFDRCxJQUFhLG9CQUFvQjtvQkFDaEMsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDUSxNQUFNLENBQUMsU0FBc0I7b0JBQ3JDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7b0JBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUcsQ0FBQTtvQkFDdEMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ2pDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDbEIsQ0FBQzthQUNELENBQUMsRUFBRSxDQUFBO1FBQ0wsQ0FBQztRQUNELE9BQU8sb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRTtZQUM5RCxHQUFHLE9BQU87WUFDVixHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxpQkFBaUIsRUFBRTtTQUN2RCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFRCxTQUFTO1FBQ1IsMkNBQTJDO0lBQzVDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCx3QkFBd0I7UUFDdkIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDOztBQS9oQm9CLFFBQVE7SUE2RDNCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGFBQWEsQ0FBQTtHQXJFTSxRQUFRLENBZ2lCN0I7O0FBRU0sSUFBZSxjQUFjLEdBQTdCLE1BQWUsY0FBZSxTQUFRLFFBQVE7SUFLcEQsWUFDQyxPQUErQixFQUNYLGlCQUFxQyxFQUNwQyxrQkFBdUMsRUFDckMsb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUNqQyxxQkFBNkMsRUFDOUMsb0JBQTJDLEVBQ2xELGFBQTZCLEVBQzlCLFlBQTJCLEVBQzNCLFlBQTJCLEVBQzFDLHFCQUF5RDtRQUV6RCxLQUFLLENBQ0osT0FBTyxFQUNQLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIsb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixZQUFZLEVBQ1osWUFBWSxFQUNaLHFCQUFxQixDQUNyQixDQUFBO1FBQ0QsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQyxvQkFBb0IsQ0FBQyxXQUFXLENBQy9CLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUN6RSxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUM3RSxDQUFBO0lBQ0YsQ0FBQztJQUVRLGVBQWU7UUFDdkIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVrQixVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDMUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDN0MsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUE7UUFDckUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoRSxJQUFJLHNCQUFzQixLQUFLLHdCQUF3QixFQUFFLENBQUM7WUFDekQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO2dCQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWdCLENBQUMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3BCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWdCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQy9CLE1BQU0sR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFUSx3QkFBd0I7UUFDaEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDdEYsQ0FBQztDQUdELENBQUE7QUE3RXFCLGNBQWM7SUFPakMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0dBZk0sY0FBYyxDQTZFbkM7O0FBUUQsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxRQUFzQztJQUV0QyxJQUFJLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQTtJQUVqRyxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCO1lBQ0MsVUFBVSxHQUFHLGdCQUFnQixDQUFBO1lBQzdCLGlCQUFpQixHQUFHLHNDQUFzQyxDQUFBO1lBQzFELHNCQUFzQixHQUFHLDhCQUE4QixDQUFBO1lBQ3ZELGtCQUFrQixHQUFHLDBCQUEwQixDQUFBO1lBQy9DLGtCQUFrQixHQUFHLDBCQUEwQixDQUFBO1lBQy9DLE1BQUs7UUFFTiwyQ0FBbUM7UUFDbkMsZ0RBQXdDO1FBQ3hDO1lBQ0MsVUFBVSxHQUFHLG1CQUFtQixDQUFBO1lBQ2hDLGlCQUFpQixHQUFHLGlDQUFpQyxDQUFBO1lBQ3JELHNCQUFzQixHQUFHLGlDQUFpQyxDQUFBO1lBQzFELGtCQUFrQixHQUFHLDZCQUE2QixDQUFBO1lBQ2xELGtCQUFrQixHQUFHLDZCQUE2QixDQUFBO0lBQ3BELENBQUM7SUFFRCxPQUFPO1FBQ04sVUFBVTtRQUNWLGlCQUFpQjtRQUNqQixrQkFBa0IsRUFBRTtZQUNuQixjQUFjLEVBQUUsVUFBVTtZQUMxQiwwQkFBMEIsRUFBRSxzQkFBc0I7WUFDbEQsc0JBQXNCLEVBQUUsa0JBQWtCO1lBQzFDLHNCQUFzQixFQUFFLGtCQUFrQjtTQUMxQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFnQixVQUE0QixTQUFRLE9BQU87SUFFaEUsWUFBWSxJQUFvRDtRQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5RSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBSyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUdEIn0=