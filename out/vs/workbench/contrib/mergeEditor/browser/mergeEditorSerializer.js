/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { parse } from '../../../../base/common/marshalling.js';
import { MergeEditorInput, MergeEditorInputData } from './mergeEditorInput.js';
export class MergeEditorSerializer {
    canSerialize() {
        return true;
    }
    serialize(editor) {
        return JSON.stringify(this.toJSON(editor));
    }
    toJSON(editor) {
        return {
            base: editor.base,
            input1: editor.input1,
            input2: editor.input2,
            result: editor.result,
        };
    }
    deserialize(instantiationService, raw) {
        try {
            const data = parse(raw);
            return instantiationService.createInstance(MergeEditorInput, data.base, new MergeEditorInputData(data.input1.uri, data.input1.title, data.input1.detail, data.input1.description), new MergeEditorInputData(data.input2.uri, data.input2.title, data.input2.detail, data.input2.description), data.result);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZUVkaXRvclNlcmlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSTlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTlFLE1BQU0sT0FBTyxxQkFBcUI7SUFDakMsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUF3QjtRQUNqQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBd0I7UUFDOUIsT0FBTztZQUNOLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtZQUNqQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1lBQ3JCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtTQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FDVixvQkFBMkMsRUFDM0MsR0FBVztRQUVYLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUF5QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDN0MsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLGdCQUFnQixFQUNoQixJQUFJLENBQUMsSUFBSSxFQUNULElBQUksb0JBQW9CLENBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQ3ZCLEVBQ0QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDdkIsRUFDRCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==