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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { extractCodeblockUrisFromText, extractVulnerabilitiesFromText, } from './annotations.js';
import { isResponseVM } from './chatViewModel.js';
let CodeBlockModelCollection = class CodeBlockModelCollection extends Disposable {
    constructor(tag, languageService, textModelService) {
        super();
        this.tag = tag;
        this.languageService = languageService;
        this.textModelService = textModelService;
        this._models = new Map();
        /**
         * Max number of models to keep in memory.
         *
         * Currently always maintains the most recently created models.
         */
        this.maxModelCount = 100;
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    get(sessionId, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        return {
            model: entry.model.then((ref) => ref.object.textEditorModel),
            vulns: entry.vulns,
            codemapperUri: entry.codemapperUri,
            isEdit: entry.isEdit,
        };
    }
    getOrCreate(sessionId, chat, codeBlockIndex) {
        const existing = this.get(sessionId, chat, codeBlockIndex);
        if (existing) {
            return existing;
        }
        const uri = this.getCodeBlockUri(sessionId, chat, codeBlockIndex);
        const model = this.textModelService.createModelReference(uri);
        this._models.set(this.getKey(sessionId, chat, codeBlockIndex), {
            model: model,
            vulns: [],
            codemapperUri: undefined,
        });
        while (this._models.size > this.maxModelCount) {
            const first = Iterable.first(this._models.keys());
            if (!first) {
                break;
            }
            this.delete(first);
        }
        return {
            model: model.then((x) => x.object.textEditorModel),
            vulns: [],
            codemapperUri: undefined,
        };
    }
    delete(key) {
        const entry = this._models.get(key);
        if (!entry) {
            return;
        }
        entry.model.then((ref) => ref.object.dispose());
        this._models.delete(key);
    }
    clear() {
        this._models.forEach(async (entry) => (await entry.model).dispose());
        this._models.clear();
    }
    updateSync(sessionId, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionId, chat, codeBlockIndex);
        const extractedVulns = extractVulnerabilitiesFromText(content.text);
        const newText = fixCodeText(extractedVulns.newText, content.languageId);
        this.setVulns(sessionId, chat, codeBlockIndex, extractedVulns.vulnerabilities);
        const codeblockUri = extractCodeblockUrisFromText(newText);
        if (codeblockUri) {
            this.setCodemapperUri(sessionId, chat, codeBlockIndex, codeblockUri.uri, codeblockUri.isEdit);
        }
        if (content.isComplete) {
            this.markCodeBlockCompleted(sessionId, chat, codeBlockIndex);
        }
        return this.get(sessionId, chat, codeBlockIndex) ?? entry;
    }
    markCodeBlockCompleted(sessionId, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        // TODO: fill this in once we've implemented https://github.com/microsoft/vscode/issues/232538
    }
    async update(sessionId, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionId, chat, codeBlockIndex);
        const extractedVulns = extractVulnerabilitiesFromText(content.text);
        let newText = fixCodeText(extractedVulns.newText, content.languageId);
        this.setVulns(sessionId, chat, codeBlockIndex, extractedVulns.vulnerabilities);
        const codeblockUri = extractCodeblockUrisFromText(newText);
        if (codeblockUri) {
            this.setCodemapperUri(sessionId, chat, codeBlockIndex, codeblockUri.uri, codeblockUri.isEdit);
            newText = codeblockUri.textWithoutResult;
        }
        if (content.isComplete) {
            this.markCodeBlockCompleted(sessionId, chat, codeBlockIndex);
        }
        const textModel = await entry.model;
        if (textModel.isDisposed()) {
            return entry;
        }
        if (content.languageId) {
            const vscodeLanguageId = this.languageService.getLanguageIdByLanguageName(content.languageId);
            if (vscodeLanguageId && vscodeLanguageId !== textModel.getLanguageId()) {
                textModel.setLanguage(vscodeLanguageId);
            }
        }
        const currentText = textModel.getValue(1 /* EndOfLinePreference.LF */);
        if (newText === currentText) {
            return entry;
        }
        if (newText.startsWith(currentText)) {
            const text = newText.slice(currentText.length);
            const lastLine = textModel.getLineCount();
            const lastCol = textModel.getLineMaxColumn(lastLine);
            textModel.applyEdits([{ range: new Range(lastLine, lastCol, lastLine, lastCol), text }]);
        }
        else {
            // console.log(`Failed to optimize setText`);
            textModel.setValue(newText);
        }
        return entry;
    }
    setCodemapperUri(sessionId, chat, codeBlockIndex, codemapperUri, isEdit) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (entry) {
            entry.codemapperUri = codemapperUri;
            entry.isEdit = isEdit;
        }
    }
    setVulns(sessionId, chat, codeBlockIndex, vulnerabilities) {
        const entry = this._models.get(this.getKey(sessionId, chat, codeBlockIndex));
        if (entry) {
            entry.vulns = vulnerabilities;
        }
    }
    getKey(sessionId, chat, index) {
        return `${sessionId}/${chat.id}/${index}`;
    }
    getCodeBlockUri(sessionId, chat, index) {
        const metadata = this.getUriMetaData(chat);
        const indexPart = this.tag ? `${this.tag}-${index}` : `${index}`;
        return URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            authority: sessionId,
            path: `/${chat.id}/${indexPart}`,
            fragment: metadata ? JSON.stringify(metadata) : undefined,
        });
    }
    getUriMetaData(chat) {
        if (!isResponseVM(chat)) {
            return undefined;
        }
        return {
            references: chat.contentReferences.map((ref) => {
                if (typeof ref.reference === 'string') {
                    return;
                }
                const uriOrLocation = 'variableName' in ref.reference ? ref.reference.value : ref.reference;
                if (!uriOrLocation) {
                    return;
                }
                if (URI.isUri(uriOrLocation)) {
                    return {
                        uri: uriOrLocation.toJSON(),
                    };
                }
                return {
                    uri: uriOrLocation.uri.toJSON(),
                    range: uriOrLocation.range,
                };
            }),
        };
    }
};
CodeBlockModelCollection = __decorate([
    __param(1, ILanguageService),
    __param(2, ITextModelService)
], CodeBlockModelCollection);
export { CodeBlockModelCollection };
function fixCodeText(text, languageId) {
    if (languageId === 'php') {
        if (!text.trim().startsWith('<')) {
            return `<?php\n${text}`;
        }
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUE7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsOEJBQThCLEdBRTlCLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUFpRCxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQWV6RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFrQnZELFlBQ2tCLEdBQXVCLEVBQ3RCLGVBQWtELEVBQ2pELGdCQUFvRDtRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUpVLFFBQUcsR0FBSCxHQUFHLENBQW9CO1FBQ0wsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFwQnZELFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFRL0IsQ0FBQTtRQUVIOzs7O1dBSUc7UUFDYyxrQkFBYSxHQUFHLEdBQUcsQ0FBQTtJQVFwQyxDQUFDO0lBRWUsT0FBTztRQUN0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0lBRUQsR0FBRyxDQUNGLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELGNBQXNCO1FBRXRCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7WUFDNUQsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYTtZQUNsQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDcEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxXQUFXLENBQ1YsU0FBaUIsRUFDakIsSUFBb0QsRUFDcEQsY0FBc0I7UUFFdEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzFELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUU7WUFDOUQsS0FBSyxFQUFFLEtBQUs7WUFDWixLQUFLLEVBQUUsRUFBRTtZQUNULGFBQWEsRUFBRSxTQUFTO1NBQ3hCLENBQUMsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQy9DLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2pELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixNQUFLO1lBQ04sQ0FBQztZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7WUFDbEQsS0FBSyxFQUFFLEVBQUU7WUFDVCxhQUFhLEVBQUUsU0FBUztTQUN4QixDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxHQUFXO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUUvQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxVQUFVLENBQ1QsU0FBaUIsRUFDakIsSUFBb0QsRUFDcEQsY0FBc0IsRUFDdEIsT0FBeUI7UUFFekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sY0FBYyxHQUFHLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuRSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFOUUsTUFBTSxZQUFZLEdBQUcsNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUYsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUE7SUFDMUQsQ0FBQztJQUVELHNCQUFzQixDQUNyQixTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxjQUFzQjtRQUV0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUNELDhGQUE4RjtJQUMvRixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FDWCxTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxjQUFzQixFQUN0QixPQUF5QjtRQUV6QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFL0QsTUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25FLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUU5RSxNQUFNLFlBQVksR0FBRyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM3RixPQUFPLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFBO1FBQ3pDLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ25DLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDNUIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM3RixJQUFJLGdCQUFnQixJQUFJLGdCQUFnQixLQUFLLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDO2dCQUN4RSxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsUUFBUSxnQ0FBd0IsQ0FBQTtRQUM5RCxJQUFJLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM3QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDekMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3BELFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekYsQ0FBQzthQUFNLENBQUM7WUFDUCw2Q0FBNkM7WUFDN0MsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELGNBQXNCLEVBQ3RCLGFBQWtCLEVBQ2xCLE1BQWdCO1FBRWhCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtZQUNuQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFFBQVEsQ0FDZixTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxjQUFzQixFQUN0QixlQUF5QztRQUV6QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQ2IsU0FBaUIsRUFDakIsSUFBb0QsRUFDcEQsS0FBYTtRQUViLE9BQU8sR0FBRyxTQUFTLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sZUFBZSxDQUN0QixTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxLQUFhO1FBRWIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUE7UUFDaEUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxtQkFBbUI7WUFDbkMsU0FBUyxFQUFFLFNBQVM7WUFDcEIsSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxTQUFTLEVBQUU7WUFDaEMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN6RCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sY0FBYyxDQUFDLElBQW9EO1FBQzFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzlDLElBQUksT0FBTyxHQUFHLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUN2QyxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsTUFBTSxhQUFhLEdBQUcsY0FBYyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFBO2dCQUMzRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BCLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsT0FBTzt3QkFDTixHQUFHLEVBQUUsYUFBYSxDQUFDLE1BQU0sRUFBRTtxQkFDM0IsQ0FBQTtnQkFDRixDQUFDO2dCQUVELE9BQU87b0JBQ04sR0FBRyxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO29CQUMvQixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7aUJBQzFCLENBQUE7WUFDRixDQUFDLENBQUM7U0FDRixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF2UVksd0JBQXdCO0lBb0JsQyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsaUJBQWlCLENBQUE7R0FyQlAsd0JBQXdCLENBdVFwQzs7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsVUFBOEI7SUFDaEUsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLFVBQVUsSUFBSSxFQUFFLENBQUE7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==