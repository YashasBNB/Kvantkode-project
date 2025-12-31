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
import { groupBy } from '../../../../../base/common/arrays.js';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { uppercaseFirstLetter } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { JUPYTER_EXTENSION_ID, KERNEL_RECOMMENDATIONS, } from '../notebookBrowser.js';
import { executingStateIcon, selectKernelIcon } from '../notebookIcons.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../../common/notebookKernelService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { URI } from '../../../../../base/common/uri.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { SELECT_KERNEL_ID } from '../controller/coreActions.js';
import { IExtensionManagementServerService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
function isKernelPick(item) {
    return 'kernel' in item;
}
function isGroupedKernelsPick(item) {
    return 'kernels' in item;
}
function isSourcePick(item) {
    return 'action' in item;
}
function isInstallExtensionPick(item) {
    return item.id === 'installSuggested' && 'extensionIds' in item;
}
function isSearchMarketplacePick(item) {
    return item.id === 'install';
}
function isKernelSourceQuickPickItem(item) {
    return 'command' in item;
}
function supportAutoRun(item) {
    return 'autoRun' in item && !!item.autoRun;
}
const KERNEL_PICKER_UPDATE_DEBOUNCE = 200;
function toKernelQuickPick(kernel, selected) {
    const res = {
        kernel,
        picked: kernel.id === selected?.id,
        label: kernel.label,
        description: kernel.description,
        detail: kernel.detail,
    };
    if (kernel.id === selected?.id) {
        if (!res.description) {
            res.description = localize('current1', 'Currently Selected');
        }
        else {
            res.description = localize('current2', '{0} - Currently Selected', res.description);
        }
    }
    return res;
}
class KernelPickerStrategyBase {
    constructor(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _commandService, _extensionManagementServerService) {
        this._notebookKernelService = _notebookKernelService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._labelService = _labelService;
        this._logService = _logService;
        this._extensionWorkbenchService = _extensionWorkbenchService;
        this._extensionService = _extensionService;
        this._commandService = _commandService;
        this._extensionManagementServerService = _extensionManagementServerService;
    }
    async showQuickPick(editor, wantedId, skipAutoRun) {
        const notebook = editor.textModel;
        const scopedContextKeyService = editor.scopedContextKeyService;
        const matchResult = this._getMatchingResult(notebook);
        const { selected, all } = matchResult;
        let newKernel;
        if (wantedId) {
            for (const candidate of all) {
                if (candidate.id === wantedId) {
                    newKernel = candidate;
                    break;
                }
            }
            if (!newKernel) {
                this._logService.warn(`wanted kernel DOES NOT EXIST, wanted: ${wantedId}, all: ${all.map((k) => k.id)}`);
                return false;
            }
        }
        if (newKernel) {
            this._selecteKernel(notebook, newKernel);
            return true;
        }
        const localDisposableStore = new DisposableStore();
        const quickPick = localDisposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        const quickPickItems = this._getKernelPickerQuickPickItems(notebook, matchResult, this._notebookKernelService, scopedContextKeyService);
        if (quickPickItems.length === 1 && supportAutoRun(quickPickItems[0]) && !skipAutoRun) {
            const picked = await this._handleQuickPick(editor, quickPickItems[0], quickPickItems);
            localDisposableStore.dispose();
            return picked;
        }
        quickPick.items = quickPickItems;
        quickPick.canSelectMany = false;
        quickPick.placeholder = selected
            ? localize('prompt.placeholder.change', "Change kernel for '{0}'", this._labelService.getUriLabel(notebook.uri, { relative: true }))
            : localize('prompt.placeholder.select', "Select kernel for '{0}'", this._labelService.getUriLabel(notebook.uri, { relative: true }));
        quickPick.busy = this._notebookKernelService.getKernelDetectionTasks(notebook).length > 0;
        const kernelDetectionTaskListener = this._notebookKernelService.onDidChangeKernelDetectionTasks(() => {
            quickPick.busy = this._notebookKernelService.getKernelDetectionTasks(notebook).length > 0;
        });
        // run extension recommendataion task if quickPickItems is empty
        const extensionRecommendataionPromise = quickPickItems.length === 0
            ? createCancelablePromise((token) => this._showInstallKernelExtensionRecommendation(notebook, quickPick, this._extensionWorkbenchService, token))
            : undefined;
        const kernelChangeEventListener = Event.debounce(Event.any(this._notebookKernelService.onDidChangeSourceActions, this._notebookKernelService.onDidAddKernel, this._notebookKernelService.onDidRemoveKernel, this._notebookKernelService.onDidChangeNotebookAffinity), (last, _current) => last, KERNEL_PICKER_UPDATE_DEBOUNCE)(async () => {
            // reset quick pick progress
            quickPick.busy = false;
            extensionRecommendataionPromise?.cancel();
            const currentActiveItems = quickPick.activeItems;
            const matchResult = this._getMatchingResult(notebook);
            const quickPickItems = this._getKernelPickerQuickPickItems(notebook, matchResult, this._notebookKernelService, scopedContextKeyService);
            quickPick.keepScrollPosition = true;
            // recalcuate active items
            const activeItems = [];
            for (const item of currentActiveItems) {
                if (isKernelPick(item)) {
                    const kernelId = item.kernel.id;
                    const sameItem = quickPickItems.find((pi) => isKernelPick(pi) && pi.kernel.id === kernelId);
                    if (sameItem) {
                        activeItems.push(sameItem);
                    }
                }
                else if (isSourcePick(item)) {
                    const sameItem = quickPickItems.find((pi) => isSourcePick(pi) && pi.action.action.id === item.action.action.id);
                    if (sameItem) {
                        activeItems.push(sameItem);
                    }
                }
            }
            quickPick.items = quickPickItems;
            quickPick.activeItems = activeItems;
        }, this);
        const pick = await new Promise((resolve, reject) => {
            localDisposableStore.add(quickPick.onDidAccept(() => {
                const item = quickPick.selectedItems[0];
                if (item) {
                    resolve({ selected: item, items: quickPick.items });
                }
                else {
                    resolve({ selected: undefined, items: quickPick.items });
                }
                quickPick.hide();
            }));
            localDisposableStore.add(quickPick.onDidHide(() => {
                kernelDetectionTaskListener.dispose();
                kernelChangeEventListener.dispose();
                quickPick.dispose();
                resolve({ selected: undefined, items: quickPick.items });
            }));
            quickPick.show();
        });
        localDisposableStore.dispose();
        if (pick.selected) {
            return await this._handleQuickPick(editor, pick.selected, pick.items);
        }
        return false;
    }
    _getMatchingResult(notebook) {
        return this._notebookKernelService.getMatchingKernel(notebook);
    }
    async _handleQuickPick(editor, pick, quickPickItems) {
        if (isKernelPick(pick)) {
            const newKernel = pick.kernel;
            this._selecteKernel(editor.textModel, newKernel);
            return true;
        }
        // actions
        if (isSearchMarketplacePick(pick)) {
            await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, []);
            // suggestedExtension must be defined for this option to be shown, but still check to make TS happy
        }
        else if (isInstallExtensionPick(pick)) {
            await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, pick.extensionIds, this._productService.quality !== 'stable');
        }
        else if (isSourcePick(pick)) {
            // selected explicilty, it should trigger the execution?
            pick.action.runAction();
        }
        return true;
    }
    _selecteKernel(notebook, kernel) {
        this._notebookKernelService.selectKernelForNotebook(kernel, notebook);
    }
    async _showKernelExtension(extensionWorkbenchService, extensionService, extensionManagementServerService, viewType, extIds, isInsiders) {
        // If extension id is provided attempt to install the extension as the user has requested the suggested ones be installed
        const extensionsToInstall = [];
        const extensionsToInstallOnRemote = [];
        const extensionsToEnable = [];
        for (const extId of extIds) {
            const extension = (await extensionWorkbenchService.getExtensions([{ id: extId }], CancellationToken.None))[0];
            if (extension.enablementState === 9 /* EnablementState.DisabledGlobally */ ||
                extension.enablementState === 10 /* EnablementState.DisabledWorkspace */ ||
                extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */) {
                extensionsToEnable.push(extension);
            }
            else if (!extensionWorkbenchService.installed.some((e) => areSameExtensions(e.identifier, extension.identifier))) {
                // Install this extension only if it hasn't already been installed.
                const canInstall = await extensionWorkbenchService.canInstall(extension);
                if (canInstall === true) {
                    extensionsToInstall.push(extension);
                }
            }
            else if (extensionManagementServerService.remoteExtensionManagementServer) {
                // already installed, check if it should be installed on remote since we are not getting any kernels or kernel providers.
                if (extensionWorkbenchService.installed.some((e) => areSameExtensions(e.identifier, extension.identifier) &&
                    e.server === extensionManagementServerService.remoteExtensionManagementServer)) {
                    // extension exists on remote server. should not happen
                    continue;
                }
                else {
                    // extension doesn't exist on remote server
                    const canInstall = await extensionWorkbenchService.canInstall(extension);
                    if (canInstall) {
                        extensionsToInstallOnRemote.push(extension);
                    }
                }
            }
        }
        if (extensionsToInstall.length ||
            extensionsToEnable.length ||
            extensionsToInstallOnRemote.length) {
            await Promise.all([
                ...extensionsToInstall.map(async (extension) => {
                    await extensionWorkbenchService.install(extension, {
                        installPreReleaseVersion: isInsiders ?? false,
                        context: { skipWalkthrough: true },
                    }, 15 /* ProgressLocation.Notification */);
                }),
                ...extensionsToEnable.map(async (extension) => {
                    switch (extension.enablementState) {
                        case 10 /* EnablementState.DisabledWorkspace */:
                            await extensionWorkbenchService.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
                            return;
                        case 9 /* EnablementState.DisabledGlobally */:
                            await extensionWorkbenchService.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
                            return;
                        case 2 /* EnablementState.DisabledByEnvironment */:
                            await extensionWorkbenchService.setEnablement([extension], 3 /* EnablementState.EnabledByEnvironment */);
                            return;
                        default:
                            break;
                    }
                }),
                ...extensionsToInstallOnRemote.map(async (extension) => {
                    await extensionWorkbenchService.installInServer(extension, this._extensionManagementServerService.remoteExtensionManagementServer);
                }),
            ]);
            await extensionService.activateByEvent(`onNotebook:${viewType}`);
            return;
        }
        const pascalCased = viewType
            .split(/[^a-z0-9]/gi)
            .map(uppercaseFirstLetter)
            .join('');
        await extensionWorkbenchService.openSearch(`@tag:notebookKernel${pascalCased}`);
    }
    async _showInstallKernelExtensionRecommendation(notebookTextModel, quickPick, extensionWorkbenchService, token) {
        quickPick.busy = true;
        const newQuickPickItems = await this._getKernelRecommendationsQuickPickItems(notebookTextModel, extensionWorkbenchService);
        quickPick.busy = false;
        if (token.isCancellationRequested) {
            return;
        }
        if (newQuickPickItems && quickPick.items.length === 0) {
            quickPick.items = newQuickPickItems;
        }
    }
    async _getKernelRecommendationsQuickPickItems(notebookTextModel, extensionWorkbenchService) {
        const quickPickItems = [];
        const language = this.getSuggestedLanguage(notebookTextModel);
        const suggestedExtension = language
            ? this.getSuggestedKernelFromLanguage(notebookTextModel.viewType, language)
            : undefined;
        if (suggestedExtension) {
            await extensionWorkbenchService.queryLocal();
            const extensions = extensionWorkbenchService.installed.filter((e) => (e.enablementState === 3 /* EnablementState.EnabledByEnvironment */ ||
                e.enablementState === 11 /* EnablementState.EnabledGlobally */ ||
                e.enablementState === 12 /* EnablementState.EnabledWorkspace */) &&
                suggestedExtension.extensionIds.includes(e.identifier.id));
            if (extensions.length === suggestedExtension.extensionIds.length) {
                // it's installed but might be detecting kernels
                return undefined;
            }
            // We have a suggested kernel, show an option to install it
            quickPickItems.push({
                id: 'installSuggested',
                description: suggestedExtension.displayName ?? suggestedExtension.extensionIds.join(', '),
                label: `$(${Codicon.lightbulb.id}) ` +
                    localize('installSuggestedKernel', 'Install/Enable suggested extensions'),
                extensionIds: suggestedExtension.extensionIds,
            });
        }
        // there is no kernel, show the install from marketplace
        quickPickItems.push({
            id: 'install',
            label: localize('searchForKernels', 'Browse marketplace for kernel extensions'),
        });
        return quickPickItems;
    }
    /**
     * Examine the most common language in the notebook
     * @param notebookTextModel The notebook text model
     * @returns What the suggested language is for the notebook. Used for kernal installing
     */
    getSuggestedLanguage(notebookTextModel) {
        const metaData = notebookTextModel.metadata;
        let suggestedKernelLanguage = metaData?.metadata?.language_info
            ?.name;
        // TODO how do we suggest multi language notebooks?
        if (!suggestedKernelLanguage) {
            const cellLanguages = notebookTextModel.cells
                .map((cell) => cell.language)
                .filter((language) => language !== 'markdown');
            // Check if cell languages is all the same
            if (cellLanguages.length > 1) {
                const firstLanguage = cellLanguages[0];
                if (cellLanguages.every((language) => language === firstLanguage)) {
                    suggestedKernelLanguage = firstLanguage;
                }
            }
        }
        return suggestedKernelLanguage;
    }
    /**
     * Given a language and notebook view type suggest a kernel for installation
     * @param language The language to find a suggested kernel extension for
     * @returns A recommednation object for the recommended extension, else undefined
     */
    getSuggestedKernelFromLanguage(viewType, language) {
        const recommendation = KERNEL_RECOMMENDATIONS.get(viewType)?.get(language);
        return recommendation;
    }
}
let KernelPickerMRUStrategy = class KernelPickerMRUStrategy extends KernelPickerStrategyBase {
    constructor(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _extensionManagementServerService, _commandService, _notebookKernelHistoryService, _openerService) {
        super(_notebookKernelService, _productService, _quickInputService, _labelService, _logService, _extensionWorkbenchService, _extensionService, _commandService, _extensionManagementServerService);
        this._notebookKernelHistoryService = _notebookKernelHistoryService;
        this._openerService = _openerService;
    }
    _getKernelPickerQuickPickItems(notebookTextModel, matchResult, notebookKernelService, scopedContextKeyService) {
        const quickPickItems = [];
        if (matchResult.selected) {
            const kernelItem = toKernelQuickPick(matchResult.selected, matchResult.selected);
            quickPickItems.push(kernelItem);
        }
        matchResult.suggestions
            .filter((kernel) => kernel.id !== matchResult.selected?.id)
            .map((kernel) => toKernelQuickPick(kernel, matchResult.selected))
            .forEach((kernel) => {
            quickPickItems.push(kernel);
        });
        const shouldAutoRun = quickPickItems.length === 0;
        if (quickPickItems.length > 0) {
            quickPickItems.push({
                type: 'separator',
            });
        }
        // select another kernel quick pick
        quickPickItems.push({
            id: 'selectAnother',
            label: localize('selectAnotherKernel.more', 'Select Another Kernel...'),
            autoRun: shouldAutoRun,
        });
        return quickPickItems;
    }
    _selecteKernel(notebook, kernel) {
        const currentInfo = this._notebookKernelService.getMatchingKernel(notebook);
        if (currentInfo.selected) {
            // there is already a selected kernel
            this._notebookKernelHistoryService.addMostRecentKernel(currentInfo.selected);
        }
        super._selecteKernel(notebook, kernel);
        this._notebookKernelHistoryService.addMostRecentKernel(kernel);
    }
    _getMatchingResult(notebook) {
        const { selected, all } = this._notebookKernelHistoryService.getKernels(notebook);
        const matchingResult = this._notebookKernelService.getMatchingKernel(notebook);
        return {
            selected: selected,
            all: matchingResult.all,
            suggestions: all,
            hidden: [],
        };
    }
    async _handleQuickPick(editor, pick, items) {
        if (pick.id === 'selectAnother') {
            return this.displaySelectAnotherQuickPick(editor, items.length === 1 && items[0] === pick);
        }
        return super._handleQuickPick(editor, pick, items);
    }
    async displaySelectAnotherQuickPick(editor, kernelListEmpty) {
        const notebook = editor.textModel;
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        const quickPickItem = await new Promise((resolve) => {
            // select from kernel sources
            quickPick.title = kernelListEmpty
                ? localize('select', 'Select Kernel')
                : localize('selectAnotherKernel', 'Select Another Kernel');
            quickPick.placeholder = localize('selectKernel.placeholder', 'Type to choose a kernel source');
            quickPick.busy = true;
            quickPick.buttons = [this._quickInputService.backButton];
            quickPick.show();
            disposables.add(quickPick.onDidTriggerButton((button) => {
                if (button === this._quickInputService.backButton) {
                    resolve(button);
                }
            }));
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                if (isKernelSourceQuickPickItem(e.item) && e.item.documentation !== undefined) {
                    const uri = URI.isUri(e.item.documentation)
                        ? URI.parse(e.item.documentation)
                        : await this._commandService.executeCommand(e.item.documentation);
                    void this._openerService.open(uri, { openExternal: true });
                }
            }));
            disposables.add(quickPick.onDidAccept(async () => {
                resolve(quickPick.selectedItems[0]);
            }));
            disposables.add(quickPick.onDidHide(() => {
                resolve(undefined);
            }));
            this._calculdateKernelSources(editor).then((quickPickItems) => {
                quickPick.items = quickPickItems;
                if (quickPick.items.length > 0) {
                    quickPick.busy = false;
                }
            });
            disposables.add(Event.debounce(Event.any(this._notebookKernelService.onDidChangeSourceActions, this._notebookKernelService.onDidAddKernel, this._notebookKernelService.onDidRemoveKernel), (last, _current) => last, KERNEL_PICKER_UPDATE_DEBOUNCE)(async () => {
                quickPick.busy = true;
                const quickPickItems = await this._calculdateKernelSources(editor);
                quickPick.items = quickPickItems;
                quickPick.busy = false;
            }));
        });
        quickPick.hide();
        disposables.dispose();
        if (quickPickItem === this._quickInputService.backButton) {
            return this.showQuickPick(editor, undefined, true);
        }
        if (quickPickItem) {
            const selectedKernelPickItem = quickPickItem;
            if (isKernelSourceQuickPickItem(selectedKernelPickItem)) {
                try {
                    const selectedKernelId = await this._executeCommand(notebook, selectedKernelPickItem.command);
                    if (selectedKernelId) {
                        const { all } = await this._getMatchingResult(notebook);
                        const kernel = all.find((kernel) => kernel.id === `ms-toolsai.jupyter/${selectedKernelId}`);
                        if (kernel) {
                            await this._selecteKernel(notebook, kernel);
                            return true;
                        }
                        return true;
                    }
                    else {
                        return this.displaySelectAnotherQuickPick(editor, false);
                    }
                }
                catch (ex) {
                    return false;
                }
            }
            else if (isKernelPick(selectedKernelPickItem)) {
                await this._selecteKernel(notebook, selectedKernelPickItem.kernel);
                return true;
            }
            else if (isGroupedKernelsPick(selectedKernelPickItem)) {
                await this._selectOneKernel(notebook, selectedKernelPickItem.label, selectedKernelPickItem.kernels);
                return true;
            }
            else if (isSourcePick(selectedKernelPickItem)) {
                // selected explicilty, it should trigger the execution?
                try {
                    await selectedKernelPickItem.action.runAction();
                    return true;
                }
                catch (ex) {
                    return false;
                }
            }
            else if (isSearchMarketplacePick(selectedKernelPickItem)) {
                await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, []);
                return true;
            }
            else if (isInstallExtensionPick(selectedKernelPickItem)) {
                await this._showKernelExtension(this._extensionWorkbenchService, this._extensionService, this._extensionManagementServerService, editor.textModel.viewType, selectedKernelPickItem.extensionIds, this._productService.quality !== 'stable');
                return this.displaySelectAnotherQuickPick(editor, false);
            }
        }
        return false;
    }
    async _calculdateKernelSources(editor) {
        const notebook = editor.textModel;
        const sourceActionCommands = this._notebookKernelService.getSourceActions(notebook, editor.scopedContextKeyService);
        const actions = await this._notebookKernelService.getKernelSourceActions2(notebook);
        const matchResult = this._getMatchingResult(notebook);
        if (sourceActionCommands.length === 0 && matchResult.all.length === 0 && actions.length === 0) {
            return ((await this._getKernelRecommendationsQuickPickItems(notebook, this._extensionWorkbenchService)) ?? []);
        }
        const others = matchResult.all.filter((item) => item.extension.value !== JUPYTER_EXTENSION_ID);
        const quickPickItems = [];
        // group controllers by extension
        for (const group of groupBy(others, (a, b) => a.extension.value === b.extension.value ? 0 : 1)) {
            const extension = this._extensionService.extensions.find((extension) => extension.identifier.value === group[0].extension.value);
            const source = extension?.displayName ?? extension?.description ?? group[0].extension.value;
            if (group.length > 1) {
                quickPickItems.push({
                    label: source,
                    kernels: group,
                });
            }
            else {
                quickPickItems.push({
                    label: group[0].label,
                    kernel: group[0],
                });
            }
        }
        const validActions = actions.filter((action) => action.command);
        quickPickItems.push(...validActions.map((action) => {
            const buttons = action.documentation
                ? [
                    {
                        iconClass: ThemeIcon.asClassName(Codicon.info),
                        tooltip: localize('learnMoreTooltip', 'Learn More'),
                    },
                ]
                : [];
            return {
                id: typeof action.command === 'string' ? action.command : action.command.id,
                label: action.label,
                description: action.description,
                command: action.command,
                documentation: action.documentation,
                buttons,
            };
        }));
        for (const sourceAction of sourceActionCommands) {
            const res = {
                action: sourceAction,
                picked: false,
                label: sourceAction.action.label,
                tooltip: sourceAction.action.tooltip,
            };
            quickPickItems.push(res);
        }
        return quickPickItems;
    }
    async _selectOneKernel(notebook, source, kernels) {
        const quickPickItems = kernels.map((kernel) => toKernelQuickPick(kernel, undefined));
        const localDisposableStore = new DisposableStore();
        const quickPick = localDisposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.items = quickPickItems;
        quickPick.canSelectMany = false;
        quickPick.title = localize('selectKernelFromExtension', 'Select Kernel from {0}', source);
        localDisposableStore.add(quickPick.onDidAccept(async () => {
            if (quickPick.selectedItems &&
                quickPick.selectedItems.length > 0 &&
                isKernelPick(quickPick.selectedItems[0])) {
                await this._selecteKernel(notebook, quickPick.selectedItems[0].kernel);
            }
            quickPick.hide();
            quickPick.dispose();
        }));
        localDisposableStore.add(quickPick.onDidHide(() => {
            localDisposableStore.dispose();
        }));
        quickPick.show();
    }
    async _executeCommand(notebook, command) {
        const id = typeof command === 'string' ? command : command.id;
        const args = typeof command === 'string' ? [] : (command.arguments ?? []);
        if (typeof command === 'string' ||
            !command.arguments ||
            !Array.isArray(command.arguments) ||
            command.arguments.length === 0) {
            args.unshift({
                uri: notebook.uri,
                $mid: 14 /* MarshalledId.NotebookActionContext */,
            });
        }
        if (typeof command === 'string') {
            return this._commandService.executeCommand(id);
        }
        else {
            return this._commandService.executeCommand(id, ...args);
        }
    }
    static updateKernelStatusAction(notebook, action, notebookKernelService, notebookKernelHistoryService) {
        const detectionTasks = notebookKernelService.getKernelDetectionTasks(notebook);
        if (detectionTasks.length) {
            const info = notebookKernelService.getMatchingKernel(notebook);
            action.enabled = true;
            action.class = ThemeIcon.asClassName(ThemeIcon.modify(executingStateIcon, 'spin'));
            if (info.selected) {
                action.label = info.selected.label;
                const kernelInfo = info.selected.description ?? info.selected.detail;
                action.tooltip = kernelInfo
                    ? localize('kernels.selectedKernelAndKernelDetectionRunning', 'Selected Kernel: {0} (Kernel Detection Tasks Running)', kernelInfo)
                    : localize('kernels.detecting', 'Detecting Kernels');
            }
            else {
                action.label = localize('kernels.detecting', 'Detecting Kernels');
            }
            return;
        }
        const runningActions = notebookKernelService.getRunningSourceActions(notebook);
        const updateActionFromSourceAction = (sourceAction, running) => {
            const sAction = sourceAction.action;
            action.class = running
                ? ThemeIcon.asClassName(ThemeIcon.modify(executingStateIcon, 'spin'))
                : ThemeIcon.asClassName(selectKernelIcon);
            action.label = sAction.label;
            action.enabled = true;
        };
        if (runningActions.length) {
            return updateActionFromSourceAction(runningActions[0] /** TODO handle multiple actions state */, true);
        }
        const { selected } = notebookKernelHistoryService.getKernels(notebook);
        if (selected) {
            action.label = selected.label;
            action.class = ThemeIcon.asClassName(selectKernelIcon);
            action.tooltip = selected.description ?? selected.detail ?? '';
        }
        else {
            action.label = localize('select', 'Select Kernel');
            action.class = ThemeIcon.asClassName(selectKernelIcon);
            action.tooltip = '';
        }
    }
    static async resolveKernel(notebook, notebookKernelService, notebookKernelHistoryService, commandService) {
        const alreadySelected = notebookKernelHistoryService.getKernels(notebook);
        if (alreadySelected.selected) {
            return alreadySelected.selected;
        }
        await commandService.executeCommand(SELECT_KERNEL_ID);
        const { selected } = notebookKernelHistoryService.getKernels(notebook);
        return selected;
    }
};
KernelPickerMRUStrategy = __decorate([
    __param(0, INotebookKernelService),
    __param(1, IProductService),
    __param(2, IQuickInputService),
    __param(3, ILabelService),
    __param(4, ILogService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionService),
    __param(7, IExtensionManagementServerService),
    __param(8, ICommandService),
    __param(9, INotebookKernelHistoryService),
    __param(10, IOpenerService)
], KernelPickerMRUStrategy);
export { KernelPickerMRUStrategy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxRdWlja1BpY2tTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rS2VybmVsUXVpY2tQaWNrU3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFMUYsT0FBTyxFQUVOLGtCQUFrQixHQUlsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQWMsMkJBQTJCLEVBQUUs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