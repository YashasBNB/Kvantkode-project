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
var ActionButtonRenderer_1, InputRenderer_1, ResourceGroupRenderer_1, ResourceRenderer_1, SCMInputWidget_1;
import './media/scm.css';
import { Event, Emitter } from '../../../../base/common/event.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { Disposable, DisposableStore, combinedDisposable, dispose, toDisposable, MutableDisposable, DisposableMap, } from '../../../../base/common/lifecycle.js';
import { ViewPane, ViewAction } from '../../../browser/parts/views/viewPane.js';
import { append, $, Dimension, trackFocus, clearNode, isPointerEvent, isActiveElement, } from '../../../../base/browser/dom.js';
import { asCSSUrl } from '../../../../base/browser/cssValue.js';
import { ISCMViewService, ISCMService, SCMInputChangeReason, VIEW_PANE_ID, } from '../common/scm.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextViewService, IContextMenuService, } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { MenuItemAction, IMenuService, registerAction2, MenuId, MenuRegistry, Action2, } from '../../../../platform/actions/common/actions.js';
import { ActionRunner, Action, Separator, toAction, } from '../../../../base/common/actions.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isSCMResource, isSCMResourceGroup, isSCMRepository, isSCMInput, collectContextMenuActions, getActionViewItemProvider, isSCMActionButton, isSCMViewService, isSCMResourceNode, connectPrimaryMenu, } from './util.js';
import { WorkbenchCompressibleAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { disposableTimeout, Sequencer, ThrottledDelayer, Throttler, } from '../../../../base/common/async.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { localize } from '../../../../nls.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { CodeEditorWidget, } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { getSimpleEditorOptions, setupSimpleEditorSelectionStyling, } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { EditorDictation } from '../../codeEditor/browser/dictation/editorDictation.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import * as platform from '../../../../base/common/platform.js';
import { compare, format } from '../../../../base/common/strings.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID, } from '../../../browser/parts/editor/editorCommands.js';
import { createActionViewItem, getFlatActionBarActions, getFlatContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MarkdownRenderer, openLinkFromMarkdown, } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Button, ButtonWithDropdown, } from '../../../../base/browser/ui/button/button.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { RepositoryContextKeys } from './scmViewService.js';
import { DragAndDropController } from '../../../../editor/contrib/dnd/browser/dnd.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { defaultButtonStyles, defaultCountBadgeStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { Schemas } from '../../../../base/common/network.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { CodeDataTransfers } from '../../../../platform/dnd/browser/dnd.js';
import { FormatOnType } from '../../../../editor/contrib/format/browser/formatActions.js';
import { EditorOptions, } from '../../../../editor/common/config/editorOptions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { WorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { clamp, rot } from '../../../../base/common/numbers.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { OpenScmGroupAction } from '../../multiDiffEditor/browser/scmMultiDiffSourceResolver.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { PlaceholderTextContribution } from '../../../../editor/contrib/placeholderText/browser/placeholderTextContribution.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
function processResourceFilterData(uri, filterData) {
    if (!filterData) {
        return [undefined, undefined];
    }
    if (!filterData.label) {
        const matches = createMatches(filterData);
        return [matches, undefined];
    }
    const fileName = basename(uri);
    const label = filterData.label;
    const pathLength = label.length - fileName.length;
    const matches = createMatches(filterData.score);
    // FileName match
    if (label === fileName) {
        return [matches, undefined];
    }
    // FilePath match
    const labelMatches = [];
    const descriptionMatches = [];
    for (const match of matches) {
        if (match.start > pathLength) {
            // Label match
            labelMatches.push({
                start: match.start - pathLength,
                end: match.end - pathLength,
            });
        }
        else if (match.end < pathLength) {
            // Description match
            descriptionMatches.push(match);
        }
        else {
            // Spanning match
            labelMatches.push({
                start: 0,
                end: match.end - pathLength,
            });
            descriptionMatches.push({
                start: match.start,
                end: pathLength,
            });
        }
    }
    return [labelMatches, descriptionMatches];
}
let ActionButtonRenderer = class ActionButtonRenderer {
    static { ActionButtonRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 28; }
    static { this.TEMPLATE_ID = 'actionButton'; }
    get templateId() {
        return ActionButtonRenderer_1.TEMPLATE_ID;
    }
    constructor(commandService, contextMenuService, notificationService) {
        this.commandService = commandService;
        this.contextMenuService = contextMenuService;
        this.notificationService = notificationService;
        this.actionButtons = new Map();
    }
    renderTemplate(container) {
        // hack
        ;
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Use default cursor & disable hover for list item
        container.parentElement.parentElement.classList.add('cursor-default', 'force-no-hover');
        const buttonContainer = append(container, $('.button-container'));
        const actionButton = new SCMActionButton(buttonContainer, this.contextMenuService, this.commandService, this.notificationService);
        return { actionButton, disposable: Disposable.None, templateDisposable: actionButton };
    }
    renderElement(node, index, templateData, height) {
        templateData.disposable.dispose();
        const disposables = new DisposableStore();
        const actionButton = node.element;
        templateData.actionButton.setButton(node.element.button);
        // Remember action button
        this.actionButtons.set(actionButton, templateData.actionButton);
        disposables.add({ dispose: () => this.actionButtons.delete(actionButton) });
        templateData.disposable = disposables;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    focusActionButton(actionButton) {
        this.actionButtons.get(actionButton)?.focus();
    }
    disposeElement(node, index, template) {
        template.disposable.dispose();
    }
    disposeTemplate(templateData) {
        templateData.disposable.dispose();
        templateData.templateDisposable.dispose();
    }
};
ActionButtonRenderer = ActionButtonRenderer_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IContextMenuService),
    __param(2, INotificationService)
], ActionButtonRenderer);
export { ActionButtonRenderer };
class SCMTreeDragAndDrop {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    getDragURI(element) {
        if (isSCMResource(element)) {
            return element.sourceUri.toString();
        }
        return null;
    }
    onDragStart(data, originalEvent) {
        const items = SCMTreeDragAndDrop.getResourcesFromDragAndDropData(data);
        if (originalEvent.dataTransfer && items?.length) {
            this.instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, items, originalEvent));
            const fileResources = items.filter((s) => s.scheme === Schemas.file).map((r) => r.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const element = elements[0];
            if (isSCMResource(element)) {
                return basename(element.sourceUri);
            }
        }
        return String(elements.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return true;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
    static getResourcesFromDragAndDropData(data) {
        const uris = [];
        for (const element of [...(data.context ?? []), ...data.elements]) {
            if (isSCMResource(element)) {
                uris.push(element.sourceUri);
            }
        }
        return uris;
    }
    dispose() { }
}
let InputRenderer = class InputRenderer {
    static { InputRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 26; }
    static { this.TEMPLATE_ID = 'input'; }
    get templateId() {
        return InputRenderer_1.TEMPLATE_ID;
    }
    constructor(outerLayout, overflowWidgetsDomNode, updateHeight, instantiationService) {
        this.outerLayout = outerLayout;
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.updateHeight = updateHeight;
        this.instantiationService = instantiationService;
        this.inputWidgets = new Map();
        this.contentHeights = new WeakMap();
        this.editorSelections = new WeakMap();
    }
    renderTemplate(container) {
        // hack
        ;
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Disable hover for list item
        container.parentElement.parentElement.classList.add('force-no-hover');
        const templateDisposable = new DisposableStore();
        const inputElement = append(container, $('.scm-input'));
        const inputWidget = this.instantiationService.createInstance(SCMInputWidget, inputElement, this.overflowWidgetsDomNode);
        templateDisposable.add(inputWidget);
        return {
            inputWidget,
            inputWidgetHeight: InputRenderer_1.DEFAULT_HEIGHT,
            elementDisposables: new DisposableStore(),
            templateDisposable,
        };
    }
    renderElement(node, index, templateData) {
        const input = node.element;
        templateData.inputWidget.input = input;
        // Remember widget
        this.inputWidgets.set(input, templateData.inputWidget);
        templateData.elementDisposables.add({
            dispose: () => this.inputWidgets.delete(input),
        });
        // Widget cursor selections
        const selections = this.editorSelections.get(input);
        if (selections) {
            templateData.inputWidget.selections = selections;
        }
        templateData.elementDisposables.add(toDisposable(() => {
            const selections = templateData.inputWidget.selections;
            if (selections) {
                this.editorSelections.set(input, selections);
            }
        }));
        // Reset widget height so it's recalculated
        templateData.inputWidgetHeight = InputRenderer_1.DEFAULT_HEIGHT;
        // Rerender the element whenever the editor content height changes
        const onDidChangeContentHeight = () => {
            const contentHeight = templateData.inputWidget.getContentHeight();
            this.contentHeights.set(input, contentHeight);
            if (templateData.inputWidgetHeight !== contentHeight) {
                this.updateHeight(input, contentHeight + 10);
                templateData.inputWidgetHeight = contentHeight;
                templateData.inputWidget.layout();
            }
        };
        const startListeningContentHeightChange = () => {
            templateData.elementDisposables.add(templateData.inputWidget.onDidChangeContentHeight(onDidChangeContentHeight));
            onDidChangeContentHeight();
        };
        // Setup height change listener on next tick
        disposableTimeout(startListeningContentHeightChange, 0, templateData.elementDisposables);
        // Layout the editor whenever the outer layout happens
        const layoutEditor = () => templateData.inputWidget.layout();
        templateData.elementDisposables.add(this.outerLayout.onDidChange(layoutEditor));
        layoutEditor();
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    getHeight(input) {
        return (this.contentHeights.get(input) ?? InputRenderer_1.DEFAULT_HEIGHT) + 10;
    }
    getRenderedInputWidget(input) {
        return this.inputWidgets.get(input);
    }
    getFocusedInput() {
        for (const [input, inputWidget] of this.inputWidgets) {
            if (inputWidget.hasFocus()) {
                return input;
            }
        }
        return undefined;
    }
    clearValidation() {
        for (const [, inputWidget] of this.inputWidgets) {
            inputWidget.clearValidation();
        }
    }
};
InputRenderer = InputRenderer_1 = __decorate([
    __param(3, IInstantiationService)
], InputRenderer);
let ResourceGroupRenderer = class ResourceGroupRenderer {
    static { ResourceGroupRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource group'; }
    get templateId() {
        return ResourceGroupRenderer_1.TEMPLATE_ID;
    }
    constructor(actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, menuService, scmViewService, telemetryService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        ;
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        const element = append(container, $('.resource-group'));
        const name = append(element, $('.name'));
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner,
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(element, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const disposables = combinedDisposable(actionBar, count);
        return { name, count, actionBar, elementDisposables: new DisposableStore(), disposables };
    }
    renderElement(node, index, template) {
        const group = node.element;
        template.name.textContent = group.label;
        template.count.setCount(group.resources.length);
        const menus = this.scmViewService.menus.getRepositoryMenus(group.provider);
        template.elementDisposables.add(connectPrimaryMenu(menus.getResourceGroupMenu(group), (primary) => {
            template.actionBar.setActions(primary);
        }, 'inline'));
        template.actionBar.context = group;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
};
ResourceGroupRenderer = ResourceGroupRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, IMenuService),
    __param(7, ISCMViewService),
    __param(8, ITelemetryService)
], ResourceGroupRenderer);
class RepositoryPaneActionRunner extends ActionRunner {
    constructor(getSelectedResources) {
        super();
        this.getSelectedResources = getSelectedResources;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const isContextResourceGroup = isSCMResourceGroup(context);
        const selection = this.getSelectedResources().filter((r) => isSCMResourceGroup(r) === isContextResourceGroup);
        const contextIsSelected = selection.some((s) => s === context);
        const actualContext = contextIsSelected ? selection : [context];
        const args = actualContext
            .map((e) => (ResourceTree.isResourceNode(e) ? ResourceTree.collect(e) : [e]))
            .flat();
        await action.run(...args);
    }
}
let ResourceRenderer = class ResourceRenderer {
    static { ResourceRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource'; }
    get templateId() {
        return ResourceRenderer_1.TEMPLATE_ID;
    }
    constructor(viewMode, labels, actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, labelService, menuService, scmViewService, telemetryService, themeService) {
        this.viewMode = viewMode;
        this.labels = labels;
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
        this.themeService = themeService;
        this.disposables = new DisposableStore();
        this.renderedResources = new Map();
        themeService.onDidColorThemeChange(this.onDidColorThemeChange, this, this.disposables);
    }
    renderTemplate(container) {
        const element = append(container, $('.resource'));
        const name = append(element, $('.name'));
        const fileLabel = this.labels.create(name, {
            supportDescriptionHighlights: true,
            supportHighlights: true,
        });
        const actionsContainer = append(fileLabel.element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner,
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const decorationIcon = append(element, $('.decoration-icon'));
        const actionBarMenuListener = new MutableDisposable();
        const disposables = combinedDisposable(actionBar, fileLabel, actionBarMenuListener);
        return {
            element,
            name,
            fileLabel,
            decorationIcon,
            actionBar,
            actionBarMenu: undefined,
            actionBarMenuListener,
            elementDisposables: new DisposableStore(),
            disposables,
        };
    }
    renderElement(node, index, template) {
        const resourceOrFolder = node.element;
        const iconResource = ResourceTree.isResourceNode(resourceOrFolder)
            ? resourceOrFolder.element
            : resourceOrFolder;
        const uri = ResourceTree.isResourceNode(resourceOrFolder)
            ? resourceOrFolder.uri
            : resourceOrFolder.sourceUri;
        const fileKind = ResourceTree.isResourceNode(resourceOrFolder) ? FileKind.FOLDER : FileKind.FILE;
        const tooltip = (!ResourceTree.isResourceNode(resourceOrFolder) && resourceOrFolder.decorations.tooltip) || '';
        const hidePath = this.viewMode() === "tree" /* ViewMode.Tree */;
        let matches;
        let descriptionMatches;
        let strikethrough;
        if (ResourceTree.isResourceNode(resourceOrFolder)) {
            if (resourceOrFolder.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.element.resourceGroup.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder.element));
                template.element.classList.toggle('faded', resourceOrFolder.element.decorations.faded);
                strikethrough = resourceOrFolder.element.decorations.strikeThrough;
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.context.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceFolderMenu(resourceOrFolder.context));
                matches = createMatches(node.filterData);
                template.element.classList.remove('faded');
            }
        }
        else {
            const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.resourceGroup.provider);
            this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder));
            [matches, descriptionMatches] = processResourceFilterData(uri, node.filterData);
            template.element.classList.toggle('faded', resourceOrFolder.decorations.faded);
            strikethrough = resourceOrFolder.decorations.strikeThrough;
        }
        const renderedData = {
            tooltip,
            uri,
            fileLabelOptions: { hidePath, fileKind, matches, descriptionMatches, strikethrough },
            iconResource,
        };
        this.renderIcon(template, renderedData);
        this.renderedResources.set(template, renderedData);
        template.elementDisposables.add(toDisposable(() => this.renderedResources.delete(template)));
        template.element.setAttribute('data-tooltip', tooltip);
    }
    disposeElement(resource, index, template) {
        template.elementDisposables.clear();
    }
    renderCompressedElements(node, index, template, height) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map((e) => e.name);
        const fileKind = FileKind.FOLDER;
        const matches = createMatches(node.filterData);
        template.fileLabel.setResource({ resource: folder.uri, name: label }, {
            fileDecorations: { colors: false, badges: true },
            fileKind,
            matches,
            separator: this.labelService.getSeparator(folder.uri.scheme),
        });
        const menus = this.scmViewService.menus.getRepositoryMenus(folder.context.provider);
        this._renderActionBar(template, folder, menus.getResourceFolderMenu(folder.context));
        template.name.classList.remove('strike-through');
        template.element.classList.remove('faded');
        template.decorationIcon.style.display = 'none';
        template.decorationIcon.style.backgroundImage = '';
        template.element.setAttribute('data-tooltip', '');
    }
    disposeCompressedElements(node, index, template, height) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
    _renderActionBar(template, resourceOrFolder, menu) {
        if (!template.actionBarMenu || template.actionBarMenu !== menu) {
            template.actionBarMenu = menu;
            template.actionBarMenuListener.value = connectPrimaryMenu(menu, (primary) => {
                template.actionBar.setActions(primary);
            }, 'inline');
        }
        template.actionBar.context = resourceOrFolder;
    }
    onDidColorThemeChange() {
        for (const [template, data] of this.renderedResources) {
            this.renderIcon(template, data);
        }
    }
    renderIcon(template, data) {
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT
            ? data.iconResource?.decorations.icon
            : data.iconResource?.decorations.iconDark;
        template.fileLabel.setFile(data.uri, {
            ...data.fileLabelOptions,
            fileDecorations: { colors: false, badges: !icon },
        });
        if (icon) {
            if (ThemeIcon.isThemeIcon(icon)) {
                template.decorationIcon.className = `decoration-icon ${ThemeIcon.asClassName(icon)}`;
                if (icon.color) {
                    template.decorationIcon.style.color = theme.getColor(icon.color.id)?.toString() ?? '';
                }
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = '';
            }
            else {
                template.decorationIcon.className = 'decoration-icon';
                template.decorationIcon.style.color = '';
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = asCSSUrl(icon);
            }
            template.decorationIcon.title = data.tooltip;
        }
        else {
            template.decorationIcon.className = 'decoration-icon';
            template.decorationIcon.style.color = '';
            template.decorationIcon.style.display = 'none';
            template.decorationIcon.style.backgroundImage = '';
            template.decorationIcon.title = '';
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
ResourceRenderer = ResourceRenderer_1 = __decorate([
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, ILabelService),
    __param(9, IMenuService),
    __param(10, ISCMViewService),
    __param(11, ITelemetryService),
    __param(12, IThemeService)
], ResourceRenderer);
class ListDelegate {
    constructor(inputRenderer) {
        this.inputRenderer = inputRenderer;
    }
    getHeight(element) {
        if (isSCMInput(element)) {
            return this.inputRenderer.getHeight(element);
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.DEFAULT_HEIGHT + 8;
        }
        else {
            return 22;
        }
    }
    getTemplateId(element) {
        if (isSCMRepository(element)) {
            return RepositoryRenderer.TEMPLATE_ID;
        }
        else if (isSCMInput(element)) {
            return InputRenderer.TEMPLATE_ID;
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.TEMPLATE_ID;
        }
        else if (isSCMResourceGroup(element)) {
            return ResourceGroupRenderer.TEMPLATE_ID;
        }
        else if (isSCMResource(element) || isSCMResourceNode(element)) {
            return ResourceRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Unknown element');
        }
    }
}
class SCMTreeCompressionDelegate {
    isIncompressible(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.childrenCount === 0 || !element.parent || !element.parent.parent;
        }
        return true;
    }
}
class SCMTreeFilter {
    filter(element) {
        if (isSCMResourceGroup(element)) {
            return element.resources.length > 0 || !element.hideWhenEmpty;
        }
        else {
            return true;
        }
    }
}
export class SCMTreeSorter {
    constructor(viewMode, viewSortKey) {
        this.viewMode = viewMode;
        this.viewSortKey = viewSortKey;
    }
    compare(one, other) {
        if (isSCMRepository(one)) {
            if (!isSCMRepository(other)) {
                throw new Error('Invalid comparison');
            }
            return 0;
        }
        if (isSCMInput(one)) {
            return -1;
        }
        else if (isSCMInput(other)) {
            return 1;
        }
        if (isSCMActionButton(one)) {
            return -1;
        }
        else if (isSCMActionButton(other)) {
            return 1;
        }
        if (isSCMResourceGroup(one)) {
            return isSCMResourceGroup(other) ? 0 : -1;
        }
        // Resource (List)
        if (this.viewMode() === "list" /* ViewMode.List */) {
            // FileName
            if (this.viewSortKey() === "name" /* ViewSortKey.Name */) {
                const oneName = basename(one.sourceUri);
                const otherName = basename(other.sourceUri);
                return compareFileNames(oneName, otherName);
            }
            // Status
            if (this.viewSortKey() === "status" /* ViewSortKey.Status */) {
                const oneTooltip = one.decorations.tooltip ?? '';
                const otherTooltip = other.decorations.tooltip ?? '';
                if (oneTooltip !== otherTooltip) {
                    return compare(oneTooltip, otherTooltip);
                }
            }
            // Path (default)
            const onePath = one.sourceUri.fsPath;
            const otherPath = other.sourceUri.fsPath;
            return comparePaths(onePath, otherPath);
        }
        // Resource (Tree)
        const oneIsDirectory = ResourceTree.isResourceNode(one);
        const otherIsDirectory = ResourceTree.isResourceNode(other);
        if (oneIsDirectory !== otherIsDirectory) {
            return oneIsDirectory ? -1 : 1;
        }
        const oneName = ResourceTree.isResourceNode(one)
            ? one.name
            : basename(one.sourceUri);
        const otherName = ResourceTree.isResourceNode(other)
            ? other.name
            : basename(other.sourceUri);
        return compareFileNames(oneName, otherName);
    }
}
let SCMTreeKeyboardNavigationLabelProvider = class SCMTreeKeyboardNavigationLabelProvider {
    constructor(viewMode, labelService) {
        this.viewMode = viewMode;
        this.labelService = labelService;
    }
    getKeyboardNavigationLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.name;
        }
        else if (isSCMRepository(element) || isSCMInput(element) || isSCMActionButton(element)) {
            return undefined;
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // In List mode match using the file name and the path.
                // Since we want to match both on the file name and the
                // full path we return an array of labels. A match in the
                // file name takes precedence over a match in the path.
                const fileName = basename(element.sourceUri);
                const filePath = this.labelService.getUriLabel(element.sourceUri, { relative: true });
                return [fileName, filePath];
            }
            else {
                // In Tree mode only match using the file name
                return basename(element.sourceUri);
            }
        }
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        const folders = elements;
        return folders.map((e) => e.name).join('/');
    }
};
SCMTreeKeyboardNavigationLabelProvider = __decorate([
    __param(1, ILabelService)
], SCMTreeKeyboardNavigationLabelProvider);
export { SCMTreeKeyboardNavigationLabelProvider };
function getSCMResourceId(element) {
    if (isSCMRepository(element)) {
        const provider = element.provider;
        return `repo:${provider.id}`;
    }
    else if (isSCMInput(element)) {
        const provider = element.repository.provider;
        return `input:${provider.id}`;
    }
    else if (isSCMActionButton(element)) {
        const provider = element.repository.provider;
        return `actionButton:${provider.id}`;
    }
    else if (isSCMResourceGroup(element)) {
        const provider = element.provider;
        return `resourceGroup:${provider.id}/${element.id}`;
    }
    else if (isSCMResource(element)) {
        const group = element.resourceGroup;
        const provider = group.provider;
        return `resource:${provider.id}/${group.id}/${element.sourceUri.toString()}`;
    }
    else if (isSCMResourceNode(element)) {
        const group = element.context;
        return `folder:${group.provider.id}/${group.id}/$FOLDER/${element.uri.toString()}`;
    }
    else {
        throw new Error('Invalid tree element');
    }
}
class SCMResourceIdentityProvider {
    getId(element) {
        return getSCMResourceId(element);
    }
}
let SCMAccessibilityProvider = class SCMAccessibilityProvider {
    constructor(accessibilityService, configurationService, keybindingService, labelService) {
        this.accessibilityService = accessibilityService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('scm', 'Source Control Management');
    }
    getAriaLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return (this.labelService.getUriLabel(element.uri, { relative: true, noPrefix: true }) ||
                element.name);
        }
        else if (isSCMRepository(element)) {
            return `${element.provider.name} ${element.provider.label}`;
        }
        else if (isSCMInput(element)) {
            const verbosity = this.configurationService.getValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */) === true;
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return localize('scmInput', 'Source Control Input');
            }
            const kbLabel = this.keybindingService
                .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                ?.getLabel();
            return kbLabel
                ? localize('scmInputRow.accessibilityHelp', 'Source Control Input, Use {0} to open Source Control Accessibility Help.', kbLabel)
                : localize('scmInputRow.accessibilityHelpNoKb', 'Source Control Input, Run the Open Accessibility Help command for more information.');
        }
        else if (isSCMActionButton(element)) {
            return element.button?.command.title ?? '';
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            const result = [];
            result.push(basename(element.sourceUri));
            if (element.decorations.tooltip) {
                result.push(element.decorations.tooltip);
            }
            const path = this.labelService.getUriLabel(dirname(element.sourceUri), {
                relative: true,
                noPrefix: true,
            });
            if (path) {
                result.push(path);
            }
            return result.join(', ');
        }
    }
};
SCMAccessibilityProvider = __decorate([
    __param(0, IAccessibilityService),
    __param(1, IConfigurationService),
    __param(2, IKeybindingService),
    __param(3, ILabelService)
], SCMAccessibilityProvider);
export { SCMAccessibilityProvider };
var ViewMode;
(function (ViewMode) {
    ViewMode["List"] = "list";
    ViewMode["Tree"] = "tree";
})(ViewMode || (ViewMode = {}));
var ViewSortKey;
(function (ViewSortKey) {
    ViewSortKey["Path"] = "path";
    ViewSortKey["Name"] = "name";
    ViewSortKey["Status"] = "status";
})(ViewSortKey || (ViewSortKey = {}));
const Menus = {
    ViewSort: new MenuId('SCMViewSort'),
    Repositories: new MenuId('SCMRepositories'),
    ChangesSettings: new MenuId('SCMChangesSettings'),
};
export const ContextKeys = {
    SCMViewMode: new RawContextKey('scmViewMode', "list" /* ViewMode.List */),
    SCMViewSortKey: new RawContextKey('scmViewSortKey', "path" /* ViewSortKey.Path */),
    SCMViewAreAllRepositoriesCollapsed: new RawContextKey('scmViewAreAllRepositoriesCollapsed', false),
    SCMViewIsAnyRepositoryCollapsible: new RawContextKey('scmViewIsAnyRepositoryCollapsible', false),
    SCMProvider: new RawContextKey('scmProvider', undefined),
    SCMProviderRootUri: new RawContextKey('scmProviderRootUri', undefined),
    SCMProviderHasRootUri: new RawContextKey('scmProviderHasRootUri', undefined),
    SCMHistoryItemCount: new RawContextKey('scmHistoryItemCount', 0),
    SCMCurrentHistoryItemRefHasRemote: new RawContextKey('scmCurrentHistoryItemRefHasRemote', false),
    SCMCurrentHistoryItemRefInFilter: new RawContextKey('scmCurrentHistoryItemRefInFilter', false),
    RepositoryCount: new RawContextKey('scmRepositoryCount', 0),
    RepositoryVisibilityCount: new RawContextKey('scmRepositoryVisibleCount', 0),
    RepositoryVisibility(repository) {
        return new RawContextKey(`scmRepositoryVisible:${repository.provider.id}`, false);
    },
};
MenuRegistry.appendMenuItem(MenuId.SCMTitle, {
    title: localize('sortAction', 'View & Sort'),
    submenu: Menus.ViewSort,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0)),
    group: '0_view&sort',
    order: 1,
});
MenuRegistry.appendMenuItem(Menus.ViewSort, {
    title: localize('repositories', 'Repositories'),
    submenu: Menus.Repositories,
    when: ContextKeyExpr.greater(ContextKeys.RepositoryCount.key, 1),
    group: '0_repositories',
});
class RepositoryVisibilityAction extends Action2 {
    constructor(repository) {
        super({
            id: `workbench.scm.action.toggleRepositoryVisibility.${repository.provider.id}`,
            title: repository.provider.name,
            f1: false,
            precondition: ContextKeyExpr.or(ContextKeys.RepositoryVisibilityCount.notEqualsTo(1), ContextKeys.RepositoryVisibility(repository).isEqualTo(false)),
            toggled: ContextKeys.RepositoryVisibility(repository).isEqualTo(true),
            menu: { id: Menus.Repositories, group: '0_repositories' },
        });
        this.repository = repository;
    }
    run(accessor) {
        const scmViewService = accessor.get(ISCMViewService);
        scmViewService.toggleVisibility(this.repository);
    }
}
let RepositoryVisibilityActionController = class RepositoryVisibilityActionController {
    constructor(contextKeyService, scmViewService, scmService) {
        this.contextKeyService = contextKeyService;
        this.scmViewService = scmViewService;
        this.items = new Map();
        this.disposables = new DisposableStore();
        this.repositoryCountContextKey = ContextKeys.RepositoryCount.bindTo(contextKeyService);
        this.repositoryVisibilityCountContextKey =
            ContextKeys.RepositoryVisibilityCount.bindTo(contextKeyService);
        scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.disposables);
        scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposables);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        for (const repository of scmService.repositories) {
            this.onDidAddRepository(repository);
        }
    }
    onDidAddRepository(repository) {
        const action = registerAction2(class extends RepositoryVisibilityAction {
            constructor() {
                super(repository);
            }
        });
        const contextKey = ContextKeys.RepositoryVisibility(repository).bindTo(this.contextKeyService);
        contextKey.set(this.scmViewService.isVisible(repository));
        this.items.set(repository, {
            contextKey,
            dispose() {
                contextKey.reset();
                action.dispose();
            },
        });
        this.updateRepositoryContextKeys();
    }
    onDidRemoveRepository(repository) {
        this.items.get(repository)?.dispose();
        this.items.delete(repository);
        this.updateRepositoryContextKeys();
    }
    onDidChangeVisibleRepositories() {
        let count = 0;
        for (const [repository, item] of this.items) {
            const isVisible = this.scmViewService.isVisible(repository);
            item.contextKey.set(isVisible);
            if (isVisible) {
                count++;
            }
        }
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(count);
    }
    updateRepositoryContextKeys() {
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(Iterable.reduce(this.items.keys(), (r, repository) => r + (this.scmViewService.isVisible(repository) ? 1 : 0), 0));
    }
    dispose() {
        this.disposables.dispose();
        dispose(this.items.values());
        this.items.clear();
    }
};
RepositoryVisibilityActionController = __decorate([
    __param(0, IContextKeyService),
    __param(1, ISCMViewService),
    __param(2, ISCMService)
], RepositoryVisibilityActionController);
class SetListViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setListViewMode', menu = {}) {
        super({
            id,
            title: localize('setListViewMode', 'View as List'),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listTree,
            toggled: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu },
        });
    }
    async runInView(_, view) {
        view.viewMode = "list" /* ViewMode.List */;
    }
}
class SetListViewModeNavigationAction extends SetListViewModeAction {
    constructor() {
        super('workbench.scm.action.setListViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */)),
            group: 'navigation',
            order: -1000,
        });
    }
}
class SetTreeViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setTreeViewMode', menu = {}) {
        super({
            id,
            title: localize('setTreeViewMode', 'View as Tree'),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listFlat,
            toggled: ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu },
        });
    }
    async runInView(_, view) {
        view.viewMode = "tree" /* ViewMode.Tree */;
    }
}
class SetTreeViewModeNavigationAction extends SetTreeViewModeAction {
    constructor() {
        super('workbench.scm.action.setTreeViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */)),
            group: 'navigation',
            order: -1000,
        });
    }
}
registerAction2(SetListViewModeAction);
registerAction2(SetTreeViewModeAction);
registerAction2(SetListViewModeNavigationAction);
registerAction2(SetTreeViewModeNavigationAction);
class RepositorySortAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.repositories.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: RepositoryContextKeys.RepositorySortKey.isEqualTo(sortKey),
            menu: [
                {
                    id: Menus.Repositories,
                    group: '1_sort',
                },
                {
                    id: MenuId.SCMSourceControlTitle,
                    group: '1_sort',
                },
            ],
        });
        this.sortKey = sortKey;
    }
    runInView(accessor) {
        accessor.get(ISCMViewService).toggleSortKey(this.sortKey);
    }
}
class RepositorySortByDiscoveryTimeAction extends RepositorySortAction {
    constructor() {
        super("discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */, localize('repositorySortByDiscoveryTime', 'Sort by Discovery Time'));
    }
}
class RepositorySortByNameAction extends RepositorySortAction {
    constructor() {
        super("name" /* ISCMRepositorySortKey.Name */, localize('repositorySortByName', 'Sort by Name'));
    }
}
class RepositorySortByPathAction extends RepositorySortAction {
    constructor() {
        super("path" /* ISCMRepositorySortKey.Path */, localize('repositorySortByPath', 'Sort by Path'));
    }
}
registerAction2(RepositorySortByDiscoveryTimeAction);
registerAction2(RepositorySortByNameAction);
registerAction2(RepositorySortByPathAction);
class SetSortKeyAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: ContextKeys.SCMViewSortKey.isEqualTo(sortKey),
            precondition: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '2_sort' },
        });
        this.sortKey = sortKey;
    }
    async runInView(_, view) {
        view.viewSortKey = this.sortKey;
    }
}
class SetSortByNameAction extends SetSortKeyAction {
    constructor() {
        super("name" /* ViewSortKey.Name */, localize('sortChangesByName', 'Sort Changes by Name'));
    }
}
class SetSortByPathAction extends SetSortKeyAction {
    constructor() {
        super("path" /* ViewSortKey.Path */, localize('sortChangesByPath', 'Sort Changes by Path'));
    }
}
class SetSortByStatusAction extends SetSortKeyAction {
    constructor() {
        super("status" /* ViewSortKey.Status */, localize('sortChangesByStatus', 'Sort Changes by Status'));
    }
}
registerAction2(SetSortByNameAction);
registerAction2(SetSortByPathAction);
registerAction2(SetSortByStatusAction);
class CollapseAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.collapseAllRepositories`,
            title: localize('collapse all', 'Collapse All Repositories'),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(false)),
            },
        });
    }
    async runInView(_, view) {
        view.collapseAllRepositories();
    }
}
class ExpandAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.expandAllRepositories`,
            title: localize('expand all', 'Expand All Repositories'),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(true)),
            },
        });
    }
    async runInView(_, view) {
        view.expandAllRepositories();
    }
}
registerAction2(CollapseAllRepositoriesAction);
registerAction2(ExpandAllRepositoriesAction);
var SCMInputWidgetCommandId;
(function (SCMInputWidgetCommandId) {
    SCMInputWidgetCommandId["CancelAction"] = "scm.input.cancelAction";
})(SCMInputWidgetCommandId || (SCMInputWidgetCommandId = {}));
var SCMInputWidgetStorageKey;
(function (SCMInputWidgetStorageKey) {
    SCMInputWidgetStorageKey["LastActionId"] = "scm.input.lastActionId";
})(SCMInputWidgetStorageKey || (SCMInputWidgetStorageKey = {}));
let SCMInputWidgetActionRunner = class SCMInputWidgetActionRunner extends ActionRunner {
    get runningActions() {
        return this._runningActions;
    }
    constructor(input, storageService) {
        super();
        this.input = input;
        this.storageService = storageService;
        this._runningActions = new Set();
    }
    async runAction(action) {
        try {
            // Cancel previous action
            if (this.runningActions.size !== 0) {
                this._cts?.cancel();
                if (action.id === "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */) {
                    return;
                }
            }
            // Create action context
            const context = [];
            for (const group of this.input.repository.provider.groups) {
                context.push({
                    resourceGroupId: group.id,
                    resources: [...group.resources.map((r) => r.sourceUri)],
                });
            }
            // Run action
            this._runningActions.add(action);
            this._cts = new CancellationTokenSource();
            await action.run(...[this.input.repository.provider.rootUri, context, this._cts.token]);
        }
        finally {
            this._runningActions.delete(action);
            // Save last action
            if (this._runningActions.size === 0) {
                this.storageService.store("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, action.id, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }
    }
};
SCMInputWidgetActionRunner = __decorate([
    __param(1, IStorageService)
], SCMInputWidgetActionRunner);
let SCMInputWidgetToolbar = class SCMInputWidgetToolbar extends WorkbenchToolBar {
    get dropdownActions() {
        return this._dropdownActions;
    }
    get dropdownAction() {
        return this._dropdownAction;
    }
    constructor(container, options, menuService, contextKeyService, contextMenuService, commandService, keybindingService, storageService, telemetryService) {
        super(container, { resetMenu: MenuId.SCMInputBox, ...options }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this._dropdownActions = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables = this._register(new MutableDisposable());
        this._dropdownAction = new Action('scmInputMoreActions', localize('scmInputMoreActions', 'More Actions...'), 'codicon-chevron-down');
        this._cancelAction = new MenuItemAction({
            id: "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */,
            title: localize('scmInputCancelAction', 'Cancel'),
            icon: Codicon.stopCircle,
        }, undefined, undefined, undefined, undefined, contextKeyService, commandService);
    }
    setInput(input) {
        this._disposables.value = new DisposableStore();
        const contextKeyService = this.contextKeyService.createOverlay([
            ['scmProvider', input.repository.provider.contextValue],
            ['scmProviderRootUri', input.repository.provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!input.repository.provider.rootUri],
        ]);
        const menu = this._disposables.value.add(this.menuService.createMenu(MenuId.SCMInputBox, contextKeyService, {
            emitEventsForSubmenuChanges: true,
        }));
        const isEnabled = () => {
            return input.repository.provider.groups.some((g) => g.resources.length > 0);
        };
        const updateToolbar = () => {
            const actions = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            for (const action of actions) {
                action.enabled = isEnabled();
            }
            this._dropdownAction.enabled = isEnabled();
            let primaryAction = undefined;
            if (actions.length === 1) {
                primaryAction = actions[0];
            }
            else if (actions.length > 1) {
                const lastActionId = this.storageService.get("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, 0 /* StorageScope.PROFILE */, '');
                primaryAction = actions.find((a) => a.id === lastActionId) ?? actions[0];
            }
            this._dropdownActions = actions.length === 1 ? [] : actions;
            super.setActions(primaryAction ? [primaryAction] : [], []);
            this._onDidChange.fire();
        };
        this._disposables.value.add(menu.onDidChange(() => updateToolbar()));
        this._disposables.value.add(input.repository.provider.onDidChangeResources(() => updateToolbar()));
        this._disposables.value.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, "scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, this._disposables.value)(() => updateToolbar()));
        this.actionRunner = this._disposables.value.add(new SCMInputWidgetActionRunner(input, this.storageService));
        this._disposables.value.add(this.actionRunner.onWillRun((e) => {
            if (this.actionRunner.runningActions.size === 0) {
                super.setActions([this._cancelAction], []);
                this._onDidChange.fire();
            }
        }));
        this._disposables.value.add(this.actionRunner.onDidRun((e) => {
            if (this.actionRunner.runningActions.size === 0) {
                updateToolbar();
            }
        }));
        updateToolbar();
    }
};
SCMInputWidgetToolbar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, ICommandService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, ITelemetryService)
], SCMInputWidgetToolbar);
class SCMInputWidgetEditorOptions {
    constructor(overflowWidgetsDomNode, configurationService) {
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.configurationService = configurationService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.defaultInputFontFamily = DEFAULT_FONT_FAMILY;
        this._disposables = new DisposableStore();
        const onDidChangeConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, (e) => {
            return (e.affectsConfiguration('editor.accessibilitySupport') ||
                e.affectsConfiguration('editor.cursorBlinking') ||
                e.affectsConfiguration('editor.cursorStyle') ||
                e.affectsConfiguration('editor.cursorWidth') ||
                e.affectsConfiguration('editor.emptySelectionClipboard') ||
                e.affectsConfiguration('editor.fontFamily') ||
                e.affectsConfiguration('editor.rulers') ||
                e.affectsConfiguration('editor.wordWrap') ||
                e.affectsConfiguration('scm.inputFontFamily') ||
                e.affectsConfiguration('scm.inputFontSize'));
        }, this._disposables);
        this._disposables.add(onDidChangeConfiguration(() => this._onDidChange.fire()));
    }
    getEditorConstructionOptions() {
        return {
            ...getSimpleEditorOptions(this.configurationService),
            ...this.getEditorOptions(),
            dragAndDrop: true,
            dropIntoEditor: { enabled: true },
            formatOnType: true,
            lineDecorationsWidth: 6,
            overflowWidgetsDomNode: this.overflowWidgetsDomNode,
            padding: { top: 2, bottom: 2 },
            quickSuggestions: false,
            renderWhitespace: 'none',
            scrollbar: {
                alwaysConsumeMouseWheel: false,
                vertical: 'hidden',
            },
            wrappingIndent: 'none',
            wrappingStrategy: 'advanced',
        };
    }
    getEditorOptions() {
        const fontFamily = this._getEditorFontFamily();
        const fontSize = this._getEditorFontSize();
        const lineHeight = this._getEditorLineHeight(fontSize);
        const accessibilitySupport = this.configurationService.getValue('editor.accessibilitySupport');
        const cursorBlinking = this.configurationService.getValue('editor.cursorBlinking');
        const cursorStyle = this.configurationService.getValue('editor.cursorStyle');
        const cursorWidth = this.configurationService.getValue('editor.cursorWidth') ?? 1;
        const emptySelectionClipboard = this.configurationService.getValue('editor.emptySelectionClipboard') === true;
        return {
            ...this._getEditorLanguageConfiguration(),
            accessibilitySupport,
            cursorBlinking,
            cursorStyle,
            cursorWidth,
            fontFamily,
            fontSize,
            lineHeight,
            emptySelectionClipboard,
        };
    }
    _getEditorFontFamily() {
        const inputFontFamily = this.configurationService.getValue('scm.inputFontFamily').trim();
        if (inputFontFamily.toLowerCase() === 'editor') {
            return this.configurationService.getValue('editor.fontFamily').trim();
        }
        if (inputFontFamily.length !== 0 && inputFontFamily.toLowerCase() !== 'default') {
            return inputFontFamily;
        }
        return this.defaultInputFontFamily;
    }
    _getEditorFontSize() {
        return this.configurationService.getValue('scm.inputFontSize');
    }
    _getEditorLanguageConfiguration() {
        // editor.rulers
        const rulersConfig = this.configurationService.inspect('editor.rulers', {
            overrideIdentifier: 'scminput',
        });
        const rulers = rulersConfig.overrideIdentifiers?.includes('scminput')
            ? EditorOptions.rulers.validate(rulersConfig.value)
            : [];
        // editor.wordWrap
        const wordWrapConfig = this.configurationService.inspect('editor.wordWrap', {
            overrideIdentifier: 'scminput',
        });
        const wordWrap = wordWrapConfig.overrideIdentifiers?.includes('scminput')
            ? EditorOptions.wordWrap.validate(wordWrapConfig.value)
            : 'on';
        return { rulers, wordWrap };
    }
    _getEditorLineHeight(fontSize) {
        return Math.round(fontSize * 1.5);
    }
    dispose() {
        this._disposables.dispose();
    }
}
let SCMInputWidget = class SCMInputWidget {
    static { SCMInputWidget_1 = this; }
    static { this.ValidationTimeouts = {
        [2 /* InputValidationType.Information */]: 5000,
        [1 /* InputValidationType.Warning */]: 8000,
        [0 /* InputValidationType.Error */]: 10000,
    }; }
    get input() {
        return this.model?.input;
    }
    set input(input) {
        if (input === this.input) {
            return;
        }
        this.clearValidation();
        this.element.classList.remove('synthetic-focus');
        this.repositoryDisposables.clear();
        this.repositoryIdContextKey.set(input?.repository.id);
        if (!input) {
            this.inputEditor.setModel(undefined);
            this.model = undefined;
            return;
        }
        const textModel = input.repository.provider.inputBoxTextModel;
        this.inputEditor.setModel(textModel);
        if (this.configurationService.getValue('editor.wordBasedSuggestions', {
            resource: textModel.uri,
        }) !== 'off') {
            this.configurationService.updateValue('editor.wordBasedSuggestions', 'off', { resource: textModel.uri }, 8 /* ConfigurationTarget.MEMORY */);
        }
        // Validation
        const validationDelayer = new ThrottledDelayer(200);
        const validate = async () => {
            const position = this.inputEditor.getSelection()?.getStartPosition();
            const offset = position && textModel.getOffsetAt(position);
            const value = textModel.getValue();
            this.setValidation(await input.validateInput(value, offset || 0));
        };
        const triggerValidation = () => validationDelayer.trigger(validate);
        this.repositoryDisposables.add(validationDelayer);
        this.repositoryDisposables.add(this.inputEditor.onDidChangeCursorPosition(triggerValidation));
        // Adaptive indentation rules
        const opts = this.modelService.getCreationOptions(textModel.getLanguageId(), textModel.uri, textModel.isForSimpleWidget);
        const onEnter = Event.filter(this.inputEditor.onKeyDown, (e) => e.keyCode === 3 /* KeyCode.Enter */, this.repositoryDisposables);
        this.repositoryDisposables.add(onEnter(() => textModel.detectIndentation(opts.insertSpaces, opts.tabSize)));
        // Keep model in sync with API
        textModel.setValue(input.value);
        this.repositoryDisposables.add(input.onDidChange(({ value, reason }) => {
            const currentValue = textModel.getValue();
            if (value === currentValue) {
                // circuit breaker
                return;
            }
            textModel.pushStackElement();
            textModel.pushEditOperations(null, [EditOperation.replaceMove(textModel.getFullModelRange(), value)], () => []);
            const position = reason === SCMInputChangeReason.HistoryPrevious
                ? textModel.getFullModelRange().getStartPosition()
                : textModel.getFullModelRange().getEndPosition();
            this.inputEditor.setPosition(position);
            this.inputEditor.revealPositionInCenterIfOutsideViewport(position);
        }));
        this.repositoryDisposables.add(input.onDidChangeFocus(() => this.focus()));
        this.repositoryDisposables.add(input.onDidChangeValidationMessage((e) => this.setValidation(e, { focus: true, timeout: true })));
        this.repositoryDisposables.add(input.onDidChangeValidateInput((e) => triggerValidation()));
        // Keep API in sync with model and validate
        this.repositoryDisposables.add(textModel.onDidChangeContent(() => {
            input.setValue(textModel.getValue(), true);
            triggerValidation();
        }));
        // Aria label & placeholder text
        const accessibilityVerbosityConfig = observableConfigValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */, true, this.configurationService);
        const getAriaLabel = (placeholder, verbosity) => {
            verbosity = verbosity ?? accessibilityVerbosityConfig.get();
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return placeholder;
            }
            const kbLabel = this.keybindingService
                .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                ?.getLabel();
            return kbLabel
                ? localize('scmInput.accessibilityHelp', '{0}, Use {1} to open Source Control Accessibility Help.', placeholder, kbLabel)
                : localize('scmInput.accessibilityHelpNoKb', '{0}, Run the Open Accessibility Help command for more information.', placeholder);
        };
        const getPlaceholderText = () => {
            const binding = this.keybindingService.lookupKeybinding('scm.acceptInput');
            const label = binding ? binding.getLabel() : platform.isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter';
            return format(input.placeholder, label);
        };
        const updatePlaceholderText = () => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder);
            this.inputEditor.updateOptions({ ariaLabel, placeholder });
        };
        this.repositoryDisposables.add(input.onDidChangePlaceholder(updatePlaceholderText));
        this.repositoryDisposables.add(this.keybindingService.onDidUpdateKeybindings(updatePlaceholderText));
        this.repositoryDisposables.add(runOnChange(accessibilityVerbosityConfig, (verbosity) => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder, verbosity);
            this.inputEditor.updateOptions({ ariaLabel });
        }));
        updatePlaceholderText();
        // Update input template
        let commitTemplate = '';
        this.repositoryDisposables.add(autorun((reader) => {
            if (!input.visible) {
                return;
            }
            const oldCommitTemplate = commitTemplate;
            commitTemplate = input.repository.provider.commitTemplate.read(reader);
            const value = textModel.getValue();
            if (value && value !== oldCommitTemplate) {
                return;
            }
            textModel.setValue(commitTemplate);
        }));
        // Update input enablement
        const updateEnablement = (enabled) => {
            this.inputEditor.updateOptions({ readOnly: !enabled });
        };
        this.repositoryDisposables.add(input.onDidChangeEnablement((enabled) => updateEnablement(enabled)));
        updateEnablement(input.enabled);
        // Toolbar
        this.toolbar.setInput(input);
        // Save model
        this.model = { input, textModel };
    }
    get selections() {
        return this.inputEditor.getSelections();
    }
    set selections(selections) {
        if (selections) {
            this.inputEditor.setSelections(selections);
        }
    }
    setValidation(validation, options) {
        if (this._validationTimer) {
            clearTimeout(this._validationTimer);
            this._validationTimer = 0;
        }
        this.validation = validation;
        this.renderValidation();
        if (options?.focus && !this.hasFocus()) {
            this.focus();
        }
        if (validation && options?.timeout) {
            this._validationTimer = setTimeout(() => this.setValidation(undefined), SCMInputWidget_1.ValidationTimeouts[validation.type]);
        }
    }
    constructor(container, overflowWidgetsDomNode, contextKeyService, modelService, keybindingService, configurationService, instantiationService, scmViewService, contextViewService, openerService, accessibilityService) {
        this.modelService = modelService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.scmViewService = scmViewService;
        this.contextViewService = contextViewService;
        this.openerService = openerService;
        this.accessibilityService = accessibilityService;
        this.disposables = new DisposableStore();
        this.repositoryDisposables = new DisposableStore();
        this.validationHasFocus = false;
        // This is due to "Setup height change listener on next tick" above
        // https://github.com/microsoft/vscode/issues/108067
        this.lastLayoutWasTrash = false;
        this.shouldFocusAfterLayout = false;
        this.element = append(container, $('.scm-editor'));
        this.editorContainer = append(this.element, $('.scm-editor-container'));
        this.toolbarContainer = append(this.element, $('.scm-editor-toolbar'));
        this.contextKeyService = contextKeyService.createScoped(this.element);
        this.repositoryIdContextKey = this.contextKeyService.createKey('scmRepository', undefined);
        this.inputEditorOptions = new SCMInputWidgetEditorOptions(overflowWidgetsDomNode, this.configurationService);
        this.disposables.add(this.inputEditorOptions.onDidChange(this.onDidChangeEditorOptions, this));
        this.disposables.add(this.inputEditorOptions);
        const codeEditorWidgetOptions = {
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                CodeActionController.ID,
                ColorDetector.ID,
                ContextMenuController.ID,
                CopyPasteController.ID,
                DragAndDropController.ID,
                DropIntoEditorController.ID,
                EditorDictation.ID,
                FormatOnType.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                InlineCompletionsController.ID,
                LinkDetector.ID,
                MenuPreventer.ID,
                MessageController.ID,
                PlaceholderTextContribution.ID,
                SelectionClipboardContributionID,
                SnippetController2.ID,
                SuggestController.ID,
            ]),
            isSimpleWidget: true,
        };
        const services = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        const instantiationService2 = instantiationService.createChild(services, this.disposables);
        const editorConstructionOptions = this.inputEditorOptions.getEditorConstructionOptions();
        this.inputEditor = instantiationService2.createInstance(CodeEditorWidget, this.editorContainer, editorConstructionOptions, codeEditorWidgetOptions);
        this.disposables.add(this.inputEditor);
        this.disposables.add(this.inputEditor.onDidFocusEditorText(() => {
            if (this.input?.repository) {
                this.scmViewService.focus(this.input.repository);
            }
            this.element.classList.add('synthetic-focus');
            this.renderValidation();
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorText(() => {
            this.element.classList.remove('synthetic-focus');
            setTimeout(() => {
                if (!this.validation || !this.validationHasFocus) {
                    this.clearValidation();
                }
            }, 0);
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this.inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this.inputEditor)?.clearWidgets();
        }));
        const firstLineKey = this.contextKeyService.createKey('scmInputIsInFirstPosition', false);
        const lastLineKey = this.contextKeyService.createKey('scmInputIsInLastPosition', false);
        this.disposables.add(this.inputEditor.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this.inputEditor._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            firstLineKey.set(viewPosition.lineNumber === 1 && viewPosition.column === 1);
            lastLineKey.set(viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol);
        }));
        this.disposables.add(this.inputEditor.onDidScrollChange((e) => {
            this.toolbarContainer.classList.toggle('scroll-decoration', e.scrollTop > 0);
        }));
        Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.showInputActionButton'))(() => this.layout(), this, this.disposables);
        this.onDidChangeContentHeight = Event.signal(Event.filter(this.inputEditor.onDidContentSizeChange, (e) => e.contentHeightChanged, this.disposables));
        // Toolbar
        this.toolbar = instantiationService2.createInstance(SCMInputWidgetToolbar, this.toolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && this.toolbar.dropdownActions.length > 1) {
                    return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, this.toolbar.dropdownAction, this.toolbar.dropdownActions, '', { actionRunner: this.toolbar.actionRunner, hoverDelegate: options.hoverDelegate });
                }
                return createActionViewItem(instantiationService, action, options);
            },
            menuOptions: {
                shouldForwardArgs: true,
            },
        });
        this.disposables.add(this.toolbar.onDidChange(() => this.layout()));
        this.disposables.add(this.toolbar);
    }
    getContentHeight() {
        const lineHeight = this.inputEditor.getOption(68 /* EditorOption.lineHeight */);
        const { top, bottom } = this.inputEditor.getOption(88 /* EditorOption.padding */);
        const inputMinLinesConfig = this.configurationService.getValue('scm.inputMinLineCount');
        const inputMinLines = typeof inputMinLinesConfig === 'number' ? clamp(inputMinLinesConfig, 1, 50) : 1;
        const editorMinHeight = inputMinLines * lineHeight + top + bottom;
        const inputMaxLinesConfig = this.configurationService.getValue('scm.inputMaxLineCount');
        const inputMaxLines = typeof inputMaxLinesConfig === 'number' ? clamp(inputMaxLinesConfig, 1, 50) : 10;
        const editorMaxHeight = inputMaxLines * lineHeight + top + bottom;
        return clamp(this.inputEditor.getContentHeight(), editorMinHeight, editorMaxHeight);
    }
    layout() {
        const editorHeight = this.getContentHeight();
        const toolbarWidth = this.getToolbarWidth();
        const dimension = new Dimension(this.element.clientWidth - toolbarWidth, editorHeight);
        if (dimension.width < 0) {
            this.lastLayoutWasTrash = true;
            return;
        }
        this.lastLayoutWasTrash = false;
        this.inputEditor.layout(dimension);
        this.renderValidation();
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton') === true;
        this.toolbarContainer.classList.toggle('hidden', !showInputActionButton || this.toolbar?.isEmpty() === true);
        if (this.shouldFocusAfterLayout) {
            this.shouldFocusAfterLayout = false;
            this.focus();
        }
    }
    focus() {
        if (this.lastLayoutWasTrash) {
            this.lastLayoutWasTrash = false;
            this.shouldFocusAfterLayout = true;
            return;
        }
        this.inputEditor.focus();
        this.element.classList.add('synthetic-focus');
    }
    hasFocus() {
        return this.inputEditor.hasTextFocus();
    }
    onDidChangeEditorOptions() {
        this.inputEditor.updateOptions(this.inputEditorOptions.getEditorOptions());
    }
    renderValidation() {
        this.clearValidation();
        this.element.classList.toggle('validation-info', this.validation?.type === 2 /* InputValidationType.Information */);
        this.element.classList.toggle('validation-warning', this.validation?.type === 1 /* InputValidationType.Warning */);
        this.element.classList.toggle('validation-error', this.validation?.type === 0 /* InputValidationType.Error */);
        if (!this.validation || !this.inputEditor.hasTextFocus()) {
            return;
        }
        const disposables = new DisposableStore();
        this.validationContextView = this.contextViewService.showContextView({
            getAnchor: () => this.element,
            render: (container) => {
                this.element.style.borderBottomLeftRadius = '0';
                this.element.style.borderBottomRightRadius = '0';
                const validationContainer = append(container, $('.scm-editor-validation-container'));
                validationContainer.classList.toggle('validation-info', this.validation.type === 2 /* InputValidationType.Information */);
                validationContainer.classList.toggle('validation-warning', this.validation.type === 1 /* InputValidationType.Warning */);
                validationContainer.classList.toggle('validation-error', this.validation.type === 0 /* InputValidationType.Error */);
                validationContainer.style.width = `${this.element.clientWidth + 2}px`;
                const element = append(validationContainer, $('.scm-editor-validation'));
                const message = this.validation.message;
                if (typeof message === 'string') {
                    element.textContent = message;
                }
                else {
                    const tracker = trackFocus(element);
                    disposables.add(tracker);
                    disposables.add(tracker.onDidFocus(() => (this.validationHasFocus = true)));
                    disposables.add(tracker.onDidBlur(() => {
                        this.validationHasFocus = false;
                        this.element.style.borderBottomLeftRadius = '2px';
                        this.element.style.borderBottomRightRadius = '2px';
                        this.contextViewService.hideContextView();
                    }));
                    const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
                    const renderedMarkdown = renderer.render(message, {
                        actionHandler: {
                            callback: (link) => {
                                openLinkFromMarkdown(this.openerService, link, message.isTrusted);
                                this.element.style.borderBottomLeftRadius = '2px';
                                this.element.style.borderBottomRightRadius = '2px';
                                this.contextViewService.hideContextView();
                            },
                            disposables: disposables,
                        },
                    });
                    disposables.add(renderedMarkdown);
                    element.appendChild(renderedMarkdown.element);
                }
                const actionsContainer = append(validationContainer, $('.scm-editor-validation-actions'));
                const actionbar = new ActionBar(actionsContainer);
                const action = new Action('scmInputWidget.validationMessage.close', localize('label.close', 'Close'), ThemeIcon.asClassName(Codicon.close), true, () => {
                    this.contextViewService.hideContextView();
                    this.element.style.borderBottomLeftRadius = '2px';
                    this.element.style.borderBottomRightRadius = '2px';
                });
                disposables.add(actionbar);
                actionbar.push(action, { icon: true, label: false });
                return Disposable.None;
            },
            onHide: () => {
                this.validationHasFocus = false;
                this.element.style.borderBottomLeftRadius = '2px';
                this.element.style.borderBottomRightRadius = '2px';
                disposables.dispose();
            },
            anchorAlignment: 0 /* AnchorAlignment.LEFT */,
        });
    }
    getToolbarWidth() {
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton');
        if (!this.toolbar || !showInputActionButton || this.toolbar?.isEmpty() === true) {
            return 0;
        }
        return this.toolbar.dropdownActions.length === 0
            ? 26 /* 22px action + 4px margin */
            : 39; /* 35px action + 4px margin */
    }
    clearValidation() {
        this.validationContextView?.close();
        this.validationContextView = undefined;
        this.validationHasFocus = false;
    }
    dispose() {
        this.input = undefined;
        this.repositoryDisposables.dispose();
        this.clearValidation();
        this.disposables.dispose();
    }
};
SCMInputWidget = SCMInputWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IModelService),
    __param(4, IKeybindingService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ISCMViewService),
    __param(8, IContextViewService),
    __param(9, IOpenerService),
    __param(10, IAccessibilityService)
], SCMInputWidget);
let SCMViewPane = class SCMViewPane extends ViewPane {
    get viewMode() {
        return this._viewMode;
    }
    set viewMode(mode) {
        if (this._viewMode === mode) {
            return;
        }
        this._viewMode = mode;
        // Update sort key based on view mode
        this.viewSortKey = this.getViewSortKey();
        this.updateChildren();
        this.onDidActiveEditorChange();
        this._onDidChangeViewMode.fire(mode);
        this.viewModeContextKey.set(mode);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this.storageService.store(`scm.viewMode`, mode, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    get viewSortKey() {
        return this._viewSortKey;
    }
    set viewSortKey(sortKey) {
        if (this._viewSortKey === sortKey) {
            return;
        }
        this._viewSortKey = sortKey;
        this.updateChildren();
        this.viewSortKeyContextKey.set(sortKey);
        this._onDidChangeViewSortKey.fire(sortKey);
        if (this._viewMode === "list" /* ViewMode.List */) {
            this.storageService.store(`scm.viewSortKey`, sortKey, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
    }
    constructor(options, commandService, editorService, menuService, scmService, scmViewService, storageService, uriIdentityService, keybindingService, themeService, contextMenuService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, hoverService) {
        super({ ...options, titleMenuId: MenuId.SCMTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.commandService = commandService;
        this.editorService = editorService;
        this.menuService = menuService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeViewMode = new Emitter();
        this.onDidChangeViewMode = this._onDidChangeViewMode.event;
        this._onDidChangeViewSortKey = new Emitter();
        this.onDidChangeViewSortKey = this._onDidChangeViewSortKey.event;
        this.items = new DisposableMap();
        this.visibilityDisposables = new DisposableStore();
        this.treeOperationSequencer = new Sequencer();
        this.revealResourceThrottler = new Throttler();
        this.updateChildrenThrottler = new Throttler();
        this.disposables = new DisposableStore();
        // View mode and sort key
        this._viewMode = this.getViewMode();
        this._viewSortKey = this.getViewSortKey();
        // Context Keys
        this.viewModeContextKey = ContextKeys.SCMViewMode.bindTo(contextKeyService);
        this.viewModeContextKey.set(this._viewMode);
        this.viewSortKeyContextKey = ContextKeys.SCMViewSortKey.bindTo(contextKeyService);
        this.viewSortKeyContextKey.set(this.viewSortKey);
        this.areAllRepositoriesCollapsedContextKey =
            ContextKeys.SCMViewAreAllRepositoriesCollapsed.bindTo(contextKeyService);
        this.isAnyRepositoryCollapsibleContextKey =
            ContextKeys.SCMViewIsAnyRepositoryCollapsible.bindTo(contextKeyService);
        this.scmProviderContextKey = ContextKeys.SCMProvider.bindTo(contextKeyService);
        this.scmProviderRootUriContextKey = ContextKeys.SCMProviderRootUri.bindTo(contextKeyService);
        this.scmProviderHasRootUriContextKey =
            ContextKeys.SCMProviderHasRootUri.bindTo(contextKeyService);
        this._onDidLayout = new Emitter();
        this.layoutCache = { height: undefined, width: undefined, onDidChange: this._onDidLayout.event };
        this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, this.disposables)((e) => {
            switch (e.key) {
                case 'scm.viewMode':
                    this.viewMode = this.getViewMode();
                    break;
                case 'scm.viewSortKey':
                    this.viewSortKey = this.getViewSortKey();
                    break;
            }
        }, this, this.disposables);
        this.storageService.onWillSaveState((e) => {
            this.viewMode = this.getViewMode();
            this.viewSortKey = this.getViewSortKey();
            this.storeTreeViewState();
        }, this, this.disposables);
        Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository)(() => this._onDidChangeViewWelcomeState.fire(), this, this.disposables);
        this.disposables.add(this.revealResourceThrottler);
        this.disposables.add(this.updateChildrenThrottler);
    }
    layoutBody(height = this.layoutCache.height, width = this.layoutCache.width) {
        if (height === undefined) {
            return;
        }
        if (width !== undefined) {
            super.layoutBody(height, width);
        }
        this.layoutCache.height = height;
        this.layoutCache.width = width;
        this._onDidLayout.fire();
        this.treeContainer.style.height = `${height}px`;
        this.tree.layout(height, width);
    }
    renderBody(container) {
        super.renderBody(container);
        // Tree
        this.treeContainer = append(container, $('.scm-view.show-file-icons'));
        this.treeContainer.classList.add('file-icon-themable-tree');
        this.treeContainer.classList.add('show-file-icons');
        const updateActionsVisibility = () => this.treeContainer.classList.toggle('show-actions', this.configurationService.getValue('scm.alwaysShowActions'));
        Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.alwaysShowActions'), this.disposables)(updateActionsVisibility, this, this.disposables);
        updateActionsVisibility();
        const updateProviderCountVisibility = () => {
            const value = this.configurationService.getValue('scm.providerCountBadge');
            this.treeContainer.classList.toggle('hide-provider-counts', value === 'hidden');
            this.treeContainer.classList.toggle('auto-provider-counts', value === 'auto');
        };
        Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.providerCountBadge'), this.disposables)(updateProviderCountVisibility, this, this.disposables);
        updateProviderCountVisibility();
        const viewState = this.loadTreeViewState();
        this.createTree(this.treeContainer, viewState);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (visible) {
                this.treeOperationSequencer.queue(async () => {
                    await this.tree.setInput(this.scmViewService, viewState);
                    Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.alwaysShowRepositories'), this.visibilityDisposables)(() => {
                        this.updateActions();
                        this.updateChildren();
                    }, this, this.visibilityDisposables);
                    Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.inputMinLineCount') ||
                        e.affectsConfiguration('scm.inputMaxLineCount') ||
                        e.affectsConfiguration('scm.showActionButton'), this.visibilityDisposables)(() => this.updateChildren(), this, this.visibilityDisposables);
                    // Add visible repositories
                    this.editorService.onDidActiveEditorChange(this.onDidActiveEditorChange, this, this.visibilityDisposables);
                    this.scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.visibilityDisposables);
                    this.onDidChangeVisibleRepositories({
                        added: this.scmViewService.visibleRepositories,
                        removed: Iterable.empty(),
                    });
                    // Restore scroll position
                    if (typeof this.treeScrollTop === 'number') {
                        this.tree.scrollTop = this.treeScrollTop;
                        this.treeScrollTop = undefined;
                    }
                    this.updateRepositoryCollapseAllContextKeys();
                });
            }
            else {
                this.visibilityDisposables.clear();
                this.onDidChangeVisibleRepositories({
                    added: Iterable.empty(),
                    removed: [...this.items.keys()],
                });
                this.treeScrollTop = this.tree.scrollTop;
                this.updateRepositoryCollapseAllContextKeys();
            }
        }, this, this.disposables);
        this.disposables.add(this.instantiationService.createInstance(RepositoryVisibilityActionController));
        this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this, this.disposables);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
    }
    createTree(container, viewState) {
        const overflowWidgetsDomNode = $('.scm-overflow-widgets-container.monaco-editor');
        this.inputRenderer = this.instantiationService.createInstance(InputRenderer, this.layoutCache, overflowWidgetsDomNode, (input, height) => {
            try {
                // Attempt to update the input element height. There is an
                // edge case where the input has already been disposed and
                // updating the height would fail.
                this.tree.updateElementHeight(input, height);
            }
            catch { }
        });
        this.actionButtonRenderer = this.instantiationService.createInstance(ActionButtonRenderer);
        this.listLabels = this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        });
        this.disposables.add(this.listLabels);
        const resourceActionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        resourceActionRunner.onWillRun(() => this.tree.domFocus(), this, this.disposables);
        this.disposables.add(resourceActionRunner);
        const treeDataSource = this.instantiationService.createInstance(SCMTreeDataSource, () => this.viewMode);
        this.disposables.add(treeDataSource);
        const compressionEnabled = observableConfigValue('scm.compactFolders', true, this.configurationService);
        this.tree = this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'SCM Tree Repo', container, new ListDelegate(this.inputRenderer), new SCMTreeCompressionDelegate(), [
            this.inputRenderer,
            this.actionButtonRenderer,
            this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMTitle, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ResourceGroupRenderer, getActionViewItemProvider(this.instantiationService), resourceActionRunner),
            this.instantiationService.createInstance(ResourceRenderer, () => this.viewMode, this.listLabels, getActionViewItemProvider(this.instantiationService), resourceActionRunner),
        ], treeDataSource, {
            horizontalScrolling: false,
            setRowLineHeight: false,
            transformOptimization: false,
            filter: new SCMTreeFilter(),
            dnd: new SCMTreeDragAndDrop(this.instantiationService),
            identityProvider: new SCMResourceIdentityProvider(),
            sorter: new SCMTreeSorter(() => this.viewMode, () => this.viewSortKey),
            keyboardNavigationLabelProvider: this.instantiationService.createInstance(SCMTreeKeyboardNavigationLabelProvider, () => this.viewMode),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            compressionEnabled: compressionEnabled.get(),
            collapseByDefault: (e) => {
                // Repository, Resource Group, Resource Folder (Tree)
                if (isSCMRepository(e) || isSCMResourceGroup(e) || isSCMResourceNode(e)) {
                    return false;
                }
                // History Item Group, History Item, or History Item Change
                return (viewState?.expanded ?? []).indexOf(getSCMResourceId(e)) === -1;
            },
            accessibilityProvider: this.instantiationService.createInstance(SCMAccessibilityProvider),
        });
        this.disposables.add(this.tree);
        this.tree.onDidOpen(this.open, this, this.disposables);
        this.tree.onContextMenu(this.onListContextMenu, this, this.disposables);
        this.tree.onDidScroll(this.inputRenderer.clearValidation, this.inputRenderer, this.disposables);
        Event.filter(this.tree.onDidChangeCollapseState, (e) => isSCMRepository(e.node.element?.element), this.disposables)(this.updateRepositoryCollapseAllContextKeys, this, this.disposables);
        this.disposables.add(autorun((reader) => {
            this.tree.updateOptions({
                compressionEnabled: compressionEnabled.read(reader),
            });
        }));
        append(container, overflowWidgetsDomNode);
    }
    async open(e) {
        if (!e.element) {
            return;
        }
        else if (isSCMRepository(e.element)) {
            this.scmViewService.focus(e.element);
            return;
        }
        else if (isSCMInput(e.element)) {
            this.scmViewService.focus(e.element.repository);
            const widget = this.inputRenderer.getRenderedInputWidget(e.element);
            if (widget) {
                widget.focus();
                this.tree.setFocus([], e.browserEvent);
                const selection = this.tree.getSelection();
                if (selection.length === 1 && selection[0] === e.element) {
                    setTimeout(() => this.tree.setSelection([]));
                }
            }
            return;
        }
        else if (isSCMActionButton(e.element)) {
            this.scmViewService.focus(e.element.repository);
            // Focus the action button
            this.actionButtonRenderer.focusActionButton(e.element);
            this.tree.setFocus([], e.browserEvent);
            return;
        }
        else if (isSCMResourceGroup(e.element)) {
            const provider = e.element.provider;
            const repository = Iterable.find(this.scmService.repositories, (r) => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
        else if (isSCMResource(e.element)) {
            if (e.element.command?.id === API_OPEN_EDITOR_COMMAND_ID ||
                e.element.command?.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                if (isPointerEvent(e.browserEvent) && e.browserEvent.button === 1) {
                    const resourceGroup = e.element.resourceGroup;
                    const title = `${resourceGroup.provider.label}: ${resourceGroup.label}`;
                    await OpenScmGroupAction.openMultiFileDiffEditor(this.editorService, title, resourceGroup.provider.rootUri, resourceGroup.id, {
                        ...e.editorOptions,
                        viewState: {
                            revealData: {
                                resource: {
                                    original: e.element.multiDiffEditorOriginalUri,
                                    modified: e.element.multiDiffEditorModifiedUri,
                                },
                            },
                        },
                        preserveFocus: true,
                    });
                }
                else {
                    await this.commandService.executeCommand(e.element.command.id, ...(e.element.command.arguments || []), e);
                }
            }
            else {
                await e.element.open(!!e.editorOptions.preserveFocus);
                if (e.editorOptions.pinned) {
                    const activeEditorPane = this.editorService.activeEditorPane;
                    activeEditorPane?.group.pinEditor(activeEditorPane.input);
                }
            }
            const provider = e.element.resourceGroup.provider;
            const repository = Iterable.find(this.scmService.repositories, (r) => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
        }
        else if (isSCMResourceNode(e.element)) {
            const provider = e.element.context.provider;
            const repository = Iterable.find(this.scmService.repositories, (r) => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
    }
    onDidActiveEditorChange() {
        if (!this.configurationService.getValue('scm.autoReveal')) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (!uri) {
            return;
        }
        // Do not set focus/selection when the resource is already focused and selected
        if (this.tree
            .getFocus()
            .some((e) => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri)) &&
            this.tree
                .getSelection()
                .some((e) => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri))) {
            return;
        }
        this.revealResourceThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            for (const repository of this.scmViewService.visibleRepositories) {
                const item = this.items.get(repository);
                if (!item) {
                    continue;
                }
                // go backwards from last group
                for (let j = repository.provider.groups.length - 1; j >= 0; j--) {
                    const groupItem = repository.provider.groups[j];
                    const resource = this.viewMode === "tree" /* ViewMode.Tree */
                        ? groupItem.resourceTree.getNode(uri)?.element
                        : groupItem.resources.find((r) => this.uriIdentityService.extUri.isEqual(r.sourceUri, uri));
                    if (resource) {
                        await this.tree.expandTo(resource);
                        this.tree.reveal(resource);
                        this.tree.setSelection([resource]);
                        this.tree.setFocus([resource]);
                        return;
                    }
                }
            }
        }));
    }
    onDidChangeVisibleRepositories({ added, removed, }) {
        // Added repositories
        for (const repository of added) {
            const repositoryDisposables = new DisposableStore();
            repositoryDisposables.add(autorun((reader) => {
                /** @description action button */
                repository.provider.actionButton.read(reader);
                this.updateChildren(repository);
            }));
            repositoryDisposables.add(repository.input.onDidChangeVisibility(() => this.updateChildren(repository)));
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(() => this.updateChildren(repository)));
            const resourceGroupDisposables = repositoryDisposables.add(new DisposableMap());
            const onDidChangeResourceGroups = () => {
                for (const [resourceGroup] of resourceGroupDisposables) {
                    if (!repository.provider.groups.includes(resourceGroup)) {
                        resourceGroupDisposables.deleteAndDispose(resourceGroup);
                    }
                }
                for (const resourceGroup of repository.provider.groups) {
                    if (!resourceGroupDisposables.has(resourceGroup)) {
                        const disposableStore = new DisposableStore();
                        disposableStore.add(resourceGroup.onDidChange(() => this.updateChildren(repository)));
                        disposableStore.add(resourceGroup.onDidChangeResources(() => this.updateChildren(repository)));
                        resourceGroupDisposables.set(resourceGroup, disposableStore);
                    }
                }
            };
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(onDidChangeResourceGroups));
            onDidChangeResourceGroups();
            this.items.set(repository, repositoryDisposables);
        }
        // Removed repositories
        for (const repository of removed) {
            this.items.deleteAndDispose(repository);
        }
        this.updateChildren();
        this.onDidActiveEditorChange();
    }
    onListContextMenu(e) {
        if (!e.element) {
            const menu = this.menuService.getMenuActions(Menus.ViewSort, this.contextKeyService);
            const actions = getFlatContextMenuActions(menu);
            return this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                onHide: () => { },
            });
        }
        const element = e.element;
        let context = element;
        let actions = [];
        let actionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        if (isSCMRepository(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.repositoryContextMenu;
            context = element.provider;
            actionRunner = new RepositoryActionRunner(() => this.getSelectedRepositories());
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMInput(element) || isSCMActionButton(element)) {
            // noop
        }
        else if (isSCMResourceGroup(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.getResourceGroupMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResource(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.resourceGroup.provider);
            const menu = menus.getResourceMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResourceNode(element)) {
            if (element.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.element.resourceGroup.provider);
                const menu = menus.getResourceMenu(element.element);
                actions = collectContextMenuActions(menu);
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.context.provider);
                const menu = menus.getResourceFolderMenu(element.context);
                actions = collectContextMenuActions(menu);
            }
        }
        actionRunner.onWillRun(() => this.tree.domFocus());
        this.contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => context,
            onHide: () => actionRunner.dispose(),
        });
    }
    getSelectedRepositories() {
        const focusedRepositories = this.tree
            .getFocus()
            .filter((r) => !!r && isSCMRepository(r));
        const selectedRepositories = this.tree
            .getSelection()
            .filter((r) => !!r && isSCMRepository(r));
        return Array.from(new Set([...focusedRepositories, ...selectedRepositories]));
    }
    getSelectedResources() {
        return this.tree
            .getSelection()
            .filter((r) => isSCMResourceGroup(r) || isSCMResource(r) || isSCMResourceNode(r));
    }
    getViewMode() {
        let mode = this.configurationService.getValue('scm.defaultViewMode') === 'list'
            ? "list" /* ViewMode.List */
            : "tree" /* ViewMode.Tree */;
        const storageMode = this.storageService.get(`scm.viewMode`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageMode === 'string') {
            mode = storageMode;
        }
        return mode;
    }
    getViewSortKey() {
        // Tree
        if (this._viewMode === "tree" /* ViewMode.Tree */) {
            return "path" /* ViewSortKey.Path */;
        }
        // List
        let viewSortKey;
        const viewSortKeyString = this.configurationService.getValue('scm.defaultViewSortKey');
        switch (viewSortKeyString) {
            case 'name':
                viewSortKey = "name" /* ViewSortKey.Name */;
                break;
            case 'status':
                viewSortKey = "status" /* ViewSortKey.Status */;
                break;
            default:
                viewSortKey = "path" /* ViewSortKey.Path */;
                break;
        }
        const storageSortKey = this.storageService.get(`scm.viewSortKey`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageSortKey === 'string') {
            viewSortKey = storageSortKey;
        }
        return viewSortKey;
    }
    loadTreeViewState() {
        const storageViewState = this.storageService.get('scm.viewState2', 1 /* StorageScope.WORKSPACE */);
        if (!storageViewState) {
            return undefined;
        }
        try {
            const treeViewState = JSON.parse(storageViewState);
            return treeViewState;
        }
        catch {
            return undefined;
        }
    }
    storeTreeViewState() {
        if (this.tree) {
            this.storageService.store('scm.viewState2', JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    updateChildren(element) {
        this.updateChildrenThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            const focusedInput = this.inputRenderer.getFocusedInput();
            if (element && this.tree.hasNode(element)) {
                // Refresh specific repository
                await this.tree.updateChildren(element);
            }
            else {
                // Refresh the entire tree
                await this.tree.updateChildren(undefined);
            }
            if (focusedInput) {
                this.inputRenderer.getRenderedInputWidget(focusedInput)?.focus();
            }
            this.updateScmProviderContextKeys();
            this.updateRepositoryCollapseAllContextKeys();
        }));
    }
    updateIndentStyles(theme) {
        this.treeContainer.classList.toggle('list-view-mode', this.viewMode === "list" /* ViewMode.List */);
        this.treeContainer.classList.toggle('tree-view-mode', this.viewMode === "tree" /* ViewMode.Tree */);
        this.treeContainer.classList.toggle('align-icons-and-twisties', (this.viewMode === "list" /* ViewMode.List */ && theme.hasFileIcons) ||
            (theme.hasFileIcons && !theme.hasFolderIcons));
        this.treeContainer.classList.toggle('hide-arrows', this.viewMode === "tree" /* ViewMode.Tree */ && theme.hidesExplorerArrows === true);
    }
    updateScmProviderContextKeys() {
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories');
        if (!alwaysShowRepositories && this.items.size === 1) {
            const provider = Iterable.first(this.items.keys()).provider;
            this.scmProviderContextKey.set(provider.contextValue);
            this.scmProviderRootUriContextKey.set(provider.rootUri?.toString());
            this.scmProviderHasRootUriContextKey.set(!!provider.rootUri);
        }
        else {
            this.scmProviderContextKey.set(undefined);
            this.scmProviderRootUriContextKey.set(undefined);
            this.scmProviderHasRootUriContextKey.set(false);
        }
    }
    updateRepositoryCollapseAllContextKeys() {
        if (!this.isBodyVisible() || this.items.size === 1) {
            this.isAnyRepositoryCollapsibleContextKey.set(false);
            this.areAllRepositoriesCollapsedContextKey.set(false);
            return;
        }
        this.isAnyRepositoryCollapsibleContextKey.set(this.scmViewService.visibleRepositories.some((r) => this.tree.hasNode(r) && this.tree.isCollapsible(r)));
        this.areAllRepositoriesCollapsedContextKey.set(this.scmViewService.visibleRepositories.every((r) => this.tree.hasNode(r) && (!this.tree.isCollapsible(r) || this.tree.isCollapsed(r))));
    }
    collapseAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.collapse(repository);
            }
        }
    }
    expandAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.expand(repository);
            }
        }
    }
    focusPreviousInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(-1));
    }
    focusNextInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(1));
    }
    async focusInput(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        let input = this.scmViewService.focusedRepository.input;
        const repositories = this.scmViewService.visibleRepositories;
        // One visible repository and the input is already focused
        if (repositories.length === 1 &&
            this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            return;
        }
        // Multiple visible repositories and the input already focused
        if (repositories.length > 1 &&
            this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            const focusedRepositoryIndex = repositories.indexOf(this.scmViewService.focusedRepository);
            const newFocusedRepositoryIndex = rot(focusedRepositoryIndex + delta, repositories.length);
            input = repositories[newFocusedRepositoryIndex].input;
        }
        await this.tree.expandTo(input);
        this.tree.reveal(input);
        this.inputRenderer.getRenderedInputWidget(input)?.focus();
    }
    focusPreviousResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(-1));
    }
    focusNextResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(1));
    }
    async focusResourceGroup(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        const treeHasDomFocus = isActiveElement(this.tree.getHTMLElement());
        const resourceGroups = this.scmViewService.focusedRepository.provider.groups;
        const focusedResourceGroup = this.tree.getFocus().find((e) => isSCMResourceGroup(e));
        const focusedResourceGroupIndex = treeHasDomFocus && focusedResourceGroup ? resourceGroups.indexOf(focusedResourceGroup) : -1;
        let resourceGroupNext;
        if (focusedResourceGroupIndex === -1) {
            // First visible resource group
            for (const resourceGroup of resourceGroups) {
                if (this.tree.hasNode(resourceGroup)) {
                    resourceGroupNext = resourceGroup;
                    break;
                }
            }
        }
        else {
            // Next/Previous visible resource group
            let index = rot(focusedResourceGroupIndex + delta, resourceGroups.length);
            while (index !== focusedResourceGroupIndex) {
                if (this.tree.hasNode(resourceGroups[index])) {
                    resourceGroupNext = resourceGroups[index];
                    break;
                }
                index = rot(index + delta, resourceGroups.length);
            }
        }
        if (resourceGroupNext) {
            await this.tree.expandTo(resourceGroupNext);
            this.tree.reveal(resourceGroupNext);
            this.tree.setSelection([resourceGroupNext]);
            this.tree.setFocus([resourceGroupNext]);
            this.tree.domFocus();
        }
    }
    shouldShowWelcome() {
        return this.scmService.repositoryCount === 0;
    }
    getActionsContext() {
        return this.scmViewService.visibleRepositories.length === 1
            ? this.scmViewService.visibleRepositories[0].provider
            : undefined;
    }
    focus() {
        super.focus();
        this.treeOperationSequencer.queue(() => {
            return new Promise((resolve) => {
                if (this.isExpanded()) {
                    if (this.tree.getFocus().length === 0) {
                        for (const repository of this.scmViewService.visibleRepositories) {
                            const widget = this.inputRenderer.getRenderedInputWidget(repository.input);
                            if (widget) {
                                widget.focus();
                                resolve();
                                return;
                            }
                        }
                    }
                    this.tree.domFocus();
                    resolve();
                }
            });
        });
    }
    dispose() {
        this.visibilityDisposables.dispose();
        this.disposables.dispose();
        this.items.dispose();
        super.dispose();
    }
};
SCMViewPane = __decorate([
    __param(1, ICommandService),
    __param(2, IEditorService),
    __param(3, IMenuService),
    __param(4, ISCMService),
    __param(5, ISCMViewService),
    __param(6, IStorageService),
    __param(7, IUriIdentityService),
    __param(8, IKeybindingService),
    __param(9, IThemeService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService),
    __param(12, IViewDescriptorService),
    __param(13, IConfigurationService),
    __param(14, IContextKeyService),
    __param(15, IOpenerService),
    __param(16, IHoverService)
], SCMViewPane);
export { SCMViewPane };
let SCMTreeDataSource = class SCMTreeDataSource extends Disposable {
    constructor(viewMode, configurationService, scmViewService) {
        super();
        this.viewMode = viewMode;
        this.configurationService = configurationService;
        this.scmViewService = scmViewService;
    }
    async getChildren(inputOrElement) {
        const repositoryCount = this.scmViewService.visibleRepositories.length;
        const showActionButton = this.configurationService.getValue('scm.showActionButton') === true;
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories') === true;
        if (isSCMViewService(inputOrElement) && (repositoryCount > 1 || alwaysShowRepositories)) {
            return this.scmViewService.visibleRepositories;
        }
        else if ((isSCMViewService(inputOrElement) && repositoryCount === 1 && !alwaysShowRepositories) ||
            isSCMRepository(inputOrElement)) {
            const children = [];
            inputOrElement = isSCMRepository(inputOrElement)
                ? inputOrElement
                : this.scmViewService.visibleRepositories[0];
            const actionButton = inputOrElement.provider.actionButton.get();
            const resourceGroups = inputOrElement.provider.groups;
            // SCM Input
            if (inputOrElement.input.visible) {
                children.push(inputOrElement.input);
            }
            // Action Button
            if (showActionButton && actionButton) {
                children.push({
                    type: 'actionButton',
                    repository: inputOrElement,
                    button: actionButton,
                });
            }
            // ResourceGroups
            const hasSomeChanges = resourceGroups.some((group) => group.resources.length > 0);
            if (hasSomeChanges || (repositoryCount === 1 && (!showActionButton || !actionButton))) {
                children.push(...resourceGroups);
            }
            return children;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // Resources (List)
                return inputOrElement.resources;
            }
            else if (this.viewMode() === "tree" /* ViewMode.Tree */) {
                // Resources (Tree)
                const children = [];
                for (const node of inputOrElement.resourceTree.root.children) {
                    children.push(node.element && node.childrenCount === 0 ? node.element : node);
                }
                return children;
            }
        }
        else if (isSCMResourceNode(inputOrElement)) {
            // Resources (Tree), History item changes (Tree)
            const children = [];
            for (const node of inputOrElement.children) {
                children.push(node.element && node.childrenCount === 0 ? node.element : node);
            }
            return children;
        }
        return [];
    }
    getParent(element) {
        if (isSCMResourceNode(element)) {
            if (element.parent === element.context.resourceTree.root) {
                return element.context;
            }
            else if (element.parent) {
                return element.parent;
            }
            else {
                throw new Error('Invalid element passed to getParent');
            }
        }
        else if (isSCMResource(element)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                return element.resourceGroup;
            }
            const node = element.resourceGroup.resourceTree.getNode(element.sourceUri);
            const result = node?.parent;
            if (!result) {
                throw new Error('Invalid element passed to getParent');
            }
            if (result === element.resourceGroup.resourceTree.root) {
                return element.resourceGroup;
            }
            return result;
        }
        else if (isSCMInput(element)) {
            return element.repository;
        }
        else if (isSCMResourceGroup(element)) {
            const repository = this.scmViewService.visibleRepositories.find((r) => r.provider === element.provider);
            if (!repository) {
                throw new Error('Invalid element passed to getParent');
            }
            return repository;
        }
        else {
            throw new Error('Unexpected call to getParent');
        }
    }
    hasChildren(inputOrElement) {
        if (isSCMViewService(inputOrElement)) {
            return this.scmViewService.visibleRepositories.length !== 0;
        }
        else if (isSCMRepository(inputOrElement)) {
            return true;
        }
        else if (isSCMInput(inputOrElement)) {
            return false;
        }
        else if (isSCMActionButton(inputOrElement)) {
            return false;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            return true;
        }
        else if (isSCMResource(inputOrElement)) {
            return false;
        }
        else if (ResourceTree.isResourceNode(inputOrElement)) {
            return inputOrElement.childrenCount > 0;
        }
        else {
            throw new Error('hasChildren not implemented.');
        }
    }
};
SCMTreeDataSource = __decorate([
    __param(1, IConfigurationService),
    __param(2, ISCMViewService)
], SCMTreeDataSource);
export class SCMActionButton {
    constructor(container, contextMenuService, commandService, notificationService) {
        this.container = container;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.disposables = new MutableDisposable();
    }
    dispose() {
        this.disposables?.dispose();
    }
    setButton(button) {
        // Clear old button
        this.clear();
        if (!button) {
            return;
        }
        if (button.secondaryCommands?.length) {
            const actions = [];
            for (let index = 0; index < button.secondaryCommands.length; index++) {
                const commands = button.secondaryCommands[index];
                for (const command of commands) {
                    actions.push(toAction({
                        id: command.id,
                        label: command.title,
                        enabled: true,
                        run: async () => {
                            await this.executeCommand(command.id, ...(command.arguments || []));
                        },
                    }));
                }
                if (commands.length) {
                    actions.push(new Separator());
                }
            }
            // Remove last separator
            actions.pop();
            // ButtonWithDropdown
            this.button = new ButtonWithDropdown(this.container, {
                actions: actions,
                addPrimaryActionToDropdown: false,
                contextMenuProvider: this.contextMenuService,
                title: button.command.tooltip,
                supportIcons: true,
                ...defaultButtonStyles,
            });
        }
        else {
            // Button
            this.button = new Button(this.container, {
                supportIcons: true,
                supportShortLabel: !!button.command.shortTitle,
                title: button.command.tooltip,
                ...defaultButtonStyles,
            });
        }
        this.button.enabled = button.enabled;
        this.button.label = button.command.title;
        if (this.button instanceof Button && button.command.shortTitle) {
            this.button.labelShort = button.command.shortTitle;
        }
        this.button.onDidClick(async () => await this.executeCommand(button.command.id, ...(button.command.arguments || [])), null, this.disposables.value);
        this.disposables.value.add(this.button);
    }
    focus() {
        this.button?.focus();
    }
    clear() {
        this.disposables.value = new DisposableStore();
        this.button = undefined;
        clearNode(this.container);
    }
    async executeCommand(commandId, ...args) {
        try {
            await this.commandService.executeCommand(commandId, ...args);
        }
        catch (ex) {
            this.notificationService.error(ex);
        }
    }
}
setupSimpleEditorSelectionStyling('.scm-view .scm-editor-container');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21WaWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUVOLFVBQVUsRUFDVixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLE9BQU8sRUFDUCxZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLGFBQWEsR0FDYixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQW9CLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pHLE9BQU8sRUFDTixNQUFNLEVBQ04sQ0FBQyxFQUNELFNBQVMsRUFDVCxVQUFVLEVBQ1YsU0FBUyxFQUNULGNBQWMsRUFDZCxlQUFlLEdBQ2YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQU9OLGVBQWUsRUFFZixXQUFXLEVBQ1gsb0JBQW9CLEVBQ3BCLFlBQVksR0FLWixNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxjQUFjLEVBQXFDLE1BQU0sNEJBQTRCLENBQUE7QUFDOUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFD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