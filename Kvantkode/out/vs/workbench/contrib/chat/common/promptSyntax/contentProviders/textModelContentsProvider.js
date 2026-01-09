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
