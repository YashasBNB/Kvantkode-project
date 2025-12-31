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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvY29tbW9uL2tleWJpbmRpbmdJTy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU5RSxPQUFPLEVBQ04sY0FBYyxHQUVkLE1BQU0sc0RBQXNELENBQUE7QUFhN0QsTUFBTSxPQUFPLFlBQVk7SUFDakIsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEdBQWtCLEVBQUUsSUFBNEI7UUFDakYsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsQ0FDOUMsQ0FBQTtRQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxpQkFBaUIsQ0FBQywwQkFBMEIsR0FBRyxHQUFHLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRTVGLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNuRixNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzNELElBQUksb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxDQUFDLENB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