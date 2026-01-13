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
import { Emitter } from '../../../../../base/common/event.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
let TerminalQuickFixService = class TerminalQuickFixService {
    get providers() {
        return this._providers;
    }
    constructor(_logService) {
        this._logService = _logService;
        this._selectors = new Map();
        this._providers = new Map();
        this._onDidRegisterProvider = new Emitter();
        this.onDidRegisterProvider = this._onDidRegisterProvider.event;
        this._onDidRegisterCommandSelector = new Emitter();
        this.onDidRegisterCommandSelector = this._onDidRegisterCommandSelector.event;
        this._onDidUnregisterProvider = new Emitter();
        this.onDidUnregisterProvider = this._onDidUnregisterProvider.event;
        this.extensionQuickFixes = new Promise((r) => quickFixExtensionPoint.setHandler((fixes) => {
            r(fixes
                .filter((c) => isProposedApiEnabled(c.description, 'terminalQuickFixProvider'))
                .map((c) => {
                if (!c.value) {
                    return [];
                }
                return c.value.map((fix) => {
                    return { ...fix, extensionIdentifier: c.description.identifier.value };
                });
            })
                .flat());
        }));
        this.extensionQuickFixes.then((selectors) => {
            for (const selector of selectors) {
                this.registerCommandSelector(selector);
            }
        });
    }
    registerCommandSelector(selector) {
        this._selectors.set(selector.id, selector);
        this._onDidRegisterCommandSelector.fire(selector);
    }
    registerQuickFixProvider(id, provider) {
        // This is more complicated than it looks like it should be because we need to return an
        // IDisposable synchronously but we must await ITerminalContributionService.quickFixes
        // asynchronously before actually registering the provider.
        let disposed = false;
        this.extensionQuickFixes.then(() => {
            if (disposed) {
                return;
            }
            this._providers.set(id, provider);
            const selector = this._selectors.get(id);
            if (!selector) {
                this._logService.error(`No registered selector for ID: ${id}`);
                return;
            }
            this._onDidRegisterProvider.fire({ selector, provider });
        });
        return toDisposable(() => {
            disposed = true;
            this._providers.delete(id);
            const selector = this._selectors.get(id);
            if (selector) {
                this._selectors.delete(id);
                this._onDidUnregisterProvider.fire(selector.id);
            }
        });
    }
};
TerminalQuickFixService = __decorate([
    __param(0, ILogService)
], TerminalQuickFixService);
export { TerminalQuickFixService };
const quickFixExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'terminalQuickFixes',
    defaultExtensionKind: ['workspace'],
    activationEventsGenerator: (terminalQuickFixes, result) => {
        for (const quickFixContrib of terminalQuickFixes ?? []) {
            result.push(`onTerminalQuickFixRequest:${quickFixContrib.id}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.terminalQuickFixes', 'Contributes terminal quick fixes.'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'commandLineMatcher', 'outputMatcher', 'commandExitResult'],
            defaultSnippets: [
                {
                    body: {
                        id: '$1',
                        commandLineMatcher: '$2',
                        outputMatcher: '$3',
                        exitStatus: '$4',
                    },
                },
            ],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.id', 'The ID of the quick fix provider'),
                    type: 'string',
                },
                commandLineMatcher: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandLineMatcher', 'A regular expression or string to test the command line against'),
                    type: 'string',
                },
                outputMatcher: {
                    markdownDescription: localize('vscode.extension.contributes.terminalQuickFixes.outputMatcher', "A regular expression or string to match a single line of the output against, which provides groups to be referenced in terminalCommand and uri.\n\nFor example:\n\n `lineMatcher: /git push --set-upstream origin (?<branchName>[^\s]+)/;`\n\n`terminalCommand: 'git push --set-upstream origin ${group:branchName}';`\n"),
                    type: 'object',
                    required: ['lineMatcher', 'anchor', 'offset', 'length'],
                    properties: {
                        lineMatcher: {
                            description: 'A regular expression or string to test the command line against',
                            type: 'string',
                        },
                        anchor: {
                            description: 'Where the search should begin in the buffer',
                            enum: ['top', 'bottom'],
                        },
                        offset: {
                            description: 'The number of lines vertically from the anchor in the buffer to start matching against',
                            type: 'number',
                        },
                        length: {
                            description: 'The number of rows to match against, this should be as small as possible for performance reasons',
                            type: 'number',
                        },
                    },
                },
                commandExitResult: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandExitResult', 'The command exit result to match on'),
                    enum: ['success', 'error'],
                    enumDescriptions: [
                        'The command exited with an exit code of zero.',
                        'The command exited with a non-zero exit code.',
                    ],
                },
                kind: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.kind', 'The kind of the resulting quick fix. This changes how the quick fix is presented. Defaults to {0}.', '`"fix"`'),
                    enum: ['default', 'explain'],
                    enumDescriptions: ['A high confidence quick fix.', 'An explanation of the problem.'],
                },
            },
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3Rlcm1pbmFsUXVpY2tGaXhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQU92RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUUxRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQU1uQyxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQVdELFlBQXlCLFdBQXlDO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBaEIxRCxlQUFVLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUE7UUFFN0QsZUFBVSxHQUEyQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBS3JELDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFxQyxDQUFBO1FBQ2pGLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFDakQsa0NBQTZCLEdBQUcsSUFBSSxPQUFPLEVBQTRCLENBQUE7UUFDL0UsaUNBQTRCLEdBQUcsSUFBSSxD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