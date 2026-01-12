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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlZmVyZW5jZXNDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFJlZmVyZW5jZXNDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDOUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUNOLE9BQU8sRUFDUCxZQUFZLEVBQ1osTUFBTSxFQUNOLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9B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