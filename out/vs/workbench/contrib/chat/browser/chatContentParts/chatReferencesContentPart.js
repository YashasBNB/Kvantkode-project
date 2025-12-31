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
var CollapsibleListRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { matchesSomeScheme, Schemas } from '../../../../../base/common/network.js';
import { basename } from '../../../../../base/common/path.js';
import { basenameOrAuthority, isEqualAuthority } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ColorScheme } from '../../../../browser/web.api.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { SETTINGS_AUTHORITY } from '../../../../services/preferences/common/preferences.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { ExplorerFolderContext } from '../../../files/common/files.js';
import { chatEditingWidgetFileStateContextKey, } from '../../common/chatEditingService.js';
import { ChatResponseReferencePartStatusKind, } from '../../common/chatService.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { IChatWidgetService } from '../chat.js';
import { ChatCollapsibleContentPart } from './chatCollapsibleContentPart.js';
import { ResourcePool } from './chatCollections.js';
export const $ = dom.$;
let ChatCollapsibleListContentPart = class ChatCollapsibleListContentPart extends ChatCollapsibleContentPart {
    constructor(data, labelOverride, context, contentReferencesListPool, openerService, menuService, instantiationService, contextMenuService) {
        super(labelOverride ??
            (data.length > 1
                ? localize('usedReferencesPlural', 'Used {0} references', data.length)
                : localize('usedReferencesSingular', 'Used {0} reference', 1)), context);
        this.data = data;
        this.contentReferencesListPool = contentReferencesListPool;
        this.openerService = openerService;
        this.menuService = menuService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
    }
    initContent() {
        const ref = this._register(this.contentReferencesListPool.get());
        const list = ref.object;
        this._register(list.onDidOpen((e) => {
            if (e.element && 'reference' in e.element && typeof e.element.reference === 'object') {
                const uriOrLocation = 'variableName' in e.element.reference ? e.element.reference.value : e.element.reference;
                const uri = URI.isUri(uriOrLocation) ? uriOrLocation : uriOrLocation?.uri;
                if (uri) {
                    this.openerService.open(uri, {
                        fromUserGesture: true,
                        editorOptions: {
                            ...e.editorOptions,
                            ...{
                                selection: uriOrLocation && 'range' in uriOrLocation ? uriOrLocation.range : undefined,
                            },
                        },
                    });
                }
            }
        }));
        this._register(list.onContextMenu((e) => {
            dom.EventHelper.stop(e.browserEvent, true);
            const uri = e.element && getResourceForElement(e.element);
            if (!uri) {
                return;
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatAttachmentsContext, list.contextKeyService, { shouldForwardArgs: true, arg: uri });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
        const resourceContextKey = this._register(this.instantiationService.createInstance(ResourceContextKey));
        this._register(list.onDidChangeFocus((e) => {
            resourceContextKey.reset();
            const element = e.elements.length ? e.elements[0] : undefined;
            const uri = element && getResourceForElement(element);
            resourceContextKey.set(uri ?? null);
        }));
        const maxItemsShown = 6;
        const itemsShown = Math.min(this.data.length, maxItemsShown);
        const height = itemsShown * 22;
        list.layout(height);
        list.getHTMLElement().style.height = `${height}px`;
        list.splice(0, list.length, this.data);
        return list.getHTMLElement().parentElement;
    }
    hasSameContent(other, followingContent, element) {
        return (other.kind === 'references' &&
            other.references.length === this.data.length &&
            !!followingContent.length === this.hasFollowingContent);
    }
};
ChatCollapsibleListContentPart = __decorate([
    __param(4, IOpenerService),
    __param(5, IMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextMenuService)
], ChatCollapsibleListContentPart);
export { ChatCollapsibleListContentPart };
let ChatUsedReferencesListContentPart = class ChatUsedReferencesListContentPart extends ChatCollapsibleListContentPart {
    constructor(data, labelOverride, context, contentReferencesListPool, options, openerService, menuService, instantiationService, contextMenuService) {
        super(data, labelOverride, context, contentReferencesListPool, openerService, menuService, instantiationService, contextMenuService);
        this.options = options;
        if (data.length === 0) {
            dom.hide(this.domNode);
        }
    }
    isExpanded() {
        const element = this.context.element;
        return (element.usedReferencesExpanded ??
            !!(this.options.expandedWhenEmptyResponse && element.response.value.length === 0));
    }
    setExpanded(value) {
        const element = this.context.element;
        element.usedReferencesExpanded = !this.isExpanded();
    }
};
ChatUsedReferencesListContentPart = __decorate([
    __param(5, IOpenerService),
    __param(6, IMenuService),
    __param(7, IInstantiationService),
    __param(8, IContextMenuService)
], ChatUsedReferencesListContentPart);
export { ChatUsedReferencesListContentPart };
let CollapsibleListPool = class CollapsibleListPool extends Disposable {
    get inUse() {
        return this._pool.inUse;
    }
    constructor(_onDidChangeVisibility, menuId, instantiationService, themeService, labelService) {
        super();
        this._onDidChangeVisibility = _onDidChangeVisibility;
        this.menuId = menuId;
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this.labelService = labelService;
        this._pool = this._register(new ResourcePool(() => this.listFactory()));
    }
    listFactory() {
        const resourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this._onDidChangeVisibility,
        }));
        const container = $('.chat-used-context-list');
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const list = this.instantiationService.createInstance((WorkbenchList), 'ChatListRenderer', container, new CollapsibleListDelegate(), [
            this.instantiationService.createInstance(CollapsibleListRenderer, resourceLabels, this.menuId),
        ], {
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    if (element.kind === 'warning') {
                        return element.content.value;
                    }
                    const reference = element.reference;
                    if (typeof reference === 'string') {
                        return reference;
                    }
                    else if ('variableName' in reference) {
                        return reference.variableName;
                    }
                    else if (URI.isUri(reference)) {
                        return basename(reference.path);
                    }
                    else {
                        return basename(reference.uri.path);
                    }
                },
                getWidgetAriaLabel: () => localize('chatCollapsibleList', 'Collapsible Chat List'),
            },
            dnd: {
                getDragURI: (element) => getResourceForElement(element)?.toString() ?? null,
                getDragLabel: (elements, originalEvent) => {
                    const uris = coalesce(elements.map(getResourceForElement));
                    if (!uris.length) {
                        return undefined;
                    }
                    else if (uris.length === 1) {
                        return this.labelService.getUriLabel(uris[0], { relative: true });
                    }
                    else {
                        return `${uris.length}`;
                    }
                },
                dispose: () => { },
                onDragOver: () => false,
                drop: () => { },
                onDragStart: (data, originalEvent) => {
                    try {
                        const elements = data.getData();
                        const uris = coalesce(elements.map(getResourceForElement));
                        this.instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, uris, originalEvent));
                    }
                    catch {
                        // noop
                    }
                },
            },
        });
        return list;
    }
    get() {
        const object = this._pool.get();
        let stale = false;
        return {
            object,
            isStale: () => stale,
            dispose: () => {
                stale = true;
                this._pool.release(object);
            },
        };
    }
};
CollapsibleListPool = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, ILabelService)
], CollapsibleListPool);
export { CollapsibleListPool };
class CollapsibleListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return CollapsibleListRenderer.TEMPLATE_ID;
    }
}
let CollapsibleListRenderer = class CollapsibleListRenderer {
    static { CollapsibleListRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'chatCollapsibleListRenderer'; }
    constructor(labels, menuId, themeService, productService, instantiationService, contextKeyService) {
        this.labels = labels;
        this.menuId = menuId;
        this.themeService = themeService;
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = CollapsibleListRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true, supportIcons: true }));
        let toolbar;
        let actionBarContainer;
        let contextKeyService;
        if (this.menuId) {
            actionBarContainer = $('.chat-collapsible-list-action-bar');
            contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(actionBarContainer));
            const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
            toolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, this.menuId, { menuOptions: { shouldForwardArgs: true, arg: undefined } }));
            label.element.appendChild(actionBarContainer);
        }
        return { templateDisposables, label, toolbar, actionBarContainer, contextKeyService };
    }
    getReferenceIcon(data) {
        if (ThemeIcon.isThemeIcon(data.iconPath)) {
            return data.iconPath;
        }
        else {
            return this.themeService.getColorTheme().type === ColorScheme.DARK && data.iconPath?.dark
                ? data.iconPath?.dark
                : data.iconPath?.light;
        }
    }
    renderElement(data, index, templateData, height) {
        if (data.kind === 'warning') {
            templateData.label.setResource({ name: data.content.value }, { icon: Codicon.warning });
            return;
        }
        const reference = data.reference;
        const icon = this.getReferenceIcon(data);
        templateData.label.element.style.display = 'flex';
        let arg;
        if (typeof reference === 'object' && 'variableName' in reference) {
            if (reference.value) {
                const uri = URI.isUri(reference.value) ? reference.value : reference.value.uri;
                templateData.label.setResource({
                    resource: uri,
                    name: basenameOrAuthority(uri),
                    description: `#${reference.variableName}`,
                    range: 'range' in reference.value ? reference.value.range : undefined,
                }, { icon, title: data.options?.status?.description ?? data.title });
            }
            else if (reference.variableName.startsWith('kernelVariable')) {
                const variable = reference.variableName.split(':')[1];
                const asVariableName = `${variable}`;
                const label = `Kernel variable`;
                templateData.label.setLabel(label, asVariableName, {
                    title: data.options?.status?.description,
                });
            }
            else {
                // Nothing else is expected to fall into here
                templateData.label.setLabel('Unknown variable type');
            }
        }
        else if (typeof reference === 'string') {
            templateData.label.setLabel(reference, undefined, {
                iconPath: URI.isUri(icon) ? icon : undefined,
                title: data.options?.status?.description ?? data.title,
            });
        }
        else {
            const uri = 'uri' in reference ? reference.uri : reference;
            arg = uri;
            const extraClasses = data.excluded ? ['excluded'] : [];
            if (uri.scheme === 'https' &&
                isEqualAuthority(uri.authority, 'github.com') &&
                uri.path.includes('/tree/')) {
                // Parse a nicer label for GitHub URIs that point at a particular commit + file
                const label = uri.path.split('/').slice(1, 3).join('/');
                const description = uri.path.split('/').slice(5).join('/');
                templateData.label.setResource({ resource: uri, name: label, description }, { icon: Codicon.github, title: data.title, strikethrough: data.excluded, extraClasses });
            }
            else if (uri.scheme === this.productService.urlProtocol &&
                isEqualAuthority(uri.authority, SETTINGS_AUTHORITY)) {
                // a nicer label for settings URIs
                const settingId = uri.path.substring(1);
                templateData.label.setResource({ resource: uri, name: settingId }, {
                    icon: Codicon.settingsGear,
                    title: localize('setting.hover', "Open setting '{0}'", settingId),
                    strikethrough: data.excluded,
                    extraClasses,
                });
            }
            else if (matchesSomeScheme(uri, Schemas.mailto, Schemas.http, Schemas.https)) {
                templateData.label.setResource({ resource: uri, name: uri.toString() }, {
                    icon: icon ?? Codicon.globe,
                    title: data.options?.status?.description ?? data.title ?? uri.toString(),
                    strikethrough: data.excluded,
                    extraClasses,
                });
            }
            else {
                templateData.label.setFile(uri, {
                    fileKind: FileKind.FILE,
                    // Should not have this live-updating data on a historical reference
                    fileDecorations: undefined,
                    range: 'range' in reference ? reference.range : undefined,
                    title: data.options?.status?.description ?? data.title,
                    strikethrough: data.excluded,
                    extraClasses,
                });
            }
        }
        for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
            const element = templateData.label.element.querySelector(selector);
            if (element) {
                if (data.options?.status?.kind === ChatResponseReferencePartStatusKind.Omitted ||
                    data.options?.status?.kind === ChatResponseReferencePartStatusKind.Partial) {
                    element.classList.add('warning');
                }
                else {
                    element.classList.remove('warning');
                }
            }
        }
        if (data.state !== undefined) {
            if (templateData.actionBarContainer) {
                if (data.state === 0 /* WorkingSetEntryState.Modified */ &&
                    !templateData.actionBarContainer.classList.contains('modified')) {
                    templateData.actionBarContainer.classList.add('modified');
                    templateData.label.element
                        .querySelector('.monaco-icon-name-container')
                        ?.classList.add('modified');
                }
                else if (data.state !== 0 /* WorkingSetEntryState.Modified */) {
                    templateData.actionBarContainer.classList.remove('modified');
                    templateData.label.element
                        .querySelector('.monaco-icon-name-container')
                        ?.classList.remove('modified');
                }
            }
            if (templateData.toolbar) {
                templateData.toolbar.context = arg;
            }
            if (templateData.contextKeyService) {
                if (data.state !== undefined) {
                    chatEditingWidgetFileStateContextKey
                        .bindTo(templateData.contextKeyService)
                        .set(data.state);
                }
            }
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
CollapsibleListRenderer = CollapsibleListRenderer_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IProductService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], CollapsibleListRenderer);
function getResourceForElement(element) {
    if (element.kind === 'warning') {
        return null;
    }
    const { reference } = element;
    if (typeof reference === 'string' || 'variableName' in reference) {
        return null;
    }
    else if (URI.isUri(reference)) {
        return reference;
    }
    else {
        return reference.uri;
    }
}
//#region Resource context menu
registerAction2(class AddToChatAction extends Action2 {
    static { this.id = 'workbench.action.chat.addToChatAction'; }
    constructor() {
        super({
            id: AddToChatAction.id,
            title: {
                ...localize2('addToChat', 'Add File to Chat'),
            },
            f1: false,
            menu: [
                {
                    id: MenuId.ChatAttachmentsContext,
                    group: 'chat',
                    order: 1,
                    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, ExplorerFolderContext.negate()),
                },
            ],
        });
    }
    async run(accessor, resource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const variablesService = accessor.get(IChatVariablesService);
        if (!resource) {
            return;
        }
        const widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        variablesService.attachContext('file', resource, widget.location);
    }
});
registerAction2(class OpenChatReferenceLinkAction extends Action2 {
    static { this.id = 'workbench.action.chat.copyLink'; }
    constructor() {
        super({
            id: OpenChatReferenceLinkAction.id,
            title: {
                ...localize2('copyLink', 'Copy Link'),
            },
            f1: false,
            menu: [
                {
                    id: MenuId.ChatAttachmentsContext,
                    group: 'chat',
                    order: 0,
                    when: ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.http), ResourceContextKey.Scheme.isEqualTo(Schemas.https)),
                },
            ],
        });
    }
    async run(accessor, resource) {
        await accessor.get(IClipboardService).writeResources([resource]);
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlZmVyZW5jZXNDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRSZWZlcmVuY2VzQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixPQUFPLEVBQ1AsWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEdBQ2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRSxPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sb0NBQW9DLEdBRXBDLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUNOLG1DQUFtQyxHQUduQyxNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJFLE9BQU8sRUFBZ0Isa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUUsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUd6RSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQVdmLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsMEJBQTBCO0lBQzdFLFlBQ2tCLElBQTZDLEVBQzlELGFBQW1ELEVBQ25ELE9BQXNDLEVBQ3JCLHlCQUE4QyxFQUM5QixhQUE2QixFQUMvQixXQUF5QixFQUNoQixvQkFBMkMsRUFDN0Msa0JBQXVDO1FBRTdFLEtBQUssQ0FDSixhQUFhO1lBQ1osQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUN0RSxDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQ2hFLE9BQU8sQ0FDUCxDQUFBO1FBZmdCLFNBQUksR0FBSixJQUFJLENBQXlDO1FBRzdDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBcUI7UUFDOUIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ2hCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtJQVM5RSxDQUFDO0lBRWtCLFdBQVc7UUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNoRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBRXZCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxXQUFXLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN0RixNQUFNLGFBQWEsR0FDbEIsY0FBYyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO2dCQUN4RixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUE7Z0JBQ3pFLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ1QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO3dCQUM1QixlQUFlLEVBQUUsSUFBSTt3QkFDckIsYUFBYSxFQUFFOzRCQUNkLEdBQUcsQ0FBQyxDQUFDLGFBQWE7NEJBQ2xCLEdBQUc7Z0NBQ0YsU0FBUyxFQUNSLGFBQWEsSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTOzZCQUM1RTt5QkFDRDtxQkFDRCxDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUUxQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO2dCQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU07Z0JBQ3pCLFVBQVUsRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUMzQyxNQUFNLENBQUMsc0JBQXNCLEVBQzdCLElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNyQyxDQUFBO29CQUNELE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQzVELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzFCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDN0QsTUFBTSxHQUFHLEdBQUcsT0FBTyxJQUFJLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3JELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUN2QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzVELE1BQU0sTUFBTSxHQUFHLFVBQVUsR0FBRyxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFBO1FBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXRDLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLGFBQWMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsY0FBYyxDQUNiLEtBQTJCLEVBQzNCLGdCQUF3QyxFQUN4QyxPQUFxQjtRQUVyQixPQUFPLENBQ04sS0FBSyxDQUFDLElBQUksS0FBSyxZQUFZO1lBQzNCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUM1QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsQ0FDdEQsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdEdZLDhCQUE4QjtJQU14QyxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0dBVFQsOEJBQThCLENBc0cxQzs7QUFNTSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLDhCQUE4QjtJQUNwRixZQUNDLElBQTZDLEVBQzdDLGFBQW1ELEVBQ25ELE9BQXNDLEVBQ3RDLHlCQUE4QyxFQUM3QixPQUF1QyxFQUN4QyxhQUE2QixFQUMvQixXQUF5QixFQUNoQixvQkFBMkMsRUFDN0Msa0JBQXVDO1FBRTVELEtBQUssQ0FDSixJQUFJLEVBQ0osYUFBYSxFQUNiLE9BQU8sRUFDUCx5QkFBeUIsRUFDekIsYUFBYSxFQUNiLFdBQVcsRUFDWCxvQkFBb0IsRUFDcEIsa0JBQWtCLENBQ2xCLENBQUE7UUFmZ0IsWUFBTyxHQUFQLE9BQU8sQ0FBZ0M7UUFnQnhELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVrQixVQUFVO1FBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBaUMsQ0FBQTtRQUM5RCxPQUFPLENBQ04sT0FBTyxDQUFDLHNCQUFzQjtZQUM5QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FDakYsQ0FBQTtJQUNGLENBQUM7SUFFa0IsV0FBVyxDQUFDLEtBQWM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFpQyxDQUFBO1FBQzlELE9BQU8sQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQTtBQXZDWSxpQ0FBaUM7SUFPM0MsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtHQVZULGlDQUFpQyxDQXVDN0M7O0FBRU0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBR2xELElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7SUFDeEIsQ0FBQztJQUVELFlBQ1Msc0JBQXNDLEVBQzdCLE1BQTBCLEVBQ0gsb0JBQTJDLEVBQ25ELFlBQTJCLEVBQzNCLFlBQTJCO1FBRTNELEtBQUssRUFBRSxDQUFBO1FBTkMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFnQjtRQUM3QixXQUFNLEdBQU4sTUFBTSxDQUFvQjtRQUNILHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFHM0QsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVPLFdBQVc7UUFDbEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUU7WUFDeEQscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQjtTQUNsRCxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRXRGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3BELENBQUEsYUFBdUMsQ0FBQSxFQUN2QyxrQkFBa0IsRUFDbEIsU0FBUyxFQUNULElBQUksdUJBQXVCLEVBQUUsRUFDN0I7WUFDQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2Qyx1QkFBdUIsRUFDdkIsY0FBYyxFQUNkLElBQUksQ0FBQyxNQUFNLENBQ1g7U0FDRCxFQUNEO1lBQ0MsdUJBQXVCLEVBQUUsS0FBSztZQUM5QixxQkFBcUIsRUFBRTtnQkFDdEIsWUFBWSxFQUFFLENBQUMsT0FBaUMsRUFBRSxFQUFFO29CQUNuRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ2hDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7b0JBQzdCLENBQUM7b0JBQ0QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQTtvQkFDbkMsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDbkMsT0FBTyxTQUFTLENBQUE7b0JBQ2pCLENBQUM7eUJBQU0sSUFBSSxjQUFjLElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ3hDLE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQTtvQkFDOUIsQ0FBQzt5QkFBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQzt3QkFDakMsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNoQyxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDcEMsQ0FBQztnQkFDRixDQUFDO2dCQUVELGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1QkFBdUIsQ0FBQzthQUNsRjtZQUNELEdBQUcsRUFBRTtnQkFDSixVQUFVLEVBQUUsQ0FBQyxPQUFpQyxFQUFFLEVBQUUsQ0FDakQscUJBQXFCLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSTtnQkFDbkQsWUFBWSxFQUFFLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFO29CQUN6QyxNQUFNLElBQUksR0FBVSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7b0JBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2xCLE9BQU8sU0FBUyxDQUFBO29CQUNqQixDQUFDO3lCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDOUIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDbEUsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQ3hCLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztnQkFDakIsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7Z0JBQ3ZCLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO2dCQUNkLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRTtvQkFDcEMsSUFBSSxDQUFDO3dCQUNKLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQWdDLENBQUE7d0JBQzdELE1BQU0sSUFBSSxHQUFVLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTt3QkFDakUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3JELG1CQUFtQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQ2xELENBQUE7b0JBQ0YsQ0FBQztvQkFBQyxNQUFNLENBQUM7d0JBQ1IsT0FBTztvQkFDUixDQUFDO2dCQUNGLENBQUM7YUFDRDtTQUNELENBQ0QsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEdBQUc7UUFDRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQy9CLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNqQixPQUFPO1lBQ04sTUFBTTtZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1lBQ3BCLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsS0FBSyxHQUFHLElBQUksQ0FBQTtnQkFDWixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBM0dZLG1CQUFtQjtJQVU3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FaSCxtQkFBbUIsQ0EyRy9COztBQUVELE1BQU0sdUJBQXVCO0lBQzVCLFNBQVMsQ0FBQyxPQUFpQztRQUMxQyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBaUM7UUFDOUMsT0FBTyx1QkFBdUIsQ0FBQyxXQUFXLENBQUE7SUFDM0MsQ0FBQztDQUNEO0FBVUQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O2FBR3JCLGdCQUFXLEdBQUcsNkJBQTZCLEFBQWhDLENBQWdDO0lBR2xELFlBQ1MsTUFBc0IsRUFDdEIsTUFBMEIsRUFDbkIsWUFBNEMsRUFDMUMsY0FBZ0QsRUFDMUMsb0JBQTRELEVBQy9ELGlCQUFzRDtRQUxsRSxXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUN0QixXQUFNLEdBQU4sTUFBTSxDQUFvQjtRQUNGLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ3pCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFSbEUsZUFBVSxHQUFXLHlCQUF1QixDQUFDLFdBQVcsQ0FBQTtJQVM5RCxDQUFDO0lBRUosY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNqRCxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDOUUsQ0FBQTtRQUVELElBQUksT0FBTyxDQUFBO1FBQ1gsSUFBSSxrQkFBa0IsQ0FBQTtRQUN0QixJQUFJLGlCQUFpQixDQUFBO1FBQ3JCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1lBQzNELGlCQUFpQixHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUN2RCxDQUFBO1lBQ0QsTUFBTSwwQkFBMEIsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQ3pELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3BDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQzlELENBQ0QsQ0FBQTtZQUNELE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQ2hDLDBCQUEwQixDQUFDLGNBQWMsQ0FDeEMsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixJQUFJLENBQUMsTUFBTSxFQUNYLEVBQUUsV0FBVyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUM1RCxDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFFRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxDQUFBO0lBQ3RGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUEyQjtRQUNuRCxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSTtnQkFDeEYsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSTtnQkFDckIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQThCLEVBQzlCLEtBQWEsRUFDYixZQUFzQyxFQUN0QyxNQUEwQjtRQUUxQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDN0IsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUN2RixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ2pELElBQUksR0FBb0IsQ0FBQTtRQUN4QixJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsSUFBSSxjQUFjLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEUsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQTtnQkFDOUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQzdCO29CQUNDLFFBQVEsRUFBRSxHQUFHO29CQUNiLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7b0JBQzlCLFdBQVcsRUFBRSxJQUFJLFNBQVMsQ0FBQyxZQUFZLEVBQUU7b0JBQ3pDLEtBQUssRUFBRSxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7aUJBQ3JFLEVBQ0QsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQ2hFLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxjQUFjLEdBQUcsR0FBRyxRQUFRLEVBQUUsQ0FBQTtnQkFDcEMsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUE7Z0JBQy9CLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUU7b0JBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXO2lCQUN4QyxDQUFDLENBQUE7WUFDSCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsNkNBQTZDO2dCQUM3QyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQ3JELENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxZQUFZLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFO2dCQUNqRCxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM1QyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxJQUFJLElBQUksQ0FBQyxLQUFLO2FBQ3RELENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEdBQUcsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQzFELEdBQUcsR0FBRyxHQUFHLENBQUE7WUFDVCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDdEQsSUFDQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU87Z0JBQ3RCLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDO2dCQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDMUIsQ0FBQztnQkFDRiwrRUFBK0U7Z0JBQy9FLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUN2RCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMxRCxZQUFZLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDN0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEVBQzNDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQ3ZGLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQ04sR0FBRyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVc7Z0JBQzlDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsRUFDbEQsQ0FBQztnQkFDRixrQ0FBa0M7Z0JBQ2xDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QyxZQUFZLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDN0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDbEM7b0JBQ0MsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO29CQUMxQixLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxTQUFTLENBQUM7b0JBQ2pFLGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUTtvQkFDNUIsWUFBWTtpQkFDWixDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksaUJBQWlCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEYsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQzdCLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQ3ZDO29CQUNDLElBQUksRUFBRSxJQUFJLElBQUksT0FBTyxDQUFDLEtBQUs7b0JBQzNCLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFO29CQUN4RSxhQUFhLEVBQUUsSUFBSSxDQUFDLFFBQVE7b0JBQzVCLFlBQVk7aUJBQ1osQ0FDRCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtvQkFDL0IsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUN2QixvRUFBb0U7b0JBQ3BFLGVBQWUsRUFBRSxTQUFTO29CQUMxQixLQUFLLEVBQUUsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDekQsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSztvQkFDdEQsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRO29CQUM1QixZQUFZO2lCQUNaLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLFFBQVEsSUFBSSxDQUFDLCtCQUErQixFQUFFLDZCQUE2QixDQUFDLEVBQUUsQ0FBQztZQUN6RixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUNDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksS0FBSyxtQ0FBbUMsQ0FBQyxPQUFPO29CQUMxRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEtBQUssbUNBQW1DLENBQUMsT0FBTyxFQUN6RSxDQUFDO29CQUNGLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNqQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3BDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM5QixJQUFJLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNyQyxJQUNDLElBQUksQ0FBQyxLQUFLLDBDQUFrQztvQkFDNUMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFDOUQsQ0FBQztvQkFDRixZQUFZLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDekQsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPO3lCQUN4QixhQUFhLENBQUMsNkJBQTZCLENBQUM7d0JBQzdDLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDN0IsQ0FBQztxQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLDBDQUFrQyxFQUFFLENBQUM7b0JBQ3pELFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUM1RCxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU87eUJBQ3hCLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQzt3QkFDN0MsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMxQixZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUE7WUFDbkMsQ0FBQztZQUNELElBQUksWUFBWSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDOUIsb0NBQW9DO3lCQUNsQyxNQUFNLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO3lCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNsQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXNDO1FBQ3JELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQyxDQUFDOztBQXpNSSx1QkFBdUI7SUFTMUIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtHQVpmLHVCQUF1QixDQTBNNUI7QUFFRCxTQUFTLHFCQUFxQixDQUFDLE9BQWlDO0lBQy9ELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBQzdCLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLGNBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNsRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7U0FBTSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQTtJQUNyQixDQUFDO0FBQ0YsQ0FBQztBQUVELCtCQUErQjtBQUUvQixlQUFlLENBQ2QsTUFBTSxlQUFnQixTQUFRLE9BQU87YUFDcEIsT0FBRSxHQUFHLHVDQUF1QyxDQUFBO0lBRTVEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGVBQWUsQ0FBQyxFQUFFO1lBQ3RCLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUM7YUFDN0M7WUFDRCxFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHNCQUFzQjtvQkFDakMsS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGtCQUFrQixDQUFDLG9CQUFvQixFQUN2QyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FDOUI7aUJBQ0Q7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsUUFBYTtRQUMzRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUU1RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFBO1FBQ2xELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBRUQsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSwyQkFBNEIsU0FBUSxPQUFPO2FBQ2hDLE9BQUUsR0FBRyxnQ0FBZ0MsQ0FBQTtJQUVyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFO1lBQ2xDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO2FBQ3JDO1lBQ0QsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxzQkFBc0I7b0JBQ2pDLEtBQUssRUFBRSxNQUFNO29CQUNiLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUN0QixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFDakQsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQ2xEO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFFBQWE7UUFDM0QsTUFBTSxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsWUFBWSJ9