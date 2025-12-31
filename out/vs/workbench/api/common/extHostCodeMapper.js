/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { NotebookEdit, TextEdit } from './extHostTypeConverters.js';
import { URI } from '../../../base/common/uri.js';
import { asArray } from '../../../base/common/arrays.js';
export class ExtHostCodeMapper {
    static { this._providerHandlePool = 0; }
    constructor(mainContext) {
        this.providers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCodeMapper);
    }
    async $mapCode(handle, internalRequest, token) {
        // Received request to map code from the main thread
        const provider = this.providers.get(handle);
        if (!provider) {
            throw new Error(`Received request to map code for unknown provider handle ${handle}`);
        }
        // Construct a response object to pass to the provider
        const stream = {
            textEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(TextEdit.from),
                });
            },
            notebookEdit: (target, edits) => {
                edits = asArray(edits);
                this._proxy.$handleProgress(internalRequest.requestId, {
                    uri: target,
                    edits: edits.map(NotebookEdit.from),
                });
            },
        };
        const request = {
            location: internalRequest.location,
            chatRequestId: internalRequest.chatRequestId,
            codeBlocks: internalRequest.codeBlocks.map((block) => {
                return {
                    code: block.code,
                    resource: URI.revive(block.resource),
                    markdownBeforeBlock: block.markdownBeforeBlock,
                };
            }),
        };
        const result = await provider.provideMappedEdits(request, stream, token);
        return result ?? null;
    }
    registerMappedEditsProvider(extension, provider) {
        const handle = ExtHostCodeMapper._providerHandlePool++;
        this._proxy.$registerCodeMapperProvider(handle, extension.displayName ?? extension.name);
        this.providers.set(handle, provider);
        return {
            dispose: () => {
                return this._proxy.$unregisterCodeMapperProvider(handle);
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvZGVNYXBwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29kZU1hcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV4RCxNQUFNLE9BQU8saUJBQWlCO2FBQ2Qsd0JBQW1CLEdBQVcsQ0FBQyxBQUFaLENBQVk7SUFJOUMsWUFBWSxXQUF5QztRQUZwQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUE7UUFHMUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FDYixNQUFjLEVBQ2QsZUFBc0QsRUFDdEQsS0FBd0I7UUFFeEIsb0RBQW9EO1FBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxNQUFNLE1BQU0sR0FBcUM7WUFDaEQsUUFBUSxFQUFFLENBQUMsTUFBa0IsRUFBRSxLQUEwQyxFQUFFLEVBQUU7Z0JBQzVFLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUU7b0JBQ3RELEdBQUcsRUFBRSxNQUFNO29CQUNYLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7aUJBQy9CLENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxZQUFZLEVBQUUsQ0FBQyxNQUFrQixFQUFFLEtBQWtELEVBQUUsRUFBRTtnQkFDeEYsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRTtvQkFDdEQsR0FBRyxFQUFFLE1BQU07b0JBQ1gsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztpQkFDbkMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztTQUNELENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBOEI7WUFDMUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRO1lBQ2xDLGFBQWEsRUFBRSxlQUFlLENBQUMsYUFBYTtZQUM1QyxVQUFVLEVBQUUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDcEQsT0FBTztvQkFDTixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7b0JBQ2hCLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7b0JBQ3BDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxtQkFBbUI7aUJBQzlDLENBQUE7WUFDRixDQUFDLENBQUM7U0FDRixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RSxPQUFPLE1BQU0sSUFBSSxJQUFJLENBQUE7SUFDdEIsQ0FBQztJQUVELDJCQUEyQixDQUMxQixTQUFnQyxFQUNoQyxRQUFxQztRQUVyQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RELElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNwQyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDekQsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDIn0=