/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SingleLineEdit } from '../../../../../common/core/lineEdit.js';
export class InlineEditWithChanges {
    constructor(originalText, edit, cursorPosition, commands, inlineCompletion) {
        this.originalText = originalText;
        this.edit = edit;
        this.cursorPosition = cursorPosition;
        this.commands = commands;
        this.inlineCompletion = inlineCompletion;
        this.lineEdit = SingleLineEdit.fromSingleTextEdit(this.edit.toSingle(this.originalText), this.originalText);
        this.originalLineRange = this.lineEdit.lineRange;
        this.modifiedLineRange = this.lineEdit.toLineEdit().getNewLineRanges()[0];
    }
    equals(other) {
        return (this.originalText.getValue() === other.originalText.getValue() &&
            this.edit.equals(other.edit) &&
            this.cursorPosition.equals(other.cursorPosition) &&
            this.commands === other.commands &&
            this.inlineCompletion === other.inlineCompletion);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdFdpdGhDaGFuZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRXaXRoQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFNdkUsTUFBTSxPQUFPLHFCQUFxQjtJQVNqQyxZQUNpQixZQUEwQixFQUMxQixJQUFjLEVBQ2QsY0FBd0IsRUFDeEIsUUFBNEIsRUFDNUIsZ0JBQXNDO1FBSnRDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLFNBQUksR0FBSixJQUFJLENBQVU7UUFDZCxtQkFBYyxHQUFkLGNBQWMsQ0FBVTtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQUM1QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXNCO1FBYnZDLGFBQVEsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQzNELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFDckMsSUFBSSxDQUFDLFlBQVksQ0FDakIsQ0FBQTtRQUVlLHNCQUFpQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFBO1FBQzNDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQVFqRixDQUFDO0lBRUosTUFBTSxDQUFDLEtBQTRCO1FBQ2xDLE9BQU8sQ0FDTixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQzlELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztZQUNoRCxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLENBQ2hELENBQUE7SUFDRixDQUFDO0NBQ0QifQ==