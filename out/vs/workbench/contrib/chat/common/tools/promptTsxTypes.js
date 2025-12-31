/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function stringifyPromptElementJSON(element) {
    const strs = [];
    stringifyPromptNodeJSON(element.node, strs);
    return strs.join('');
}
function stringifyPromptNodeJSON(node, strs) {
    if (node.type === 2 /* PromptNodeType.Text */) {
        if (node.lineBreakBefore) {
            strs.push('\n');
        }
        if (typeof node.text === 'string') {
            strs.push(node.text);
        }
    }
    else if (node.ctor === 3 /* PieceCtorKind.ImageChatMessage */) {
        // This case currently can't be hit by prompt-tsx
        strs.push('<image>');
    }
    else if (node.ctor === 1 /* PieceCtorKind.BaseChatMessage */ || node.ctor === 2 /* PieceCtorKind.Other */) {
        for (const child of node.children) {
            stringifyPromptNodeJSON(child, strs);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VHN4VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9wcm9tcHRUc3hUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQStDaEcsTUFBTSxVQUFVLDBCQUEwQixDQUFDLE9BQTBCO0lBQ3BFLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQTtJQUN6Qix1QkFBdUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzNDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUNyQixDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxJQUFvQixFQUFFLElBQWM7SUFDcEUsSUFBSSxJQUFJLENBQUMsSUFBSSxnQ0FBd0IsRUFBRSxDQUFDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLENBQUM7SUFDRixDQUFDO1NBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSwyQ0FBbUMsRUFBRSxDQUFDO1FBQ3pELGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3JCLENBQUM7U0FBTSxJQUFJLElBQUksQ0FBQyxJQUFJLDBDQUFrQyxJQUFJLElBQUksQ0FBQyxJQUFJLGdDQUF3QixFQUFFLENBQUM7UUFDN0YsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyJ9