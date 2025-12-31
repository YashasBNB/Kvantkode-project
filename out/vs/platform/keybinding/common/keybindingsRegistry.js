/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeKeybinding } from '../../../base/common/keybindings.js';
import { OS } from '../../../base/common/platform.js';
import { CommandsRegistry, } from '../../commands/common/commands.js';
import { Registry } from '../../registry/common/platform.js';
import { combinedDisposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
export var KeybindingWeight;
(function (KeybindingWeight) {
    KeybindingWeight[KeybindingWeight["EditorCore"] = 0] = "EditorCore";
    KeybindingWeight[KeybindingWeight["EditorContrib"] = 100] = "EditorContrib";
    KeybindingWeight[KeybindingWeight["WorkbenchContrib"] = 200] = "WorkbenchContrib";
    KeybindingWeight[KeybindingWeight["BuiltinExtension"] = 300] = "BuiltinExtension";
    KeybindingWeight[KeybindingWeight["ExternalExtension"] = 400] = "ExternalExtension";
    KeybindingWeight[KeybindingWeight["VoidExtension"] = 605] = "VoidExtension";
})(KeybindingWeight || (KeybindingWeight = {}));
/**
 * Stores all built-in and extension-provided keybindings (but not ones that user defines themselves)
 */
class KeybindingsRegistryImpl {
    constructor() {
        this._coreKeybindings = new LinkedList();
        this._extensionKeybindings = [];
        this._cachedMergedKeybindings = null;
    }
    /**
     * Take current platform into account and reduce to primary & secondary.
     */
    static bindToCurrentPlatform(kb) {
        if (OS === 1 /* OperatingSystem.Windows */) {
            if (kb && kb.win) {
                return kb.win;
            }
        }
        else if (OS === 2 /* OperatingSystem.Macintosh */) {
            if (kb && kb.mac) {
                return kb.mac;
            }
        }
        else {
            if (kb && kb.linux) {
                return kb.linux;
            }
        }
        return kb;
    }
    registerKeybindingRule(rule) {
        const actualKb = KeybindingsRegistryImpl.bindToCurrentPlatform(rule);
        const result = new DisposableStore();
        if (actualKb && actualKb.primary) {
            const kk = decodeKeybinding(actualKb.primary, OS);
            if (kk) {
                result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, 0, rule.when));
            }
        }
        if (actualKb && Array.isArray(actualKb.secondary)) {
            for (let i = 0, len = actualKb.secondary.length; i < len; i++) {
                const k = actualKb.secondary[i];
                const kk = decodeKeybinding(k, OS);
                if (kk) {
                    result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, -i - 1, rule.when));
                }
            }
        }
        return result;
    }
    setExtensionKeybindings(rules) {
        const result = [];
        let keybindingsLen = 0;
        for (const rule of rules) {
            if (rule.keybinding) {
                result[keybindingsLen++] = {
                    keybinding: rule.keybinding,
                    command: rule.id,
                    commandArgs: rule.args,
                    when: rule.when,
                    weight1: rule.weight,
                    weight2: 0,
                    extensionId: rule.extensionId || null,
                    isBuiltinExtension: rule.isBuiltinExtension || false,
                };
            }
        }
        this._extensionKeybindings = result;
        this._cachedMergedKeybindings = null;
    }
    registerCommandAndKeybindingRule(desc) {
        return combinedDisposable(this.registerKeybindingRule(desc), CommandsRegistry.registerCommand(desc));
    }
    _registerDefaultKeybinding(keybinding, commandId, commandArgs, weight1, weight2, when) {
        const remove = this._coreKeybindings.push({
            keybinding: keybinding,
            command: commandId,
            commandArgs: commandArgs,
            when: when,
            weight1: weight1,
            weight2: weight2,
            extensionId: null,
            isBuiltinExtension: false,
        });
        this._cachedMergedKeybindings = null;
        return toDisposable(() => {
            remove();
            this._cachedMergedKeybindings = null;
        });
    }
    getDefaultKeybindings() {
        if (!this._cachedMergedKeybindings) {
            this._cachedMergedKeybindings = Array.from(this._coreKeybindings).concat(this._extensionKeybindings);
            this._cachedMergedKeybindings.sort(sorter);
        }
        return this._cachedMergedKeybindings.slice(0);
    }
}
export const KeybindingsRegistry = new KeybindingsRegistryImpl();
// Define extension point ids
export const Extensions = {
    EditorModes: 'platform.keybindingsRegistry',
};
Registry.add(Extensions.EditorModes, KeybindingsRegistry);
function sorter(a, b) {
    if (a.weight1 !== b.weight1) {
        return a.weight1 - b.weight1;
    }
    if (a.command && b.command) {
        if (a.command < b.command) {
            return -1;
        }
        if (a.command > b.command) {
            return 1;
        }
    }
    return a.weight2 - b.weight2;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL2tleWJpbmRpbmdzUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFjLE1BQU0scUNBQXFDLENBQUE7QUFDbEYsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sbUNBQW1DLENBQUE7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQWtEL0QsTUFBTSxDQUFOLElBQWtCLGdCQU9qQjtBQVBELFdBQWtCLGdCQUFnQjtJQUNqQyxtRUFBYyxDQUFBO0lBQ2QsMkVBQW1CLENBQUE7SUFDbkIsaUZBQXNCLENBQUE7SUFDdEIsaUZBQXNCLENBQUE7SUFDdEIsbUZBQXVCLENBQUE7SUFDdkIsMkVBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQVBpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBT2pDO0FBY0Q7O0dBRUc7QUFDSCxNQUFNLHVCQUF1QjtJQUs1QjtRQUNDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFBO1FBQ3hDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQTtJQUNyQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMscUJBQXFCLENBQUMs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