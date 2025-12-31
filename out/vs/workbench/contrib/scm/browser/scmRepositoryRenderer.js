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
var RepositoryRenderer_1;
import './media/scm.css';
import { DisposableStore, combinedDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore } from '../../../../base/common/observable.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { ISCMViewService } from '../common/scm.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { connectPrimaryMenu, getRepositoryResourceCount, isSCMRepository, StatusBarAction, } from './util.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class RepositoryActionRunner extends ActionRunner {
    constructor(getSelectedRepositories) {
        super();
        this.getSelectedRepositories = getSelectedRepositories;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const selection = this.getSelectedRepositories().map((r) => r.provider);
        const actionContext = selection.some((s) => s === context) ? selection : [context];
        await action.run(...actionContext);
    }
}
let RepositoryRenderer = class RepositoryRenderer {
    static { RepositoryRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'repository'; }
    get templateId() {
        return RepositoryRenderer_1.TEMPLATE_ID;
    }
    constructor(toolbarMenuId, actionViewItemProvider, commandService, contextKeyService, contextMenuService, hoverService, keybindingService, menuService, scmViewService, telemetryService) {
        this.toolbarMenuId = toolbarMenuId;
        this.actionViewItemProvider = actionViewItemProvider;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        if (container.classList.contains('monaco-tl-contents')) {
            ;
            container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        }
        const provider = append(container, $('.scm-provider'));
        const label = append(provider, $('.label'));
        const labelCustomHover = this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), label, '', {});
        const name = append(label, $('span.name'));
        const description = append(label, $('span.description'));
        const actions = append(provider, $('.actions'));
        const toolBar = new WorkbenchToolBar(actions, { actionViewItemProvider: this.actionViewItemProvider, resetMenu: this.toolbarMenuId }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(provider, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const visibilityDisposable = toolBar.onDidChangeDropdownVisibility((e) => provider.classList.toggle('active', e));
        const templateDisposable = combinedDisposable(labelCustomHover, visibilityDisposable, toolBar);
        return {
            label,
            labelCustomHover,
            name,
            description,
            countContainer,
            count,
            toolBar,
            elementDisposables: new DisposableStore(),
            templateDisposable,
        };
    }
    renderElement(arg, index, templateData, height) {
        const repository = isSCMRepository(arg) ? arg : arg.element;
        templateData.name.textContent = repository.provider.name;
        if (repository.provider.rootUri) {
            templateData.labelCustomHover.update(`${repository.provider.label}: ${repository.provider.rootUri.fsPath}`);
            templateData.description.textContent = repository.provider.label;
        }
        else {
            templateData.labelCustomHover.update(repository.provider.label);
            templateData.description.textContent = '';
        }
        let statusPrimaryActions = [];
        let menuPrimaryActions = [];
        let menuSecondaryActions = [];
        const updateToolbar = () => {
            templateData.toolBar.setActions([...statusPrimaryActions, ...menuPrimaryActions], menuSecondaryActions);
        };
        templateData.elementDisposables.add(autorunWithStore((reader, store) => {
            const commands = repository.provider.statusBarCommands.read(reader) ?? [];
            statusPrimaryActions = commands.map((c) => store.add(new StatusBarAction(c, this.commandService)));
            updateToolbar();
        }));
        templateData.elementDisposables.add(autorun((reader) => {
            const count = repository.provider.count.read(reader) ?? getRepositoryResourceCount(repository.provider);
            templateData.countContainer.setAttribute('data-count', String(count));
            templateData.count.setCount(count);
        }));
        const repositoryMenus = this.scmViewService.menus.getRepositoryMenus(repository.provider);
        const menu = this.toolbarMenuId === MenuId.SCMTitle
            ? repositoryMenus.titleMenu.menu
            : repositoryMenus.repositoryMenu;
        templateData.elementDisposables.add(connectPrimaryMenu(menu, (primary, secondary) => {
            menuPrimaryActions = primary;
            menuSecondaryActions = secondary;
            updateToolbar();
        }));
        templateData.toolBar.context = repository.provider;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
        templateData.count.dispose();
    }
};
RepositoryRenderer = RepositoryRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IHoverService),
    __param(6, IKeybindingService),
    __param(7, IMenuService),
    __param(8, ISCMViewService),
    __param(9, ITelemetryService)
], RepositoryRenderer);
export { RepositoryRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtUmVwb3NpdG9yeVJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtUmVwb3NpdG9yeVJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFFTixlQUFlLEVBQ2Ysa0JBQWtCLEdBQ2xCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDM0QsT0FBTyxFQUFnQyxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDBCQUEwQixFQUMxQixlQUFlLEVBQ2YsZUFBZSxHQUNmLE1BQU0sV0FBVyxDQUFBO0FBTWxCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFz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