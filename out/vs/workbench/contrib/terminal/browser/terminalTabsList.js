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
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService, } from './terminal.js';
import { localize } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Action } from '../../../../base/common/actions.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels, } from '../../../browser/labels.js';
import { IDecorationsService, } from '../../../services/decorations/common/decorations.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import Severity from '../../../../base/common/severity.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { ElementsDragAndDropData, NativeDragAndDropData, } from '../../../../base/browser/ui/list/listView.js';
import { URI } from '../../../../base/common/uri.js';
import { getColorClass, getIconId, getUriClasses } from './terminalIcon.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { CodeDataTransfers, containsDragType, getPathForFile, } from '../../../../platform/dnd/browser/dnd.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getTerminalResourcesFromDragEvent, parseTerminalUri } from './terminalUri.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { getColorForSeverity } from './terminalStatusList.js';
import { TerminalContextActionRunner } from './terminalContextMenu.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
const $ = DOM.$;
export var TerminalTabsListSizes;
(function (TerminalTabsListSizes) {
    TerminalTabsListSizes[TerminalTabsListSizes["TabHeight"] = 22] = "TabHeight";
    TerminalTabsListSizes[TerminalTabsListSizes["NarrowViewWidth"] = 46] = "NarrowViewWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["WideViewMinimumWidth"] = 80] = "WideViewMinimumWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["DefaultWidth"] = 120] = "DefaultWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["MidpointViewWidth"] = 63] = "MidpointViewWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["ActionbarMinimumWidth"] = 105] = "ActionbarMinimumWidth";
    TerminalTabsListSizes[TerminalTabsListSizes["MaximumWidth"] = 500] = "MaximumWidth";
})(TerminalTabsListSizes || (TerminalTabsListSizes = {}));
let TerminalTabList = class TerminalTabList extends WorkbenchList {
    constructor(container, disposableStore, contextKeyService, listService, _configurationService, _terminalService, _terminalGroupService, instantiationService, decorationsService, _themeService, _storageService, lifecycleService, _hoverService) {
        super('TerminalTabsList', container, {
            getHeight: () => 22 /* TerminalTabsListSizes.TabHeight */,
            getTemplateId: () => 'terminal.tabs',
        }, [
            disposableStore.add(instantiationService.createInstance(TerminalTabsRenderer, container, instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER), () => this.getSelectedElements())),
        ], {
            horizontalScrolling: false,
            supportDynamicHeights: false,
            selectionNavigation: true,
            identityProvider: {
                getId: (e) => e?.instanceId,
            },
            accessibilityProvider: instantiationService.createInstance(TerminalTabsAccessibilityProvider),
            smoothScrolling: _configurationService.getValue('workbench.list.smoothScrolling'),
            multipleSelectionSupport: true,
            paddingBottom: 22 /* TerminalTabsListSizes.TabHeight */,
            dnd: instantiationService.createInstance(TerminalTabsDragAndDrop),
            openOnSingleClick: true,
        }, contextKeyService, listService, _configurationService, instantiationService);
        this._configurationService = _configurationService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._themeService = _themeService;
        this._storageService = _storageService;
        this._hoverService = _hoverService;
        const instanceDisposables = [
            this._terminalGroupService.onDidChangeInstances(() => this.refresh()),
            this._terminalGroupService.onDidChangeGroups(() => this.refresh()),
            this._terminalGroupService.onDidShow(() => this.refresh()),
            this._terminalGroupService.onDidChangeInstanceCapability(() => this.refresh()),
            this._terminalService.onAnyInstanceTitleChange(() => this.refresh()),
            this._terminalService.onAnyInstanceIconChange(() => this.refresh()),
            this._terminalService.onAnyInstancePrimaryStatusChange(() => this.refresh()),
            this._terminalService.onDidChangeConnectionState(() => this.refresh()),
            this._themeService.onDidColorThemeChange(() => this.refresh()),
            this._terminalGroupService.onDidChangeActiveInstance((e) => {
                if (e) {
                    const i = this._terminalGroupService.instances.indexOf(e);
                    this.setSelection([i]);
                    this.reveal(i);
                }
                this.refresh();
            }),
            this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, "terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, this.disposables)(() => this.refresh()),
        ];
        // Dispose of instance listeners on shutdown to avoid extra work and so tabs don't disappear
        // briefly
        this.disposables.add(lifecycleService.onWillShutdown((e) => {
            dispose(instanceDisposables);
            instanceDisposables.length = 0;
        }));
        this.disposables.add(toDisposable(() => {
            dispose(instanceDisposables);
            instanceDisposables.length = 0;
        }));
        this.disposables.add(this.onMouseDblClick(async (e) => {
            const focus = this.getFocus();
            if (focus.length === 0) {
                const instance = await this._terminalService.createTerminal({
                    location: TerminalLocation.Panel,
                });
                this._terminalGroupService.setActiveInstance(instance);
                await instance.focusWhenReady();
            }
            if (this._terminalService.getEditingTerminal()?.instanceId === e.element?.instanceId) {
                return;
            }
            if (this._getFocusMode() === 'doubleClick' && this.getFocus().length === 1) {
                e.element?.focus(true);
            }
        }));
        // on left click, if focus mode = single click, focus the element
        // unless multi-selection is in progress
        this.disposables.add(this.onMouseClick(async (e) => {
            if (this._terminalService.getEditingTerminal()?.instanceId === e.element?.instanceId) {
                return;
            }
            if (e.browserEvent.altKey && e.element) {
                await this._terminalService.createTerminal({ location: { parentTerminal: e.element } });
            }
            else if (this._getFocusMode() === 'singleClick') {
                if (this.getSelection().length <= 1) {
                    e.element?.focus(true);
                }
            }
        }));
        // on right click, set the focus to that element
        // unless multi-selection is in progress
        this.disposables.add(this.onContextMenu((e) => {
            if (!e.element) {
                this.setSelection([]);
                return;
            }
            const selection = this.getSelectedElements();
            if (!selection || !selection.find((s) => e.element === s)) {
                this.setFocus(e.index !== undefined ? [e.index] : []);
            }
        }));
        this._terminalTabsSingleSelectedContextKey =
            TerminalContextKeys.tabsSingularSelection.bindTo(contextKeyService);
        this._isSplitContextKey = TerminalContextKeys.splitTerminal.bindTo(contextKeyService);
        this.disposables.add(this.onDidChangeSelection((e) => this._updateContextKey()));
        this.disposables.add(this.onDidChangeFocus(() => this._updateContextKey()));
        this.disposables.add(this.onDidOpen(async (e) => {
            const instance = e.element;
            if (!instance) {
                return;
            }
            this._terminalGroupService.setActiveInstance(instance);
            if (!e.editorOptions.preserveFocus) {
                await instance.focusWhenReady();
            }
        }));
        if (!this._decorationsProvider) {
            this._decorationsProvider = this.disposables.add(instantiationService.createInstance(TabDecorationsProvider));
            this.disposables.add(decorationsService.registerDecorationsProvider(this._decorationsProvider));
        }
        this.refresh();
    }
    _getFocusMode() {
        return this._configurationService.getValue("terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */);
    }
    refresh(cancelEditing = true) {
        if (cancelEditing && this._terminalService.isEditable(undefined)) {
            this.domFocus();
        }
        this.splice(0, this.length, this._terminalGroupService.instances.slice());
    }
    focusHover() {
        const instance = this.getSelectedElements()[0];
        if (!instance) {
            return;
        }
        this._hoverService.showInstantHover({
            ...getInstanceHoverInfo(instance, this._storageService),
            target: this.getHTMLElement(),
            trapFocus: true,
        }, true);
    }
    _updateContextKey() {
        this._terminalTabsSingleSelectedContextKey.set(this.getSelectedElements().length === 1);
        const instance = this.getFocusedElements();
        this._isSplitContextKey.set(instance.length > 0 && this._terminalGroupService.instanceIsSplit(instance[0]));
    }
};
TerminalTabList = __decorate([
    __param(2, IContextKeyService),
    __param(3, IListService),
    __param(4, IConfigurationService),
    __param(5, ITerminalService),
    __param(6, ITerminalGroupService),
    __param(7, IInstantiationService),
    __param(8, IDecorationsService),
    __param(9, IThemeService),
    __param(10, IStorageService),
    __param(11, ILifecycleService),
    __param(12, IHoverService)
], TerminalTabList);
export { TerminalTabList };
let TerminalTabsRenderer = class TerminalTabsRenderer extends Disposable {
    constructor(_container, _labels, _getSelection, _instantiationService, _terminalConfigurationService, _terminalService, _terminalGroupService, _hoverService, _keybindingService, _listService, _storageService, _themeService, _contextViewService, _commandService) {
        super();
        this._container = _container;
        this._labels = _labels;
        this._getSelection = _getSelection;
        this._instantiationService = _instantiationService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._hoverService = _hoverService;
        this._keybindingService = _keybindingService;
        this._listService = _listService;
        this._storageService = _storageService;
        this._themeService = _themeService;
        this._contextViewService = _contextViewService;
        this._commandService = _commandService;
        this.templateId = 'terminal.tabs';
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.terminal-tabs-entry'));
        const context = {};
        const label = this._labels.create(element, {
            supportHighlights: true,
            supportDescriptionHighlights: true,
            supportIcons: true,
            hoverDelegate: {
                delay: 0,
                showHover: (options) => {
                    return this._hoverService.showDelayedHover({
                        ...options,
                        actions: context.hoverActions,
                        target: element,
                        appearance: {
                            showPointer: true,
                        },
                        position: {
                            hoverPosition: this._terminalConfigurationService.config.tabs.location === 'left'
                                ? 1 /* HoverPosition.RIGHT */
                                : 0 /* HoverPosition.LEFT */,
                        },
                    }, { groupId: 'terminal-tabs-list' });
                },
            },
        });
        const actionsContainer = DOM.append(label.element, $('.actions'));
        const actionBar = this._register(new ActionBar(actionsContainer, {
            actionRunner: this._register(new TerminalContextActionRunner()),
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this._register(this._instantiationService.createInstance(MenuEntryActionViewItem, action, {
                    hoverDelegate: options.hoverDelegate,
                }))
                : undefined,
        }));
        return {
            element,
            label,
            actionBar,
            context,
            elementDisposables: new DisposableStore(),
        };
    }
    shouldHideText() {
        return this._container
            ? this._container.clientWidth < 63 /* TerminalTabsListSizes.MidpointViewWidth */
            : false;
    }
    shouldHideActionBar() {
        return this._container
            ? this._container.clientWidth <= 105 /* TerminalTabsListSizes.ActionbarMinimumWidth */
            : false;
    }
    renderElement(instance, index, template) {
        const hasText = !this.shouldHideText();
        const group = this._terminalGroupService.getGroupForInstance(instance);
        if (!group) {
            throw new Error(`Could not find group for instance "${instance.instanceId}"`);
        }
        template.element.classList.toggle('has-text', hasText);
        template.element.classList.toggle('is-active', this._terminalGroupService.activeInstance === instance);
        let prefix = '';
        if (group.terminalInstances.length > 1) {
            const terminalIndex = group.terminalInstances.indexOf(instance);
            if (terminalIndex === 0) {
                prefix = `┌ `;
            }
            else if (terminalIndex === group.terminalInstances.length - 1) {
                prefix = `└ `;
            }
            else {
                prefix = `├ `;
            }
        }
        const hoverInfo = getInstanceHoverInfo(instance, this._storageService);
        template.context.hoverActions = hoverInfo.actions;
        const iconId = this._instantiationService.invokeFunction(getIconId, instance);
        const hasActionbar = !this.shouldHideActionBar();
        let label = '';
        if (!hasText) {
            const primaryStatus = instance.statusList.primary;
            // Don't show ignore severity
            if (primaryStatus && primaryStatus.severity > Severity.Ignore) {
                label = `${prefix}$(${primaryStatus.icon?.id || iconId})`;
            }
            else {
                label = `${prefix}$(${iconId})`;
            }
        }
        else {
            this.fillActionBar(instance, template);
            label = prefix;
            // Only add the title if the icon is set, this prevents the title jumping around for
            // example when launching with a ShellLaunchConfig.name and no icon
            if (instance.icon) {
                label += `$(${iconId}) ${instance.title}`;
            }
        }
        if (!hasActionbar) {
            template.actionBar.clear();
        }
        // Kill terminal on middle click
        template.elementDisposables.add(DOM.addDisposableListener(template.element, DOM.EventType.AUXCLICK, (e) => {
            e.stopImmediatePropagation();
            if (e.button === 1 /*middle*/) {
                this._terminalService.safeDisposeTerminal(instance);
            }
        }));
        const extraClasses = [];
        const colorClass = getColorClass(instance);
        if (colorClass) {
            extraClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(instance, this._themeService.getColorTheme().type);
        if (uriClasses) {
            extraClasses.push(...uriClasses);
        }
        template.label.setResource({
            resource: instance.resource,
            name: label,
            description: hasText ? instance.description : undefined,
        }, {
            fileDecorations: {
                colors: true,
                badges: hasText,
            },
            title: {
                markdown: hoverInfo.content,
                markdownNotSupportedFallback: undefined,
            },
            extraClasses,
        });
        const editableData = this._terminalService.getEditableData(instance);
        template.label.element.classList.toggle('editable-tab', !!editableData);
        if (editableData) {
            template.elementDisposables.add(this._renderInputBox(template.label.element.querySelector('.monaco-icon-label-container'), instance, editableData));
            template.actionBar.clear();
        }
    }
    _renderInputBox(container, instance, editableData) {
        const value = instance.title || '';
        const inputBox = new InputBox(container, this._contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */,
                    };
                },
            },
            ariaLabel: localize('terminalInputAriaLabel', 'Type terminal name. Press Enter to confirm or Escape to cancel.'),
            inputBoxStyles: defaultInputBoxStyles,
        });
        inputBox.element.style.height = '22px';
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: value.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            inputBox.element.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            inputBox.element.remove();
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info
                            ? 1 /* MessageType.INFO */
                            : message.severity === Severity.Warning
                                ? 2 /* MessageType.WARNING */
                                : 3 /* MessageType.ERROR */,
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const toDispose = [
            inputBox,
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                e.stopPropagation();
                if (e.equals(3 /* KeyCode.Enter */)) {
                    done(inputBox.isInputValid(), true);
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e) => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, () => {
                done(inputBox.isInputValid(), true);
            }),
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(instance, index, templateData) {
        templateData.elementDisposables.clear();
        templateData.actionBar.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.label.dispose();
        templateData.actionBar.dispose();
    }
    fillActionBar(instance, template) {
        // If the instance is within the selection, split all selected
        const actions = [
            this._register(new Action("workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */, terminalStrings.split.short, ThemeIcon.asClassName(Codicon.splitHorizontal), true, async () => {
                this._runForSelectionOrInstance(instance, async (e) => {
                    this._terminalService.createTerminal({ location: { parentTerminal: e } });
                });
            })),
        ];
        if (instance.shellLaunchConfig.tabActions) {
            for (const action of instance.shellLaunchConfig.tabActions) {
                actions.push(this._register(new Action(action.id, action.label, action.icon ? ThemeIcon.asClassName(action.icon) : undefined, true, async () => {
                    this._runForSelectionOrInstance(instance, (e) => this._commandService.executeCommand(action.id, instance));
                })));
            }
        }
        actions.push(this._register(new Action("workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */, terminalStrings.kill.short, ThemeIcon.asClassName(Codicon.trashcan), true, async () => {
            this._runForSelectionOrInstance(instance, (e) => this._terminalService.safeDisposeTerminal(e));
        })));
        // TODO: Cache these in a way that will use the correct instance
        template.actionBar.clear();
        for (const action of actions) {
            template.actionBar.push(action, {
                icon: true,
                label: false,
                keybinding: this._keybindingService.lookupKeybinding(action.id)?.getLabel(),
            });
        }
    }
    _runForSelectionOrInstance(instance, callback) {
        const selection = this._getSelection();
        if (selection.includes(instance)) {
            for (const s of selection) {
                if (s) {
                    callback(s);
                }
            }
        }
        else {
            callback(instance);
        }
        this._terminalGroupService.focusTabs();
        this._listService.lastFocusedList?.focusNext();
    }
};
TerminalTabsRenderer = __decorate([
    __param(3, IInstantiationService),
    __param(4, ITerminalConfigurationService),
    __param(5, ITerminalService),
    __param(6, ITerminalGroupService),
    __param(7, IHoverService),
    __param(8, IKeybindingService),
    __param(9, IListService),
    __param(10, IStorageService),
    __param(11, IThemeService),
    __param(12, IContextViewService),
    __param(13, ICommandService)
], TerminalTabsRenderer);
let TerminalTabsAccessibilityProvider = class TerminalTabsAccessibilityProvider {
    constructor(_terminalGroupService) {
        this._terminalGroupService = _terminalGroupService;
    }
    getWidgetAriaLabel() {
        return localize('terminal.tabs', 'Terminal tabs');
    }
    getAriaLabel(instance) {
        let ariaLabel = '';
        const tab = this._terminalGroupService.getGroupForInstance(instance);
        if (tab && tab.terminalInstances?.length > 1) {
            const terminalIndex = tab.terminalInstances.indexOf(instance);
            ariaLabel = localize({
                key: 'splitTerminalAriaLabel',
                comment: [
                    `The terminal's ID`,
                    `The terminal's title`,
                    `The terminal's split number`,
                    `The terminal group's total split number`,
                ],
            }, 'Terminal {0} {1}, split {2} of {3}', instance.instanceId, instance.title, terminalIndex + 1, tab.terminalInstances.length);
        }
        else {
            ariaLabel = localize({
                key: 'terminalAriaLabel',
                comment: [`The terminal's ID`, `The terminal's title`],
            }, 'Terminal {0} {1}', instance.instanceId, instance.title);
        }
        return ariaLabel;
    }
};
TerminalTabsAccessibilityProvider = __decorate([
    __param(0, ITerminalGroupService)
], TerminalTabsAccessibilityProvider);
let TerminalTabsDragAndDrop = class TerminalTabsDragAndDrop extends Disposable {
    constructor(_terminalService, _terminalGroupService, _listService) {
        super();
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._listService = _listService;
        this._autoFocusDisposable = Disposable.None;
        this._primaryBackend = this._terminalService.getPrimaryBackend();
    }
    getDragURI(instance) {
        if (this._terminalService.getEditingTerminal()?.instanceId === instance.instanceId) {
            return null;
        }
        return instance.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        return elements.length === 1 ? elements[0].title : undefined;
    }
    onDragLeave() {
        this._autoFocusInstance = undefined;
        this._autoFocusDisposable.dispose();
        this._autoFocusDisposable = Disposable.None;
    }
    onDragStart(data, originalEvent) {
        if (!originalEvent.dataTransfer) {
            return;
        }
        const dndData = data.getData();
        if (!Array.isArray(dndData)) {
            return;
        }
        // Attach terminals type to event
        const terminals = dndData.filter((e) => 'instanceId' in e);
        if (terminals.length > 0) {
            originalEvent.dataTransfer.setData("Terminals" /* TerminalDataTransfers.Terminals */, JSON.stringify(terminals.map((e) => e.resource.toString())));
        }
    }
    onDragOver(data, targetInstance, targetIndex, targetSector, originalEvent) {
        if (data instanceof NativeDragAndDropData) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, DataTransfers.RESOURCES, "Terminals" /* TerminalDataTransfers.Terminals */, CodeDataTransfers.FILES)) {
                return false;
            }
        }
        const didChangeAutoFocusInstance = this._autoFocusInstance !== targetInstance;
        if (didChangeAutoFocusInstance) {
            this._autoFocusDisposable.dispose();
            this._autoFocusInstance = targetInstance;
        }
        if (!targetInstance && !containsDragType(originalEvent, "Terminals" /* TerminalDataTransfers.Terminals */)) {
            return data instanceof ElementsDragAndDropData;
        }
        if (didChangeAutoFocusInstance && targetInstance) {
            this._autoFocusDisposable = disposableTimeout(() => {
                this._terminalService.setActiveInstance(targetInstance);
                this._autoFocusInstance = undefined;
            }, 500, this._store);
        }
        return {
            feedback: targetIndex ? [targetIndex] : undefined,
            accept: true,
            effect: { type: 1 /* ListDragOverEffectType.Move */, position: "drop-target" /* ListDragOverEffectPosition.Over */ },
        };
    }
    async drop(data, targetInstance, targetIndex, targetSector, originalEvent) {
        this._autoFocusDisposable.dispose();
        this._autoFocusInstance = undefined;
        let sourceInstances;
        const promises = [];
        const resources = getTerminalResourcesFromDragEvent(originalEvent);
        if (resources) {
            for (const uri of resources) {
                const instance = this._terminalService.getInstanceFromResource(uri);
                if (instance) {
                    if (Array.isArray(sourceInstances)) {
                        sourceInstances.push(instance);
                    }
                    else {
                        sourceInstances = [instance];
                    }
                    this._terminalService.moveToTerminalView(instance);
                }
                else if (this._primaryBackend) {
                    const terminalIdentifier = parseTerminalUri(uri);
                    if (terminalIdentifier.instanceId) {
                        promises.push(this._primaryBackend.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId));
                    }
                }
            }
        }
        if (promises.length) {
            let processes = await Promise.all(promises);
            processes = processes.filter((p) => p !== undefined);
            let lastInstance;
            for (const attachPersistentProcess of processes) {
                lastInstance = await this._terminalService.createTerminal({
                    config: { attachPersistentProcess },
                });
            }
            if (lastInstance) {
                this._terminalService.setActiveInstance(lastInstance);
            }
            return;
        }
        if (sourceInstances === undefined) {
            if (!(data instanceof ElementsDragAndDropData)) {
                this._handleExternalDrop(targetInstance, originalEvent);
                return;
            }
            const draggedElement = data.getData();
            if (!draggedElement || !Array.isArray(draggedElement)) {
                return;
            }
            sourceInstances = [];
            for (const e of draggedElement) {
                if ('instanceId' in e) {
                    sourceInstances.push(e);
                }
            }
        }
        if (!targetInstance) {
            this._terminalGroupService.moveGroupToEnd(sourceInstances);
            this._terminalService.setActiveInstance(sourceInstances[0]);
            const targetGroup = this._terminalGroupService.getGroupForInstance(sourceInstances[0]);
            if (targetGroup) {
                const index = this._terminalGroupService.groups.indexOf(targetGroup);
                this._listService.lastFocusedList?.setSelection([index]);
            }
            return;
        }
        this._terminalGroupService.moveGroup(sourceInstances, targetInstance);
        this._terminalService.setActiveInstance(sourceInstances[0]);
        const targetGroup = this._terminalGroupService.getGroupForInstance(sourceInstances[0]);
        if (targetGroup) {
            const index = this._terminalGroupService.groups.indexOf(targetGroup);
            this._listService.lastFocusedList?.setSelection([index]);
        }
    }
    async _handleExternalDrop(instance, e) {
        if (!instance || !e.dataTransfer) {
            return;
        }
        // Check if files were dragged from the tree explorer
        let resource;
        const rawResources = e.dataTransfer.getData(DataTransfers.RESOURCES);
        if (rawResources) {
            resource = URI.parse(JSON.parse(rawResources)[0]);
        }
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (!resource && rawCodeFiles) {
            resource = URI.file(JSON.parse(rawCodeFiles)[0]);
        }
        if (!resource && e.dataTransfer.files.length > 0 && getPathForFile(e.dataTransfer.files[0])) {
            // Check if the file was dragged from the filesystem
            resource = URI.file(getPathForFile(e.dataTransfer.files[0]));
        }
        if (!resource) {
            return;
        }
        this._terminalService.setActiveInstance(instance);
        instance.focus();
        await instance.sendPath(resource, false);
    }
};
TerminalTabsDragAndDrop = __decorate([
    __param(0, ITerminalService),
    __param(1, ITerminalGroupService),
    __param(2, IListService)
], TerminalTabsDragAndDrop);
let TabDecorationsProvider = class TabDecorationsProvider extends Disposable {
    constructor(_terminalService) {
        super();
        this._terminalService = _terminalService;
        this.label = localize('label', 'Terminal');
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this._terminalService.onAnyInstancePrimaryStatusChange((e) => this._onDidChange.fire([e.resource])));
    }
    provideDecorations(resource) {
        if (resource.scheme !== Schemas.vscodeTerminal) {
            return undefined;
        }
        const instance = this._terminalService.getInstanceFromResource(resource);
        if (!instance) {
            return undefined;
        }
        const primaryStatus = instance?.statusList?.primary;
        if (!primaryStatus?.icon) {
            return undefined;
        }
        return {
            color: getColorForSeverity(primaryStatus.severity),
            letter: primaryStatus.icon,
            tooltip: primaryStatus.tooltip,
        };
    }
};
TabDecorationsProvider = __decorate([
    __param(0, ITerminalService)
], TabDecorationsProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJzTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxUYWJzTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IscUJBQXFCLEVBRXJCLGdCQUFnQixHQUVoQixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRXpHLE9BQU8sRUFFTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0s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