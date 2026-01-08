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
var TextModelContentsProvider_1;
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { FilePromptContentProvider } from './filePromptContentsProvider.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { newWriteableStream } from '../../../../../../base/common/stream.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { TextModel } from '../../../../../../editor/common/model/textModel.js';
/**
 * Prompt contents provider for a {@link ITextModel} instance.
 */
let TextModelContentsProvider = TextModelContentsProvider_1 = class TextModelContentsProvider extends PromptContentsProviderBase {
    constructor(model, initService) {
        super();
        this.model = model;
        this.initService = initService;
        /**
         * URI component of the prompt associated with this contents provider.
         */
        this.uri = this.model.uri;
        this._register(this.model.onWillDispose(this.dispose.bind(this)));
        this._register(this.model.onDidChangeContent(this.onChangeEmitter.fire));
    }
    /**
     * Creates a stream of binary data from the text model based on the changes
     * listed in the provided event.
     *
     * Note! this method implements a basic logic which does not take into account
     * 		 the `_event` argument for incremental updates. This needs to be improved.
     *
     * @param _event - event that describes the changes in the text model; `'full'` is
     * 				   the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        const stream = newWriteableStream(null);
        const linesCount = this.model.getLineCount();
        // provide the changed lines to the stream incrementally and asynchronously
        // to avoid blocking the main thread and save system resources used
        let i = 1;
        const interval = setInterval(() => {
            // if we have written all lines or lines count is zero,
            // end the stream and stop the interval timer
            if (i >= linesCount) {
                clearInterval(interval);
                stream.end();
                stream.destroy();
            }
            // if model was disposed or cancellation was requested,
            // end the stream with an error and stop the interval timer
            if (this.model.isDisposed() || cancellationToken?.isCancellationRequested) {
                clearInterval(interval);
                stream.error(new CancellationError());
                stream.destroy();
                return;
            }
            try {
                // write the current line to the stream
                stream.write(VSBuffer.fromString(this.model.getLineContent(i)));
                // for all lines except the last one, write the EOL character
                // to separate the lines in the stream
                if (i !== linesCount) {
                    stream.write(VSBuffer.fromString(this.model.getEOL()));
                }
            }
            catch (error) {
                console.log(this.uri, i, error);
            }
            // use the next line in the next iteration
            i++;
        }, 1);
        return stream;
    }
    createNew(promptContentsSource) {
        if (promptContentsSource instanceof TextModel) {
            return this.initService.createInstance(TextModelContentsProvider_1, promptContentsSource);
        }
        return this.initService.createInstance(FilePromptContentProvider, promptContentsSource.uri);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `text-model-prompt-contents-provider:${this.uri.path}`;
    }
};
TextModelContentsProvider = TextModelContentsProvider_1 = __decorate([
    __param(1, IInstantiationService)
], TextModelContentsProvider);
export { TextModelContentsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQ29udGVudHNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvdGV4dE1vZGVsQ29udGVudHNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFOUU7O0dBRUc7QUFDSSxJQUFNLHlCQUF5QixpQ0FBL0IsTUFBTSx5QkFBMEIsU0FBUSwwQkFBcUQ7SUFNbkcsWUFDa0IsS0FBaUIsRUFDWCxXQUFtRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQTtRQUhVLFVBQUssR0FBTCxLQUFLLENBQVk7UUFDTSxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFQM0U7O1dBRUc7UUFDYSxRQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7UUFRbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FB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