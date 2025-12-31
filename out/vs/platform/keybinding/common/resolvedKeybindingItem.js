/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ResolvedKeybindingItem {
    constructor(resolvedKeybinding, command, commandArgs, when, isDefault, extensionId, isBuiltinExtension) {
        this._resolvedKeybindingItemBrand = undefined;
        this.resolvedKeybinding = resolvedKeybinding;
        this.chords = resolvedKeybinding
            ? toEmptyArrayIfContainsNull(resolvedKeybinding.getDispatchChords())
            : [];
        if (resolvedKeybinding && this.chords.length === 0) {
            // handle possible single modifier chord keybindings
            this.chords = toEmptyArrayIfContainsNull(resolvedKeybinding.getSingleModifierDispatchChords());
        }
        this.bubble = command ? command.charCodeAt(0) === 94 /* CharCode.Caret */ : false;
        this.command = this.bubble ? command.substr(1) : command;
        this.commandArgs = commandArgs;
        this.when = when;
        this.isDefault = isDefault;
        this.extensionId = extensionId;
        this.isBuiltinExtension = isBuiltinExtension;
    }
}
export function toEmptyArrayIfContainsNull(arr) {
    const result = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        const element = arr[i];
        if (!element) {
            return [];
        }
        result.push(element);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZWRLZXliaW5kaW5nSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL3Jlc29sdmVkS2V5YmluZGluZ0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLHNCQUFzQjtJQWFsQyxZQUNDLGtCQUFrRCxFQUNsRCxPQUFzQixFQUN0QixXQUFnQixFQUNoQixJQUFzQyxFQUN0QyxTQUFrQixFQUNsQixXQUEwQixFQUMxQixrQkFBMkI7UUFuQjVCLGlDQUE0QixHQUFTLFNBQVMsQ0FBQTtRQXFCN0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFBO1FBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCO1lBQy9CLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTCxJQUFJLGtCQUFrQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELG9EQUFvRDtZQUNwRCxJQUFJLENBQUMsTUFBTSxHQUFHLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLCtCQUErQixFQUFFLENBQUMsQ0FBQTtRQUMvRixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRCQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDeEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDekQsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7UUFDOUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7UUFDOUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFBO0lBQzdDLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBSSxHQUFpQjtJQUM5RCxNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUE7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2hELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3JCLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMifQ==