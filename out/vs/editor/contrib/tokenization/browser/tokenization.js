/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import * as nls from '../../../../nls.js';
class ForceRetokenizeAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.forceRetokenize',
            label: nls.localize2('forceRetokenize', 'Developer: Force Retokenize'),
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        model.tokenization.resetTokenization();
        const sw = new StopWatch();
        model.tokenization.forceTokenization(model.getLineCount());
        sw.stop();
        console.log(`tokenization took ${sw.elapsed()}`);
    }
}
registerEditorAction(ForceRetokenizeAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvdG9rZW5pemF0aW9uL2Jyb3dzZXIvdG9rZW5pemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUVwQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsTUFBTSxxQkFBc0IsU0FBUSxZQUFZO0lBQy9DO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSw2QkFBNkIsQ0FBQztZQUN0RSxZQUFZLEVBQUUsU0FBUztTQUN2QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEVBQUUsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBQzFCLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDMUQsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0NBQ0Q7QUFFRCxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBIn0=