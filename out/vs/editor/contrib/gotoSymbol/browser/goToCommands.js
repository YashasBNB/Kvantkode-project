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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL2dvVG9Db21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUYsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFFTixrQ0FBa0MsR0FDbEMsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQWtDLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sc0NBQXNDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFekcsT0FBTyxLQUFLLFlBQVksTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGNBQWMsRUFBMEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1B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