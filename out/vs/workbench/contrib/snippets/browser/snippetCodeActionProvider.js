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
var SurroundWithSnippetCodeActionProvider_1, FileTemplateCodeActionProvider_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ApplyFileSnippetAction } from './commands/fileTemplateSnippets.js';
import { getSurroundableSnippets, SurroundWithSnippetEditorAction, } from './commands/surroundWithSnippet.js';
import { ISnippetsService } from './snippets.js';
let SurroundWithSnippetCodeActionProvider = class SurroundWithSnippetCodeActionProvider {
    static { SurroundWithSnippetCodeActionProvider_1 = this; }
    static { this._MAX_CODE_ACTIONS = 4; }
    static { this._overflowCommandCodeAction = {
        kind: CodeActionKind.SurroundWith.value,
        title: localize('more', 'More...'),
        command: {
            id: SurroundWithSnippetEditorAction.options.id,
            title: SurroundWithSnippetEditorAction.options.title.value,
        },
    }; }
    constructor(_snippetService) {
        this._snippetService = _snippetService;
    }
    async provideCodeActions(model, range) {
        if (range.isEmpty()) {
            return undefined;
        }
        const position = Selection.isISelection(range) ? range.getPosition() : range.getStartPosition();
        const snippets = await getSurroundableSnippets(this._snippetService, model, position, false);
        if (!snippets.length) {
            return undefined;
        }
        const actions = [];
        for (const snippet of snippets) {
            if (actions.length >= SurroundWithSnippetCodeActionProvider_1._MAX_CODE_ACTIONS) {
                actions.push(SurroundWithSnippetCodeActionProvider_1._overflowCommandCodeAction);
                break;
            }
            actions.push({
                title: localize('codeAction', '{0}', snippet.name),
                kind: CodeActionKind.SurroundWith.value,
                edit: asWorkspaceEdit(model, range, snippet),
            });
        }
        return {
            actions,
            dispose() { },
        };
    }
};
SurroundWithSnippetCodeActionProvider = SurroundWithSnippetCodeActionProvider_1 = __decorate([
    __param(0, ISnippetsService)
], SurroundWithSnippetCodeActionProvider);
let FileTemplateCodeActionProvider = class FileTemplateCodeActionProvider {
    static { FileTemplateCodeActionProvider_1 = this; }
    static { this._MAX_CODE_ACTIONS = 4; }
    static { this._overflowCommandCodeAction = {
        title: localize('overflow.start.title', 'Start with Snippet'),
        kind: CodeActionKind.SurroundWith.value,
        command: {
            id: ApplyFileSnippetAction.Id,
            title: '',
        },
    }; }
    constructor(_snippetService) {
        this._snippetService = _snippetService;
        this.providedCodeActionKinds = [CodeActionKind.SurroundWith.value];
    }
    async provideCodeActions(model) {
        if (model.getValueLength() !== 0) {
            return undefined;
        }
        const snippets = await this._snippetService.getSnippets(model.getLanguageId(), {
            fileTemplateSnippets: true,
            includeNoPrefixSnippets: true,
        });
        const actions = [];
        for (const snippet of snippets) {
            if (actions.length >= FileTemplateCodeActionProvider_1._MAX_CODE_ACTIONS) {
                actions.push(FileTemplateCodeActionProvider_1._overflowCommandCodeAction);
                break;
            }
            actions.push({
                title: localize('title', 'Start with: {0}', snippet.name),
                kind: CodeActionKind.SurroundWith.value,
                edit: asWorkspaceEdit(model, model.getFullModelRange(), snippet),
            });
        }
        return {
            actions,
            dispose() { },
        };
    }
};
FileTemplateCodeActionProvider = FileTemplateCodeActionProvider_1 = __decorate([
    __param(0, ISnippetsService)
], FileTemplateCodeActionProvider);
function asWorkspaceEdit(model, range, snippet) {
    return {
        edits: [
            {
                versionId: model.getVersionId(),
                resource: model.uri,
                textEdit: {
                    range,
                    text: snippet.body,
                    insertAsSnippet: true,
                },
            },
        ],
    };
}
let SnippetCodeActions = class SnippetCodeActions {
    constructor(instantiationService, languageFeaturesService, configService) {
        this._store = new DisposableStore();
        const setting = 'editor.snippets.codeActions.enabled';
        const sessionStore = new DisposableStore();
        const update = () => {
            sessionStore.clear();
            if (configService.getValue(setting)) {
                sessionStore.add(languageFeaturesService.codeActionProvider.register('*', instantiationService.createInstance(SurroundWithSnippetCodeActionProvider)));
                sessionStore.add(languageFeaturesService.codeActionProvider.register('*', instantiationService.createInstance(FileTemplateCodeActionProvider)));
            }
        };
        update();
        this._store.add(configService.onDidChangeConfiguration((e) => e.affectsConfiguration(setting) && update()));
        this._store.add(sessionStore);
    }
    dispose() {
        this._store.dispose();
    }
};
SnippetCodeActions = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageFeaturesService),
    __param(2, IConfigurationService)
], SnippetCodeActions);
export { SnippetCodeActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvZGVBY3Rpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldENvZGVBY3Rpb25Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVF2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsK0JBQStCLEdBQy9CLE1BQU0sbUNBQW1DLENBQUE7QUFFMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRWhELElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXFDOzthQUNsQixzQkFBaUIsR0FBRyxDQUFDLEFBQUosQ0FBSTthQUVyQiwrQkFBMEIsR0FBZTtRQUNoRSxJQUFJLEVBQUUsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLO1FBQ3ZDLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztRQUNsQyxPQUFPLEVBQUU7WUFDUixFQUFFLEVBQUUs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