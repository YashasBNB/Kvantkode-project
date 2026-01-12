/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { createCancelablePromise, raceCancellation } from '../../../../base/common/async.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorStateCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { isCodeEditor } from '../../../browser/editorBrowser.js';
import { EditorAction2 } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import * as corePosition from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { isLocationLink } from '../../../common/languages.js';
import { ReferencesController } from './peek/referencesController.js';
import { ReferencesModel } from './referencesModel.js';
import { ISymbolNavigationService } from './symbolNavigation.js';
import { MessageController } from '../../message/browser/messageController.js';
import { PeekContext } from '../../peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { getDeclarationsAtPosition, getDefinitionsAtPosition, getImplementationsAtPosition, getReferencesAtPosition, getTypeDefinitionsAtPosition, } from './goToSymbol.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.EditorContextPeek,
    title: nls.localize('peek.submenu', 'Peek'),
    group: 'navigation',
    order: 100,
});
export class SymbolNavigationAnchor {
    static is(thing) {
        if (!thing || typeof thing !== 'object') {
            return false;
        }
        if (thing instanceof SymbolNavigationAnchor) {
            return true;
        }
        if (corePosition.Position.isIPosition(thing.position) &&
            thing.model) {
            return true;
        }
        return false;
    }
    constructor(model, position) {
        this.model = model;
        this.position = position;
    }
}
export class SymbolNavigationAction extends EditorAction2 {
    static { this._allSymbolNavigationCommands = new Map(); }
    static { this._activeAlternativeCommands = new Set(); }
    static all() {
        return SymbolNavigationAction._allSymbolNavigationCommands.values();
    }
    static _patchConfig(opts) {
        const result = { ...opts, f1: true };
        // patch context menu when clause
        if (result.menu) {
            for (const item of Iterable.wrap(result.menu)) {
                if (item.id === MenuId.EditorContext || item.id === MenuId.EditorContextPeek) {
                    item.when = ContextKeyExpr.and(opts.precondition, item.when);
                }
            }
        }
        return result;
    }
    constructor(configuration, opts) {
        super(SymbolNavigationAction._patchConfig(opts));
        this.configuration = configuration;
        SymbolNavigationAction._allSymbolNavigationCommands.set(opts.id, this);
    }
    runEditorCommand(accessor, editor, arg, range) {
        if (!editor.hasModel()) {
            return Promise.resolve(undefined);
        }
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(ICodeEditorService);
        const progressService = accessor.get(IEditorProgressService);
        const symbolNavService = accessor.get(ISymbolNavigationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const instaService = accessor.get(IInstantiationService);
        const model = editor.getModel();
        const position = editor.getPosition();
        const anchor = SymbolNavigationAnchor.is(arg)
            ? arg
            : new SymbolNavigationAnchor(model, position);
        const cts = new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
        const promise = raceCancellation(this._getLocationModel(languageFeaturesService, anchor.model, anchor.position, cts.token), cts.token)
            .then(async (references) => {
            if (!references || cts.token.isCancellationRequested) {
                return;
            }
            alert(references.ariaMessage);
            let altAction;
            if (references.referenceAt(model.uri, position)) {
                const altActionId = this._getAlternativeCommand(editor);
                if (altActionId !== undefined &&
                    !SymbolNavigationAction._activeAlternativeCommands.has(altActionId) &&
                    SymbolNavigationAction._allSymbolNavigationCommands.has(altActionId)) {
                    altAction = SymbolNavigationAction._allSymbolNavigationCommands.get(altActionId);
                }
            }
            const referenceCount = references.references.length;
            if (referenceCount === 0) {
                // no result -> show message
                if (!this.configuration.muteMessage) {
                    const info = model.getWordAtPosition(position);
                    MessageController.get(editor)?.showMessage(this._getNoResultFoundMessage(info), position);
                }
            }
            else if (referenceCount === 1 && altAction) {
                // already at the only result, run alternative
                SymbolNavigationAction._activeAlternativeCommands.add(this.desc.id);
                instaService.invokeFunction((accessor) => altAction.runEditorCommand(accessor, editor, arg, range).finally(() => {
                    SymbolNavigationAction._activeAlternativeCommands.delete(this.desc.id);
                }));
            }
            else {
                // normal results handling
                return this._onResult(editorService, symbolNavService, editor, references, range);
            }
        }, (err) => {
            // report an error
            notificationService.error(err);
        })
            .finally(() => {
            cts.dispose();
        });
        progressService.showWhile(promise, 250);
        return promise;
    }
    async _onResult(editorService, symbolNavService, editor, model, range) {
        const gotoLocation = this._getGoToPreference(editor);
        if (!(editor instanceof EmbeddedCodeEditorWidget) &&
            (this.configuration.openInPeek || (gotoLocation === 'peek' && model.references.length > 1))) {
            this._openInPeek(editor, model, range);
        }
        else {
            const next = model.firstReference();
            const peek = model.references.length > 1 && gotoLocation === 'gotoAndPeek';
            const targetEditor = await this._openReference(editor, editorService, next, this.configuration.openToSide, !peek);
            if (peek && targetEditor) {
                this._openInPeek(targetEditor, model, range);
            }
            else {
                model.dispose();
            }
            // keep remaining locations around when using
            // 'goto'-mode
            if (gotoLocation === 'goto') {
                symbolNavService.put(next);
            }
        }
    }
    async _openReference(editor, editorService, reference, sideBySide, highlight) {
        // range is the target-selection-range when we have one
        // and the fallback is the 'full' range
        let range = undefined;
        if (isLocationLink(reference)) {
            range = reference.targetSelectionRange;
        }
        if (!range) {
            range = reference.range;
        }
        if (!range) {
            return undefined;
        }
        const targetEditor = await editorService.openCodeEditor({
            resource: reference.uri,
            options: {
                selection: Range.collapseToStart(range),
                selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
                selectionSource: "code.jump" /* TextEditorSelectionSource.JUMP */,
            },
        }, editor, sideBySide);
        if (!targetEditor) {
            return undefined;
        }
        if (highlight) {
            const modelNow = targetEditor.getModel();
            const decorations = targetEditor.createDecorationsCollection([
                {
                    range,
                    options: {
                        description: 'symbol-navigate-action-highlight',
                        className: 'symbolHighlight',
                    },
                },
            ]);
            setTimeout(() => {
                if (targetEditor.getModel() === modelNow) {
                    decorations.clear();
                }
            }, 350);
        }
        return targetEditor;
    }
    _openInPeek(target, model, range) {
        const controller = ReferencesController.get(target);
        if (controller && target.hasModel()) {
            controller.toggleWidget(range ?? target.getSelection(), createCancelablePromise((_) => Promise.resolve(model)), this.configuration.openInPeek);
        }
        else {
            model.dispose();
        }
    }
}
//#region --- DEFINITION
export class DefinitionAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, false, token), nls.localize('def.title', 'Definitions'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('noResultWord', "No definition found for '{0}'", info.word)
            : nls.localize('generic.noResults', 'No definition found');
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeDefinitionCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleDefinitions;
    }
}
registerAction2(class GoToDefinitionAction extends DefinitionAction {
    static { this.id = 'editor.action.revealDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: GoToDefinitionAction.id,
            title: {
                ...nls.localize2('actions.goToDecl.label', 'Go to Definition'),
                mnemonicTitle: nls.localize({ key: 'miGotoDefinition', comment: ['&& denotes a mnemonic'] }, 'Go to &&Definition'),
            },
            precondition: EditorContextKeys.hasDefinitionProvider,
            keybinding: [
                {
                    when: EditorContextKeys.editorTextFocus,
                    primary: 70 /* KeyCode.F12 */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
                {
                    when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, IsWebContext),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */,
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.1,
                },
                {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 2,
                },
            ],
        });
        CommandsRegistry.registerCommandAlias('editor.action.goToDeclaration', GoToDefinitionAction.id);
    }
});
registerAction2(class OpenDefinitionToSideAction extends DefinitionAction {
    static { this.id = 'editor.action.revealDefinitionAside'; }
    constructor() {
        super({
            openToSide: true,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: OpenDefinitionToSideAction.id,
            title: nls.localize2('actions.goToDeclToSide.label', 'Open Definition to the Side'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDefinitionProvider, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: [
                {
                    when: EditorContextKeys.editorTextFocus,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 70 /* KeyCode.F12 */),
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
                {
                    when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, IsWebContext),
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */),
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
            ],
        });
        CommandsRegistry.registerCommandAlias('editor.action.openDeclarationToTheSide', OpenDefinitionToSideAction.id);
    }
});
registerAction2(class PeekDefinitionAction extends DefinitionAction {
    static { this.id = 'editor.action.peekDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: PeekDefinitionAction.id,
            title: nls.localize2('actions.previewDecl.label', 'Peek Definition'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDefinitionProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 70 /* KeyCode.F12 */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 68 /* KeyCode.F10 */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 2,
            },
        });
        CommandsRegistry.registerCommandAlias('editor.action.previewDeclaration', PeekDefinitionAction.id);
    }
});
//#endregion
//#region --- DECLARATION
class DeclarationAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, false, token), nls.localize('decl.title', 'Declarations'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('decl.noResultWord', "No declaration found for '{0}'", info.word)
            : nls.localize('decl.generic.noResults', 'No declaration found');
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeDeclarationCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleDeclarations;
    }
}
registerAction2(class GoToDeclarationAction extends DeclarationAction {
    static { this.id = 'editor.action.revealDeclaration'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: GoToDeclarationAction.id,
            title: {
                ...nls.localize2('actions.goToDeclaration.label', 'Go to Declaration'),
                mnemonicTitle: nls.localize({ key: 'miGotoDeclaration', comment: ['&& denotes a mnemonic'] }, 'Go to &&Declaration'),
            },
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDeclarationProvider, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.3,
                },
                {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 3,
                },
            ],
        });
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('decl.noResultWord', "No declaration found for '{0}'", info.word)
            : nls.localize('decl.generic.noResults', 'No declaration found');
    }
});
registerAction2(class PeekDeclarationAction extends DeclarationAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: 'editor.action.peekDeclaration',
            title: nls.localize2('actions.peekDecl.label', 'Peek Declaration'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasDeclarationProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 3,
            },
        });
    }
});
//#endregion
//#region --- TYPE DEFINITION
class TypeDefinitionAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, false, token), nls.localize('typedef.title', 'Type Definitions'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('goToTypeDefinition.noResultWord', "No type definition found for '{0}'", info.word)
            : nls.localize('goToTypeDefinition.generic.noResults', 'No type definition found');
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeTypeDefinitionCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleTypeDefinitions;
    }
}
registerAction2(class GoToTypeDefinitionAction extends TypeDefinitionAction {
    static { this.ID = 'editor.action.goToTypeDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: GoToTypeDefinitionAction.ID,
            title: {
                ...nls.localize2('actions.goToTypeDefinition.label', 'Go to Type Definition'),
                mnemonicTitle: nls.localize({ key: 'miGotoTypeDefinition', comment: ['&& denotes a mnemonic'] }, 'Go to &&Type Definition'),
            },
            precondition: EditorContextKeys.hasTypeDefinitionProvider,
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.4,
                },
                {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 3,
                },
            ],
        });
    }
});
registerAction2(class PeekTypeDefinitionAction extends TypeDefinitionAction {
    static { this.ID = 'editor.action.peekTypeDefinition'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: PeekTypeDefinitionAction.ID,
            title: nls.localize2('actions.peekTypeDefinition.label', 'Peek Type Definition'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasTypeDefinitionProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 4,
            },
        });
    }
});
//#endregion
//#region --- IMPLEMENTATION
class ImplementationAction extends SymbolNavigationAction {
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, false, token), nls.localize('impl.title', 'Implementations'));
    }
    _getNoResultFoundMessage(info) {
        return info && info.word
            ? nls.localize('goToImplementation.noResultWord', "No implementation found for '{0}'", info.word)
            : nls.localize('goToImplementation.generic.noResults', 'No implementation found');
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeImplementationCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleImplementations;
    }
}
registerAction2(class GoToImplementationAction extends ImplementationAction {
    static { this.ID = 'editor.action.goToImplementation'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: GoToImplementationAction.ID,
            title: {
                ...nls.localize2('actions.goToImplementation.label', 'Go to Implementations'),
                mnemonicTitle: nls.localize({ key: 'miGotoImplementation', comment: ['&& denotes a mnemonic'] }, 'Go to &&Implementations'),
            },
            precondition: EditorContextKeys.hasImplementationProvider,
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.45,
                },
                {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 4,
                },
            ],
        });
    }
});
registerAction2(class PeekImplementationAction extends ImplementationAction {
    static { this.ID = 'editor.action.peekImplementation'; }
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: PeekImplementationAction.ID,
            title: nls.localize2('actions.peekImplementation.label', 'Peek Implementations'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasImplementationProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 5,
            },
        });
    }
});
//#endregion
//#region --- REFERENCES
class ReferencesAction extends SymbolNavigationAction {
    _getNoResultFoundMessage(info) {
        return info
            ? nls.localize('references.no', "No references found for '{0}'", info.word)
            : nls.localize('references.noGeneric', 'No references found');
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeReferenceCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleReferences;
    }
}
registerAction2(class GoToReferencesAction extends ReferencesAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false,
        }, {
            id: 'editor.action.goToReferences',
            title: {
                ...nls.localize2('goToReferences.label', 'Go to References'),
                mnemonicTitle: nls.localize({ key: 'miGotoReference', comment: ['&& denotes a mnemonic'] }, 'Go to &&References'),
            },
            precondition: ContextKeyExpr.and(EditorContextKeys.hasReferenceProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            keybinding: {
                when: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 70 /* KeyCode.F12 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'navigation',
                    order: 1.45,
                },
                {
                    id: MenuId.MenubarGoMenu,
                    precondition: null,
                    group: '4_symbol_nav',
                    order: 5,
                },
            ],
        });
    }
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, true, false, token), nls.localize('ref.title', 'References'));
    }
});
registerAction2(class PeekReferencesAction extends ReferencesAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false,
        }, {
            id: 'editor.action.referenceSearch.trigger',
            title: nls.localize2('references.action.label', 'Peek References'),
            precondition: ContextKeyExpr.and(EditorContextKeys.hasReferenceProvider, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: {
                id: MenuId.EditorContextPeek,
                group: 'peek',
                order: 6,
            },
        });
    }
    async _getLocationModel(languageFeaturesService, model, position, token) {
        return new ReferencesModel(await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, false, token), nls.localize('ref.title', 'References'));
    }
});
//#endregion
//#region --- GENERIC goto symbols command
class GenericGoToLocationAction extends SymbolNavigationAction {
    constructor(config, _references, _gotoMultipleBehaviour) {
        super(config, {
            id: 'editor.action.goToLocation',
            title: nls.localize2('label.generic', 'Go to Any Symbol'),
            precondition: ContextKeyExpr.and(PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
        });
        this._references = _references;
        this._gotoMultipleBehaviour = _gotoMultipleBehaviour;
    }
    async _getLocationModel(languageFeaturesService, _model, _position, _token) {
        return new ReferencesModel(this._references, nls.localize('generic.title', 'Locations'));
    }
    _getNoResultFoundMessage(info) {
        return (info && nls.localize('generic.noResult', "No results for '{0}'", info.word)) || '';
    }
    _getGoToPreference(editor) {
        return (this._gotoMultipleBehaviour ?? editor.getOption(60 /* EditorOption.gotoLocation */).multipleReferences);
    }
    _getAlternativeCommand() {
        return undefined;
    }
}
CommandsRegistry.registerCommand({
    id: 'editor.action.goToLocations',
    metadata: {
        description: 'Go to locations from a position in a file',
        args: [
            { name: 'uri', description: 'The text document in which to start', constraint: URI },
            {
                name: 'position',
                description: 'The position at which to start',
                constraint: corePosition.Position.isIPosition,
            },
            { name: 'locations', description: 'An array of locations.', constraint: Array },
            {
                name: 'multiple',
                description: 'Define what to do when having multiple results, either `peek`, `gotoAndPeek`, or `goto`',
            },
            {
                name: 'noResultsMessage',
                description: 'Human readable message that shows when locations is empty.',
            },
        ],
    },
    handler: async (accessor, resource, position, references, multiple, noResultsMessage, openInPeek) => {
        assertType(URI.isUri(resource));
        assertType(corePosition.Position.isIPosition(position));
        assertType(Array.isArray(references));
        assertType(typeof multiple === 'undefined' || typeof multiple === 'string');
        assertType(typeof openInPeek === 'undefined' || typeof openInPeek === 'boolean');
        const editorService = accessor.get(ICodeEditorService);
        const editor = await editorService.openCodeEditor({ resource }, editorService.getFocusedCodeEditor());
        if (isCodeEditor(editor)) {
            editor.setPosition(position);
            editor.revealPositionInCenterIfOutsideViewport(position, 0 /* ScrollType.Smooth */);
            return editor.invokeWithinContext((accessor) => {
                const command = new (class extends GenericGoToLocationAction {
                    _getNoResultFoundMessage(info) {
                        return noResultsMessage || super._getNoResultFoundMessage(info);
                    }
                })({
                    muteMessage: !Boolean(noResultsMessage),
                    openInPeek: Boolean(openInPeek),
                    openToSide: false,
                }, references, multiple);
                accessor.get(IInstantiationService).invokeFunction(command.run.bind(command), editor);
            });
        }
    },
});
CommandsRegistry.registerCommand({
    id: 'editor.action.peekLocations',
    metadata: {
        description: 'Peek locations from a position in a file',
        args: [
            { name: 'uri', description: 'The text document in which to start', constraint: URI },
            {
                name: 'position',
                description: 'The position at which to start',
                constraint: corePosition.Position.isIPosition,
            },
            { name: 'locations', description: 'An array of locations.', constraint: Array },
            {
                name: 'multiple',
                description: 'Define what to do when having multiple results, either `peek`, `gotoAndPeek`, or `goto`',
            },
        ],
    },
    handler: async (accessor, resource, position, references, multiple) => {
        accessor
            .get(ICommandService)
            .executeCommand('editor.action.goToLocations', resource, position, references, multiple, undefined, true);
    },
});
//#endregion
//#region --- REFERENCE search special commands
CommandsRegistry.registerCommand({
    id: 'editor.action.findReferences',
    handler: (accessor, resource, position) => {
        assertType(URI.isUri(resource));
        assertType(corePosition.Position.isIPosition(position));
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const codeEditorService = accessor.get(ICodeEditorService);
        return codeEditorService
            .openCodeEditor({ resource }, codeEditorService.getFocusedCodeEditor())
            .then((control) => {
            if (!isCodeEditor(control) || !control.hasModel()) {
                return undefined;
            }
            const controller = ReferencesController.get(control);
            if (!controller) {
                return undefined;
            }
            const references = createCancelablePromise((token) => getReferencesAtPosition(languageFeaturesService.referenceProvider, control.getModel(), corePosition.Position.lift(position), false, false, token).then((references) => new ReferencesModel(references, nls.localize('ref.title', 'References'))));
            const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
            return Promise.resolve(controller.toggleWidget(range, references, false));
        });
    },
});
// use NEW command
CommandsRegistry.registerCommandAlias('editor.action.showReferences', 'editor.action.peekLocations');
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvZ29Ub0NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUVOLGtDQUFrQyxHQUNsQyxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBa0MsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUV6RyxPQUFPLEtBQUssWUFBWSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsY0FBYyxFQUEwQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVB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