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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbktleWJpbmRpbmdSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uS2V5YmluZGluZ1Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixlQUFlLEVBQ2Ysd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQXVCLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBUWxGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTRCOzthQUNoQix1QkFBa0IsR0FBc0I7UUFDL0QsaUJBQWlCO1FBQ2pCLG1CQUFtQjtRQUNuQixxQkFBcUI7UUFDckIsd0JBQXdCO1FBQ3hCLGVBQWU7S0FDZixBQU55QyxDQU16QztJQUVELFlBQWlELGlCQUFxQztRQUFyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBQUcsQ0FBQztJQUVuRixXQUFXO1FBQ2pCLHFEQUFxRDtRQUNyRCxNQUFNLHFCQUFxQixHQUFHLElBQUksSUFBSSxDQUF5QyxHQUFHLEVBQUUsQ0FDbkYsSUFBSSxDQUFDLGlCQUFpQjthQUNwQixjQUFjLEVBQUU7YUFDaEIsTUFBTSxDQUNOLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyw4QkFBNEIsQ0FBQyxrQkFBa0IsQ0FB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