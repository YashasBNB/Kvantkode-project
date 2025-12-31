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
var RenameController_1;
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { raceCancellation } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, registerModelAndPositionCommand, } from '../../../browser/editorExtensions.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { NewSymbolNameTriggerKind, } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextResourceConfigurationService } from '../../../common/services/textResourceConfiguration.js';
import { EditorStateCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { MessageController } from '../../message/browser/messageController.js';
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CONTEXT_RENAME_INPUT_VISIBLE, RenameWidget, } from './renameWidget.js';
class RenameSkeleton {
    constructor(model, position, registry) {
        this.model = model;
        this.position = position;
        this._providerRenameIdx = 0;
        this._providers = registry.ordered(model);
    }
    hasProvider() {
        return this._providers.length > 0;
    }
    async resolveRenameLocation(token) {
        const rejects = [];
        for (this._providerRenameIdx = 0; this._providerRenameIdx < this._providers.length; this._providerRenameIdx++) {
            const provider = this._providers[this._providerRenameIdx];
            if (!provider.resolveRenameLocation) {
                break;
            }
            const res = await provider.resolveRenameLocation(this.model, this.position, token);
            if (!res) {
                continue;
            }
            if (res.rejectReason) {
                rejects.push(res.rejectReason);
                continue;
            }
            return res;
        }
        // we are here when no provider prepared a location which means we can
        // just rely on the word under cursor and start with the first provider
        this._providerRenameIdx = 0;
        const word = this.model.getWordAtPosition(this.position);
        if (!word) {
            return {
                range: Range.fromPositions(this.position),
                text: '',
                rejectReason: rejects.length > 0 ? rejects.join('\n') : undefined,
            };
        }
        return {
            range: new Range(this.position.lineNumber, word.startColumn, this.position.lineNumber, word.endColumn),
            text: word.word,
            rejectReason: rejects.length > 0 ? rejects.join('\n') : undefined,
        };
    }
    async provideRenameEdits(newName, token) {
        return this._provideRenameEdits(newName, this._providerRenameIdx, [], token);
    }
    async _provideRenameEdits(newName, i, rejects, token) {
        const provider = this._providers[i];
        if (!provider) {
            return {
                edits: [],
                rejectReason: rejects.join('\n'),
            };
        }
        const result = await provider.provideRenameEdits(this.model, this.position, newName, token);
        if (!result) {
            return this._provideRenameEdits(newName, i + 1, rejects.concat(nls.localize('no result', 'No result.')), token);
        }
        else if (result.rejectReason) {
            return this._provideRenameEdits(newName, i + 1, rejects.concat(result.rejectReason), token);
        }
        return result;
    }
}
export async function rename(registry, model, position, newName) {
    const skeleton = new RenameSkeleton(model, position, registry);
    const loc = await skeleton.resolveRenameLocation(CancellationToken.None);
    if (loc?.rejectReason) {
        return { edits: [], rejectReason: loc.rejectReason };
    }
    return skeleton.provideRenameEdits(newName, CancellationToken.None);
}
// ---  register actions and commands
let RenameController = class RenameController {
    static { RenameController_1 = this; }
    static { this.ID = 'editor.contrib.renameController'; }
    static get(editor) {
        return editor.getContribution(RenameController_1.ID);
    }
    constructor(editor, _instaService, _notificationService, _bulkEditService, _progressService, _logService, _configService, _languageFeaturesService, _telemetryService) {
        this.editor = editor;
        this._instaService = _instaService;
        this._notificationService = _notificationService;
        this._bulkEditService = _bulkEditService;
        this._progressService = _progressService;
        this._logService = _logService;
        this._configService = _configService;
        this._languageFeaturesService = _languageFeaturesService;
        this._telemetryService = _telemetryService;
        this._disposableStore = new DisposableStore();
        this._cts = new CancellationTokenSource();
        this._renameWidget = this._disposableStore.add(this._instaService.createInstance(RenameWidget, this.editor, [
            'acceptRenameInput',
            'acceptRenameInputWithPreview',
        ]));
    }
    dispose() {
        this._disposableStore.dispose();
        this._cts.dispose(true);
    }
    async run() {
        const trace = this._logService.trace.bind(this._logService, '[rename]');
        // set up cancellation token to prevent reentrant rename, this
        // is the parent to the resolve- and rename-tokens
        this._cts.dispose(true);
        this._cts = new CancellationTokenSource();
        if (!this.editor.hasModel()) {
            trace('editor has no model');
            return undefined;
        }
        const position = this.editor.getPosition();
        const skeleton = new RenameSkeleton(this.editor.getModel(), position, this._languageFeaturesService.renameProvider);
        if (!skeleton.hasProvider()) {
            trace('skeleton has no provider');
            return undefined;
        }
        // part 1 - resolve rename location
        const cts1 = new EditorStateCancellationTokenSource(this.editor, 4 /* CodeEditorStateFlag.Position */ | 1 /* CodeEditorStateFlag.Value */, undefined, this._cts.token);
        let loc;
        try {
            trace('resolving rename location');
            const resolveLocationOperation = skeleton.resolveRenameLocation(cts1.token);
            this._progressService.showWhile(resolveLocationOperation, 250);
            loc = await resolveLocationOperation;
            trace('resolved rename location');
        }
        catch (e) {
            if (e instanceof CancellationError) {
                trace('resolve rename location cancelled', JSON.stringify(e, null, '\t'));
            }
            else {
                trace('resolve rename location failed', e instanceof Error ? e : JSON.stringify(e, null, '\t'));
                if (typeof e === 'string' || isMarkdownString(e)) {
                    MessageController.get(this.editor)?.showMessage(e ||
                        nls.localize('resolveRenameLocationFailed', 'An unknown error occurred while resolving rename location'), position);
                }
            }
            return undefined;
        }
        finally {
            cts1.dispose();
        }
        if (!loc) {
            trace('returning early - no loc');
            return undefined;
        }
        if (loc.rejectReason) {
            trace(`returning early - rejected with reason: ${loc.rejectReason}`, loc.rejectReason);
            MessageController.get(this.editor)?.showMessage(loc.rejectReason, position);
            return undefined;
        }
        if (cts1.token.isCancellationRequested) {
            trace('returning early - cts1 cancelled');
            return undefined;
        }
        // part 2 - do rename at location
        const cts2 = new EditorStateCancellationTokenSource(this.editor, 4 /* CodeEditorStateFlag.Position */ | 1 /* CodeEditorStateFlag.Value */, loc.range, this._cts.token);
        const model = this.editor.getModel(); // @ulugbekna: assumes editor still has a model, otherwise, cts1 should've been cancelled
        const newSymbolNamesProviders = this._languageFeaturesService.newSymbolNamesProvider.all(model);
        const resolvedNewSymbolnamesProviders = await Promise.all(newSymbolNamesProviders.map(async (p) => [p, (await p.supportsAutomaticNewSymbolNamesTriggerKind) ?? false]));
        const requestRenameSuggestions = (triggerKind, cts) => {
            let providers = resolvedNewSymbolnamesProviders.slice();
            if (triggerKind === NewSymbolNameTriggerKind.Automatic) {
                providers = providers.filter(([_, supportsAutomatic]) => supportsAutomatic);
            }
            return providers.map(([p]) => p.provideNewSymbolNames(model, loc.range, triggerKind, cts));
        };
        trace('creating rename input field and awaiting its result');
        const supportPreview = this._bulkEditService.hasPreviewHandler() &&
            this._configService.getValue(this.editor.getModel().uri, 'editor.rename.enablePreview');
        const inputFieldResult = await this._renameWidget.getInput(loc.range, loc.text, supportPreview, newSymbolNamesProviders.length > 0 ? requestRenameSuggestions : undefined, cts2);
        trace('received response from rename input field');
        if (newSymbolNamesProviders.length > 0) {
            // @ulugbekna: we're interested only in telemetry for rename suggestions currently
            this._reportTelemetry(newSymbolNamesProviders.length, model.getLanguageId(), inputFieldResult);
        }
        // no result, only hint to focus the editor or not
        if (typeof inputFieldResult === 'boolean') {
            trace(`returning early - rename input field response - ${inputFieldResult}`);
            if (inputFieldResult) {
                this.editor.focus();
            }
            cts2.dispose();
            return undefined;
        }
        this.editor.focus();
        trace('requesting rename edits');
        const renameOperation = raceCancellation(skeleton.provideRenameEdits(inputFieldResult.newName, cts2.token), cts2.token)
            .then(async (renameResult) => {
            if (!renameResult) {
                trace('returning early - no rename edits result');
                return;
            }
            if (!this.editor.hasModel()) {
                trace('returning early - no model after rename edits are provided');
                return;
            }
            if (renameResult.rejectReason) {
                trace(`returning early - rejected with reason: ${renameResult.rejectReason}`);
                this._notificationService.info(renameResult.rejectReason);
                return;
            }
            // collapse selection to active end
            this.editor.setSelection(Range.fromPositions(this.editor.getSelection().getPosition()));
            trace('applying edits');
            this._bulkEditService
                .apply(renameResult, {
                editor: this.editor,
                showPreview: inputFieldResult.wantsPreview,
                label: nls.localize('label', "Renaming '{0}' to '{1}'", loc?.text, inputFieldResult.newName),
                code: 'undoredo.rename',
                quotableLabel: nls.localize('quotableLabel', 'Renaming {0} to {1}', loc?.text, inputFieldResult.newName),
                respectAutoSaveConfig: true,
            })
                .then((result) => {
                trace('edits applied');
                if (result.ariaSummary) {
                    alert(nls.localize('aria', "Successfully renamed '{0}' to '{1}'. Summary: {2}", loc.text, inputFieldResult.newName, result.ariaSummary));
                }
            })
                .catch((err) => {
                trace(`error when applying edits ${JSON.stringify(err, null, '\t')}`);
                this._notificationService.error(nls.localize('rename.failedApply', 'Rename failed to apply edits'));
                this._logService.error(err);
            });
        }, (err) => {
            trace('error when providing rename edits', JSON.stringify(err, null, '\t'));
            this._notificationService.error(nls.localize('rename.failed', 'Rename failed to compute edits'));
            this._logService.error(err);
        })
            .finally(() => {
            cts2.dispose();
        });
        trace('returning rename operation');
        this._progressService.showWhile(renameOperation, 250);
        return renameOperation;
    }
    acceptRenameInput(wantsPreview) {
        this._renameWidget.acceptInput(wantsPreview);
    }
    cancelRenameInput() {
        this._renameWidget.cancelInput(true, 'cancelRenameInput command');
    }
    focusNextRenameSuggestion() {
        this._renameWidget.focusNextRenameSuggestion();
    }
    focusPreviousRenameSuggestion() {
        this._renameWidget.focusPreviousRenameSuggestion();
    }
    _reportTelemetry(nRenameSuggestionProviders, languageId, inputFieldResult) {
        const value = typeof inputFieldResult === 'boolean'
            ? {
                kind: 'cancelled',
                languageId,
                nRenameSuggestionProviders,
            }
            : {
                kind: 'accepted',
                languageId,
                nRenameSuggestionProviders,
                source: inputFieldResult.stats.source.k,
                nRenameSuggestions: inputFieldResult.stats.nRenameSuggestions,
                timeBeforeFirstInputFieldEdit: inputFieldResult.stats.timeBeforeFirstInputFieldEdit,
                wantsPreview: inputFieldResult.wantsPreview,
                nRenameSuggestionsInvocations: inputFieldResult.stats.nRenameSuggestionsInvocations,
                hadAutomaticRenameSuggestionsInvocation: inputFieldResult.stats.hadAutomaticRenameSuggestionsInvocation,
            };
        this._telemetryService.publicLog2('renameInvokedEvent', value);
    }
};
RenameController = RenameController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IBulkEditService),
    __param(4, IEditorProgressService),
    __param(5, ILogService),
    __param(6, ITextResourceConfigurationService),
    __param(7, ILanguageFeaturesService),
    __param(8, ITelemetryService)
], RenameController);
// ---- action implementation
export class RenameAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.rename',
            label: nls.localize2('rename.label', 'Rename Symbol'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasRenameProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 60 /* KeyCode.F2 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.1,
            },
        });
    }
    runCommand(accessor, args) {
        const editorService = accessor.get(ICodeEditorService);
        const [uri, pos] = (Array.isArray(args) && args) || [undefined, undefined];
        if (URI.isUri(uri) && Position.isIPosition(pos)) {
            return editorService
                .openCodeEditor({ resource: uri }, editorService.getActiveCodeEditor())
                .then((editor) => {
                if (!editor) {
                    return;
                }
                editor.setPosition(pos);
                editor.invokeWithinContext((accessor) => {
                    this.reportTelemetry(accessor, editor);
                    return this.run(accessor, editor);
                });
            }, onUnexpectedError);
        }
        return super.runCommand(accessor, args);
    }
    run(accessor, editor) {
        const logService = accessor.get(ILogService);
        const controller = RenameController.get(editor);
        if (controller) {
            logService.trace('[RenameAction] got controller, running...');
            return controller.run();
        }
        logService.trace('[RenameAction] returning early - controller missing');
        return Promise.resolve();
    }
}
registerEditorContribution(RenameController.ID, RenameController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(RenameAction);
const RenameCommand = EditorCommand.bindToContribution(RenameController.get);
registerEditorCommand(new RenameCommand({
    id: 'acceptRenameInput',
    precondition: CONTEXT_RENAME_INPUT_VISIBLE,
    handler: (x) => x.acceptRenameInput(false),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 3 /* KeyCode.Enter */,
    },
}));
registerEditorCommand(new RenameCommand({
    id: 'acceptRenameInputWithPreview',
    precondition: ContextKeyExpr.and(CONTEXT_RENAME_INPUT_VISIBLE, ContextKeyExpr.has('config.editor.rename.enablePreview')),
    handler: (x) => x.acceptRenameInput(true),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 2048 /* KeyMod.CtrlCmd */ + 3 /* KeyCode.Enter */,
    },
}));
registerEditorCommand(new RenameCommand({
    id: 'cancelRenameInput',
    precondition: CONTEXT_RENAME_INPUT_VISIBLE,
    handler: (x) => x.cancelRenameInput(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
registerAction2(class FocusNextRenameSuggestion extends Action2 {
    constructor() {
        super({
            id: 'focusNextRenameSuggestion',
            title: {
                ...nls.localize2('focusNextRenameSuggestion', 'Focus Next Rename Suggestion'),
            },
            precondition: CONTEXT_RENAME_INPUT_VISIBLE,
            keybinding: [
                {
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
                },
            ],
        });
    }
    run(accessor) {
        const currentEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!currentEditor) {
            return;
        }
        const controller = RenameController.get(currentEditor);
        if (!controller) {
            return;
        }
        controller.focusNextRenameSuggestion();
    }
});
registerAction2(class FocusPreviousRenameSuggestion extends Action2 {
    constructor() {
        super({
            id: 'focusPreviousRenameSuggestion',
            title: {
                ...nls.localize2('focusPreviousRenameSuggestion', 'Focus Previous Rename Suggestion'),
            },
            precondition: CONTEXT_RENAME_INPUT_VISIBLE,
            keybinding: [
                {
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
                },
            ],
        });
    }
    run(accessor) {
        const currentEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!currentEditor) {
            return;
        }
        const controller = RenameController.get(currentEditor);
        if (!controller) {
            return;
        }
        controller.focusPreviousRenameSuggestion();
    }
});
// ---- api bridge command
registerModelAndPositionCommand('_executeDocumentRenameProvider', function (accessor, model, position, ...args) {
    const [newName] = args;
    assertType(typeof newName === 'string');
    const { renameProvider } = accessor.get(ILanguageFeaturesService);
    return rename(renameProvider, model, position, newName);
});
registerModelAndPositionCommand('_executePrepareRename', async function (accessor, model, position) {
    const { renameProvider } = accessor.get(ILanguageFeaturesService);
    const skeleton = new RenameSkeleton(model, position, renameProvider);
    const loc = await skeleton.resolveRenameLocation(CancellationToken.None);
    if (loc?.rejectReason) {
        throw new Error(loc.rejectReason);
    }
    return loc;
});
//todo@jrieken use editor options world
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        'editor.rename.enablePreview': {
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('enablePreview', 'Enable/disable the ability to preview changes before renaming'),
            default: true,
            type: 'boolean',
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcmVuYW1lL2Jyb3dzZXIvcmVuYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBR2Isb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsRUFDMUIsK0JBQStCLEdBQy9CLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtB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