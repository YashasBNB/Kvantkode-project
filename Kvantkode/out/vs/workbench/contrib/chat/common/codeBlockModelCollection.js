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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jb2RlQmxvY2tNb2RlbENvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVsRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUNOLDRCQUE0QixFQUM1Qiw4QkFBOEIsR0FFOUIsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQWlELFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBZXpGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQWtCdkQsWUFDa0IsR0FBdUIsRUFDdEIsZUFBa0QsRUFDakQsZ0JBQW9EO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBSlUsUUFBRyxHQUFILEdBQUcsQ0FBb0I7UUFDTCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDaEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQXBCdkQsWUFBTyxHQUFHLElBQUksR0FBRyxFQVEvQixDQUFBO1FBRUg7Ozs7V0FJRztRQUNjLGtCQUFhLEdBQUcsR0FBRyxDQUFBO0lBUXBDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNiLENBQUM7SUFFRCxHQUFHLENBQ0YsU0FBaUIsRUFDakIsSUFBb0QsRUFDcEQsY0FBc0I7UUFFdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDNUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFDRCxPQUFPO1lBQ04sS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUM1RCxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO1lBQ2xDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtTQUNwQixDQUFBO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FDVixTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxjQUFzQjtRQUV0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDakUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRTtZQUM5RCxLQUFLLEVBQUUsS0FBSztZQUNaLEtBQUssRUFBRSxFQUFFO1lBQ1QsYUFBYSxFQUFFLFNBQVM7U0FDeEIsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDL0MsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE1BQUs7WUFDTixDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQixDQUFDO1FBRUQsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUNsRCxLQUFLLEVBQUUsRUFBRTtZQUNULGFBQWEsRUFBRSxTQUFTO1NBQ3hCLENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLEdBQVc7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRS9DLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELFVBQVUsQ0FDVCxTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxjQUFzQixFQUN0QixPQUF5QjtRQUV6QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFL0QsTUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25FLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUU5RSxNQUFNLFlBQVksR0FBRyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5RixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQTtJQUMxRCxDQUFDO0lBRUQsc0JBQXNCLENBQ3JCLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELGNBQXNCO1FBRXRCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBQ0QsOEZBQThGO0lBQy9GLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUNYLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELGNBQXNCLEVBQ3RCLE9BQXlCO1FBRXpCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUUvRCxNQUFNLGNBQWMsR0FBRyw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkUsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sWUFBWSxHQUFHLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFELElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzdGLE9BQU8sR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUE7UUFDekMsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDbkMsSUFBSSxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUM1QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzdGLElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLEtBQUssU0FBUyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7Z0JBQ3hFLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1FBQzlELElBQUksT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzdCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzlDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDcEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO2FBQU0sQ0FBQztZQUNQLDZDQUE2QztZQUM3QyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsU0FBaUIsRUFDakIsSUFBb0QsRUFDcEQsY0FBc0IsRUFDdEIsYUFBa0IsRUFDbEIsTUFBZ0I7UUFFaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDNUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1lBQ25DLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUSxDQUNmLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELGNBQXNCLEVBQ3RCLGVBQXlDO1FBRXpDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzVFLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FDYixTQUFpQixFQUNqQixJQUFvRCxFQUNwRCxLQUFhO1FBRWIsT0FBTyxHQUFHLFNBQVMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFTyxlQUFlLENBQ3RCLFNBQWlCLEVBQ2pCLElBQW9ELEVBQ3BELEtBQWE7UUFFYixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQTtRQUNoRSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLG1CQUFtQjtZQUNuQyxTQUFTLEVBQUUsU0FBUztZQUNwQixJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRTtZQUNoQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3pELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxjQUFjLENBQUMsSUFBb0Q7UUFDMUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPO1lBQ04sVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDOUMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3ZDLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxNQUFNLGFBQWEsR0FBRyxjQUFjLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUE7Z0JBQzNGLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsT0FBTTtnQkFDUCxDQUFDO2dCQUVELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUM5QixPQUFPO3dCQUNOLEdBQUcsRUFBRSxhQUFhLENBQUMsTUFBTSxFQUFFO3FCQUMzQixDQUFBO2dCQUNGLENBQUM7Z0JBRUQsT0FBTztvQkFDTixHQUFHLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7b0JBQy9CLEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSztpQkFDMUIsQ0FBQTtZQUNGLENBQUMsQ0FBQztTQUNGLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXZRWSx3QkFBd0I7SUFvQmxDLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxpQkFBaUIsQ0FBQTtHQXJCUCx3QkFBd0IsQ0F1UXBDOztBQUVELFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxVQUE4QjtJQUNoRSxJQUFJLFVBQVUsS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sVUFBVSxJQUFJLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9