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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdWdnZXN0L2Jyb3dzZXIvc2ltcGxlQ29tcGxldGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBb0QvRCxNQUFNLE9BQU8sb0JBQW9CO0lBZWhDLFlBQXFCLFVBQTZCO1FBQTdCLGVBQVUsR0FBVixVQUFVLENBQW1CO1FBUmxELHFCQUFxQjtRQUNyQixVQUFLLEdBQWUsVUFBVSxDQUFDLE9BQU8sQ0FBQTtRQUl0QyxhQUFhO1FBQ2IsY0FBUyxHQUFZLEtBQUssQ0FBQTtRQUd6QiwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLFNBQVM7WUFDYixPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQTtRQUNsRixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDN0MsQ0FBQztDQUNEIn0=