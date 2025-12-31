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
var NewFileTemplatesManager_1;
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, IMenuService, MenuId, registerAction2, MenuRegistry, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
const builtInSource = localize('Built-In', 'Built-In');
const category = localize2('Create', 'Create');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showNewFileEntries',
            title: localize2('welcome.newFile', 'New File...'),
            category,
            f1: true,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ + 2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 44 /* KeyCode.KeyN */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '1_new',
                order: 2,
            },
        });
    }
    async run(accessor) {
        return assertIsDefined(NewFileTemplatesManager.Instance).run();
    }
});
let NewFileTemplatesManager = class NewFileTemplatesManager extends Disposable {
    static { NewFileTemplatesManager_1 = this; }
    constructor(quickInputService, contextKeyService, commandService, keybindingService, menuService) {
        super();
        this.quickInputService = quickInputService;
        this.contextKeyService = contextKeyService;
        this.commandService = commandService;
        this.keybindingService = keybindingService;
        NewFileTemplatesManager_1.Instance = this;
        this._register({
            dispose() {
                if (NewFileTemplatesManager_1.Instance === this) {
                    NewFileTemplatesManager_1.Instance = undefined;
                }
            },
        });
        this.menu = menuService.createMenu(MenuId.NewFile, contextKeyService);
    }
    allEntries() {
        const items = [];
        for (const [groupName, group] of this.menu.getActions({ renderShortTitle: true })) {
            for (const action of group) {
                if (action instanceof MenuItemAction) {
                    items.push({
                        commandID: action.item.id,
                        from: action.item.source?.title ?? builtInSource,
                        title: action.label,
                        group: groupName,
                    });
                }
            }
        }
        return items;
    }
    async run() {
        const entries = this.allEntries();
        if (entries.length === 0) {
            throw Error('Unexpected empty new items list');
        }
        else if (entries.length === 1) {
            this.commandService.executeCommand(entries[0].commandID);
            return true;
        }
        else {
            return this.selectNewEntry(entries);
        }
    }
    async selectNewEntry(entries) {
        const { promise: resultPromise, resolve: resolveResult } = promiseWithResolvers();
        const disposables = new DisposableStore();
        const qp = this.quickInputService.createQuickPick({ useSeparators: true });
        qp.title = localize('newFileTitle', 'New File...');
        qp.placeholder = localize('newFilePlaceholder', 'Select File Type or Enter File Name...');
        qp.sortByLabel = false;
        qp.matchOnDetail = true;
        qp.matchOnDescription = true;
        const sortCategories = (a, b) => {
            const categoryPriority = { file: 1, notebook: 2 };
            if (categoryPriority[a.group] && categoryPriority[b.group]) {
                if (categoryPriority[a.group] !== categoryPriority[b.group]) {
                    return categoryPriority[b.group] - categoryPriority[a.group];
                }
            }
            else if (categoryPriority[a.group]) {
                return 1;
            }
            else if (categoryPriority[b.group]) {
                return -1;
            }
            if (a.from === builtInSource) {
                return 1;
            }
            if (b.from === builtInSource) {
                return -1;
            }
            return a.from.localeCompare(b.from);
        };
        const displayCategory = {
            file: localize('file', 'File'),
            notebook: localize('notebook', 'Notebook'),
        };
        const refreshQp = (entries) => {
            const items = [];
            let lastSeparator;
            entries
                .sort((a, b) => -sortCategories(a, b))
                .forEach((entry) => {
                const command = entry.commandID;
                const keybinding = this.keybindingService.lookupKeybinding(command || '', this.contextKeyService);
                if (lastSeparator !== entry.group) {
                    items.push({
                        type: 'separator',
                        label: displayCategory[entry.group] ?? entry.group,
                    });
                    lastSeparator = entry.group;
                }
                items.push({
                    ...entry,
                    label: entry.title,
                    type: 'item',
                    keybinding,
                    buttons: command
                        ? [
                            {
                                iconClass: 'codicon codicon-gear',
                                tooltip: localize('change keybinding', 'Configure Keybinding'),
                            },
                        ]
                        : [],
                    detail: '',
                    description: entry.from,
                });
            });
            qp.items = items;
        };
        refreshQp(entries);
        disposables.add(this.menu.onDidChange(() => refreshQp(this.allEntries())));
        disposables.add(qp.onDidChangeValue((val) => {
            if (val === '') {
                refreshQp(entries);
                return;
            }
            const currentTextEntry = {
                commandID: 'workbench.action.files.newFile',
                commandArgs: { languageId: undefined, viewType: undefined, fileName: val },
                title: localize('miNewFileWithName', 'Create New File ({0})', val),
                group: 'file',
                from: builtInSource,
            };
            refreshQp([currentTextEntry, ...entries]);
        }));
        disposables.add(qp.onDidAccept(async (e) => {
            const selected = qp.selectedItems[0];
            resolveResult(!!selected);
            qp.hide();
            if (selected) {
                await this.commandService.executeCommand(selected.commandID, selected.commandArgs);
            }
        }));
        disposables.add(qp.onDidHide(() => {
            qp.dispose();
            disposables.dispose();
            resolveResult(false);
        }));
        disposables.add(qp.onDidTriggerItemButton((e) => {
            qp.hide();
            this.commandService.executeCommand('workbench.action.openGlobalKeybindings', e.item.commandID);
            resolveResult(false);
        }));
        qp.show();
        return resultPromise;
    }
};
NewFileTemplatesManager = NewFileTemplatesManager_1 = __decorate([
    __param(0, IQuickInputService),
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IKeybindingService),
    __param(4, IMenuService)
], NewFileTemplatesManager);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NewFileTemplatesManager, 3 /* LifecyclePhase.Restored */);
MenuRegistry.appendMenuItem(MenuId.NewFile, {
    group: 'file',
    command: {
        id: 'workbench.action.files.newUntitledFile',
        title: localize('miNewFile2', 'Text File'),
    },
    order: 1,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3RmlsZS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lVmlld3MvY29tbW9uL25ld0ZpbGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFDTixPQUFPLEVBQ1AsWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEVBRWYsWUFBWSxFQUNaLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFHekMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUN0RCxNQUFNLFFBQVEsR0FBcUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFR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