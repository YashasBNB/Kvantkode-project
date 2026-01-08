/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
export class KeybindingIO {
    static writeKeybindingItem(out, item) {
        if (!item.resolvedKeybinding) {
            return;
        }
        const quotedSerializedKeybinding = JSON.stringify(item.resolvedKeybinding.getUserSettingsLabel());
        out.write(`{ "key": ${rightPaddedString(quotedSerializedKeybinding + ',', 25)} "command": `);
        const quotedSerializedWhen = item.when ? JSON.stringify(item.when.serialize()) : '';
        const quotedSerializeCommand = JSON.stringify(item.command);
        if (quotedSerializedWhen.length > 0) {
            out.write(`${quotedSerializeCommand},`);
            out.writeLine();
            out.write(`                                     "when": ${quotedSerializedWhen}`);
        }
        else {
            out.write(`${quotedSerializeCommand}`);
        }
        if (item.commandArgs) {
            out.write(',');
            out.writeLine();
            out.write(`                                     "args": ${JSON.stringify(item.commandArgs)}`);
        }
        out.write(' }');
    }
    static readUserKeybindingItem(input) {
        const keybinding = 'key' in input && typeof input.key === 'string'
            ? KeybindingParser.parseKeybinding(input.key)
            : null;
        const when = 'when' in input && typeof input.when === 'string'
            ? ContextKeyExpr.deserialize(input.when)
            : undefined;
        const command = 'command' in input && typeof input.command === 'string' ? input.command : null;
        const commandArgs = 'args' in input && typeof input.args !== 'undefined' ? input.args : undefined;
        return {
            keybinding,
            command,
            commandArgs,
            when,
            _sourceKey: 'key' in input && typeof input.key === 'string' ? input.key : undefined,
        };
    }
}
function rightPaddedString(str, minChars) {
    if (str.length < minChars) {
        return str + new Array(minChars - str.length).join(' ');
    }
    return str;
}
export class OutputBuilder {
    constructor() {
        this._lines = [];
        this._currentLine = '';
    }
    write(str) {
        this._currentLine += str;
    }
    writeLine(str = '') {
        this._lines.push(this._currentLine + str);
        this._currentLine = '';
    }
    toString() {
        this.writeLine();
        return this._lines.join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9jb21tb24va2V5YmluZGluZ0lPLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTlFLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSxzREFBc0QsQ0FBQTtBQWE3RCxNQUFNLE9BQU8sWUFBWTtJQUNqQixNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBa0IsRUFBRSxJQUE0QjtRQUNqRixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRSxDQUM5QyxDQUFBO1FBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLGlCQUFpQixDQUFDLDBCQUEwQixHQUFHLEdBQUcsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFNUYsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ25GLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0QsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLHNCQUFzQixHQUFHLENBQUMsQ0FBQTtZQUN2QyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDZixHQUFHLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDbEYsQ0FBQzthQUFNLENBQUM7WUFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ2YsR0FBRyxDQUFDLEtBQUssQ0FBQyxnREFBZ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlGLENBQUM7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsc0JBQXNCLENBQUMsS0FBYTtRQUNqRCxNQUFNLFVBQVUsR0FDZixLQUFLLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxRQUFRO1lBQzlDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ1IsTUFBTSxJQUFJLEdBQ1QsTUFBTSxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUNoRCxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDYixNQUFNLE9BQU8sR0FBRyxTQUFTLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUM5RixNQUFNLFdBQVcsR0FDaEIsTUFBTSxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDOUUsT0FBTztZQUNOLFVBQVU7WUFDVixPQUFPO1lBQ1AsV0FBVztZQUNYLElBQUk7WUFDSixVQUFVLEVBQUUsS0FBSyxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssQ0FBQyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ25GLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxTQUFTLGlCQUFpQixDQUFDLEdBQVcsRUFBRSxRQUFnQjtJQUN2RCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsUUFBUSxFQUFFLENBQUM7UUFDM0IsT0FBTyxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQztBQUVELE1BQU0sT0FBTyxhQUFhO0lBQTFCO1FBQ1MsV0FBTSxHQUFhLEVBQUUsQ0FBQTtRQUNyQixpQkFBWSxHQUFXLEVBQUUsQ0FBQTtJQWVsQyxDQUFDO0lBYkEsS0FBSyxDQUFDLEdBQVc7UUFDaEIsSUFBSSxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUE7SUFDekIsQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUFjLEVBQUU7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlCLENBQUM7Q0FDRCJ9