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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tGaXgvYnJvd3Nlci90ZXJtaW5hbFF1aWNrRml4U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFPdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFFMUYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFNbkMsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFXRCxZQUF5QixXQUF5QztRQUF4QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQWhCMUQsZUFBVSxHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRTdELGVBQVUsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUtyRCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBcUMsQ0FBQTtRQUNqRiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBQ2pELGtDQUE2QixHQUFHLElBQUksT0FBTyxFQUE0QixDQUFBO1FBQy9FLGlDQUE0QixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUE7UUFDL0QsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUN4RCw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBS3JFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzVDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQzNDLENBQUMsQ0FDQSxLQUFLO2lCQUNILE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO2lCQUM5RSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNkLE9BQU8sRUFBRSxDQUFBO2dCQUNWLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO29CQUMxQixPQUFPLEVBQUUsR0FBRyxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3ZFLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDO2lCQUNELElBQUksRUFBRSxDQUNSLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzNDLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBa0M7UUFDekQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxFQUFVLEVBQUUsUUFBbUM7UUFDdkUsd0ZBQXdGO1FBQ3hGLHNGQUFzRjtRQUN0RiwyREFBMkQ7UUFDM0QsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2xDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDeEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUM5RCxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixRQUFRLEdBQUcsSUFBSSxDQUFBO1lBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDeEMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDMUIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDaEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUE1RVksdUJBQXVCO0lBbUJ0QixXQUFBLFdBQVcsQ0FBQTtHQW5CWix1QkFBdUIsQ0E0RW5DOztBQUVELE1BQU0sc0JBQXNCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBRXRFO0lBQ0QsY0FBYyxFQUFFLG9CQUFvQjtJQUNwQyxvQkFBb0IsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUNuQyx5QkFBeUIsRUFBRSxDQUMxQixrQkFBOEMsRUFDOUMsTUFBb0MsRUFDbkMsRUFBRTtRQUNILEtBQUssTUFBTSxlQUFlLElBQUksa0JBQWtCLElBQUksRUFBRSxFQUFFLENBQUM7WUFDeEQsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0QsQ0FBQztJQUNGLENBQUM7SUFDRCxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUNwQixpREFBaUQsRUFDakQsbUNBQW1DLENBQ25DO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLG9CQUFvQixFQUFFLEtBQUs7WUFDM0IsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQztZQUM1RSxlQUFlLEVBQUU7Z0JBQ2hCO29CQUNDLElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsSUFBSTt3QkFDUixrQkFBa0IsRUFBRSxJQUFJO3dCQUN4QixhQUFhLEVBQUUsSUFBSTt3QkFDbkIsVUFBVSxFQUFFLElBQUk7cUJBQ2hCO2lCQUNEO2FBQ0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsRUFBRSxFQUFFO29CQUNILFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9EQUFvRCxFQUNwRCxrQ0FBa0MsQ0FDbEM7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0Qsa0JBQWtCLEVBQUU7b0JBQ25CLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG9FQUFvRSxFQUNwRSxpRUFBaUUsQ0FDakU7b0JBQ0QsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsYUFBYSxFQUFFO29CQUNkLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsK0RBQStELEVBQy9ELDBUQUEwVCxDQUMxVDtvQkFDRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxRQUFRLEVBQUUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ3ZELFVBQVUsRUFBRTt3QkFDWCxXQUFXLEVBQUU7NEJBQ1osV0FBVyxFQUFFLGlFQUFpRTs0QkFDOUUsSUFBSSxFQUFFLFFBQVE7eUJBQ2Q7d0JBQ0QsTUFBTSxFQUFFOzRCQUNQLFdBQVcsRUFBRSw2Q0FBNkM7NEJBQzFELElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7eUJBQ3ZCO3dCQUNELE1BQU0sRUFBRTs0QkFDUCxXQUFXLEVBQ1Ysd0ZBQXdGOzRCQUN6RixJQUFJLEVBQUUsUUFBUTt5QkFDZDt3QkFDRCxNQUFNLEVBQUU7NEJBQ1AsV0FBVyxFQUNWLGtHQUFrRzs0QkFDbkcsSUFBSSxFQUFFLFFBQVE7eUJBQ2Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsaUJBQWlCLEVBQUU7b0JBQ2xCLFdBQVcsRUFBRSxRQUFRLENBQ3BCLG1FQUFtRSxFQUNuRSxxQ0FBcUMsQ0FDckM7b0JBQ0QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQztvQkFDMUIsZ0JBQWdCLEVBQUU7d0JBQ2pCLCtDQUErQzt3QkFDL0MsK0NBQStDO3FCQUMvQztpQkFDRDtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsc0RBQXNELEVBQ3RELG9HQUFvRyxFQUNwRyxTQUFTLENBQ1Q7b0JBQ0QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztvQkFDNUIsZ0JBQWdCLEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxnQ0FBZ0MsQ0FBQztpQkFDcEY7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==