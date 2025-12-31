/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { localize } from '../../../../../nls.js';
export class ChatToolInvocation {
    get isComplete() {
        return this._isComplete;
    }
    get isCompletePromise() {
        return this._isCompleteDeferred.p;
    }
    get confirmed() {
        return this._confirmDeferred;
    }
    get isConfirmed() {
        return this._isConfirmed;
    }
    get resultDetails() {
        return this._resultDetails;
    }
    constructor(preparedInvocation, toolData, toolCallId) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this._isComplete = false;
        this._isCompleteDeferred = new DeferredPromise();
        this._confirmDeferred = new DeferredPromise();
        const defaultMessage = localize('toolInvocationMessage', 'Using {0}', `"${toolData.displayName}"`);
        const invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.invocationMessage = invocationMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this._confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        if (!this._confirmationMessages) {
            // No confirmation needed
            this._isConfirmed = true;
            this._confirmDeferred.complete(true);
        }
        this._confirmDeferred.p.then((confirmed) => {
            this._isConfirmed = confirmed;
            this._confirmationMessages = undefined;
        });
        this._isCompleteDeferred.p.then(() => {
            this._isComplete = true;
        });
    }
    complete(result) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        this._resultDetails = result?.toolResultDetails;
        this._isCompleteDeferred.complete();
    }
    get confirmationMessages() {
        return this._confirmationMessages;
    }
    toJSON() {
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            isConfirmed: this._isConfirmed,
            isComplete: this._isComplete,
            resultDetails: this._resultDetails,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFByb2dyZXNzVHlwZXMvY2hhdFRvb2xJbnZvY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFjaEQsTUFBTSxPQUFPLGtCQUFrQjtJQUk5QixJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFHRCxJQUFXLGlCQUFpQjtRQUMzQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUdELElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBR0QsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBR0QsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBVUQsWUFDQyxrQkFBdUQsRUFDdkQsUUFBbUIsRUFDSCxVQUFrQjtRQUFsQixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBdENuQixTQUFJLEdBQXFCLGdCQUFnQixDQUFBO1FBRWpELGdCQUFXLEdBQUcsS0FBSyxDQUFBO1FBS25CLHdCQUFtQixHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7UUFLakQscUJBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQVcsQ0FBQTtRQTRCeEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUM5Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLElBQUksUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUMzQixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsRUFBRSxpQkFBaUIsSUFBSSxjQUFjLENBQUE7UUFDakYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFBO1FBQzFDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQTtRQUM1RCxJQUFJLENBQUMscUJBQXFCLEdBQUcsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUE7UUFDckUsSUFBSSxDQUFDLFlBQVksR0FBRyxrQkFBa0IsRUFBRSxZQUFZLENBQUE7UUFDcEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixFQUFFLGdCQUFnQixDQUFBO1FBQzVELElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQTtRQUV6QixJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDakMseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7WUFDN0IsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtRQUN2QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsTUFBK0I7UUFDOUMsSUFBSSxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQTtRQUMvQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQVcsb0JBQW9CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQ2xDLENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTztZQUNOLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDekMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUN2QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDOUIsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzVCLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNsQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUMzQixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=