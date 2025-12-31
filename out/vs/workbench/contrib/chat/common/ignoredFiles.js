/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ILanguageModelIgnoredFilesService = createDecorator('languageModelIgnoredFilesService');
export class LanguageModelIgnoredFilesService {
    constructor() {
        this._providers = new Set();
    }
    async fileIsIgnored(uri, token) {
        // Just use the first provider
        const provider = this._providers.values().next().value;
        return provider ? provider.isFileIgnored(uri, token) : false;
    }
    registerIgnoredFileProvider(provider) {
        this._providers.add(provider);
        return toDisposable(() => {
            this._providers.delete(provider);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vaWdub3JlZEZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNNUYsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUMvRCxrQ0FBa0MsQ0FDbEMsQ0FBQTtBQVFELE1BQU0sT0FBTyxnQ0FBZ0M7SUFBN0M7UUFHa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO0lBYzNFLENBQUM7SUFaQSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUF3QjtRQUNyRCw4QkFBOEI7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUE7UUFDdEQsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDN0QsQ0FBQztJQUVELDJCQUEyQixDQUFDLFFBQTJDO1FBQ3RFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9