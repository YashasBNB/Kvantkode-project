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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ILanguageService, } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { ITestResultService } from './testResultService.js';
import { TEST_DATA_SCHEME, parseTestUri } from './testingUri.js';
/**
 * A content provider that returns various outputs for tests. This is used
 * in the inline peek view.
 */
let TestingContentProvider = class TestingContentProvider {
    constructor(textModelResolverService, languageService, modelService, resultService) {
        this.languageService = languageService;
        this.modelService = modelService;
        this.resultService = resultService;
        textModelResolverService.registerTextModelContentProvider(TEST_DATA_SCHEME, this);
    }
    /**
     * @inheritdoc
     */
    async provideTextContent(resource) {
        const existing = this.modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const parsed = parseTestUri(resource);
        if (!parsed) {
            return null;
        }
        const result = this.resultService.getResult(parsed.resultId);
        if (!result) {
            return null;
        }
        if (parsed.type === 0 /* TestUriType.TaskOutput */) {
            const task = result.tasks[parsed.taskIndex];
            const model = this.modelService.createModel('', null, resource, false);
            const append = (text) => model.applyEdits([
                {
                    range: {
                        startColumn: 1,
                        endColumn: 1,
                        startLineNumber: Infinity,
                        endLineNumber: Infinity,
                    },
                    text,
                },
            ]);
            const init = VSBuffer.concat(task.output.buffers, task.output.length).toString();
            append(removeAnsiEscapeCodes(init));
            let hadContent = init.length > 0;
            const dispose = new DisposableStore();
            dispose.add(task.output.onDidWriteData((d) => {
                hadContent ||= d.byteLength > 0;
                append(removeAnsiEscapeCodes(d.toString()));
            }));
            task.output.endPromise.then(() => {
                if (dispose.isDisposed) {
                    return;
                }
                if (!hadContent) {
                    append(localize('runNoOutout', 'The test run did not record any output.'));
                    dispose.dispose();
                }
            });
            model.onWillDispose(() => dispose.dispose());
            return model;
        }
        const test = result?.getStateById(parsed.testExtId);
        if (!test) {
            return null;
        }
        let text;
        let language = null;
        switch (parsed.type) {
            case 3 /* TestUriType.ResultActualOutput */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (message?.type === 0 /* TestMessageType.Error */) {
                    text = message.actual;
                }
                break;
            }
            case 1 /* TestUriType.TestOutput */: {
                text = '';
                const output = result.tasks[parsed.taskIndex].output;
                for (const message of test.tasks[parsed.taskIndex].messages) {
                    if (message.type === 1 /* TestMessageType.Output */) {
                        text += removeAnsiEscapeCodes(output.getRange(message.offset, message.length).toString());
                    }
                }
                break;
            }
            case 4 /* TestUriType.ResultExpectedOutput */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (message?.type === 0 /* TestMessageType.Error */) {
                    text = message.expected;
                }
                break;
            }
            case 2 /* TestUriType.ResultMessage */: {
                const message = test.tasks[parsed.taskIndex].messages[parsed.messageIndex];
                if (!message) {
                    break;
                }
                if (message.type === 1 /* TestMessageType.Output */) {
                    const content = result.tasks[parsed.taskIndex].output.getRange(message.offset, message.length);
                    text = removeAnsiEscapeCodes(content.toString());
                }
                else if (typeof message.message === 'string') {
                    text = removeAnsiEscapeCodes(message.message);
                }
                else {
                    text = message.message.value;
                    language = this.languageService.createById('markdown');
                }
            }
        }
        if (text === undefined) {
            return null;
        }
        return this.modelService.createModel(text, language, resource, false);
    }
};
TestingContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITestResultService)
], TestingContentProvider);
export { TestingContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ0NvbnRlbnRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTFFLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFN0U7OztHQUdHO0FBQ0ksSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7SUFDbEMsWUFDb0Isd0JBQTJDLEVBQzNCLGVBQWlDLEVBQ3BDLFlBQTJCLEVBQ3RCLGFBQWlDO1FBRm5DLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNwQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN0QixrQkFBYSxHQUFiLGFBQWEsQ0FBb0I7UUFFdEUsd0JBQXdCLENBQUMsZ0NBQWdDLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJ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