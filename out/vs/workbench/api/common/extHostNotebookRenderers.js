/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { MainContext, } from './extHost.protocol.js';
import { ExtHostNotebookEditor } from './extHostNotebookEditor.js';
export class ExtHostNotebookRenderers {
    constructor(mainContext, _extHostNotebook) {
        this._extHostNotebook = _extHostNotebook;
        this._rendererMessageEmitters = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadNotebookRenderers);
    }
    $postRendererMessage(editorId, rendererId, message) {
        const editor = this._extHostNotebook.getEditorById(editorId);
        this._rendererMessageEmitters.get(rendererId)?.fire({ editor: editor.apiEditor, message });
    }
    createRendererMessaging(manifest, rendererId) {
        if (!manifest.contributes?.notebookRenderer?.some((r) => r.id === rendererId)) {
            throw new Error(`Extensions may only call createRendererMessaging() for renderers they contribute (got ${rendererId})`);
        }
        const messaging = {
            onDidReceiveMessage: (listener, thisArg, disposables) => {
                return this.getOrCreateEmitterFor(rendererId).event(listener, thisArg, disposables);
            },
            postMessage: (message, editorOrAlias) => {
                if (ExtHostNotebookEditor.apiEditorsToExtHost.has(message)) {
                    // back compat for swapped args
                    ;
                    [message, editorOrAlias] = [editorOrAlias, message];
                }
                const extHostEditor = editorOrAlias && ExtHostNotebookEditor.apiEditorsToExtHost.get(editorOrAlias);
                return this.proxy.$postMessage(extHostEditor?.id, rendererId, message);
            },
        };
        return messaging;
    }
    getOrCreateEmitterFor(rendererId) {
        let emitter = this._rendererMessageEmitters.get(rendererId);
        if (emitter) {
            return emitter;
        }
        emitter = new Emitter({
            onDidRemoveLastListener: () => {
                emitter?.dispose();
                this._rendererMessageEmitters.delete(rendererId);
            },
        });
        this._rendererMessageEmitters.set(rendererId, emitter);
        return emitter;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rUmVuZGVyZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rUmVuZGVyZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHbEUsTUFBTSxPQUFPLHdCQUF3QjtJQU9wQyxZQUNDLFdBQXlCLEVBQ1IsZ0JBQTJDO1FBQTNDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMkI7UUFSNUMsNkJBQXdCLEdBQUcsSUFBSSxHQUFHLEVBR2hELENBQUE7UUFPRixJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVNLG9CQUFvQixDQUFDLFFBQWdCLEVBQUUsVUFBa0IsRUFBRSxPQUFnQjtRQUNqRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUMzRixDQUFDO0lBRU0sdUJBQXVCLENBQzdCLFFBQStCLEVBQy9CLFVBQWtCO1FBRWxCLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQy9FLE1BQU0sSUFBSSxLQUFLLENBQ2QseUZBQXlGLFVBQVUsR0FBRyxDQUN0RyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFxQztZQUNuRCxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUU7Z0JBQ3ZELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7WUFDRCxXQUFXLEVBQUUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUU7Z0JBQ3ZDLElBQUkscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzVELCtCQUErQjtvQkFDL0IsQ0FBQztvQkFBQSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFDckQsQ0FBQztnQkFFRCxNQUFNLGFBQWEsR0FDbEIsYUFBYSxJQUFJLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDOUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1NBQ0QsQ0FBQTtRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxVQUFrQjtRQUMvQyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7WUFDckIsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO2dCQUM3QixPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDakQsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRXRELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztDQUNEIn0=