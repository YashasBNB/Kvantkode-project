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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JTZXJpYWxpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlRWRpdG9yU2VyaWFsaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFJOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFOUUsTUFBTSxPQUFPLHFCQUFxQjtJQUNqQyxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsU0FBUyxDQUFDLE1BQXdCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUF3QjtRQUM5QixPQUFPO1lBQ04sSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ2pCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQ3JCLENBQUE7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUNWLG9CQUEyQyxFQUMzQyxHQUFXO1FBRVgsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLEdBQXlCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3QyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDdkIsRUFDRCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUN2QixFQUNELElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9