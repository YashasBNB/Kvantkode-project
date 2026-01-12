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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxRdWlja1BpY2tTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tLZXJuZWxRdWlja1BpY2tTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUUxRixPQUFPLEVBRU4sa0JBQWtCLEdBSWxCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBYywyQkFBMkIs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