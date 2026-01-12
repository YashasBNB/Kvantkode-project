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
import './media/extension.css';
import { append, $, addDisposableListener } from '../../../../base/browser/dom.js';
import { dispose, combinedDisposable } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ExtensionContainers, IExtensionsWorkbenchService, } from '../common/extensions.js';
import { ManageExtensionAction, ExtensionRuntimeStateAction, ExtensionStatusLabelAction, RemoteInstallAction, ExtensionStatusAction, LocalInstallAction, ButtonWithDropDownExtensionAction, InstallDropdownAction, InstallingLabelAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, WebInstallAction, MigrateDeprecatedExtensionAction, SetLanguageAction, ClearLanguageAction, UpdateAction, } from './extensionsActions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RatingsWidget, InstallCountWidget, RecommendationWidget, RemoteBadgeWidget, ExtensionPackCountWidget as ExtensionPackBadgeWidget, SyncIgnoredWidget, ExtensionHoverWidget, ExtensionRuntimeStatusWidget, PreReleaseBookmarkWidget, PublisherWidget, ExtensionKindIndicatorWidget, } from './extensionsWidgets.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { extensionVerifiedPublisherIconColor, verifiedPublisherIcon, } from '../../../services/extensionManagement/common/extensionsIcons.js';
const EXTENSION_LIST_ELEMENT_HEIGHT = 72;
export class Delegate {
    getHeight() {
        return EXTENSION_LIST_ELEMENT_HEIGHT;
    }
    getTemplateId() {
        return 'extension';
    }
}
let Renderer = class Renderer {
    constructor(extensionViewState, options, instantiationService, notificationService, extensionService, extensionsWorkbenchService, extensionEnablementService, contextMenuService) {
        this.extensionViewState = extensionViewState;
        this.options = options;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.contextMenuService = contextMenuService;
    }
    get templateId() {
        return 'extension';
    }
    renderTemplate(root) {
        const recommendationWidget = this.instantiationService.createInstance(RecommendationWidget, append(root, $('.extension-bookmark-container')));
        const preReleaseWidget = this.instantiationService.createInstance(PreReleaseBookmarkWidget, append(root, $('.extension-bookmark-container')));
        const element = append(root, $('.extension-list-item'));
        const iconContainer = append(element, $('.icon-container'));
        const icon = append(iconContainer, $('img.icon', { alt: '' }));
        const iconRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, false);
        const extensionPackBadgeWidget = this.instantiationService.createInstance(ExtensionPackBadgeWidget, iconContainer);
        const details = append(element, $('.details'));
        const headerContainer = append(details, $('.header-container'));
        const header = append(headerContainer, $('.header'));
        const name = append(header, $('span.name'));
        const installCount = append(header, $('span.install-count'));
        const ratings = append(header, $('span.ratings'));
        const syncIgnore = append(header, $('span.sync-ignored'));
        const extensionKindIndicator = append(header, $('span'));
        const activationStatus = append(header, $('span.activation-status'));
        const headerRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, header, false);
        const description = append(details, $('.description.ellipsis'));
        const footer = append(details, $('.footer'));
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, append(footer, $('.publisher-container')), true);
        const actionbar = new ActionBar(footer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames,
                    }, this.contextMenuService);
                }
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                return undefined;
            },
            focusOnlyEnabledItems: true,
        });
        actionbar.setFocusable(false);
        const actionBarListener = actionbar.onDidRun(({ error }) => error && this.notificationService.error(error));
        const extensionStatusIconAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, true),
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(UpdateAction, false),
            this.instantiationService.createInstance(InstallDropdownAction),
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            extensionStatusIconAction,
            this.instantiationService.createInstance(ManageExtensionAction),
        ];
        const extensionHoverWidget = this.instantiationService.createInstance(ExtensionHoverWidget, { target: root, position: this.options.hoverOptions.position }, extensionStatusIconAction);
        const widgets = [
            recommendationWidget,
            preReleaseWidget,
            iconRemoteBadgeWidget,
            extensionPackBadgeWidget,
            headerRemoteBadgeWidget,
            publisherWidget,
            extensionHoverWidget,
            this.instantiationService.createInstance(SyncIgnoredWidget, syncIgnore),
            this.instantiationService.createInstance(ExtensionRuntimeStatusWidget, this.extensionViewState, activationStatus),
            this.instantiationService.createInstance(InstallCountWidget, installCount, true),
            this.instantiationService.createInstance(RatingsWidget, ratings, true),
            this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindIndicator, true),
        ];
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets]);
        actionbar.push(actions, { icon: true, label: true });
        const disposable = combinedDisposable(...actions, ...widgets, actionbar, actionBarListener, extensionContainers);
        return {
            root,
            element,
            icon,
            name,
            installCount,
            ratings,
            description,
            disposables: [disposable],
            actionbar,
            extensionDisposables: [],
            set extension(extension) {
                extensionContainers.extension = extension;
            },
        };
    }
    renderPlaceholder(index, data) {
        data.element.classList.add('loading');
        data.root.removeAttribute('aria-label');
        data.root.removeAttribute('data-extension-id');
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.icon.src = '';
        data.name.textContent = '';
        data.description.textContent = '';
        data.installCount.style.display = 'none';
        data.ratings.style.display = 'none';
        data.extension = null;
    }
    renderElement(extension, index, data) {
        data.element.classList.remove('loading');
        data.root.setAttribute('data-extension-id', extension.identifier.id);
        if (extension.state !== 3 /* ExtensionState.Uninstalled */ && !extension.server) {
            // Get the extension if it is installed and has no server information
            extension =
                this.extensionsWorkbenchService.local.filter((e) => e.server === extension.server && areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        }
        data.extensionDisposables = dispose(data.extensionDisposables);
        const updateEnablement = () => {
            const disabled = extension.state === 1 /* ExtensionState.Installed */ &&
                extension.local &&
                !this.extensionEnablementService.isEnabled(extension.local);
            const deprecated = !!extension.deprecationInfo;
            data.element.classList.toggle('deprecated', deprecated);
            data.root.classList.toggle('disabled', disabled);
        };
        updateEnablement();
        this.extensionService.onDidChangeExtensions(() => updateEnablement(), this, data.extensionDisposables);
        data.extensionDisposables.push(addDisposableListener(data.icon, 'error', () => (data.icon.src = extension.iconUrlFallback), {
            once: true,
        }));
        data.icon.src = extension.iconUrl;
        if (!data.icon.complete) {
            data.icon.style.visibility = 'hidden';
            data.icon.onload = () => (data.icon.style.visibility = 'inherit');
        }
        else {
            data.icon.style.visibility = 'inherit';
        }
        data.name.textContent = extension.displayName;
        data.description.textContent = extension.description;
        data.installCount.style.display = '';
        data.ratings.style.display = '';
        data.extension = extension;
        if (extension.gallery &&
            extension.gallery.properties &&
            extension.gallery.properties.localizedLanguages &&
            extension.gallery.properties.localizedLanguages.length) {
            data.description.textContent = extension.gallery.properties.localizedLanguages
                .map((name) => name[0].toLocaleUpperCase() + name.slice(1))
                .join(', ');
        }
        this.extensionViewState.onFocus((e) => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(true);
            }
        }, this, data.extensionDisposables);
        this.extensionViewState.onBlur((e) => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(false);
            }
        }, this, data.extensionDisposables);
    }
    disposeElement(extension, index, data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
    }
    disposeTemplate(data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.disposables = dispose(data.disposables);
    }
};
Renderer = __decorate([
    __param(2, IInstantiationService),
    __param(3, INotificationService),
    __param(4, IExtensionService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IContextMenuService)
], Renderer);
export { Renderer };
registerThemingParticipant((theme, collector) => {
    const verifiedPublisherIconColor = theme.getColor(extensionVerifiedPublisherIconColor);
    if (verifiedPublisherIconColor) {
        const disabledVerifiedPublisherIconColor = verifiedPublisherIconColor
            .transparent(0.5)
            .makeOpaque(WORKBENCH_BACKGROUND(theme));
        collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disabled:not(.selected) .author .verified-publisher ${ThemeIcon.asCSSSelector(verifiedPublisherIcon)} { color: ${disabledVerifiedPublisherIconColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEYsT0FBTyxFQUFlLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxPQUFPLEVBRU4sbUJBQW1CLEVBRW5CLDJCQUEyQixHQUUzQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsMkJBQTJCLEVBQzNCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixpQ0FBaUMsRUFDakMscUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQix5Q0FBeUMsRUFDekMsdUJBQXVCLEVBQ3ZCLGdCQUFnQixFQUNoQixnQ0FBZ0MsRUFDaEMsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQixZQUFZLEdBQ1osTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUM5RyxPQUFPLEVBQ04sYUFBYSxFQUNiLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLHdCQUF3QixJQUFJLHdCQUF3QixFQUNwRCxpQkFBaUIsRUFDakIs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