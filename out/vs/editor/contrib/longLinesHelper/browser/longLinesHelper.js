/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
class LongLinesHelper extends Disposable {
    static { this.ID = 'editor.contrib.longLinesHelper'; }
    static get(editor) {
        return editor.getContribution(LongLinesHelper.ID);
    }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(this._editor.onMouseDown((e) => {
            const stopRenderingLineAfter = this._editor.getOption(122 /* EditorOption.stopRenderingLineAfter */);
            if (stopRenderingLineAfter >= 0 &&
                e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
                e.target.position.column >= stopRenderingLineAfter) {
                this._editor.updateOptions({
                    stopRenderingLineAfter: -1,
                });
            }
        }));
    }
}
registerEditorContribution(LongLinesHelper.ID, LongLinesHelper, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0xpbmVzSGVscGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbG9uZ0xpbmVzSGVscGVyL2Jyb3dzZXIvbG9uZ0xpbmVzSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFJN0MsTUFBTSxlQUFnQixTQUFRLFVBQVU7YUFDaEIsT0FBRSxHQUFHLGdDQUFnQyxDQUFBO0lBRXJELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFrQixlQUFlLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELFlBQTZCLE9BQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFHaEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLCtDQUFxQyxDQUFBO1lBQzFGLElBQ0Msc0JBQXNCLElBQUksQ0FBQztnQkFDM0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQztnQkFDOUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLHNCQUFzQixFQUNqRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO29CQUMxQixzQkFBc0IsRUFBRSxDQUFDLENBQUM7aUJBQzFCLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQzs7QUFHRiwwQkFBMEIsQ0FDekIsZUFBZSxDQUFDLEVBQUUsRUFDbEIsZUFBZSxpRUFFZixDQUFBIn0=