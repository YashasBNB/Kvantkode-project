/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../platform/update/common/update.config.contribution.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProductContribution, UpdateContribution, CONTEXT_UPDATE_STATE, SwitchProductQualityContribution, RELEASE_NOTES_URL, showReleaseNotesInEditor, DOWNLOAD_URL, } from './update.js';
import product from '../../../../platform/product/common/product.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { ShowCurrentReleaseNotesActionId, ShowCurrentReleaseNotesFromCurrentFileActionId, } from '../common/update.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { URI } from '../../../../base/common/uri.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
const workbench = Registry.as(WorkbenchExtensions.Workbench);
workbench.registerWorkbenchContribution(ProductContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(UpdateContribution, 3 /* LifecyclePhase.Restored */);
workbench.registerWorkbenchContribution(SwitchProductQualityContribution, 3 /* LifecyclePhase.Restored */);
// Release notes
export class ShowCurrentReleaseNotesAction extends Action2 {
    constructor() {
        super({
            id: ShowCurrentReleaseNotesActionId,
            title: {
                ...localize2('showReleaseNotes', 'Show Release Notes'),
                mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, 'Show &&Release Notes'),
            },
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: RELEASE_NOTES_URL,
            menu: [
                {
                    id: MenuId.MenubarHelpMenu,
                    group: '1_welcome',
                    order: 5,
                    when: RELEASE_NOTES_URL,
                },
            ],
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        try {
            await showReleaseNotesInEditor(instantiationService, productService.version, false);
        }
        catch (err) {
            if (productService.releaseNotesUrl) {
                await openerService.open(URI.parse(productService.releaseNotesUrl));
            }
            else {
                throw new Error(localize('update.noReleaseNotesOnline', 'This version of {0} does not have release notes online', productService.nameLong));
            }
        }
    }
}
export class ShowCurrentReleaseNotesFromCurrentFileAction extends Action2 {
    constructor() {
        super({
            id: ShowCurrentReleaseNotesFromCurrentFileActionId,
            title: {
                ...localize2('showReleaseNotesCurrentFile', 'Open Current File as Release Notes'),
                mnemonicTitle: localize({ key: 'mshowReleaseNotes', comment: ['&& denotes a mnemonic'] }, 'Show &&Release Notes'),
            },
            category: localize2('developerCategory', 'Developer'),
            f1: true,
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const productService = accessor.get(IProductService);
        try {
            await showReleaseNotesInEditor(instantiationService, productService.version, true);
        }
        catch (err) {
            throw new Error(localize('releaseNotesFromFileNone', 'Cannot open the current file as Release Notes'));
        }
    }
}
registerAction2(ShowCurrentReleaseNotesAction);
registerAction2(ShowCurrentReleaseNotesFromCurrentFileAction);
// Update
export class CheckForUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.checkForUpdate',
            title: localize2('checkForUpdates', 'Check for Updates...'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */),
        });
    }
    async run(accessor) {
        const updateService = accessor.get(IUpdateService);
        return updateService.checkForUpdates(true);
    }
}
class DownloadUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.downloadUpdate',
            title: localize2('downloadUpdate', 'Download Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */),
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).downloadUpdate();
    }
}
class InstallUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.installUpdate',
            title: localize2('installUpdate', 'Install Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */),
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).applyUpdate();
    }
}
class RestartToUpdateAction extends Action2 {
    constructor() {
        super({
            id: 'update.restartToUpdate',
            title: localize2('restartToUpdate', 'Restart to Update'),
            category: { value: product.nameShort, original: product.nameShort },
            f1: true,
            precondition: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */),
        });
    }
    async run(accessor) {
        await accessor.get(IUpdateService).quitAndInstall();
    }
}
class DownloadAction extends Action2 {
    static { this.ID = 'workbench.action.download'; }
    constructor() {
        super({
            id: DownloadAction.ID,
            title: localize2('openDownloadPage', 'Download {0}', product.nameLong),
            precondition: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL), // Only show when running in a web browser and a download url is available
            f1: true,
            menu: [
                {
                    id: MenuId.StatusBarWindowIndicatorMenu,
                    when: ContextKeyExpr.and(IsWebContext, DOWNLOAD_URL),
                },
            ],
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.downloadUrl) {
            openerService.open(URI.parse(productService.downloadUrl));
        }
    }
}
registerAction2(DownloadAction);
registerAction2(CheckForUpdateAction);
registerAction2(DownloadUpdateAction);
registerAction2(InstallUpdateAction);
registerAction2(RestartToUpdateAction);
if (isWindows) {
    class DeveloperApplyUpdateAction extends Action2 {
        constructor() {
            super({
                id: '_update.applyupdate',
                title: localize2('applyUpdate', 'Apply Update...'),
                category: Categories.Developer,
                f1: true,
                precondition: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */),
            });
        }
        async run(accessor) {
            const updateService = accessor.get(IUpdateService);
            const fileDialogService = accessor.get(IFileDialogService);
            const updatePath = await fileDialogService.showOpenDialog({
                title: localize('pickUpdate', 'Apply Update'),
                filters: [{ name: 'Setup', extensions: ['exe'] }],
                canSelectFiles: true,
                openLabel: mnemonicButtonLabel(localize({ key: 'updateButton', comment: ['&& denotes a mnemonic'] }, '&&Update')),
            });
            if (!updatePath || !updatePath[0]) {
                return;
            }
            await updateService._applySpecificUpdate(updatePath[0].fsPath);
        }
    }
    registerAction2(DeveloperApplyUpdateAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VwZGF0ZS9icm93c2VyL3VwZGF0ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsZ0NBQWdDLEVBQ2hDLGlCQUFpQixFQUNqQix3QkFBd0IsRUFDeEIsWUFBWSxHQUNaLE1BQU0sYUFBYSxDQUFBO0FBRXBCLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0Is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