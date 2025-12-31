/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuzzyScore } from '../../../../base/common/filters.js';
export class SimpleCompletionItem {
    constructor(completion) {
        this.completion = completion;
        // sorting, filtering
        this.score = FuzzyScore.Default;
        // validation
        this.isInvalid = false;
        // ensure lower-variants (perf)
        this.textLabel =
            typeof completion.label === 'string' ? completion.label : completion.label?.label;
        this.labelLow = this.textLabel.toLowerCase();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3VnZ2VzdC9icm93c2VyL3NpbXBsZUNvbXBsZXRpb25JdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQW9EL0QsTUFBTSxPQUFPLG9CQUFvQjtJQWVoQyxZQUFxQixVQUE2QjtRQUE3QixlQUFVLEdBQVYsVUFBVSxDQUFtQjtRQVJsRCxxQkFBcUI7UUFDckIsVUFBSyxHQUFlLFVBQVUsQ0FBQyxPQUFPLENBQUE7UUFJdEMsYUFBYTtRQUNiLGNBQVMsR0FBWSxLQUFLLENBQUE7UUFHekIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTO1lBQ2IsT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUE7UUFDbEYsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQzdDLENBQUM7Q0FDRCJ9