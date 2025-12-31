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
var InlineAnchorWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { DefinitionAction } from '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import * as nls from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { FolderThemeIcon, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ExplorerFolderContext } from '../../files/common/files.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { IChatWidgetService } from './chat.js';
import { chatAttachmentResourceContextKey, hookUpSymbolAttachmentDragAndContextMenu, } from './chatContentParts/chatAttachmentsContentPart.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
let InlineAnchorWidget = class InlineAnchorWidget extends Disposable {
    static { InlineAnchorWidget_1 = this; }
    static { this.className = 'chat-inline-anchor-widget'; }
    constructor(element, inlineReference, originalContextKeyService, contextMenuService, fileService, hoverService, instantiationService, labelService, languageService, menuService, modelService, telemetryService, themeService) {
        super();
        this.element = element;
        this.inlineReference = inlineReference;
        this._isDisposed = false;
        // TODO: Make sure we handle updates from an inlineReference being `resolved` late
        this.data =
            'uri' in inlineReference.inlineReference
                ? inlineReference.inlineReference
                : 'name' in inlineReference.inlineReference
                    ? { kind: 'symbol', symbol: inlineReference.inlineReference }
                    : { uri: inlineReference.inlineReference };
        const contextKeyService = this._register(originalContextKeyService.createScoped(element));
        this._chatResourceContext = chatAttachmentResourceContextKey.bindTo(contextKeyService);
        element.classList.add(InlineAnchorWidget_1.className, 'show-file-icons');
        let iconText;
        let iconClasses;
        let location;
        let updateContextKeys;
        if (this.data.kind === 'symbol') {
            const symbol = this.data.symbol;
            location = this.data.symbol.location;
            iconText = this.data.symbol.name;
            iconClasses = [
                'codicon',
                ...getIconClasses(modelService, languageService, undefined, undefined, SymbolKinds.toIcon(symbol.kind)),
            ];
            this._store.add(instantiationService.invokeFunction((accessor) => hookUpSymbolAttachmentDragAndContextMenu(accessor, element, contextKeyService, { value: symbol.location, name: symbol.name, kind: symbol.kind }, MenuId.ChatInlineSymbolAnchorContext)));
        }
        else {
            location = this.data;
            const label = labelService.getUriBasenameLabel(location.uri);
            iconText =
                location.range && this.data.kind !== 'symbol'
                    ? `${label}#${location.range.startLineNumber}-${location.range.endLineNumber}`
                    : label;
            let fileKind = location.uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            const recomputeIconClasses = () => getIconClasses(modelService, languageService, location.uri, fileKind, fileKind === FileKind.FOLDER && !themeService.getFileIconTheme().hasFolderIcons
                ? FolderThemeIcon
                : undefined);
            iconClasses = recomputeIconClasses();
            const refreshIconClasses = () => {
                iconEl.classList.remove(...iconClasses);
                iconClasses = recomputeIconClasses();
                iconEl.classList.add(...iconClasses);
            };
            this._register(themeService.onDidFileIconThemeChange(() => {
                refreshIconClasses();
            }));
            const isFolderContext = ExplorerFolderContext.bindTo(contextKeyService);
            fileService
                .stat(location.uri)
                .then((stat) => {
                isFolderContext.set(stat.isDirectory);
                if (stat.isDirectory) {
                    fileKind = FileKind.FOLDER;
                    refreshIconClasses();
                }
            })
                .catch(() => { });
            // Context menu
            this._register(dom.addDisposableListener(element, dom.EventType.CONTEXT_MENU, async (domEvent) => {
                const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
                dom.EventHelper.stop(domEvent, true);
                try {
                    await updateContextKeys?.();
                }
                catch (e) {
                    console.error(e);
                }
                if (this._isDisposed) {
                    return;
                }
                contextMenuService.showContextMenu({
                    contextKeyService,
                    getAnchor: () => event,
                    getActions: () => {
                        const menu = menuService.getMenuActions(MenuId.ChatInlineResourceAnchorContext, contextKeyService, { arg: location.uri });
                        return getFlatContextMenuActions(menu);
                    },
                });
            }));
        }
        const resourceContextKey = this._register(new ResourceContextKey(contextKeyService, fileService, languageService, modelService));
        resourceContextKey.set(location.uri);
        this._chatResourceContext.set(location.uri.toString());
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        element.replaceChildren(iconEl, dom.$('span.icon-label', {}, iconText));
        const fragment = location.range
            ? `${location.range.startLineNumber},${location.range.startColumn}`
            : '';
        element.setAttribute('data-href', (fragment ? location.uri.with({ fragment }) : location.uri).toString());
        // Hover
        const relativeLabel = labelService.getUriLabel(location.uri, { relative: true });
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, relativeLabel));
        // Drag and drop
        if (this.data.kind !== 'symbol') {
            element.draggable = true;
            this._register(dom.addDisposableListener(element, 'dragstart', (e) => {
                const stat = {
                    resource: location.uri,
                    selection: location.range,
                };
                instantiationService.invokeFunction((accessor) => fillEditorsDragData(accessor, [stat], e));
                e.dataTransfer?.setDragImage(element, 0, 0);
            }));
        }
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    getHTMLElement() {
        return this.element;
    }
};
InlineAnchorWidget = InlineAnchorWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IFileService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, ILabelService),
    __param(8, ILanguageService),
    __param(9, IMenuService),
    __param(10, IModelService),
    __param(11, ITelemetryService),
    __param(12, IThemeService)
], InlineAnchorWidget);
export { InlineAnchorWidget };
//#region Resource context menu
registerAction2(class AddFileToChatAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.addFileToChat'; }
    constructor() {
        super({
            id: AddFileToChatAction.id,
            title: nls.localize2('actions.attach.label', 'Add File to Chat'),
            menu: [
                {
                    id: MenuId.ChatInlineResourceAnchorContext,
                    group: 'chat',
                    order: 1,
                    when: ExplorerFolderContext.negate(),
                },
            ],
        });
    }
    async run(accessor, resource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const variablesService = accessor.get(IChatVariablesService);
        const widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        variablesService.attachContext('file', resource, widget.location);
    }
});
//#endregion
//#region Resource keybindings
registerAction2(class CopyResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.copyResource'; }
    constructor() {
        super({
            id: CopyResourceAction.id,
            title: nls.localize2('actions.copy.label', 'Copy'),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            },
        });
    }
    async run(accessor) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        const clipboardService = accessor.get(IClipboardService);
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return;
        }
        // TODO: we should also write out the standard mime types so that external programs can use them
        // like how `fillEditorsDragData` works but without having an event to work with.
        const resource = anchor.data.kind === 'symbol' ? anchor.data.symbol.location.uri : anchor.data.uri;
        clipboardService.writeResources([resource]);
    }
});
registerAction2(class OpenToSideResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.openToSide'; }
    constructor() {
        super({
            id: OpenToSideResourceAction.id,
            title: nls.localize2('actions.openToSide.label', 'Open to the Side'),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                },
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map((id) => ({
                id: id,
                group: 'navigation',
                order: 1,
            })),
        });
    }
    async run(accessor, arg) {
        const editorService = accessor.get(IEditorService);
        const target = this.getTarget(accessor, arg);
        if (!target) {
            return;
        }
        const input = URI.isUri(target)
            ? { resource: target }
            : {
                resource: target.uri,
                options: {
                    selection: {
                        startColumn: target.range.startColumn,
                        startLineNumber: target.range.startLineNumber,
                    },
                },
            };
        await editorService.openEditors([input], SIDE_GROUP);
    }
    getTarget(accessor, arg) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        if (arg) {
            return arg;
        }
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return undefined;
        }
        return anchor.data.kind === 'symbol' ? anchor.data.symbol.location : anchor.data.uri;
    }
});
//#endregion
//#region Symbol context menu
registerAction2(class GoToDefinitionAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToDefinition'; }
    constructor() {
        super({
            id: GoToDefinitionAction.id,
            title: {
                ...nls.localize2('actions.goToDecl.label', 'Go to Definition'),
                mnemonicTitle: nls.localize({ key: 'miGotoDefinition', comment: ['&& denotes a mnemonic'] }, 'Go to &&Definition'),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map((id) => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasDefinitionProvider,
            })),
        });
    }
    async run(accessor, location) {
        const editorService = accessor.get(ICodeEditorService);
        await openEditorWithSelection(editorService, location);
        const action = new DefinitionAction({ openToSide: false, openInPeek: false, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
        return action.run(accessor);
    }
});
async function openEditorWithSelection(editorService, location) {
    await editorService.openCodeEditor({
        resource: location.uri,
        options: {
            selection: {
                startColumn: location.range.startColumn,
                startLineNumber: location.range.startLineNumber,
            },
        },
    }, null);
}
async function runGoToCommand(accessor, command, location) {
    const editorService = accessor.get(ICodeEditorService);
    const commandService = accessor.get(ICommandService);
    await openEditorWithSelection(editorService, location);
    return commandService.executeCommand(command);
}
registerAction2(class GoToTypeDefinitionsAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToTypeDefinitions'; }
    constructor() {
        super({
            id: GoToTypeDefinitionsAction.id,
            title: {
                ...nls.localize2('goToTypeDefinitions.label', 'Go to Type Definitions'),
                mnemonicTitle: nls.localize({ key: 'miGotoTypeDefinition', comment: ['&& denotes a mnemonic'] }, 'Go to &&Type Definitions'),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map((id) => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasTypeDefinitionProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToTypeDefinition', location);
    }
});
registerAction2(class GoToImplementations extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToImplementations'; }
    constructor() {
        super({
            id: GoToImplementations.id,
            title: {
                ...nls.localize2('goToImplementations.label', 'Go to Implementations'),
                mnemonicTitle: nls.localize({ key: 'miGotoImplementations', comment: ['&& denotes a mnemonic'] }, 'Go to &&Implementations'),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map((id) => ({
                id,
                group: '4_symbol_nav',
                order: 1.2,
                when: EditorContextKeys.hasImplementationProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToImplementation', location);
    }
});
registerAction2(class GoToReferencesAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToReferences'; }
    constructor() {
        super({
            id: GoToReferencesAction.id,
            title: {
                ...nls.localize2('goToReferences.label', 'Go to References'),
                mnemonicTitle: nls.localize({ key: 'miGotoReference', comment: ['&& denotes a mnemonic'] }, 'Go to &&References'),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map((id) => ({
                id,
                group: '4_symbol_nav',
                order: 1.3,
                when: EditorContextKeys.hasReferenceProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToReferences', location);
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElubGluZUFuY2hvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0SW5saW5lQW5jaG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRW5HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFZLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUMzRyxPQUFPLEVBQ04sT0FBTyxFQUNQLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUc3RixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUduRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDOUMsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyx3Q0FBd0MsR0FDeEMsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQVVyRixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7O2FBQzFCLGNBQVMsR0FBRywyQkFBMkIsQUFBOUIsQ0FBOEI7SUFROUQsWUFDa0IsT0FBd0MsRUFDekMsZUFBNEMsRUFDeEMseUJBQTZDLEVBQzVDLGtCQUF1QyxFQUM5QyxXQUF5QixFQUN4QixZQUEyQixFQUNuQixvQkFBMkMsRUFDbkQsWUFBMkIsRUFDeEIsZUFBaUMsRUFDckMsV0FBeUIsRUFDeEIsWUFBMkIsRUFDdkIsZ0JBQW1DLEVBQ3ZDLFlBQTJCO1FBRTFDLEtBQUssRUFBRSxDQUFBO1FBZFUsWUFBTyxHQUFQLE9BQU8sQ0FBaUM7UUFDekMsb0JBQWUsR0FBZixlQUFlLENBQTZCO1FBSnJELGdCQUFXLEdBQUcsS0FBSyxDQUFBO1FBbUIxQixrRkFBa0Y7UUFFbEYsSUFBSSxDQUFDLElBQUk7WUFDUixLQUFLLElBQUksZUFBZSxDQUFDLGVBQWU7Z0JBQ3ZDLENBQUMsQ0FBQyxlQUFlLENBQUMsZUFBZTtnQkFDakMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxlQUFlLENBQUMsZUFBZTtvQkFDMUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLGVBQWUsRUFBRTtvQkFDN0QsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUU3QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXRGLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFrQixDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRXRFLElBQUksUUFBZ0IsQ0FBQTtRQUNwQixJQUFJLFdBQXFCLENBQUE7UUFFekIsSUFBSSxRQUF3RCxDQUFBO1FBRTVELElBQUksaUJBQW9ELENBQUE7UUFDeEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtZQUUvQixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO1lBQ3BDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUE7WUFDaEMsV0FBVyxHQUFHO2dCQUNiLFNBQVM7Z0JBQ1QsR0FBRyxjQUFjLENBQ2hCLFlBQVksRUFDWixlQUFlLEVBQ2YsU0FBUyxFQUNULFNBQVMsRUFDVCxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FDL0I7YUFDRCxDQUFBO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2Qsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDaEQsd0NBQXdDLENBQ3ZDLFFBQVEsRUFDUixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFDaEUsTUFBTSxDQUFDLDZCQUE2QixDQUNwQyxDQUNELENBQ0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7WUFFcEIsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1RCxRQUFRO2dCQUNQLFFBQVEsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUTtvQkFDNUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFO29CQUM5RSxDQUFDLENBQUMsS0FBSyxDQUFBO1lBRVQsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFBO1lBQ2hGLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxFQUFFLENBQ2pDLGNBQWMsQ0FDYixZQUFZLEVBQ1osZUFBZSxFQUNmLFFBQVEsQ0FBQyxHQUFHLEVBQ1osUUFBUSxFQUNSLFFBQVEsS0FBSyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUMsY0FBYztnQkFDOUUsQ0FBQyxDQUFDLGVBQWU7Z0JBQ2pCLENBQUMsQ0FBQyxTQUFTLENBQ1osQ0FBQTtZQUVGLFdBQVcsR0FBRyxvQkFBb0IsRUFBRSxDQUFBO1lBRXBDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO2dCQUMvQixNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO2dCQUN2QyxXQUFXLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQTtnQkFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQTtZQUNyQyxDQUFDLENBQUE7WUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQzFDLGtCQUFrQixFQUFFLENBQUE7WUFDckIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sZUFBZSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3ZFLFdBQVc7aUJBQ1QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7aUJBQ2xCLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNkLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDdEIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7b0JBQzFCLGtCQUFrQixFQUFFLENBQUE7Z0JBQ3JCLENBQUM7WUFDRixDQUFDLENBQUM7aUJBQ0QsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFBO1lBRWpCLGVBQWU7WUFDZixJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUNqRixNQUFNLEtBQUssR0FBRyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ3ZFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFFcEMsSUFBSSxDQUFDO29CQUNKLE1BQU0saUJBQWlCLEVBQUUsRUFBRSxDQUFBO2dCQUM1QixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakIsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDdEIsT0FBTTtnQkFDUCxDQUFDO2dCQUVELGtCQUFrQixDQUFDLGVBQWUsQ0FBQztvQkFDbEMsaUJBQWlCO29CQUNqQixTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztvQkFDdEIsVUFBVSxFQUFFLEdBQUcsRUFBRTt3QkFDaEIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FDdEMsTUFBTSxDQUFDLCtCQUErQixFQUN0QyxpQkFBaUIsRUFDakIsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUNyQixDQUFBO3dCQUNELE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3ZDLENBQUM7aUJBQ0QsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hDLElBQUksa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FDckYsQ0FBQTtRQUNELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFdEQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBQ3BDLE9BQU8sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUs7WUFDOUIsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDbkUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNMLE9BQU8sQ0FBQyxZQUFZLENBQ25CLFdBQVcsRUFDWCxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQ3RFLENBQUE7UUFFRCxRQUFRO1FBQ1IsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUMxRixDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNyRCxNQUFNLElBQUksR0FBa0I7b0JBQzNCLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRztvQkFDdEIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2lCQUN6QixDQUFBO2dCQUNELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hELG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN4QyxDQUFBO2dCQUVELENBQUMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDOztBQTFNVyxrQkFBa0I7SUFZNUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGFBQWEsQ0FBQTtHQXRCSCxrQkFBa0IsQ0EyTTlCOztBQUVELCtCQUErQjtBQUUvQixlQUFlLENBQ2QsTUFBTSxtQkFBb0IsU0FBUSxPQUFPO2FBQ3hCLE9BQUUsR0FBRyx5Q0FBeUMsQ0FBQTtJQUU5RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO1lBQzFCLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDO1lBQ2hFLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLCtCQUErQjtvQkFDMUMsS0FBSyxFQUFFLE1BQU07b0JBQ2IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtpQkFDcEM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsUUFBYTtRQUMzRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUU1RCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUVELGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsWUFBWTtBQUVaLDhCQUE4QjtBQUU5QixlQUFlLENBQ2QsTUFBTSxrQkFBbUIsU0FBUSxPQUFPO2FBQ3ZCLE9BQUUsR0FBRyx3Q0FBd0MsQ0FBQTtJQUU3RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3pCLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQztZQUNsRCxFQUFFLEVBQUUsS0FBSztZQUNULFlBQVksRUFBRSxnQ0FBZ0M7WUFDOUMsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsaURBQTZCO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFeEQsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQUE7UUFDbEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFFRCxnR0FBZ0c7UUFDaEcsaUZBQWlGO1FBQ2pGLE1BQU0sUUFBUSxHQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUE7UUFDbEYsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sd0JBQXlCLFNBQVEsT0FBTzthQUM3QixPQUFFLEdBQUcsc0NBQXNDLENBQUE7SUFFM0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0JBQXdCLENBQUMsRUFBRTtZQUMvQixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxrQkFBa0IsQ0FBQztZQUNwRSxFQUFFLEVBQUUsS0FBSztZQUNULFlBQVksRUFBRSxnQ0FBZ0M7WUFDOUMsVUFBVSxFQUFFO2dCQUNYLE1BQU0sRUFBRSwrQ0FBcUMsQ0FBQztnQkFDOUMsT0FBTyxFQUFFLGlEQUE4QjtnQkFDdkMsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxnREFBOEI7aUJBQ3ZDO2FBQ0Q7WUFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxDQUN4RixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDUixFQUFFLEVBQUUsRUFBRTtnQkFDTixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7YUFDUixDQUFDLENBQ0Y7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQW9CO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBNkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDeEQsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRTtZQUN0QixDQUFDLENBQUM7Z0JBQ0EsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHO2dCQUNwQixPQUFPLEVBQUU7b0JBQ1IsU0FBUyxFQUFFO3dCQUNWLFdBQVcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVc7d0JBQ3JDLGVBQWUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWU7cUJBQzdDO2lCQUNEO2FBQ0QsQ0FBQTtRQUVILE1BQU0sYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTyxTQUFTLENBQ2hCLFFBQTBCLEVBQzFCLEdBQStCO1FBRS9CLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBRWxFLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDckYsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELFlBQVk7QUFFWiw2QkFBNkI7QUFFN0IsZUFBZSxDQUNkLE1BQU0sb0JBQXFCLFNBQVEsT0FBTzthQUN6QixPQUFFLEdBQUcsd0NBQXdDLENBQUE7SUFFN0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtZQUMzQixLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixDQUFDO2dCQUM5RCxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMvRCxvQkFBb0IsQ0FDcEI7YUFDRDtZQUNELElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxHQUFHLENBQ3hGLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNSLEVBQUU7Z0JBQ0YsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLEtBQUssRUFBRSxHQUFHO2dCQUNWLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxxQkFBcUI7YUFDN0MsQ0FBQyxDQUNGO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxRQUFrQjtRQUNoRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFdEQsTUFBTSx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFdEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDbEMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUMzRCxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxDQUN2RSxDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzVCLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxLQUFLLFVBQVUsdUJBQXVCLENBQUMsYUFBaUMsRUFBRSxRQUFrQjtJQUMzRixNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQ2pDO1FBQ0MsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHO1FBQ3RCLE9BQU8sRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVixXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXO2dCQUN2QyxlQUFlLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlO2FBQy9DO1NBQ0Q7S0FDRCxFQUNELElBQUksQ0FDSixDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssVUFBVSxjQUFjLENBQUMsUUFBMEIsRUFBRSxPQUFlLEVBQUUsUUFBa0I7SUFDNUYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ3RELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7SUFFcEQsTUFBTSx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFFdEQsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQzlDLENBQUM7QUFFRCxlQUFlLENBQ2QsTUFBTSx5QkFBMEIsU0FBUSxPQUFPO2FBQzlCLE9BQUUsR0FBRyw2Q0FBNkMsQ0FBQTtJQUVsRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFO1lBQ2hDLEtBQUssRUFBRTtnQkFDTixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLEVBQUUsd0JBQXdCLENBQUM7Z0JBQ3ZFLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUMxQixFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ25FLDBCQUEwQixDQUMxQjthQUNEO1lBQ0QsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLEdBQUcsQ0FDeEYsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ1IsRUFBRTtnQkFDRixLQUFLLEVBQUUsY0FBYztnQkFDckIsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsSUFBSSxFQUFFLGlCQUFpQixDQUFDLHlCQUF5QjthQUNqRCxDQUFDLENBQ0Y7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFFBQWtCO1FBQ2hFLE9BQU8sY0FBYyxDQUFDLFFBQVEsRUFBRSxrQ0FBa0MsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sbUJBQW9CLFNBQVEsT0FBTzthQUN4QixPQUFFLEdBQUcsNkNBQTZDLENBQUE7SUFFbEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CLENBQUMsRUFBRTtZQUMxQixLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLDJCQUEyQixFQUFFLHVCQUF1QixDQUFDO2dCQUN0RSxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNwRSx5QkFBeUIsQ0FDekI7YUFDRDtZQUNELElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxHQUFHLENBQ3hGLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNSLEVBQUU7Z0JBQ0YsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLEtBQUssRUFBRSxHQUFHO2dCQUNWLElBQUksRUFBRSxpQkFBaUIsQ0FBQyx5QkFBeUI7YUFDakQsQ0FBQyxDQUNGO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxRQUFrQjtRQUNoRSxPQUFPLGNBQWMsQ0FBQyxRQUFRLEVBQUUsa0NBQWtDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDOUUsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLG9CQUFxQixTQUFRLE9BQU87YUFDekIsT0FBRSxHQUFHLHdDQUF3QyxDQUFBO0lBRTdEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7WUFDM0IsS0FBSyxFQUFFO2dCQUNOLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQztnQkFDNUQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQzFCLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUQsb0JBQW9CLENBQ3BCO2FBQ0Q7WUFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxDQUN4RixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDUixFQUFFO2dCQUNGLEtBQUssRUFBRSxjQUFjO2dCQUNyQixLQUFLLEVBQUUsR0FBRztnQkFDVixJQUFJLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CO2FBQzVDLENBQUMsQ0FDRjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsUUFBa0I7UUFDaEUsT0FBTyxjQUFjLENBQUMsUUFBUSxFQUFFLDhCQUE4QixFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxZQUFZIn0=