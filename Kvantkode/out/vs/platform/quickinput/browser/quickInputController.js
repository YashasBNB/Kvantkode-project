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
var QuickInputController_1;
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../base/browser/ui/button/button.js';
import { CountBadge } from '../../../base/browser/ui/countBadge/countBadge.js';
import { ProgressBar } from '../../../base/browser/ui/progressbar/progressbar.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, dispose } from '../../../base/common/lifecycle.js';
import Severity from '../../../base/common/severity.js';
import { isString } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { QuickInputHideReason, QuickPickFocus, } from '../common/quickInput.js';
import { QuickInputBox } from './quickInputBox.js';
import { QuickPick, backButton, InputBox, QuickWidget, InQuickInputContextKey, QuickInputTypeContextKey, EndOfQuickInputBoxContextKey, QuickInputAlignmentContextKey, } from './quickInput.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { QuickInputTree } from './quickInputTree.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import './quickInputActions.js';
import { autorun, observableValue } from '../../../base/common/observable.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { platform } from '../../../base/common/platform.js';
import { getWindowControlsStyle } from '../../window/common/window.js';
import { getZoomFactor } from '../../../base/browser/browser.js';
const $ = dom.$;
const VIEWSTATE_STORAGE_KEY = 'workbench.quickInput.viewState';
let QuickInputController = class QuickInputController extends Disposable {
    static { QuickInputController_1 = this; }
    static { this.MAX_WIDTH = 600; } // Max total width of quick input widget
    get currentQuickInput() {
        return this.controller ?? undefined;
    }
    get container() {
        return this._container;
    }
    constructor(options, layoutService, instantiationService, contextKeyService, storageService) {
        super();
        this.options = options;
        this.layoutService = layoutService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.enabled = true;
        this.onDidAcceptEmitter = this._register(new Emitter());
        this.onDidCustomEmitter = this._register(new Emitter());
        this.onDidTriggerButtonEmitter = this._register(new Emitter());
        this.keyMods = { ctrlCmd: false, alt: false };
        this.controller = null;
        this.onShowEmitter = this._register(new Emitter());
        this.onShow = this.onShowEmitter.event;
        this.onHideEmitter = this._register(new Emitter());
        this.onHide = this.onHideEmitter.event;
        this.backButton = backButton;
        this.inQuickInputContext = InQuickInputContextKey.bindTo(contextKeyService);
        this.quickInputTypeContext = QuickInputTypeContextKey.bindTo(contextKeyService);
        this.endOfQuickInputBoxContext = EndOfQuickInputBoxContextKey.bindTo(contextKeyService);
        this.idPrefix = options.idPrefix;
        this._container = options.container;
        this.styles = options.styles;
        this._register(Event.runAndSubscribe(dom.onDidRegisterWindow, ({ window, disposables }) => this.registerKeyModsListeners(window, disposables), { window: mainWindow, disposables: this._store }));
        this._register(dom.onWillUnregisterWindow((window) => {
            if (this.ui && dom.getWindow(this.ui.container) === window) {
                // The window this quick input is contained in is about to
                // close, so we have to make sure to reparent it back to an
                // existing parent to not loose functionality.
                // (https://github.com/microsoft/vscode/issues/195870)
                this.reparentUI(this.layoutService.mainContainer);
                this.layout(this.layoutService.mainContainerDimension, this.layoutService.mainContainerOffset.quickPickTop);
            }
        }));
        this.viewState = this.loadViewState();
    }
    registerKeyModsListeners(window, disposables) {
        const listener = (e) => {
            this.keyMods.ctrlCmd = e.ctrlKey || e.metaKey;
            this.keyMods.alt = e.altKey;
        };
        for (const event of [dom.EventType.KEY_DOWN, dom.EventType.KEY_UP, dom.EventType.MOUSE_DOWN]) {
            disposables.add(dom.addDisposableListener(window, event, listener, true));
        }
    }
    getUI(showInActiveContainer) {
        if (this.ui) {
            // In order to support aux windows, re-parent the controller
            // if the original event is from a different document
            if (showInActiveContainer) {
                if (dom.getWindow(this._container) !== dom.getWindow(this.layoutService.activeContainer)) {
                    this.reparentUI(this.layoutService.activeContainer);
                    this.layout(this.layoutService.activeContainerDimension, this.layoutService.activeContainerOffset.quickPickTop);
                }
            }
            return this.ui;
        }
        const container = dom.append(this._container, $('.quick-input-widget.show-file-icons'));
        container.tabIndex = -1;
        container.style.display = 'none';
        const styleSheet = domStylesheetsJs.createStyleSheet(container);
        const titleBar = dom.append(container, $('.quick-input-titlebar'));
        const leftActionBar = this._register(new ActionBar(titleBar, { hoverDelegate: this.options.hoverDelegate }));
        leftActionBar.domNode.classList.add('quick-input-left-action-bar');
        const title = dom.append(titleBar, $('.quick-input-title'));
        const rightActionBar = this._register(new ActionBar(titleBar, { hoverDelegate: this.options.hoverDelegate }));
        rightActionBar.domNode.classList.add('quick-input-right-action-bar');
        const headerContainer = dom.append(container, $('.quick-input-header'));
        const checkAll = dom.append(headerContainer, $('input.quick-input-check-all'));
        checkAll.type = 'checkbox';
        checkAll.setAttribute('aria-label', localize('quickInput.checkAll', 'Toggle all checkboxes'));
        this._register(dom.addStandardDisposableListener(checkAll, dom.EventType.CHANGE, (e) => {
            const checked = checkAll.checked;
            list.setAllVisibleChecked(checked);
        }));
        this._register(dom.addDisposableListener(checkAll, dom.EventType.CLICK, (e) => {
            if (e.x || e.y) {
                // Avoid 'click' triggered by 'space'...
                inputBox.setFocus();
            }
        }));
        const description2 = dom.append(headerContainer, $('.quick-input-description'));
        const inputContainer = dom.append(headerContainer, $('.quick-input-and-message'));
        const filterContainer = dom.append(inputContainer, $('.quick-input-filter'));
        const inputBox = this._register(new QuickInputBox(filterContainer, this.styles.inputBox, this.styles.toggle));
        inputBox.setAttribute('aria-describedby', `${this.idPrefix}message`);
        const visibleCountContainer = dom.append(filterContainer, $('.quick-input-visible-count'));
        visibleCountContainer.setAttribute('aria-live', 'polite');
        visibleCountContainer.setAttribute('aria-atomic', 'true');
        const visibleCount = this._register(new CountBadge(visibleCountContainer, {
            countFormat: localize({
                key: 'quickInput.visibleCount',
                comment: [
                    'This tells the user how many items are shown in a list of items to select from. The items can be anything. Currently not visible, but read by screen readers.',
                ],
            }, '{0} Results'),
        }, this.styles.countBadge));
        const countContainer = dom.append(filterContainer, $('.quick-input-count'));
        countContainer.setAttribute('aria-live', 'polite');
        const count = this._register(new CountBadge(countContainer, {
            countFormat: localize({
                key: 'quickInput.countSelected',
                comment: [
                    'This tells the user how many items are selected in a list of items to select from. The items can be anything.',
                ],
            }, '{0} Selected'),
        }, this.styles.countBadge));
        const inlineActionBar = this._register(new ActionBar(headerContainer, { hoverDelegate: this.options.hoverDelegate }));
        inlineActionBar.domNode.classList.add('quick-input-inline-action-bar');
        const okContainer = dom.append(headerContainer, $('.quick-input-action'));
        const ok = this._register(new Button(okContainer, this.styles.button));
        ok.label = localize('ok', 'OK');
        this._register(ok.onDidClick((e) => {
            this.onDidAcceptEmitter.fire();
        }));
        const customButtonContainer = dom.append(headerContainer, $('.quick-input-action'));
        const customButton = this._register(new Button(customButtonContainer, { ...this.styles.button, supportIcons: true }));
        customButton.label = localize('custom', 'Custom');
        this._register(customButton.onDidClick((e) => {
            this.onDidCustomEmitter.fire();
        }));
        const message = dom.append(inputContainer, $(`#${this.idPrefix}message.quick-input-message`));
        const progressBar = this._register(new ProgressBar(container, this.styles.progressBar));
        progressBar.getContainer().classList.add('quick-input-progress');
        const widget = dom.append(container, $('.quick-input-html-widget'));
        widget.tabIndex = -1;
        const description1 = dom.append(container, $('.quick-input-description'));
        const listId = this.idPrefix + 'list';
        const list = this._register(this.instantiationService.createInstance(QuickInputTree, container, this.options.hoverDelegate, this.options.linkOpenerDelegate, listId));
        inputBox.setAttribute('aria-controls', listId);
        this._register(list.onDidChangeFocus(() => {
            inputBox.setAttribute('aria-activedescendant', list.getActiveDescendant() ?? '');
        }));
        this._register(list.onChangedAllVisibleChecked((checked) => {
            checkAll.checked = checked;
        }));
        this._register(list.onChangedVisibleCount((c) => {
            visibleCount.setCount(c);
        }));
        this._register(list.onChangedCheckedCount((c) => {
            count.setCount(c);
        }));
        this._register(list.onLeave(() => {
            // Defer to avoid the input field reacting to the triggering key.
            // TODO@TylerLeonhardt https://github.com/microsoft/vscode/issues/203675
            setTimeout(() => {
                if (!this.controller) {
                    return;
                }
                inputBox.setFocus();
                if (this.controller instanceof QuickPick && this.controller.canSelectMany) {
                    list.clearFocus();
                }
            }, 0);
        }));
        const focusTracker = dom.trackFocus(container);
        this._register(focusTracker);
        this._register(dom.addDisposableListener(container, dom.EventType.FOCUS, (e) => {
            const ui = this.getUI();
            if (dom.isAncestor(e.relatedTarget, ui.inputContainer)) {
                const value = ui.inputBox.isSelectionAtEnd();
                if (this.endOfQuickInputBoxContext.get() !== value) {
                    this.endOfQuickInputBoxContext.set(value);
                }
            }
            // Ignore focus events within container
            if (dom.isAncestor(e.relatedTarget, ui.container)) {
                return;
            }
            this.inQuickInputContext.set(true);
            this.previousFocusElement = dom.isHTMLElement(e.relatedTarget)
                ? e.relatedTarget
                : undefined;
        }, true));
        this._register(focusTracker.onDidBlur(() => {
            if (!this.getUI().ignoreFocusOut && !this.options.ignoreFocusOut()) {
                this.hide(QuickInputHideReason.Blur);
            }
            this.inQuickInputContext.set(false);
            this.endOfQuickInputBoxContext.set(false);
            this.previousFocusElement = undefined;
        }));
        this._register(inputBox.onKeyDown((_) => {
            const value = this.getUI().inputBox.isSelectionAtEnd();
            if (this.endOfQuickInputBoxContext.get() !== value) {
                this.endOfQuickInputBoxContext.set(value);
            }
            // Allow screenreaders to read what's in the input
            // Note: this works for arrow keys and selection changes,
            // but not for deletions since that often triggers a
            // change in the list.
            inputBox.removeAttribute('aria-activedescendant');
        }));
        this._register(dom.addDisposableListener(container, dom.EventType.FOCUS, (e) => {
            inputBox.setFocus();
        }));
        // TODO: Turn into commands instead of handling KEY_DOWN
        // Keybindings for the quickinput widget as a whole
        this._register(dom.addStandardDisposableListener(container, dom.EventType.KEY_DOWN, (event) => {
            if (dom.isAncestor(event.target, widget)) {
                return; // Ignore event if target is inside widget to allow the widget to handle the event.
            }
            switch (event.keyCode) {
                case 3 /* KeyCode.Enter */:
                    dom.EventHelper.stop(event, true);
                    if (this.enabled) {
                        this.onDidAcceptEmitter.fire();
                    }
                    break;
                case 9 /* KeyCode.Escape */:
                    dom.EventHelper.stop(event, true);
                    this.hide(QuickInputHideReason.Gesture);
                    break;
                case 2 /* KeyCode.Tab */:
                    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
                        // detect only visible actions
                        const selectors = [
                            '.quick-input-list .monaco-action-bar .always-visible',
                            '.quick-input-list-entry:hover .monaco-action-bar',
                            '.monaco-list-row.focused .monaco-action-bar',
                        ];
                        if (container.classList.contains('show-checkboxes')) {
                            selectors.push('input');
                        }
                        else {
                            selectors.push('input[type=text]');
                        }
                        if (this.getUI().list.displayed) {
                            selectors.push('.monaco-list');
                        }
                        // focus links if there are any
                        if (this.getUI().message) {
                            selectors.push('.quick-input-message a');
                        }
                        if (this.getUI().widget) {
                            if (dom.isAncestor(event.target, this.getUI().widget)) {
                                // let the widget control tab
                                break;
                            }
                            selectors.push('.quick-input-html-widget');
                        }
                        const stops = container.querySelectorAll(selectors.join(', '));
                        if (!event.shiftKey && dom.isAncestor(event.target, stops[stops.length - 1])) {
                            dom.EventHelper.stop(event, true);
                            stops[0].focus();
                        }
                        if (event.shiftKey && dom.isAncestor(event.target, stops[0])) {
                            dom.EventHelper.stop(event, true);
                            stops[stops.length - 1].focus();
                        }
                    }
                    break;
            }
        }));
        // Drag and Drop support
        this.dndController = this._register(this.instantiationService.createInstance(QuickInputDragAndDropController, this._container, container, [
            {
                node: titleBar,
                includeChildren: true,
            },
            {
                node: headerContainer,
                includeChildren: false,
            },
        ], this.viewState));
        // DnD update layout
        this._register(autorun((reader) => {
            const dndViewState = this.dndController?.dndViewState.read(reader);
            if (!dndViewState) {
                return;
            }
            if (dndViewState.top !== undefined && dndViewState.left !== undefined) {
                this.viewState = {
                    ...this.viewState,
                    top: dndViewState.top,
                    left: dndViewState.left,
                };
            }
            else {
                // Reset position/size
                this.viewState = undefined;
            }
            this.updateLayout();
            // Save position
            if (dndViewState.done) {
                this.saveViewState(this.viewState);
            }
        }));
        this.ui = {
            container,
            styleSheet,
            leftActionBar,
            titleBar,
            title,
            description1,
            description2,
            widget,
            rightActionBar,
            inlineActionBar,
            checkAll,
            inputContainer,
            filterContainer,
            inputBox,
            visibleCountContainer,
            visibleCount,
            countContainer,
            count,
            okContainer,
            ok,
            message,
            customButtonContainer,
            customButton,
            list,
            progressBar,
            onDidAccept: this.onDidAcceptEmitter.event,
            onDidCustom: this.onDidCustomEmitter.event,
            onDidTriggerButton: this.onDidTriggerButtonEmitter.event,
            ignoreFocusOut: false,
            keyMods: this.keyMods,
            show: (controller) => this.show(controller),
            hide: () => this.hide(),
            setVisibilities: (visibilities) => this.setVisibilities(visibilities),
            setEnabled: (enabled) => this.setEnabled(enabled),
            setContextKey: (contextKey) => this.options.setContextKey(contextKey),
            linkOpenerDelegate: (content) => this.options.linkOpenerDelegate(content),
        };
        this.updateStyles();
        return this.ui;
    }
    reparentUI(container) {
        if (this.ui) {
            this._container = container;
            dom.append(this._container, this.ui.container);
            this.dndController?.reparentUI(this._container);
        }
    }
    pick(picks, options = {}, token = CancellationToken.None) {
        return new Promise((doResolve, reject) => {
            let resolve = (result) => {
                resolve = doResolve;
                options.onKeyMods?.(input.keyMods);
                doResolve(result);
            };
            if (token.isCancellationRequested) {
                resolve(undefined);
                return;
            }
            const input = this.createQuickPick({ useSeparators: true });
            let activeItem;
            const disposables = [
                input,
                input.onDidAccept(() => {
                    if (input.canSelectMany) {
                        resolve(input.selectedItems.slice());
                        input.hide();
                    }
                    else {
                        const result = input.activeItems[0];
                        if (result) {
                            resolve(result);
                            input.hide();
                        }
                    }
                }),
                input.onDidChangeActive((items) => {
                    const focused = items[0];
                    if (focused && options.onDidFocus) {
                        options.onDidFocus(focused);
                    }
                }),
                input.onDidChangeSelection((items) => {
                    if (!input.canSelectMany) {
                        const result = items[0];
                        if (result) {
                            resolve(result);
                            input.hide();
                        }
                    }
                }),
                input.onDidTriggerItemButton((event) => options.onDidTriggerItemButton &&
                    options.onDidTriggerItemButton({
                        ...event,
                        removeItem: () => {
                            const index = input.items.indexOf(event.item);
                            if (index !== -1) {
                                const items = input.items.slice();
                                const removed = items.splice(index, 1);
                                const activeItems = input.activeItems.filter((activeItem) => activeItem !== removed[0]);
                                const keepScrollPositionBefore = input.keepScrollPosition;
                                input.keepScrollPosition = true;
                                input.items = items;
                                if (activeItems) {
                                    input.activeItems = activeItems;
                                }
                                input.keepScrollPosition = keepScrollPositionBefore;
                            }
                        },
                    })),
                input.onDidTriggerSeparatorButton((event) => options.onDidTriggerSeparatorButton?.(event)),
                input.onDidChangeValue((value) => {
                    if (activeItem &&
                        !value &&
                        (input.activeItems.length !== 1 || input.activeItems[0] !== activeItem)) {
                        input.activeItems = [activeItem];
                    }
                }),
                token.onCancellationRequested(() => {
                    input.hide();
                }),
                input.onDidHide(() => {
                    dispose(disposables);
                    resolve(undefined);
                }),
            ];
            input.title = options.title;
            if (options.value) {
                input.value = options.value;
            }
            input.canSelectMany = !!options.canPickMany;
            input.placeholder = options.placeHolder;
            input.ignoreFocusOut = !!options.ignoreFocusLost;
            input.matchOnDescription = !!options.matchOnDescription;
            input.matchOnDetail = !!options.matchOnDetail;
            input.matchOnLabel = options.matchOnLabel === undefined || options.matchOnLabel; // default to true
            input.quickNavigate = options.quickNavigate;
            input.hideInput = !!options.hideInput;
            input.contextKey = options.contextKey;
            input.busy = true;
            Promise.all([picks, options.activeItem]).then(([items, _activeItem]) => {
                activeItem = _activeItem;
                input.busy = false;
                input.items = items;
                if (input.canSelectMany) {
                    input.selectedItems = items.filter((item) => item.type !== 'separator' && item.picked);
                }
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
            });
            input.show();
            Promise.resolve(picks).then(undefined, (err) => {
                reject(err);
                input.hide();
            });
        });
    }
    setValidationOnInput(input, validationResult) {
        if (validationResult && isString(validationResult)) {
            input.severity = Severity.Error;
            input.validationMessage = validationResult;
        }
        else if (validationResult && !isString(validationResult)) {
            input.severity = validationResult.severity;
            input.validationMessage = validationResult.content;
        }
        else {
            input.severity = Severity.Ignore;
            input.validationMessage = undefined;
        }
    }
    input(options = {}, token = CancellationToken.None) {
        return new Promise((resolve) => {
            if (token.isCancellationRequested) {
                resolve(undefined);
                return;
            }
            const input = this.createInputBox();
            const validateInput = options.validateInput || (() => Promise.resolve(undefined));
            const onDidValueChange = Event.debounce(input.onDidChangeValue, (last, cur) => cur, 100);
            let validationValue = options.value || '';
            let validation = Promise.resolve(validateInput(validationValue));
            const disposables = [
                input,
                onDidValueChange((value) => {
                    if (value !== validationValue) {
                        validation = Promise.resolve(validateInput(value));
                        validationValue = value;
                    }
                    validation.then((result) => {
                        if (value === validationValue) {
                            this.setValidationOnInput(input, result);
                        }
                    });
                }),
                input.onDidAccept(() => {
                    const value = input.value;
                    if (value !== validationValue) {
                        validation = Promise.resolve(validateInput(value));
                        validationValue = value;
                    }
                    validation.then((result) => {
                        if (!result || (!isString(result) && result.severity !== Severity.Error)) {
                            resolve(value);
                            input.hide();
                        }
                        else if (value === validationValue) {
                            this.setValidationOnInput(input, result);
                        }
                    });
                }),
                token.onCancellationRequested(() => {
                    input.hide();
                }),
                input.onDidHide(() => {
                    dispose(disposables);
                    resolve(undefined);
                }),
            ];
            input.title = options.title;
            input.value = options.value || '';
            input.valueSelection = options.valueSelection;
            input.prompt = options.prompt;
            input.placeholder = options.placeHolder;
            input.password = !!options.password;
            input.ignoreFocusOut = !!options.ignoreFocusLost;
            input.show();
        });
    }
    createQuickPick(options = { useSeparators: false }) {
        const ui = this.getUI(true);
        return new QuickPick(ui);
    }
    createInputBox() {
        const ui = this.getUI(true);
        return new InputBox(ui);
    }
    setAlignment(alignment) {
        this.dndController?.setAlignment(alignment);
    }
    createQuickWidget() {
        const ui = this.getUI(true);
        return new QuickWidget(ui);
    }
    show(controller) {
        const ui = this.getUI(true);
        this.onShowEmitter.fire();
        const oldController = this.controller;
        this.controller = controller;
        oldController?.didHide();
        this.setEnabled(true);
        ui.leftActionBar.clear();
        ui.title.textContent = '';
        ui.description1.textContent = '';
        ui.description2.textContent = '';
        dom.reset(ui.widget);
        ui.rightActionBar.clear();
        ui.inlineActionBar.clear();
        ui.checkAll.checked = false;
        // ui.inputBox.value = ''; Avoid triggering an event.
        ui.inputBox.placeholder = '';
        ui.inputBox.password = false;
        ui.inputBox.showDecoration(Severity.Ignore);
        ui.visibleCount.setCount(0);
        ui.count.setCount(0);
        dom.reset(ui.message);
        ui.progressBar.stop();
        ui.list.setElements([]);
        ui.list.matchOnDescription = false;
        ui.list.matchOnDetail = false;
        ui.list.matchOnLabel = true;
        ui.list.sortByLabel = true;
        ui.ignoreFocusOut = false;
        ui.inputBox.toggles = undefined;
        const backKeybindingLabel = this.options.backKeybindingLabel();
        backButton.tooltip = backKeybindingLabel
            ? localize('quickInput.backWithKeybinding', 'Back ({0})', backKeybindingLabel)
            : localize('quickInput.back', 'Back');
        ui.container.style.display = '';
        this.updateLayout();
        this.dndController?.layoutContainer();
        ui.inputBox.setFocus();
        this.quickInputTypeContext.set(controller.type);
    }
    isVisible() {
        return !!this.ui && this.ui.container.style.display !== 'none';
    }
    setVisibilities(visibilities) {
        const ui = this.getUI();
        ui.title.style.display = visibilities.title ? '' : 'none';
        ui.description1.style.display =
            visibilities.description && (visibilities.inputBox || visibilities.checkAll) ? '' : 'none';
        ui.description2.style.display =
            visibilities.description && !(visibilities.inputBox || visibilities.checkAll) ? '' : 'none';
        ui.checkAll.style.display = visibilities.checkAll ? '' : 'none';
        ui.inputContainer.style.display = visibilities.inputBox ? '' : 'none';
        ui.filterContainer.style.display = visibilities.inputBox ? '' : 'none';
        ui.visibleCountContainer.style.display = visibilities.visibleCount ? '' : 'none';
        ui.countContainer.style.display = visibilities.count ? '' : 'none';
        ui.okContainer.style.display = visibilities.ok ? '' : 'none';
        ui.customButtonContainer.style.display = visibilities.customButton ? '' : 'none';
        ui.message.style.display = visibilities.message ? '' : 'none';
        ui.progressBar.getContainer().style.display = visibilities.progressBar ? '' : 'none';
        ui.list.displayed = !!visibilities.list;
        ui.container.classList.toggle('show-checkboxes', !!visibilities.checkBox);
        ui.container.classList.toggle('hidden-input', !visibilities.inputBox && !visibilities.description);
        this.updateLayout(); // TODO
    }
    setEnabled(enabled) {
        if (enabled !== this.enabled) {
            this.enabled = enabled;
            for (const item of this.getUI().leftActionBar.viewItems) {
                ;
                item.action.enabled = enabled;
            }
            for (const item of this.getUI().rightActionBar.viewItems) {
                ;
                item.action.enabled = enabled;
            }
            this.getUI().checkAll.disabled = !enabled;
            this.getUI().inputBox.enabled = enabled;
            this.getUI().ok.enabled = enabled;
            this.getUI().list.enabled = enabled;
        }
    }
    hide(reason) {
        const controller = this.controller;
        if (!controller) {
            return;
        }
        controller.willHide(reason);
        const container = this.ui?.container;
        const focusChanged = container && !dom.isAncestorOfActiveElement(container);
        this.controller = null;
        this.onHideEmitter.fire();
        if (container) {
            container.style.display = 'none';
        }
        if (!focusChanged) {
            let currentElement = this.previousFocusElement;
            while (currentElement && !currentElement.offsetParent) {
                currentElement = currentElement.parentElement ?? undefined;
            }
            if (currentElement?.offsetParent) {
                currentElement.focus();
                this.previousFocusElement = undefined;
            }
            else {
                this.options.returnFocus();
            }
        }
        controller.didHide(reason);
    }
    focus() {
        if (this.isVisible()) {
            const ui = this.getUI();
            if (ui.inputBox.enabled) {
                ui.inputBox.setFocus();
            }
            else {
                ui.list.domFocus();
            }
        }
    }
    toggle() {
        if (this.isVisible() && this.controller instanceof QuickPick && this.controller.canSelectMany) {
            this.getUI().list.toggleCheckbox();
        }
    }
    toggleHover() {
        if (this.isVisible() && this.controller instanceof QuickPick) {
            this.getUI().list.toggleHover();
        }
    }
    navigate(next, quickNavigate) {
        if (this.isVisible() && this.getUI().list.displayed) {
            this.getUI().list.focus(next ? QuickPickFocus.Next : QuickPickFocus.Previous);
            if (quickNavigate && this.controller instanceof QuickPick) {
                this.controller.quickNavigate = quickNavigate;
            }
        }
    }
    async accept(keyMods = { alt: false, ctrlCmd: false }) {
        // When accepting the item programmatically, it is important that
        // we update `keyMods` either from the provided set or unset it
        // because the accept did not happen from mouse or keyboard
        // interaction on the list itself
        this.keyMods.alt = keyMods.alt;
        this.keyMods.ctrlCmd = keyMods.ctrlCmd;
        this.onDidAcceptEmitter.fire();
    }
    async back() {
        this.onDidTriggerButtonEmitter.fire(this.backButton);
    }
    async cancel() {
        this.hide();
    }
    layout(dimension, titleBarOffset) {
        this.dimension = dimension;
        this.titleBarOffset = titleBarOffset;
        this.updateLayout();
    }
    updateLayout() {
        if (this.ui && this.isVisible()) {
            const style = this.ui.container.style;
            const width = Math.min(this.dimension.width * 0.62 /* golden cut */, QuickInputController_1.MAX_WIDTH);
            style.width = width + 'px';
            // Position
            style.top = `${this.viewState?.top ? Math.round(this.dimension.height * this.viewState.top) : this.titleBarOffset}px`;
            style.left = `${Math.round(this.dimension.width * (this.viewState?.left ?? 0.5) /* center */ - width / 2)}px`;
            this.ui.inputBox.layout();
            this.ui.list.layout(this.dimension && this.dimension.height * 0.4);
        }
    }
    applyStyles(styles) {
        this.styles = styles;
        this.updateStyles();
    }
    updateStyles() {
        if (this.ui) {
            const { quickInputTitleBackground, quickInputBackground, quickInputForeground, widgetBorder, widgetShadow, } = this.styles.widget;
            this.ui.titleBar.style.backgroundColor = quickInputTitleBackground ?? '';
            this.ui.container.style.backgroundColor = quickInputBackground ?? '';
            this.ui.container.style.color = quickInputForeground ?? '';
            this.ui.container.style.border = widgetBorder ? `1px solid ${widgetBorder}` : '';
            this.ui.container.style.boxShadow = widgetShadow ? `0 0 8px 2px ${widgetShadow}` : '';
            this.ui.list.style(this.styles.list);
            const content = [];
            if (this.styles.pickerGroup.pickerGroupBorder) {
                content.push(`.quick-input-list .quick-input-list-entry { border-top-color:  ${this.styles.pickerGroup.pickerGroupBorder}; }`);
            }
            if (this.styles.pickerGroup.pickerGroupForeground) {
                content.push(`.quick-input-list .quick-input-list-separator { color:  ${this.styles.pickerGroup.pickerGroupForeground}; }`);
            }
            if (this.styles.pickerGroup.pickerGroupForeground) {
                content.push(`.quick-input-list .quick-input-list-separator-as-item { color: var(--vscode-descriptionForeground); }`);
            }
            if (this.styles.keybindingLabel.keybindingLabelBackground ||
                this.styles.keybindingLabel.keybindingLabelBorder ||
                this.styles.keybindingLabel.keybindingLabelBottomBorder ||
                this.styles.keybindingLabel.keybindingLabelShadow ||
                this.styles.keybindingLabel.keybindingLabelForeground) {
                content.push('.quick-input-list .monaco-keybinding > .monaco-keybinding-key {');
                if (this.styles.keybindingLabel.keybindingLabelBackground) {
                    content.push(`background-color: ${this.styles.keybindingLabel.keybindingLabelBackground};`);
                }
                if (this.styles.keybindingLabel.keybindingLabelBorder) {
                    // Order matters here. `border-color` must come before `border-bottom-color`.
                    content.push(`border-color: ${this.styles.keybindingLabel.keybindingLabelBorder};`);
                }
                if (this.styles.keybindingLabel.keybindingLabelBottomBorder) {
                    content.push(`border-bottom-color: ${this.styles.keybindingLabel.keybindingLabelBottomBorder};`);
                }
                if (this.styles.keybindingLabel.keybindingLabelShadow) {
                    content.push(`box-shadow: inset 0 -1px 0 ${this.styles.keybindingLabel.keybindingLabelShadow};`);
                }
                if (this.styles.keybindingLabel.keybindingLabelForeground) {
                    content.push(`color: ${this.styles.keybindingLabel.keybindingLabelForeground};`);
                }
                content.push('}');
            }
            const newStyles = content.join('\n');
            if (newStyles !== this.ui.styleSheet.textContent) {
                this.ui.styleSheet.textContent = newStyles;
            }
        }
    }
    loadViewState() {
        try {
            const data = JSON.parse(this.storageService.get(VIEWSTATE_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, '{}'));
            if (data.top !== undefined || data.left !== undefined) {
                return data;
            }
        }
        catch { }
        return undefined;
    }
    saveViewState(viewState) {
        const isMainWindow = this.layoutService.activeContainer === this.layoutService.mainContainer;
        if (!isMainWindow) {
            return;
        }
        if (viewState !== undefined) {
            this.storageService.store(VIEWSTATE_STORAGE_KEY, JSON.stringify(viewState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(VIEWSTATE_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        }
    }
};
QuickInputController = QuickInputController_1 = __decorate([
    __param(1, ILayoutService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, IStorageService)
], QuickInputController);
export { QuickInputController };
let QuickInputDragAndDropController = class QuickInputDragAndDropController extends Disposable {
    constructor(_container, _quickInputContainer, _quickInputDragAreas, initialViewState, _layoutService, contextKeyService, configurationService) {
        super();
        this._container = _container;
        this._quickInputContainer = _quickInputContainer;
        this._quickInputDragAreas = _quickInputDragAreas;
        this._layoutService = _layoutService;
        this.configurationService = configurationService;
        this.dndViewState = observableValue(this, undefined);
        this._snapThreshold = 20;
        this._snapLineHorizontalRatio = 0.25;
        this._quickInputAlignmentContext = QuickInputAlignmentContextKey.bindTo(contextKeyService);
        const customWindowControls = getWindowControlsStyle(this.configurationService) === "custom" /* WindowControlsStyle.CUSTOM */;
        // Do not allow the widget to overflow or underflow window controls.
        // Use CSS calculations to avoid having to force layout with `.clientWidth`
        this._controlsOnLeft = customWindowControls && platform === 1 /* Platform.Mac */;
        this._controlsOnRight =
            customWindowControls && (platform === 3 /* Platform.Windows */ || platform === 2 /* Platform.Linux */);
        this._registerLayoutListener();
        this.registerMouseListeners();
        this.dndViewState.set({ ...initialViewState, done: true }, undefined);
    }
    reparentUI(container) {
        this._container = container;
    }
    layoutContainer(dimension = this._layoutService.activeContainerDimension) {
        const state = this.dndViewState.get();
        const dragAreaRect = this._quickInputContainer.getBoundingClientRect();
        if (state?.top && state?.left) {
            const a = Math.round(state.left * 1e2) / 1e2;
            const b = dimension.width;
            const c = dragAreaRect.width;
            const d = a * b - c / 2;
            this._layout(state.top * dimension.height, d);
        }
    }
    setAlignment(alignment, done = true) {
        if (alignment === 'top') {
            this.dndViewState.set({
                top: this._getTopSnapValue() / this._container.clientHeight,
                left: (this._getCenterXSnapValue() + this._quickInputContainer.clientWidth / 2) /
                    this._container.clientWidth,
                done,
            }, undefined);
            this._quickInputAlignmentContext.set('top');
        }
        else if (alignment === 'center') {
            this.dndViewState.set({
                top: this._getCenterYSnapValue() / this._container.clientHeight,
                left: (this._getCenterXSnapValue() + this._quickInputContainer.clientWidth / 2) /
                    this._container.clientWidth,
                done,
            }, undefined);
            this._quickInputAlignmentContext.set('center');
        }
        else {
            this.dndViewState.set({ top: alignment.top, left: alignment.left, done }, undefined);
            this._quickInputAlignmentContext.set(undefined);
        }
    }
    _registerLayoutListener() {
        this._register(Event.filter(this._layoutService.onDidLayoutContainer, (e) => e.container === this._container)((e) => this.layoutContainer(e.dimension)));
    }
    registerMouseListeners() {
        const dragArea = this._quickInputContainer;
        // Double click
        this._register(dom.addDisposableGenericMouseUpListener(dragArea, (event) => {
            const originEvent = new StandardMouseEvent(dom.getWindow(dragArea), event);
            if (originEvent.detail !== 2) {
                return;
            }
            // Ignore event if the target is not the drag area
            if (!this._quickInputDragAreas.some(({ node, includeChildren }) => includeChildren
                ? dom.isAncestor(originEvent.target, node)
                : originEvent.target === node)) {
                return;
            }
            this.dndViewState.set({ top: undefined, left: undefined, done: true }, undefined);
        }));
        // Mouse down
        this._register(dom.addDisposableGenericMouseDownListener(dragArea, (e) => {
            const activeWindow = dom.getWindow(this._layoutService.activeContainer);
            const originEvent = new StandardMouseEvent(activeWindow, e);
            // Ignore event if the target is not the drag area
            if (!this._quickInputDragAreas.some(({ node, includeChildren }) => includeChildren
                ? dom.isAncestor(originEvent.target, node)
                : originEvent.target === node)) {
                return;
            }
            // Mouse position offset relative to dragArea
            const dragAreaRect = this._quickInputContainer.getBoundingClientRect();
            const dragOffsetX = originEvent.browserEvent.clientX - dragAreaRect.left;
            const dragOffsetY = originEvent.browserEvent.clientY - dragAreaRect.top;
            let isMovingQuickInput = false;
            const mouseMoveListener = dom.addDisposableGenericMouseMoveListener(activeWindow, (e) => {
                const mouseMoveEvent = new StandardMouseEvent(activeWindow, e);
                mouseMoveEvent.preventDefault();
                if (!isMovingQuickInput) {
                    isMovingQuickInput = true;
                }
                this._layout(e.clientY - dragOffsetY, e.clientX - dragOffsetX);
            });
            const mouseUpListener = dom.addDisposableGenericMouseUpListener(activeWindow, (e) => {
                if (isMovingQuickInput) {
                    // Save position
                    const state = this.dndViewState.get();
                    this.dndViewState.set({ top: state?.top, left: state?.left, done: true }, undefined);
                }
                // Dispose listeners
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
    }
    _layout(topCoordinate, leftCoordinate) {
        const snapCoordinateYTop = this._getTopSnapValue();
        const snapCoordinateY = this._getCenterYSnapValue();
        const snapCoordinateX = this._getCenterXSnapValue();
        // Make sure the quick input is not moved outside the container
        topCoordinate = Math.max(0, Math.min(topCoordinate, this._container.clientHeight - this._quickInputContainer.clientHeight));
        if (topCoordinate < this._layoutService.activeContainerOffset.top) {
            if (this._controlsOnLeft) {
                leftCoordinate = Math.max(leftCoordinate, 80 / getZoomFactor(dom.getActiveWindow()));
            }
            else if (this._controlsOnRight) {
                leftCoordinate = Math.min(leftCoordinate, this._container.clientWidth -
                    this._quickInputContainer.clientWidth -
                    140 / getZoomFactor(dom.getActiveWindow()));
            }
        }
        const snappingToTop = Math.abs(topCoordinate - snapCoordinateYTop) < this._snapThreshold;
        topCoordinate = snappingToTop ? snapCoordinateYTop : topCoordinate;
        const snappingToCenter = Math.abs(topCoordinate - snapCoordinateY) < this._snapThreshold;
        topCoordinate = snappingToCenter ? snapCoordinateY : topCoordinate;
        const top = topCoordinate / this._container.clientHeight;
        // Make sure the quick input is not moved outside the container
        leftCoordinate = Math.max(0, Math.min(leftCoordinate, this._container.clientWidth - this._quickInputContainer.clientWidth));
        const snappingToCenterX = Math.abs(leftCoordinate - snapCoordinateX) < this._snapThreshold;
        leftCoordinate = snappingToCenterX ? snapCoordinateX : leftCoordinate;
        const b = this._container.clientWidth;
        const c = this._quickInputContainer.clientWidth;
        const d = leftCoordinate;
        const left = (d + c / 2) / b;
        this.dndViewState.set({ top, left, done: false }, undefined);
        if (snappingToCenterX) {
            if (snappingToTop) {
                this._quickInputAlignmentContext.set('top');
                return;
            }
            else if (snappingToCenter) {
                this._quickInputAlignmentContext.set('center');
                return;
            }
        }
        this._quickInputAlignmentContext.set(undefined);
    }
    _getTopSnapValue() {
        return this._layoutService.activeContainerOffset.quickPickTop;
    }
    _getCenterYSnapValue() {
        return Math.round(this._container.clientHeight * this._snapLineHorizontalRatio);
    }
    _getCenterXSnapValue() {
        return (Math.round(this._container.clientWidth / 2) -
            Math.round(this._quickInputContainer.clientWidth / 2));
    }
};
QuickInputDragAndDropController = __decorate([
    __param(4, ILayoutService),
    __param(5, IContextKeyService),
    __param(6, IConfigurationService)
], QuickInputDragAndDropController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0Q29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBbUIsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBV04sb0JBQW9CLEVBRXBCLGNBQWMsR0FFZCxNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBS04sU0FBUyxFQUNULFVBQVUsRUFDVixRQUFRLEVBRVIsV0FBVyxF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