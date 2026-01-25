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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL3ZpZXdzL2VtcHR5Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUU1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDaEcsT0FBTyxFQUNOLG9CQUFvQixFQUNwQix3QkFBd0IsR0FFeEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxF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