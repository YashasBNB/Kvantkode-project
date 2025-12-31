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
import * as DOM from '../../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../../base/browser/keyboardEvent.js';
import { SimpleIconLabel } from '../../../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { toErrorMessage } from '../../../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { stripIcons } from '../../../../../../base/common/iconLabels.js';
import { Disposable, DisposableStore, dispose } from '../../../../../../base/common/lifecycle.js';
import { isThemeColor } from '../../../../../../editor/common/editorCommon.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { CellFocusMode } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
const $ = DOM.$;
let CellEditorStatusBar = class CellEditorStatusBar extends CellContentPart {
    constructor(_notebookEditor, _cellContainer, editorPart, _editor, _instantiationService, hoverService, configurationService, _themeService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._cellContainer = _cellContainer;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this.leftItems = [];
        this.rightItems = [];
        this.width = 0;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.statusBarContainer = DOM.append(editorPart, $('.cell-statusbar-container'));
        this.statusBarContainer.tabIndex = -1;
        const leftItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-left'));
        const rightItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-right'));
        this.leftItemsContainer = DOM.append(leftItemsContainer, $('.cell-contributed-items.cell-contributed-items-left'));
        this.rightItemsContainer = DOM.append(rightItemsContainer, $('.cell-contributed-items.cell-contributed-items-right'));
        this.itemsDisposable = this._register(new DisposableStore());
        this.hoverDelegate = new (class {
            constructor() {
                this._lastHoverHideTime = 0;
                this.showHover = (options) => {
                    options.position = options.position ?? {};
                    options.position.hoverPosition = 3 /* HoverPosition.ABOVE */;
                    return hoverService.showInstantHover(options);
                };
                this.placement = 'element';
            }
            get delay() {
                return Date.now() - this._lastHoverHideTime < 200
                    ? 0 // show instantly when a hover was recently shown
                    : configurationService.getValue('workbench.hover.delay');
            }
            onDidHideHover() {
                this._lastHoverHideTime = Date.now();
            }
        })();
        this._register(this._themeService.onDidColorThemeChange(() => this.currentContext && this.updateContext(this.currentContext)));
        this._register(DOM.addDisposableListener(this.statusBarContainer, DOM.EventType.CLICK, (e) => {
            if (e.target === leftItemsContainer ||
                e.target === rightItemsContainer ||
                e.target === this.statusBarContainer) {
                // hit on empty space
                this._onDidClick.fire({
                    type: 0 /* ClickTargetType.Container */,
                    event: e,
                });
            }
            else {
                const target = e.target;
                let itemHasCommand = false;
                if (target && DOM.isHTMLElement(target)) {
                    const targetElement = target;
                    if (targetElement.classList.contains('cell-status-item-has-command')) {
                        itemHasCommand = true;
                    }
                    else if (targetElement.parentElement &&
                        targetElement.parentElement.classList.contains('cell-status-item-has-command')) {
                        itemHasCommand = true;
                    }
                }
                if (itemHasCommand) {
                    this._onDidClick.fire({
                        type: 2 /* ClickTargetType.ContributedCommandItem */,
                        event: e,
                    });
                }
                else {
                    // text
                    this._onDidClick.fire({
                        type: 1 /* ClickTargetType.ContributedTextItem */,
                        event: e,
                    });
                }
            }
        }));
    }
    didRenderCell(element) {
        if (this._notebookEditor.hasModel()) {
            const context = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                $mid: 13 /* MarshalledId.NotebookCellActionContext */,
            };
            this.updateContext(context);
        }
        if (this._editor) {
            // Focus Mode
            const updateFocusModeForEditorEvent = () => {
                if (this._editor &&
                    (this._editor.hasWidgetFocus() ||
                        (this.statusBarContainer.ownerDocument.activeElement &&
                            this.statusBarContainer.contains(this.statusBarContainer.ownerDocument.activeElement)))) {
                    element.focusMode = CellFocusMode.Editor;
                }
                else {
                    const currentMode = element.focusMode;
                    if (currentMode === CellFocusMode.ChatInput) {
                        element.focusMode = CellFocusMode.ChatInput;
                    }
                    else if (currentMode === CellFocusMode.Output &&
                        this._notebookEditor.hasWebviewFocus()) {
                        element.focusMode = CellFocusMode.Output;
                    }
                    else {
                        element.focusMode = CellFocusMode.Container;
                    }
                }
            };
            this.cellDisposables.add(this._editor.onDidFocusEditorWidget(() => {
                updateFocusModeForEditorEvent();
            }));
            this.cellDisposables.add(this._editor.onDidBlurEditorWidget(() => {
                // this is for a special case:
                // users click the status bar empty space, which we will then focus the editor
                // so we don't want to update the focus state too eagerly, it will be updated with onDidFocusEditorWidget
                if (this._notebookEditor.hasEditorFocus() &&
                    !(this.statusBarContainer.ownerDocument.activeElement &&
                        this.statusBarContainer.contains(this.statusBarContainer.ownerDocument.activeElement))) {
                    updateFocusModeForEditorEvent();
                }
            }));
            // Mouse click handlers
            this.cellDisposables.add(this.onDidClick((e) => {
                if (this.currentCell instanceof CodeCellViewModel &&
                    e.type !== 2 /* ClickTargetType.ContributedCommandItem */ &&
                    this._editor) {
                    const target = this._editor.getTargetAtClientPoint(e.event.clientX, e.event.clientY -
                        this._notebookEditor.notebookOptions.computeEditorStatusbarHeight(this.currentCell.internalMetadata, this.currentCell.uri));
                    if (target?.position) {
                        this._editor.setPosition(target.position);
                        this._editor.focus();
                    }
                }
            }));
        }
    }
    updateInternalLayoutNow(element) {
        // todo@rebornix layer breaker
        this._cellContainer.classList.toggle('cell-statusbar-hidden', this._notebookEditor.notebookOptions.computeEditorStatusbarHeight(element.internalMetadata, element.uri) === 0);
        const layoutInfo = element.layoutInfo;
        const width = layoutInfo.editorWidth;
        if (!width) {
            return;
        }
        this.width = width;
        this.statusBarContainer.style.width = `${width}px`;
        const maxItemWidth = this.getMaxItemWidth();
        this.leftItems.forEach((item) => (item.maxWidth = maxItemWidth));
        this.rightItems.forEach((item) => (item.maxWidth = maxItemWidth));
    }
    getMaxItemWidth() {
        return this.width / 2;
    }
    updateContext(context) {
        this.currentContext = context;
        this.itemsDisposable.clear();
        if (!this.currentContext) {
            return;
        }
        this.itemsDisposable.add(this.currentContext.cell.onDidChangeLayout(() => {
            if (this.currentContext) {
                this.updateInternalLayoutNow(this.currentContext.cell);
            }
        }));
        this.itemsDisposable.add(this.currentContext.cell.onDidChangeCellStatusBarItems(() => this.updateRenderedItems()));
        this.itemsDisposable.add(this.currentContext.notebookEditor.onDidChangeActiveCell(() => this.updateActiveCell()));
        this.updateInternalLayoutNow(this.currentContext.cell);
        this.updateActiveCell();
        this.updateRenderedItems();
    }
    updateActiveCell() {
        const isActiveCell = this.currentContext.notebookEditor.getActiveCell() === this.currentContext?.cell;
        this.statusBarContainer.classList.toggle('is-active-cell', isActiveCell);
    }
    updateRenderedItems() {
        const items = this.currentContext.cell.getCellStatusBarItems();
        items.sort((itemA, itemB) => {
            return (itemB.priority ?? 0) - (itemA.priority ?? 0);
        });
        const maxItemWidth = this.getMaxItemWidth();
        const newLeftItems = items.filter((item) => item.alignment === 1 /* CellStatusbarAlignment.Left */);
        const newRightItems = items
            .filter((item) => item.alignment === 2 /* CellStatusbarAlignment.Right */)
            .reverse();
        const updateItems = (renderedItems, newItems, container) => {
            if (renderedItems.length > newItems.length) {
                const deleted = renderedItems.splice(newItems.length, renderedItems.length - newItems.length);
                for (const deletedItem of deleted) {
                    deletedItem.container.remove();
                    deletedItem.dispose();
                }
            }
            newItems.forEach((newLeftItem, i) => {
                const existingItem = renderedItems[i];
                if (existingItem) {
                    existingItem.updateItem(newLeftItem, maxItemWidth);
                }
                else {
                    const item = this._instantiationService.createInstance(CellStatusBarItem, this.currentContext, this.hoverDelegate, this._editor, newLeftItem, maxItemWidth);
                    renderedItems.push(item);
                    container.appendChild(item.container);
                }
            });
        };
        updateItems(this.leftItems, newLeftItems, this.leftItemsContainer);
        updateItems(this.rightItems, newRightItems, this.rightItemsContainer);
    }
    dispose() {
        super.dispose();
        dispose(this.leftItems);
        dispose(this.rightItems);
    }
};
CellEditorStatusBar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IHoverService),
    __param(6, IConfigurationService),
    __param(7, IThemeService)
], CellEditorStatusBar);
export { CellEditorStatusBar };
let CellStatusBarItem = class CellStatusBarItem extends Disposable {
    set maxWidth(v) {
        this.container.style.maxWidth = v + 'px';
    }
    constructor(_context, _hoverDelegate, _editor, itemModel, maxWidth, _telemetryService, _commandService, _notificationService, _themeService, _hoverService) {
        super();
        this._context = _context;
        this._hoverDelegate = _hoverDelegate;
        this._editor = _editor;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._hoverService = _hoverService;
        this.container = $('.cell-status-item');
        this._itemDisposables = this._register(new DisposableStore());
        this.updateItem(itemModel, maxWidth);
    }
    updateItem(item, maxWidth) {
        this._itemDisposables.clear();
        if (!this._currentItem || this._currentItem.text !== item.text) {
            this._itemDisposables.add(new SimpleIconLabel(this.container)).text = item.text.replace(/\n/g, ' ');
        }
        const resolveColor = (color) => {
            return isThemeColor(color)
                ? this._themeService.getColorTheme().getColor(color.id)?.toString() || ''
                : color;
        };
        this.container.style.color = item.color ? resolveColor(item.color) : '';
        this.container.style.backgroundColor = item.backgroundColor
            ? resolveColor(item.backgroundColor)
            : '';
        this.container.style.opacity = item.opacity ? item.opacity : '';
        this.container.classList.toggle('cell-status-item-show-when-active', !!item.onlyShowWhenActive);
        if (typeof maxWidth === 'number') {
            this.maxWidth = maxWidth;
        }
        let ariaLabel;
        let role;
        if (item.accessibilityInformation) {
            ariaLabel = item.accessibilityInformation.label;
            role = item.accessibilityInformation.role;
        }
        else {
            ariaLabel = item.text ? stripIcons(item.text).trim() : '';
        }
        this.container.setAttribute('aria-label', ariaLabel);
        this.container.setAttribute('role', role || '');
        if (item.tooltip) {
            const hoverContent = typeof item.tooltip === 'string'
                ? item.tooltip
                : {
                    markdown: item.tooltip,
                    markdownNotSupportedFallback: undefined,
                };
            this._itemDisposables.add(this._hoverService.setupManagedHover(this._hoverDelegate, this.container, hoverContent));
        }
        this.container.classList.toggle('cell-status-item-has-command', !!item.command);
        if (item.command) {
            this.container.tabIndex = 0;
            this._itemDisposables.add(DOM.addDisposableListener(this.container, DOM.EventType.CLICK, (_e) => {
                this.executeCommand();
            }));
            this._itemDisposables.add(DOM.addDisposableListener(this.container, DOM.EventType.KEY_DOWN, (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                    this.executeCommand();
                }
            }));
        }
        else {
            this.container.removeAttribute('tabIndex');
        }
        this._currentItem = item;
    }
    async executeCommand() {
        const command = this._currentItem.command;
        if (!command) {
            return;
        }
        const id = typeof command === 'string' ? command : command.id;
        const args = typeof command === 'string' ? [] : (command.arguments ?? []);
        if (typeof command === 'string' ||
            !command.arguments ||
            !Array.isArray(command.arguments) ||
            command.arguments.length === 0) {
            args.unshift(this._context);
        }
        this._telemetryService.publicLog2('workbenchActionExecuted', { id, from: 'cell status bar' });
        try {
            this._editor?.focus();
            await this._commandService.executeCommand(id, ...args);
        }
        catch (error) {
            this._notificationService.error(toErrorMessage(error));
        }
    }
};
CellStatusBarItem = __decorate([
    __param(5, ITelemetryService),
    __param(6, ICommandService),
    __param(7, INotificationService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], CellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFN0YXR1c1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxTdGF0dXNQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBS2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBR3ZGLE9BQU8sRUFBRSxhQUFhLEVBQTJDLE1BQU0sMEJBQTBCLENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFB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