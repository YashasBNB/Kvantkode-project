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
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isNative, OS } from '../../../../base/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { append, clearNode, $, h } from '../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isRecentFolder, IWorkspacesService, } from '../../../../platform/workspaces/common/workspaces.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ColorScheme } from '../../web.api.js';
import { OpenFileFolderAction, OpenFolderAction } from '../../actions/workspaceActions.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
/* eslint-disable */ // Void
import { VOID_CTRL_K_ACTION_ID, VOID_CTRL_L_ACTION_ID, } from '../../../contrib/void/browser/actionIDs.js';
import { VIEWLET_ID as REMOTE_EXPLORER_VIEWLET_ID } from '../../../contrib/remote/browser/remoteExplorer.js';
/* eslint-enable */
// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }
// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };
// const openCopilotEdits: WatermarkEntry = { text: localize('watermark.openCopilotEdits', "Open Copilot Edits"), id: 'workbench.action.chat.openEditSession', when: { native: showCopilot, web: showCopilot } };
// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);
// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];
// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];
// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// 	openCopilotEdits
// ];
let EditorGroupWatermark = class EditorGroupWatermark extends Disposable {
    constructor(container, keybindingService, contextService, configurationService, themeService, workspacesService, commandService, hostService, labelService, viewsService) {
        super();
        this.keybindingService = keybindingService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.workspacesService = workspacesService;
        this.commandService = commandService;
        this.hostService = hostService;
        this.labelService = labelService;
        this.viewsService = viewsService;
        this.transientDisposables = this._register(new DisposableStore());
        this.currentDisposables = new Set();
        const elements = h('.editor-group-watermark', [
            h('.letterpress@icon'),
            h('.shortcuts@shortcuts'),
        ]);
        append(container, elements.root);
        this.shortcuts = elements.shortcuts; // shortcuts div is modified on render()
        // void icon style
        const updateTheme = () => {
            const theme = this.themeService.getColorTheme().type;
            const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK;
            elements.icon.style.maxWidth = '220px';
            elements.icon.style.opacity = '50%';
            elements.icon.style.filter = isDark ? '' : 'invert(1)'; //brightness(.5)
        };
        updateTheme();
        this._register(this.themeService.onDidColorThemeChange(updateTheme));
        this.registerListeners();
        this.workbenchState = contextService.getWorkbenchState();
        this.render();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.tips.enabled')) {
                this.render();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState((workbenchState) => {
            if (this.workbenchState === workbenchState) {
                return;
            }
            this.workbenchState = workbenchState;
            this.render();
        }));
        // const allEntriesWhenClauses = [...noFolderEntries, ...folderEntries].filter(entry => entry.when !== undefined).map(entry => entry.when!);
        // const allKeys = new Set<string>();
        // allEntriesWhenClauses.forEach(when => when.keys().forEach(key => allKeys.add(key)));
        // this._register(this.contextKeyService.onDidChangeContext(e => {
        // 	if (e.affectsSome(allKeys)) {
        // 		this.render();
        // 	}
        // }));
    }
    render() {
        this.clear();
        const voidIconBox = append(this.shortcuts, $('.watermark-box'));
        const recentsBox = append(this.shortcuts, $('div'));
        recentsBox.style.display = 'flex';
        recentsBox.style.flex = 'row';
        recentsBox.style.justifyContent = 'center';
        const update = async () => {
            // put async at top so don't need to wait (this prevents a jitter on load)
            const recentlyOpened = await this.workspacesService
                .getRecentlyOpened()
                .catch(() => ({ files: [], workspaces: [] }))
                .then((w) => w.workspaces);
            clearNode(voidIconBox);
            clearNode(recentsBox);
            this.currentDisposables.forEach((label) => label.dispose());
            this.currentDisposables.clear();
            // Void - if the workbench is empty, show open
            if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                // Create a flex container for buttons with vertical direction
                const buttonContainer = $('div');
                buttonContainer.style.display = 'flex';
                buttonContainer.style.flexDirection = 'column'; // Change to column for vertical stacking
                buttonContainer.style.alignItems = 'center'; // Center the buttons horizontally
                buttonContainer.style.gap = '8px'; // Reduce gap between buttons from 16px to 8px
                buttonContainer.style.marginBottom = '16px';
                voidIconBox.appendChild(buttonContainer);
                // Open a folder
                const openFolderButton = h('button');
                openFolderButton.root.classList.add('void-openfolder-button');
                openFolderButton.root.style.display = 'block';
                openFolderButton.root.style.width = '124px'; // Set width to 124px as requested
                openFolderButton.root.textContent = 'Open Folder';
                openFolderButton.root.onclick = () => {
                    this.commandService.executeCommand(isMacintosh && isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID);
                    // if (this.contextKeyService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    // 	this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                    // } else {
                    // 	this.commandService.executeCommand(isMacintosh ? 'workbench.action.files.openFileFolder' : 'workbench.action.files.openFolder');
                    // }
                };
                buttonContainer.appendChild(openFolderButton.root);
                // Open SSH button
                const openSSHButton = h('button');
                openSSHButton.root.classList.add('void-openssh-button');
                openSSHButton.root.style.display = 'block';
                openSSHButton.root.style.backgroundColor = '#5a5a5a'; // Made darker than the default gray
                openSSHButton.root.style.width = '124px'; // Set width to 124px as requested
                openSSHButton.root.textContent = 'Open SSH';
                openSSHButton.root.onclick = () => {
                    this.viewsService.openViewContainer(REMOTE_EXPLORER_VIEWLET_ID);
                };
                buttonContainer.appendChild(openSSHButton.root);
                // Recents
                if (recentlyOpened.length !== 0) {
                    voidIconBox.append(...recentlyOpened
                        .map((w, i) => {
                        let fullPath;
                        let windowOpenable;
                        if (isRecentFolder(w)) {
                            windowOpenable = { folderUri: w.folderUri };
                            fullPath =
                                w.label ||
                                    this.labelService.getWorkspaceLabel(w.folderUri, { verbose: 2 /* Verbosity.LONG */ });
                        }
                        else {
                            return null;
                            // fullPath = w.label || this.labelService.getWorkspaceLabel(w.workspace, { verbose: Verbosity.LONG });
                            // windowOpenable = { workspaceUri: w.workspace.configPath };
                        }
                        const { name, parentPath } = splitRecentLabel(fullPath);
                        const linkSpan = $('span');
                        linkSpan.classList.add('void-link');
                        linkSpan.style.display = 'flex';
                        linkSpan.style.gap = '4px';
                        linkSpan.style.padding = '8px';
                        linkSpan.addEventListener('click', (e) => {
                            this.hostService.openWindow([windowOpenable], {
                                forceNewWindow: e.ctrlKey || e.metaKey,
                                remoteAuthority: w.remoteAuthority || null, // local window if remoteAuthority is not set or can not be deducted from the openable
                            });
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        const nameSpan = $('span');
                        nameSpan.innerText = name;
                        nameSpan.title = fullPath;
                        linkSpan.appendChild(nameSpan);
                        const dirSpan = $('span');
                        dirSpan.style.paddingLeft = '4px';
                        dirSpan.style.whiteSpace = 'nowrap';
                        dirSpan.style.overflow = 'hidden';
                        dirSpan.style.maxWidth = '300px';
                        dirSpan.innerText = parentPath;
                        dirSpan.title = fullPath;
                        linkSpan.appendChild(dirSpan);
                        return linkSpan;
                    })
                        .filter((v) => !!v)
                        .slice(0, 5));
                }
            }
            else {
                // show them Void keybindings
                const keys = this.keybindingService.lookupKeybinding(VOID_CTRL_L_ACTION_ID);
                const dl = append(voidIconBox, $('dl'));
                const dt = append(dl, $('dt'));
                dt.textContent = 'Chat';
                const dd = append(dl, $('dd'));
                const label = new KeybindingLabel(dd, OS, {
                    renderUnboundKeybindings: true,
                    ...defaultKeybindingLabelStyles,
                });
                if (keys)
                    label.set(keys);
                this.currentDisposables.add(label);
                const keys2 = this.keybindingService.lookupKeybinding(VOID_CTRL_K_ACTION_ID);
                const dl2 = append(voidIconBox, $('dl'));
                const dt2 = append(dl2, $('dt'));
                dt2.textContent = 'Quick Edit';
                const dd2 = append(dl2, $('dd'));
                const label2 = new KeybindingLabel(dd2, OS, {
                    renderUnboundKeybindings: true,
                    ...defaultKeybindingLabelStyles,
                });
                if (keys2)
                    label2.set(keys2);
                this.currentDisposables.add(label2);
                // const keys3 = this.keybindingService.lookupKeybinding('workbench.action.openGlobalKeybindings');
                // const button3 = append(recentsBox, $('button'));
                // button3.textContent = `Void Settings`
                // button3.style.display = 'block'
                // button3.style.marginLeft = 'auto'
                // button3.style.marginRight = 'auto'
                // button3.classList.add('void-settings-watermark-button')
                // const label3 = new KeybindingLabel(button3, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles });
                // if (keys3)
                // 	label3.set(keys3);
                // button3.onclick = () => {
                // 	this.commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID)
                // }
                // this.currentDisposables.add(label3);
            }
        };
        update();
        this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
    }
    clear() {
        clearNode(this.shortcuts);
        this.transientDisposables.clear();
    }
    dispose() {
        super.dispose();
        this.clear();
        this.currentDisposables.forEach((label) => label.dispose());
    }
};
EditorGroupWatermark = __decorate([
    __param(1, IKeybindingService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IThemeService),
    __param(5, IWorkspacesService),
    __param(6, ICommandService),
    __param(7, IHostService),
    __param(8, ILabelService),
    __param(9, IViewsService)
], EditorGroupWatermark);
export { EditorGroupWatermark };
registerColor('editorWatermark.foreground', {
    dark: transparent(editorForeground, 0.6),
    light: transparent(editorForeground, 0.68),
    hcDark: editorForeground,
    hcLight: editorForeground,
}, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/
// import { $, append, clearNode, h } from '../../../../base/browser/dom.js';
// import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
// import { coalesce, shuffle } from '../../../../base/common/arrays.js';
// import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
// import { isMacintosh, isWeb, OS } from '../../../../base/common/platform.js';
// import { localize } from '../../../../nls.js';
// import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
// import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
// import { ContextKeyExpr, ContextKeyExpression, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
// import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
// import { IStorageService, StorageScope, StorageTarget, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
// import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
// import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
// import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';
// interface WatermarkEntry {
// 	readonly id: string;
// 	readonly text: string;
// 	readonly when?: {
// 		native?: ContextKeyExpression;
// 		web?: ContextKeyExpression;
// 	};
// }
// const showCommands: WatermarkEntry = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
// const gotoFile: WatermarkEntry = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
// const openFile: WatermarkEntry = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
// const openFolder: WatermarkEntry = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
// const openFileOrFolder: WatermarkEntry = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
// const openRecent: WatermarkEntry = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
// const newUntitledFile: WatermarkEntry = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
// const findInFiles: WatermarkEntry = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
// const toggleTerminal: WatermarkEntry = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const startDebugging: WatermarkEntry = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
// const openSettings: WatermarkEntry = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
// const showCopilot = ContextKeyExpr.or(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupInstalled', true));
// const openChat: WatermarkEntry = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showCopilot, web: showCopilot } };
// const emptyWindowEntries: WatermarkEntry[] = coalesce([
// 	showCommands,
// 	...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
// 	openRecent,
// 	isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
// 	openChat
// ]);
// const randomEmptyWindowEntries: WatermarkEntry[] = [
// 	/* Nothing yet */
// ];
// const workspaceEntries: WatermarkEntry[] = [
// 	showCommands,
// 	gotoFile,
// 	openChat
// ];
// const randomWorkspaceEntries: WatermarkEntry[] = [
// 	findInFiles,
// 	startDebugging,
// 	toggleTerminal,
// 	openSettings,
// ];
// export class EditorGroupWatermark extends Disposable {
// 	private static readonly CACHED_WHEN = 'editorGroupWatermark.whenConditions';
// 	private readonly cachedWhen: { [when: string]: boolean };
// 	private readonly shortcuts: HTMLElement;
// 	private readonly transientDisposables = this._register(new DisposableStore());
// 	private readonly keybindingLabels = this._register(new DisposableStore());
// 	private enabled = false;
// 	private workbenchState: WorkbenchState;
// 	constructor(
// 		container: HTMLElement,
// 		@IKeybindingService private readonly keybindingService: IKeybindingService,
// 		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
// 		@IContextKeyService private readonly contextKeyService: IContextKeyService,
// 		@IConfigurationService private readonly configurationService: IConfigurationService,
// 		@IStorageService private readonly storageService: IStorageService
// 	) {
// 		super();
// 		this.cachedWhen = this.storageService.getObject(EditorGroupWatermark.CACHED_WHEN, StorageScope.PROFILE, Object.create(null));
// 		this.workbenchState = this.contextService.getWorkbenchState();
// 		const elements = h('.editor-group-watermark', [
// 			h('.letterpress'),
// 			h('.shortcuts@shortcuts'),
// 		]);
// 		append(container, elements.root);
// 		this.shortcuts = elements.shortcuts;
// 		this.registerListeners();
// 		this.render();
// 	}
// 	private registerListeners(): void {
// 		this._register(this.configurationService.onDidChangeConfiguration(e => {
// 			if (e.affectsConfiguration('workbench.tips.enabled') && this.enabled !== this.configurationService.getValue<boolean>('workbench.tips.enabled')) {
// 				this.render();
// 			}
// 		}));
// 		this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
// 			if (this.workbenchState !== workbenchState) {
// 				this.workbenchState = workbenchState;
// 				this.render();
// 			}
// 		}));
// 		this._register(this.storageService.onWillSaveState(e => {
// 			if (e.reason === WillSaveStateReason.SHUTDOWN) {
// 				const entries = [...emptyWindowEntries, ...randomEmptyWindowEntries, ...workspaceEntries, ...randomWorkspaceEntries];
// 				for (const entry of entries) {
// 					const when = isWeb ? entry.when?.web : entry.when?.native;
// 					if (when) {
// 						this.cachedWhen[entry.id] = this.contextKeyService.contextMatchesRules(when);
// 					}
// 				}
// 				this.storageService.store(EditorGroupWatermark.CACHED_WHEN, JSON.stringify(this.cachedWhen), StorageScope.PROFILE, StorageTarget.MACHINE);
// 			}
// 		}));
// 	}
// 	private render(): void {
// 		this.enabled = this.configurationService.getValue<boolean>('workbench.tips.enabled');
// 		clearNode(this.shortcuts);
// 		this.transientDisposables.clear();
// 		if (!this.enabled) {
// 			return;
// 		}
// 		const fixedEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? workspaceEntries : emptyWindowEntries, false /* not shuffled */);
// 		const randomEntries = this.filterEntries(this.workbenchState !== WorkbenchState.EMPTY ? randomWorkspaceEntries : randomEmptyWindowEntries, true /* shuffled */).slice(0, Math.max(0, 5 - fixedEntries.length));
// 		const entries = [...fixedEntries, ...randomEntries];
// 		const box = append(this.shortcuts, $('.watermark-box'));
// 		const update = () => {
// 			clearNode(box);
// 			this.keybindingLabels.clear();
// 			for (const entry of entries) {
// 				const keys = this.keybindingService.lookupKeybinding(entry.id);
// 				if (!keys) {
// 					continue;
// 				}
// 				const dl = append(box, $('dl'));
// 				const dt = append(dl, $('dt'));
// 				dt.textContent = entry.text;
// 				const dd = append(dl, $('dd'));
// 				const label = this.keybindingLabels.add(new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles }));
// 				label.set(keys);
// 			}
// 		};
// 		update();
// 		this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
// 	}
// 	private filterEntries(entries: WatermarkEntry[], shuffleEntries: boolean): WatermarkEntry[] {
// 		const filteredEntries = entries
// 			.filter(entry => (isWeb && !entry.when?.web) || (!isWeb && !entry.when?.native) || this.cachedWhen[entry.id])
// 			.filter(entry => !!CommandsRegistry.getCommand(entry.id))
// 			.filter(entry => !!this.keybindingService.lookupKeybinding(entry.id));
// 		if (shuffleEntries) {
// 			shuffle(filteredEntries);
// 		}
// 		return filteredEntries;
// 	}
// }
// registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JHcm91cFdhdGVybWFyay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEcsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsV0FBVyxHQUNYLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0Qs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