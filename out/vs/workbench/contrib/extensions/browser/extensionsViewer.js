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
var ExtensionRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { dispose, Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Action } from '../../../../base/common/actions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Renderer } from './extensionsList.js';
import { listFocusForeground, listFocusBackground, foreground, editorBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getAriaLabelForExtension } from './extensionsViews.js';
let ExtensionsGridView = class ExtensionsGridView extends Disposable {
    constructor(parent, delegate, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.element = dom.append(parent, dom.$('.extensions-grid-view'));
        this.renderer = this.instantiationService.createInstance(Renderer, { onFocus: Event.None, onBlur: Event.None, filters: {} }, {
            hoverOptions: {
                position() {
                    return 2 /* HoverPosition.BELOW */;
                },
            },
        });
        this.delegate = delegate;
        this.disposableStore = this._register(new DisposableStore());
    }
    setExtensions(extensions) {
        this.disposableStore.clear();
        extensions.forEach((e, index) => this.renderExtension(e, index));
    }
    renderExtension(extension, index) {
        const extensionContainer = dom.append(this.element, dom.$('.extension-container'));
        extensionContainer.style.height = `${this.delegate.getHeight()}px`;
        extensionContainer.setAttribute('tabindex', '0');
        const template = this.renderer.renderTemplate(extensionContainer);
        this.disposableStore.add(toDisposable(() => this.renderer.disposeTemplate(template)));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        openExtensionAction.extension = extension;
        template.name.setAttribute('tabindex', '0');
        const handleEvent = (e) => {
            if (e instanceof StandardKeyboardEvent && e.keyCode !== 3 /* KeyCode.Enter */) {
                return;
            }
            openExtensionAction.run(e.ctrlKey || e.metaKey);
            e.stopPropagation();
            e.preventDefault();
        };
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.CLICK, (e) => handleEvent(new StandardMouseEvent(dom.getWindow(template.name), e))));
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.disposableStore.add(dom.addDisposableListener(extensionContainer, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.renderer.renderElement(extension, index, template);
    }
};
ExtensionsGridView = __decorate([
    __param(2, IInstantiationService)
], ExtensionsGridView);
export { ExtensionsGridView };
class AsyncDataSource {
    hasChildren({ hasChildren }) {
        return hasChildren;
    }
    getChildren(extensionData) {
        return extensionData.getChildren();
    }
}
class VirualDelegate {
    getHeight(element) {
        return 62;
    }
    getTemplateId({ extension }) {
        return extension ? ExtensionRenderer.TEMPLATE_ID : UnknownExtensionRenderer.TEMPLATE_ID;
    }
}
let ExtensionRenderer = class ExtensionRenderer {
    static { ExtensionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'extension-template'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return ExtensionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('extension');
        const icon = dom.append(container, dom.$('img.icon'));
        const details = dom.append(container, dom.$('.details'));
        const header = dom.append(details, dom.$('.header'));
        const name = dom.append(header, dom.$('span.name'));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        const extensionDisposables = [
            dom.addDisposableListener(name, 'click', (e) => {
                openExtensionAction.run(e.ctrlKey || e.metaKey);
                e.stopPropagation();
                e.preventDefault();
            }),
        ];
        const identifier = dom.append(header, dom.$('span.identifier'));
        const footer = dom.append(details, dom.$('.footer'));
        const author = dom.append(footer, dom.$('.author'));
        return {
            icon,
            name,
            identifier,
            author,
            extensionDisposables,
            set extensionData(extensionData) {
                openExtensionAction.extension = extensionData.extension;
            },
        };
    }
    renderElement(node, index, data) {
        const extension = node.element.extension;
        data.extensionDisposables.push(dom.addDisposableListener(data.icon, 'error', () => (data.icon.src = extension.iconUrlFallback), { once: true }));
        data.icon.src = extension.iconUrl;
        if (!data.icon.complete) {
            data.icon.style.visibility = 'hidden';
            data.icon.onload = () => (data.icon.style.visibility = 'inherit');
        }
        else {
            data.icon.style.visibility = 'inherit';
        }
        data.name.textContent = extension.displayName;
        data.identifier.textContent = extension.identifier.id;
        data.author.textContent = extension.publisherDisplayName;
        data.extensionData = node.element;
    }
    disposeTemplate(templateData) {
        templateData.extensionDisposables = dispose(templateData.extensionDisposables);
    }
};
ExtensionRenderer = ExtensionRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], ExtensionRenderer);
class UnknownExtensionRenderer {
    static { this.TEMPLATE_ID = 'unknown-extension-template'; }
    get templateId() {
        return UnknownExtensionRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const messageContainer = dom.append(container, dom.$('div.unknown-extension'));
        dom.append(messageContainer, dom.$('span.error-marker')).textContent = localize('error', 'Error');
        dom.append(messageContainer, dom.$('span.message')).textContent = localize('Unknown Extension', 'Unknown Extension:');
        const identifier = dom.append(messageContainer, dom.$('span.message'));
        return { identifier };
    }
    renderElement(node, index, data) {
        data.identifier.textContent = node.element.extension.identifier.id;
    }
    disposeTemplate(data) { }
}
let OpenExtensionAction = class OpenExtensionAction extends Action {
    constructor(extensionsWorkdbenchService) {
        super('extensions.action.openExtension', '');
        this.extensionsWorkdbenchService = extensionsWorkdbenchService;
    }
    set extension(extension) {
        this._extension = extension;
    }
    run(sideByside) {
        if (this._extension) {
            return this.extensionsWorkdbenchService.open(this._extension, { sideByside });
        }
        return Promise.resolve();
    }
};
OpenExtensionAction = __decorate([
    __param(0, IExtensionsWorkbenchService)
], OpenExtensionAction);
let ExtensionsTree = class ExtensionsTree extends WorkbenchAsyncDataTree {
    constructor(input, container, overrideStyles, contextKeyService, listService, instantiationService, configurationService, extensionsWorkdbenchService) {
        const delegate = new VirualDelegate();
        const dataSource = new AsyncDataSource();
        const renderers = [
            instantiationService.createInstance(ExtensionRenderer),
            instantiationService.createInstance(UnknownExtensionRenderer),
        ];
        const identityProvider = {
            getId({ extension, parent }) {
                return parent ? this.getId(parent) + '/' + extension.identifier.id : extension.identifier.id;
            },
        };
        super('ExtensionsTree', container, delegate, renderers, dataSource, {
            indent: 40,
            identityProvider,
            multipleSelectionSupport: false,
            overrideStyles,
            accessibilityProvider: {
                getAriaLabel(extensionData) {
                    return getAriaLabelForExtension(extensionData.extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', 'Extensions');
                },
            },
        }, instantiationService, contextKeyService, listService, configurationService);
        this.setInput(input);
        this.disposables.add(this.onDidChangeSelection((event) => {
            if (dom.isKeyboardEvent(event.browserEvent)) {
                extensionsWorkdbenchService.open(event.elements[0].extension, { sideByside: false });
            }
        }));
    }
};
ExtensionsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IExtensionsWorkbenchService)
], ExtensionsTree);
export { ExtensionsTree };
export class ExtensionData {
    constructor(extension, parent, getChildrenExtensionIds, extensionsWorkbenchService) {
        this.extension = extension;
        this.parent = parent;
        this.getChildrenExtensionIds = getChildrenExtensionIds;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.childrenExtensionIds = this.getChildrenExtensionIds(extension);
    }
    get hasChildren() {
        return isNonEmptyArray(this.childrenExtensionIds);
    }
    async getChildren() {
        if (this.hasChildren) {
            const result = await getExtensions(this.childrenExtensionIds, this.extensionsWorkbenchService);
            return result.map((extension) => new ExtensionData(extension, this, this.getChildrenExtensionIds, this.extensionsWorkbenchService));
        }
        return null;
    }
}
export async function getExtensions(extensions, extensionsWorkbenchService) {
    const localById = extensionsWorkbenchService.local.reduce((result, e) => {
        result.set(e.identifier.id.toLowerCase(), e);
        return result;
    }, new Map());
    const result = [];
    const toQuery = [];
    for (const extensionId of extensions) {
        const id = extensionId.toLowerCase();
        const local = localById.get(id);
        if (local) {
            result.push(local);
        }
        else {
            toQuery.push(id);
        }
    }
    if (toQuery.length) {
        const galleryResult = await extensionsWorkbenchService.getExtensions(toQuery.map((id) => ({ id })), CancellationToken.None);
        result.push(...galleryResult);
    }
    return result;
}
registerThemingParticipant((theme, collector) => {
    const focusBackground = theme.getColor(listFocusBackground);
    if (focusBackground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { background-color: ${focusBackground}; outline: none; }`);
    }
    const focusForeground = theme.getColor(listFocusForeground);
    if (focusForeground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { color: ${focusForeground}; }`);
    }
    const foregroundColor = theme.getColor(foreground);
    const editorBackgroundColor = theme.getColor(editorBackground);
    if (foregroundColor && editorBackgroundColor) {
        const authorForeground = foregroundColor.transparent(0.9).makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container:not(.disabled) .author { color: ${authorForeground}; }`);
        const disabledExtensionForeground = foregroundColor
            .transparent(0.5)
            .makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container.disabled { color: ${disabledExtensionForeground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sT0FBTyxFQUNQLFVBQVUsRUFDVixlQUFlLEVBQ2YsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSwyQkFBMkIsRUFBYyxNQUFNLHlCQUF5QixDQUFBO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sWUFBWSxFQUNaLHNCQUFzQixHQUN0QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTiwwQkFBMEIsR0FHMUIsTUFBTSxtREFBbUQsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFZLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hELE9BQU8sRUFDTixtQkFBbUIs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