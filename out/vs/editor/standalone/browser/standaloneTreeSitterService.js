/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
/**
 * The monaco build doesn't like the dynamic import of tree sitter in the real service.
 * We use a dummy service here to make the build happy.
 */
export class StandaloneTreeSitterParserService {
    constructor() {
        this.onDidUpdateTree = Event.None;
        this.onDidAddLanguage = Event.None;
    }
    async getLanguage(languageId) {
        return undefined;
    }
    getTreeSync(content, languageId) {
        return undefined;
    }
    async getTextModelTreeSitter(model, parseImmediately) {
        return undefined;
    }
    async getTree(content, languageId) {
        return undefined;
    }
    getOrInitLanguage(_languageId) {
        return undefined;
    }
    getParseResult(textModel) {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lVHJlZVNpdHRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBUXJEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQ0FBaUM7SUFBOUM7UUFnQkMsb0JBQWUsR0FBMkIsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUVwRCxxQkFBZ0IsR0FBcUQsS0FBSyxDQUFDLElBQUksQ0FBQTtJQVFoRixDQUFDO0lBekJBLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBa0I7UUFDbkMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELFdBQVcsQ0FBQyxPQUFlLEVBQUUsVUFBa0I7UUFDOUMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxzQkFBc0IsQ0FDM0IsS0FBaUIsRUFDakIsZ0JBQTBCO1FBRTFCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQWUsRUFBRSxVQUFrQjtRQUNoRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBS0QsaUJBQWlCLENBQUMsV0FBbUI7UUFDcEMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELGNBQWMsQ0FBQyxTQUFxQjtRQUNuQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QifQ==