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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvZGVBY3Rpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0Q29kZUFjdGlvblByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBUXZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUNOLHVCQUF1QixFQUN2QiwrQkFBK0IsR0FDL0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFaEQsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7O2FBQ2xCLHNCQUFpQixHQUFHLENBQUMsQUFBSixDQUFJO2FBRXJCLCtCQUEwQixHQUFlO1FBQ2hFLElBQUksRUFBRSxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUs7UUFDdkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO1FBQ2xDLE9BQU8sRUFBRTtZQUNSLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM5QyxLQUFLLEVBQUUsK0JBQStCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLO1NBQzFEO0tBQ0QsQUFQaUQsQ0FPakQ7SUFFRCxZQUErQyxlQUFpQztRQUFqQyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7SUFBRyxDQUFDO0lBRXBGLEtBQUssQ0FBQyxrQkFBa0IsQ0FDdkIsS0FBaUIsRUFDakIsS0FBd0I7UUFFeEIsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUMvRixNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUF1QixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBaUIsRUFBRSxDQUFBO1FBQ2hDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLHVDQUFxQyxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQy9FLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUNBQXFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtnQkFDOUUsTUFBSztZQUNOLENBQUM7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNsRCxJQUFJLEVBQUUsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLO2dCQUN2QyxJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDO2FBQzVDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPO1lBQ04sT0FBTztZQUNQLE9BQU8sS0FBSSxDQUFDO1NBQ1osQ0FBQTtJQUNGLENBQUM7O0FBN0NJLHFDQUFxQztJQVk3QixXQUFBLGdCQUFnQixDQUFBO0dBWnhCLHFDQUFxQyxDQThDMUM7QUFFRCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4Qjs7YUFDWCxzQkFBaUIsR0FBRyxDQUFDLEFBQUosQ0FBSTthQUVyQiwrQkFBMEIsR0FBZTtRQUNoRSxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDO1FBQzdELElBQUksRUFBRSxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUs7UUFDdkMsT0FBTyxFQUFFO1lBQ1IsRUFBRSxFQUFFLHNCQUFzQixDQUFDLEVBQUU7WUFDN0IsS0FBSyxFQUFFLEVBQUU7U0FDVDtLQUNELEFBUGlELENBT2pEO0lBSUQsWUFBOEIsZUFBa0Q7UUFBakMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBRnZFLDRCQUF1QixHQUF1QixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFUCxDQUFDO0lBRXBGLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxLQUFpQjtRQUN6QyxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDOUUsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQix1QkFBdUIsRUFBRSxJQUFJO1NBQzdCLENBQUMsQ0FBQTtRQUNGLE1BQU0sT0FBTyxHQUFpQixFQUFFLENBQUE7UUFDaEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksZ0NBQThCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEUsT0FBTyxDQUFDLElBQUksQ0FBQyxnQ0FBOEIsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO2dCQUN2RSxNQUFLO1lBQ04sQ0FBQztZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDekQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxZQUFZLENBQUMsS0FBSztnQkFDdkMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsT0FBTyxDQUFDO2FBQ2hFLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxPQUFPO1lBQ04sT0FBTztZQUNQLE9BQU8sS0FBSSxDQUFDO1NBQ1osQ0FBQTtJQUNGLENBQUM7O0FBekNJLDhCQUE4QjtJQWN0QixXQUFBLGdCQUFnQixDQUFBO0dBZHhCLDhCQUE4QixDQTBDbkM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUFpQixFQUFFLEtBQWEsRUFBRSxPQUFnQjtJQUMxRSxPQUFPO1FBQ04sS0FBSyxFQUFFO1lBQ047Z0JBQ0MsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUU7Z0JBQy9CLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDbkIsUUFBUSxFQUFFO29CQUNULEtBQUs7b0JBQ0wsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNsQixlQUFlLEVBQUUsSUFBSTtpQkFDckI7YUFDRDtTQUNEO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFTSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUc5QixZQUN3QixvQkFBMkMsRUFDeEMsdUJBQWlELEVBQ3BELGFBQW9DO1FBTDNDLFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBTzlDLE1BQU0sT0FBTyxHQUFHLHFDQUFxQyxDQUFBO1FBQ3JELE1BQU0sWUFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDMUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNwQixJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsWUFBWSxDQUFDLEdBQUcsQ0FDZix1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQ2xELEdBQUcsRUFDSCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUNBQXFDLENBQUMsQ0FDMUUsQ0FDRCxDQUFBO2dCQUNELFlBQVksQ0FBQyxHQUFHLENBQ2YsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUNsRCxHQUFHLEVBQ0gsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDLENBQ25FLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLEVBQUUsQ0FBQTtRQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQzFGLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQztDQUNELENBQUE7QUF0Q1ksa0JBQWtCO0lBSTVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0dBTlgsa0JBQWtCLENBc0M5QiJ9