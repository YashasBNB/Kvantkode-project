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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
let NotebookRendererMessagingService = class NotebookRendererMessagingService extends Disposable {
    constructor(extensionService) {
        super();
        this.extensionService = extensionService;
        /**
         * Activation promises. Maps renderer IDs to a queue of messages that should
         * be sent once activation finishes, or undefined if activation is complete.
         */
        this.activations = new Map();
        this.scopedMessaging = new Map();
        this.postMessageEmitter = this._register(new Emitter());
        this.onShouldPostMessage = this.postMessageEmitter.event;
    }
    /** @inheritdoc */
    receiveMessage(editorId, rendererId, message) {
        if (editorId === undefined) {
            const sends = [...this.scopedMessaging.values()].map((e) => e.receiveMessageHandler?.(rendererId, message));
            return Promise.all(sends).then((s) => s.some((s) => !!s));
        }
        return (this.scopedMessaging.get(editorId)?.receiveMessageHandler?.(rendererId, message) ??
            Promise.resolve(false));
    }
    /** @inheritdoc */
    prepare(rendererId) {
        if (this.activations.has(rendererId)) {
            return;
        }
        const queue = [];
        this.activations.set(rendererId, queue);
        this.extensionService.activateByEvent(`onRenderer:${rendererId}`).then(() => {
            for (const message of queue) {
                this.postMessageEmitter.fire(message);
            }
            this.activations.set(rendererId, undefined);
        });
    }
    /** @inheritdoc */
    getScoped(editorId) {
        const existing = this.scopedMessaging.get(editorId);
        if (existing) {
            return existing;
        }
        const messaging = {
            postMessage: (rendererId, message) => this.postMessage(editorId, rendererId, message),
            dispose: () => this.scopedMessaging.delete(editorId),
        };
        this.scopedMessaging.set(editorId, messaging);
        return messaging;
    }
    postMessage(editorId, rendererId, message) {
        if (!this.activations.has(rendererId)) {
            this.prepare(rendererId);
        }
        const activation = this.activations.get(rendererId);
        const toSend = { rendererId, editorId, message };
        if (activation === undefined) {
            this.postMessageEmitter.fire(toSend);
        }
        else {
            activation.push(toSend);
        }
    }
};
NotebookRendererMessagingService = __decorate([
    __param(0, IExtensionService)
], NotebookRendererMessagingService);
export { NotebookRendererMessagingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tSZW5kZXJlck1lc3NhZ2luZ1NlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va1JlbmRlcmVyTWVzc2FnaW5nU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUtwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUlqRixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUNaLFNBQVEsVUFBVTtJQWFsQixZQUErQixnQkFBb0Q7UUFDbEYsS0FBSyxFQUFFLENBQUE7UUFEd0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQVRuRjs7O1dBR0c7UUFDYyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUF3RCxDQUFBO1FBQzdFLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQW1ELENBQUE7UUFDNUUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUIsQ0FBQyxDQUFBO1FBQ2xFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7SUFJbkUsQ0FBQztJQUVELGtCQUFrQjtJQUNYLGNBQWMsQ0FDcEIsUUFBNEIsRUFDNUIsVUFBa0IsRUFDbEIsT0FBZ0I7UUFFaEIsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFH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