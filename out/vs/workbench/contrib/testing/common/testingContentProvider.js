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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RpbmdDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUxRSxPQUFPLEVBRU4sZ0JBQWdCLEdBQ2hCLE1BQU0saURBQWlELENBQUE7QUFFeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFlLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTdFOzs7R0FHRztBQUNJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBQ2xDLFlBQ29CLHdCQUEyQyxFQUMzQixlQUFpQyxFQUNwQyxZQUEyQixFQUN0QixhQUFpQztRQUZuQyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDcEMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDdEIsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBRXRFLHdCQUF3QixDQUFDLGdDQUFnQyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRDs7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