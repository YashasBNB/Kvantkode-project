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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yR3JvdXBXYXRlcm1hcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8s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