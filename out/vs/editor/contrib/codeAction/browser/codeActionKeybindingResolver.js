/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CodeActionKeybindingResolver_1;
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { codeActionCommandId, fixAllCommandId, organizeImportsCommandId, refactorCommandId, sourceActionCommandId, } from './codeAction.js';
import { CodeActionCommandArgs, CodeActionKind } from '../common/types.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
let CodeActionKeybindingResolver = class CodeActionKeybindingResolver {
    static { CodeActionKeybindingResolver_1 = this; }
    static { this.codeActionCommands = [
        refactorCommandId,
        codeActionCommandId,
        sourceActionCommandId,
        organizeImportsCommandId,
        fixAllCommandId,
    ]; }
    constructor(keybindingService) {
        this.keybindingService = keybindingService;
    }
    getResolver() {
        // Lazy since we may not actually ever read the value
        const allCodeActionBindings = new Lazy(() => this.keybindingService
            .getKeybindings()
            .filter((item) => CodeActionKeybindingResolver_1.codeActionCommands.indexOf(item.command) >= 0)
            .filter((item) => item.resolvedKeybinding)
            .map((item) => {
            // Special case these commands since they come built-in with VS Code and don't use 'commandArgs'
            let commandArgs = item.commandArgs;
            if (item.command === organizeImportsCommandId) {
                commandArgs = { kind: CodeActionKind.SourceOrganizeImports.value };
            }
            else if (item.command === fixAllCommandId) {
                commandArgs = { kind: CodeActionKind.SourceFixAll.value };
            }
            return {
                resolvedKeybinding: item.resolvedKeybinding,
                ...CodeActionCommandArgs.fromUser(commandArgs, {
                    kind: HierarchicalKind.None,
                    apply: "never" /* CodeActionAutoApply.Never */,
                }),
            };
        }));
        return (action) => {
            if (action.kind) {
                const binding = this.bestKeybindingForCodeAction(action, allCodeActionBindings.value);
                return binding?.resolvedKeybinding;
            }
            return undefined;
        };
    }
    bestKeybindingForCodeAction(action, candidates) {
        if (!action.kind) {
            return undefined;
        }
        const kind = new HierarchicalKind(action.kind);
        return candidates
            .filter((candidate) => candidate.kind.contains(kind))
            .filter((candidate) => {
            if (candidate.preferred) {
                // If the candidate keybinding only applies to preferred actions, the this action must also be preferred
                return action.isPreferred;
            }
            return true;
        })
            .reduceRight((currentBest, candidate) => {
            if (!currentBest) {
                return candidate;
            }
            // Select the more specific binding
            return currentBest.kind.contains(candidate.kind) ? candidate : currentBest;
        }, undefined);
    }
};
CodeActionKeybindingResolver = CodeActionKeybindingResolver_1 = __decorate([
    __param(0, IKeybindingService)
], CodeActionKeybindingResolver);
export { CodeActionKeybindingResolver };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbktleWJpbmRpbmdSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25LZXliaW5kaW5nUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGVBQWUsRUFDZix3QkFBd0IsRUFDeEIsaUJBQWlCLEVBQ2pCLHFCQUFxQixHQUNyQixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFRbEYsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7O2FBQ2hCLHVCQUFrQixHQUFzQjtRQUMvRCxpQkFBaUI7UUFDakIsbUJBQW1CO1FBQ25CLHFCQUFxQjtRQUNyQix3QkFBd0I7UUFDeEIsZUFBZTtLQUNmLEFBTnlDLENBTXpDO0lBRUQsWUFBaUQsaUJBQXFDO1FBQXJDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFBRyxDQUFDO0lBRW5GLFdBQVc7UUFDakIscURBQXFEO1FBQ3JELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxJQUFJLENBQXlDLEdBQUcsRUFBRSxDQUNuRixJQUFJLENBQUMsaUJBQWlCO2FBQ3BCLGNBQWMsRUFBRTthQUNoQixNQUFNLENBQ04sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFD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