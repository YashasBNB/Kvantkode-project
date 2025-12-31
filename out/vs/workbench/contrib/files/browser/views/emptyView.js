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
var EmptyView_1;
import * as nls from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { isTemporaryWorkspace, IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { ResourcesDropHandler } from '../../../../browser/dnd.js';
import { listDropOverBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { DragAndDropObserver, getWindow } from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
let EmptyView = class EmptyView extends ViewPane {
    static { EmptyView_1 = this; }
    static { this.ID = 'workbench.explorer.emptyView'; }
    static { this.NAME = nls.localize2('noWorkspace', 'No Folder Opened'); }
    constructor(options, themeService, viewDescriptorService, instantiationService, keybindingService, contextMenuService, contextService, configurationService, labelService, contextKeyService, openerService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.contextService = contextService;
        this.labelService = labelService;
        this._disposed = false;
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.refreshTitle()));
        this._register(this.labelService.onDidChangeFormatters(() => this.refreshTitle()));
    }
    shouldShowWelcome() {
        return true;
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(new DragAndDropObserver(container, {
            onDrop: (e) => {
                container.style.backgroundColor = '';
                const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, {
                    allowWorkspaceOpen: !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace()),
                });
                dropHandler.handleDrop(e, getWindow(container));
            },
            onDragEnter: () => {
                const color = this.themeService.getColorTheme().getColor(listDropOverBackground);
                container.style.backgroundColor = color ? color.toString() : '';
            },
            onDragEnd: () => {
                container.style.backgroundColor = '';
            },
            onDragLeave: () => {
                container.style.backgroundColor = '';
            },
            onDragOver: (e) => {
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            },
        }));
        this.refreshTitle();
    }
    refreshTitle() {
        if (this._disposed) {
            return;
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.updateTitle(EmptyView_1.NAME.value);
        }
        else {
            this.updateTitle(this.title);
        }
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
};
EmptyView = EmptyView_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IViewDescriptorService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IWorkspaceContextService),
    __param(7, IConfigurationService),
    __param(8, ILabelService),
    __param(9, IContextKeyService),
    __param(10, IOpenerService),
    __param(11, IHoverService)
], EmptyView);
export { EmptyView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9lbXB0eVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFFNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsd0JBQXdCLEdBRXhCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxt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