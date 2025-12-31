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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc0xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xGLE9BQU8sRUFBZSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsT0FBTyxFQUVOLG1CQUFtQixFQUVuQiwyQkFBMkIsR0FFM0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLDJCQUEyQixFQUMzQiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIseUNBQXlDLEVBQ3pDLHVCQUF1QixFQUN2QixnQkFBZ0IsRUFDaEIsZ0NBQWdDLEVBQ2hDLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsWUFBWSxHQUNaLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDOUcsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQix3QkFBd0IsSUFBSSx3QkFBd0IsRUFDcEQsaUJBQWlCLEVBQ2pCLG9CQUFv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