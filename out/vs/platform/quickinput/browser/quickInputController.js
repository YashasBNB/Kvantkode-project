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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQW1CLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hGLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQVdOLG9CQUFvQixFQUVwQixjQUFjLEdBRWQsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUtOLFNBQVMsRUFDVCxVQUFVLEVBQ1YsUUFBUSxFQUVSLFdBQVcsRUFDWCxz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