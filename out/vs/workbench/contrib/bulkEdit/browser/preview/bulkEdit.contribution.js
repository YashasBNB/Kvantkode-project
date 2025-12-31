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
var BulkEditPreviewContribution_1;
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { IBulkEditService, } from '../../../../../editor/browser/services/bulkEditService.js';
import { BulkEditPane } from './bulkEditPane.js';
import { Extensions as ViewContainerExtensions, } from '../../../../common/views.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { FocusedViewContext } from '../../../../common/contextkeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ViewPaneContainer } from '../../../../browser/parts/views/viewPaneContainer.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { WorkbenchListFocusContextKey } from '../../../../../platform/list/browser/listService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { MenuId, registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../base/common/severity.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { IPaneCompositePartService } from '../../../../services/panecomposite/browser/panecomposite.js';
async function getBulkEditPane(viewsService) {
    const view = await viewsService.openView(BulkEditPane.ID, true);
    if (view instanceof BulkEditPane) {
        return view;
    }
    return undefined;
}
let UXState = class UXState {
    constructor(_paneCompositeService, _editorGroupsService) {
        this._paneCompositeService = _paneCompositeService;
        this._editorGroupsService = _editorGroupsService;
        this._activePanel = _paneCompositeService
            .getActivePaneComposite(1 /* ViewContainerLocation.Panel */)
            ?.getId();
    }
    async restore(panels, editors) {
        // (1) restore previous panel
        if (panels) {
            if (typeof this._activePanel === 'string') {
                await this._paneCompositeService.openPaneComposite(this._activePanel, 1 /* ViewContainerLocation.Panel */);
            }
            else {
                this._paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            }
        }
        // (2) close preview editors
        if (editors) {
            for (const group of this._editorGroupsService.groups) {
                const previewEditors = [];
                for (const input of group.editors) {
                    const resource = EditorResourceAccessor.getCanonicalUri(input, {
                        supportSideBySide: SideBySideEditor.PRIMARY,
                    });
                    if (resource?.scheme === BulkEditPane.Schema) {
                        previewEditors.push(input);
                    }
                }
                if (previewEditors.length) {
                    group.closeEditors(previewEditors, { preserveFocus: true });
                }
            }
        }
    }
};
UXState = __decorate([
    __param(0, IPaneCompositePartService),
    __param(1, IEditorGroupsService)
], UXState);
class PreviewSession {
    constructor(uxState, cts = new CancellationTokenSource()) {
        this.uxState = uxState;
        this.cts = cts;
    }
}
let BulkEditPreviewContribution = class BulkEditPreviewContribution {
    static { BulkEditPreviewContribution_1 = this; }
    static { this.ID = 'workbench.contrib.bulkEditPreview'; }
    static { this.ctxEnabled = new RawContextKey('refactorPreview.enabled', false); }
    constructor(_paneCompositeService, _viewsService, _editorGroupsService, _dialogService, bulkEditService, contextKeyService) {
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._editorGroupsService = _editorGroupsService;
        this._dialogService = _dialogService;
        bulkEditService.setPreviewHandler((edits) => this._previewEdit(edits));
        this._ctxEnabled = BulkEditPreviewContribution_1.ctxEnabled.bindTo(contextKeyService);
    }
    async _previewEdit(edits) {
        this._ctxEnabled.set(true);
        const uxState = this._activeSession?.uxState ??
            new UXState(this._paneCompositeService, this._editorGroupsService);
        const view = await getBulkEditPane(this._viewsService);
        if (!view) {
            this._ctxEnabled.set(false);
            return edits;
        }
        // check for active preview session and let the user decide
        if (view.hasInput()) {
            const { confirmed } = await this._dialogService.confirm({
                type: Severity.Info,
                message: localize('overlap', 'Another refactoring is being previewed.'),
                detail: localize('detail', "Press 'Continue' to discard the previous refactoring and continue with the current refactoring."),
                primaryButton: localize({ key: 'continue', comment: ['&& denotes a mnemonic'] }, '&&Continue'),
            });
            if (!confirmed) {
                return [];
            }
        }
        // session
        let session;
        if (this._activeSession) {
            await this._activeSession.uxState.restore(false, true);
            this._activeSession.cts.dispose(true);
            session = new PreviewSession(uxState);
        }
        else {
            session = new PreviewSession(uxState);
        }
        this._activeSession = session;
        // the actual work...
        try {
            return (await view.setInput(edits, session.cts.token)) ?? [];
        }
        finally {
            // restore UX state
            if (this._activeSession === session) {
                await this._activeSession.uxState.restore(true, true);
                this._activeSession.cts.dispose();
                this._ctxEnabled.set(false);
                this._activeSession = undefined;
            }
        }
    }
};
BulkEditPreviewContribution = BulkEditPreviewContribution_1 = __decorate([
    __param(0, IPaneCompositePartService),
    __param(1, IViewsService),
    __param(2, IEditorGroupsService),
    __param(3, IDialogService),
    __param(4, IBulkEditService),
    __param(5, IContextKeyService)
], BulkEditPreviewContribution);
// CMD: accept
registerAction2(class ApplyAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.apply',
            title: localize2('apply', 'Apply Refactoring'),
            category: localize2('cat', 'Refactor Preview'),
            icon: Codicon.check,
            precondition: ContextKeyExpr.and(BulkEditPreviewContribution.ctxEnabled, BulkEditPane.ctxHasCheckedChanges),
            menu: [
                {
                    id: MenuId.BulkEditContext,
                    order: 1,
                },
            ],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                when: ContextKeyExpr.and(BulkEditPreviewContribution.ctxEnabled, FocusedViewContext.isEqualTo(BulkEditPane.ID)),
                primary: 2048 /* KeyMod.CtrlCmd */ + 3 /* KeyCode.Enter */,
            },
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.accept();
    }
});
// CMD: discard
registerAction2(class DiscardAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.discard',
            title: localize2('Discard', 'Discard Refactoring'),
            category: localize2('cat', 'Refactor Preview'),
            icon: Codicon.clearAll,
            precondition: BulkEditPreviewContribution.ctxEnabled,
            menu: [
                {
                    id: MenuId.BulkEditContext,
                    order: 2,
                },
            ],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.discard();
    }
});
// CMD: toggle change
registerAction2(class ToggleAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.toggleCheckedState',
            title: localize2('toogleSelection', 'Toggle Change'),
            category: localize2('cat', 'Refactor Preview'),
            precondition: BulkEditPreviewContribution.ctxEnabled,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: WorkbenchListFocusContextKey,
                primary: 10 /* KeyCode.Space */,
            },
            menu: {
                id: MenuId.BulkEditContext,
                group: 'navigation',
            },
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.toggleChecked();
    }
});
// CMD: toggle category
registerAction2(class GroupByFile extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.groupByFile',
            title: localize2('groupByFile', 'Group Changes By File'),
            category: localize2('cat', 'Refactor Preview'),
            icon: Codicon.ungroupByRefType,
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate(), BulkEditPreviewContribution.ctxEnabled),
            menu: [
                {
                    id: MenuId.BulkEditTitle,
                    when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate()),
                    group: 'navigation',
                    order: 3,
                },
            ],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.groupByFile();
    }
});
registerAction2(class GroupByType extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.groupByType',
            title: localize2('groupByType', 'Group Changes By Type'),
            category: localize2('cat', 'Refactor Preview'),
            icon: Codicon.groupByRefType,
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile, BulkEditPreviewContribution.ctxEnabled),
            menu: [
                {
                    id: MenuId.BulkEditTitle,
                    when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile),
                    group: 'navigation',
                    order: 3,
                },
            ],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.groupByType();
    }
});
registerAction2(class ToggleGrouping extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.toggleGrouping',
            title: localize2('groupByType', 'Group Changes By Type'),
            category: localize2('cat', 'Refactor Preview'),
            icon: Codicon.listTree,
            toggled: BulkEditPane.ctxGroupByFile.negate(),
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPreviewContribution.ctxEnabled),
            menu: [
                {
                    id: MenuId.BulkEditContext,
                    order: 3,
                },
            ],
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.toggleGrouping();
    }
});
registerWorkbenchContribution2(BulkEditPreviewContribution.ID, BulkEditPreviewContribution, 2 /* WorkbenchPhase.BlockRestore */);
const refactorPreviewViewIcon = registerIcon('refactor-preview-view-icon', Codicon.lightbulb, localize('refactorPreviewViewIcon', 'View icon of the refactor preview view.'));
const container = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: BulkEditPane.ID,
    title: localize2('panel', 'Refactor Preview'),
    hideIfEmpty: true,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        BulkEditPane.ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    icon: refactorPreviewViewIcon,
    storageId: BulkEditPane.ID,
}, 1 /* ViewContainerLocation.Panel */);
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([
    {
        id: BulkEditPane.ID,
        name: localize2('panel', 'Refactor Preview'),
        when: BulkEditPreviewContribution.ctxEnabled,
        ctorDescriptor: new SyncDescriptor(BulkEditPane),
        containerIcon: refactorPreviewViewIcon,
    },
], container);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzlFLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBR3JDLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsRUFFbEIsY0FBYyxHQUNkLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFHaEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRXZHLEtBQUssVUFBVSxlQUFlLENBQUMsWUFBMkI7SUFDekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDL0QsSUFBSSxJQUFJLFlBQVksWUFBWSxFQUFFLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELElBQU0sT0FBTyxHQUFiLE1BQU0sT0FBTztJQUdaLFlBQzZDLHFCQUFnRCxFQUNyRCxvQkFBMEM7UUFEckMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUEyQjtRQUNyRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBRWpGLElBQUksQ0FBQyxZQUFZLEdBQUcscUJBQXFCO2FBQ3ZDLHNCQUFzQixxQ0FBNkI7WUFDcEQsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQWUsRUFBRSxPQUFnQjtRQUM5Qyw2QkFBNkI7UUFDN0IsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FDakQsSUFBSSxDQUFDLFlBQVksc0NBRWpCLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixxQ0FBNkIsQ0FBQTtZQUNoRixDQUFDO1FBQ0YsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3RELE1BQU0sY0FBYyxHQUFrQixFQUFFLENBQUE7Z0JBQ3hDLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNuQyxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFO3dCQUM5RCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO3FCQUMzQyxDQUFDLENBQUE7b0JBQ0YsSUFBSSxRQUFRLEVBQUUsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDOUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDM0IsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUMzQixLQUFLLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUM1RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTVDSyxPQUFPO0lBSVYsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLG9CQUFvQixDQUFBO0dBTGpCLE9BQU8sQ0E0Q1o7QUFFRCxNQUFNLGNBQWM7SUFDbkIsWUFDVSxPQUFnQixFQUNoQixNQUErQixJQUFJLHVCQUF1QixFQUFFO1FBRDVELFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsUUFBRyxHQUFILEdBQUcsQ0FBeUQ7SUFDbkUsQ0FBQztDQUNKO0FBRUQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7O2FBQ2hCLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBc0M7YUFFeEMsZUFBVSxHQUFHLElBQUksYUFBYSxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxBQUF0RCxDQUFzRDtJQU1oRixZQUM2QyxxQkFBZ0QsRUFDNUQsYUFBNEIsRUFDckIsb0JBQTBDLEVBQ2hELGNBQThCLEVBQzdDLGVBQWlDLEVBQy9CLGlCQUFxQztRQUxiLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBMkI7UUFDNUQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDckIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUNoRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFJL0QsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLFdBQVcsR0FBRyw2QkFBMkIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBcUI7UUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFMUIsTUFBTSxPQUFPLEdBQ1osSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPO1lBQzVCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNuRSxNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDM0IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsMkRBQTJEO1FBQzNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDckIsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7Z0JBQ3ZELElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDbkIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUseUNBQXlDLENBQUM7Z0JBQ3ZFLE1BQU0sRUFBRSxRQUFRLENBQ2YsUUFBUSxFQUNSLGlHQUFpRyxDQUNqRztnQkFDRCxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUN2RCxZQUFZLENBQ1o7YUFDRCxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztRQUNGLENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxPQUF1QixDQUFBO1FBQzNCLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckMsT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQTtRQUU3QixxQkFBcUI7UUFDckIsSUFBSSxDQUFDO1lBQ0osT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM3RCxDQUFDO2dCQUFTLENBQUM7WUFDVixtQkFBbUI7WUFDbkIsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNyQyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ3JELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDM0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDOztBQTVFSSwyQkFBMkI7SUFVOUIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsa0JBQWtCLENBQUE7R0FmZiwyQkFBMkIsQ0E2RWhDO0FBRUQsY0FBYztBQUNkLGVBQWUsQ0FDZCxNQUFNLFdBQVksU0FBUSxPQUFPO0lBQ2hDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QjtZQUMzQixLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQztZQUM5QyxRQUFRLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQztZQUM5QyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDbkIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLDJCQUEyQixDQUFDLFVBQVUsRUFDdEMsWUFBWSxDQUFDLG9CQUFvQixDQUNqQztZQUNELElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7b0JBQzFCLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFLDJDQUFpQyxFQUFFO2dCQUMzQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsMkJBQTJCLENBQUMsVUFBVSxFQUN0QyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUM3QztnQkFDRCxPQUFPLEVBQUUsaURBQThCO2FBQ3ZDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNoRCxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUE7SUFDZixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZTtBQUNmLGVBQWUsQ0FDZCxNQUFNLGFBQWMsU0FBUSxPQUFPO0lBQ2xDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlCQUF5QjtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQztZQUNsRCxRQUFRLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQztZQUM5QyxJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVE7WUFDdEIsWUFBWSxFQUFFLDJCQUEyQixDQUFDLFVBQVU7WUFDcEQsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEQsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxxQkFBcUI7QUFDckIsZUFBZSxDQUNkLE1BQU0sWUFBYSxTQUFRLE9BQU87SUFDakM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDO1lBQ3BELFFBQVEsRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDO1lBQzlDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQyxVQUFVO1lBQ3BELFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsSUFBSSxFQUFFLDRCQUE0QjtnQkFDbEMsT0FBTyx3QkFBZTthQUN0QjtZQUNELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzFCLEtBQUssRUFBRSxZQUFZO2FBQ25CO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNoRCxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDdEIsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELHVCQUF1QjtBQUN2QixlQUFlLENBQ2QsTUFBTSxXQUFZLFNBQVEsT0FBTztJQUNoQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQUUsdUJBQXVCLENBQUM7WUFDeEQsUUFBUSxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUM7WUFDOUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7WUFDOUIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLFlBQVksQ0FBQyxnQkFBZ0IsRUFDN0IsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFDcEMsMkJBQTJCLENBQUMsVUFBVSxDQUN0QztZQUNELElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWE7b0JBQ3hCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixZQUFZLENBQUMsZ0JBQWdCLEVBQzdCLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQ3BDO29CQUNELEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLElBQUksR0FBRyxNQUFNLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNoRCxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUE7SUFDcEIsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLFdBQVksU0FBUSxPQUFPO0lBQ2hDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQztZQUN4RCxRQUFRLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQztZQUM5QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWM7WUFDNUIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLFlBQVksQ0FBQyxnQkFBZ0IsRUFDN0IsWUFBWSxDQUFDLGNBQWMsRUFDM0IsMkJBQTJCLENBQUMsVUFBVSxDQUN0QztZQUNELElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWE7b0JBQ3hCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDO29CQUNwRixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEQsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQ3BCLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSxjQUFlLFNBQVEsT0FBTztJQUNuQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7WUFDcEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQUUsdUJBQXVCLENBQUM7WUFDeEQsUUFBUSxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUM7WUFDOUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLE9BQU8sRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUM3QyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsWUFBWSxDQUFDLGdCQUFnQixFQUM3QiwyQkFBMkIsQ0FBQyxVQUFVLENBQ3RDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEQsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCw4QkFBOEIsQ0FDN0IsMkJBQTJCLENBQUMsRUFBRSxFQUM5QiwyQkFBMkIsc0NBRTNCLENBQUE7QUFFRCxNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FDM0MsNEJBQTRCLEVBQzVCLE9BQU8sQ0FBQyxTQUFTLEVBQ2pCLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSx5Q0FBeUMsQ0FBQyxDQUM5RSxDQUFBO0FBRUQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDNUIsdUJBQXVCLENBQUMsc0JBQXNCLENBQzlDLENBQUMscUJBQXFCLENBQ3RCO0lBQ0MsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFO0lBQ25CLEtBQUssRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDO0lBQzdDLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRTtRQUNyRCxZQUFZLENBQUMsRUFBRTtRQUNmLEVBQUUsb0NBQW9DLEVBQUUsSUFBSSxFQUFFO0tBQzlDLENBQUM7SUFDRixJQUFJLEVBQUUsdUJBQXVCO0lBQzdCLFNBQVMsRUFBRSxZQUFZLENBQUMsRUFBRTtDQUMxQixzQ0FFRCxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMsYUFBYSxDQUMvRTtJQUNDO1FBQ0MsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFO1FBQ25CLElBQUksRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDO1FBQzVDLElBQUksRUFBRSwyQkFBMkIsQ0FBQyxVQUFVO1FBQzVDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxZQUFZLENBQUM7UUFDaEQsYUFBYSxFQUFFLHVCQUF1QjtLQUN0QztDQUNELEVBQ0QsU0FBUyxDQUNULENBQUEifQ==