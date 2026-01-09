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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFN0YXR1c1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbFN0YXR1c1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFLaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHakcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFHdkYsT0FBTyxFQUFFLGFBQWEsRUFBMkMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFB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