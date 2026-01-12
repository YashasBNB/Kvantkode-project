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
var PwshCompletionProviderAddon_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import * as dom from '../../../../../base/browser/dom.js';
import { sep } from '../../../../../base/common/path.js';
import { SuggestAddon } from './terminalSuggestAddon.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { terminalSuggestConfigSection, } from '../common/terminalSuggestConfiguration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
export var VSCodeSuggestOscPt;
(function (VSCodeSuggestOscPt) {
    VSCodeSuggestOscPt["Completions"] = "Completions";
})(VSCodeSuggestOscPt || (VSCodeSuggestOscPt = {}));
var RequestCompletionsSequence;
(function (RequestCompletionsSequence) {
    RequestCompletionsSequence["Contextual"] = "\u001B[24~e";
})(RequestCompletionsSequence || (RequestCompletionsSequence = {}));
let PwshCompletionProviderAddon = class PwshCompletionProviderAddon extends Disposable {
    static { PwshCompletionProviderAddon_1 = this; }
    static { this.ID = 'pwsh-shell-integration'; }
    constructor(capabilities, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this.id = PwshCompletionProviderAddon_1.ID;
        this.isBuiltin = true;
        this.shellTypes = ["pwsh" /* GeneralShellType.PowerShell */];
        this._lastUserDataTimestamp = 0;
        this._enableWidget = true;
        this.isPasting = false;
        this._completionsDeferred = null;
        this._onDidReceiveCompletions = this._register(new Emitter());
        this.onDidReceiveCompletions = this._onDidReceiveCompletions.event;
        this._onDidRequestSendText = this._register(new Emitter());
        this.onDidRequestSendText = this._onDidRequestSendText.event;
        this._register(Event.runAndSubscribe(Event.any(capabilities.onDidAddCapabilityType, capabilities.onDidRemoveCapabilityType), () => {
            const commandDetection = capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                if (this._promptInputModel !== commandDetection.promptInputModel) {
                    this._promptInputModel = commandDetection.promptInputModel;
                }
            }
            else {
                this._promptInputModel = undefined;
            }
        }));
    }
    activate(xterm) {
        this._terminal = xterm;
        this._register(xterm.onData(() => {
            this._lastUserDataTimestamp = Date.now();
        }));
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        const enabled = config.enabled;
        if (!enabled) {
            return;
        }
        this._register(xterm.parser.registerOscHandler(633 /* ShellIntegrationOscPs.VSCode */, (data) => {
            return this._handleVSCodeSequence(data);
        }));
    }
    _handleVSCodeSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        const [command, ...args] = data.split(';');
        switch (command) {
            case "Completions" /* VSCodeSuggestOscPt.Completions */:
                this._handleCompletionsSequence(this._terminal, data, command, args);
                return true;
        }
        // Unrecognized sequence
        return false;
    }
    _handleCompletionsSequence(terminal, data, command, args) {
        this._onDidReceiveCompletions.fire();
        // Nothing to handle if the terminal is not attached
        if (!terminal.element || !this._enableWidget || !this._promptInputModel) {
            this._resolveCompletions(undefined);
            return;
        }
        // Only show the suggest widget if the terminal is focused
        if (!dom.isAncestorOfActiveElement(terminal.element)) {
            this._resolveCompletions(undefined);
            return;
        }
        // No completions
        if (args.length === 0) {
            this._resolveCompletions(undefined);
            return;
        }
        let replacementIndex = 0;
        let replacementLength = this._promptInputModel.cursorIndex;
        // This is a TabExpansion2 result
        replacementIndex = parseInt(args[0]);
        replacementLength = parseInt(args[1]);
        const payload = data.slice(command.length + args[0].length + args[1].length + args[2].length + 4 /*semi-colons*/);
        const rawCompletions = args.length === 0 || payload.length === 0 ? undefined : JSON.parse(payload);
        const completions = parseCompletionsFromShell(rawCompletions, replacementIndex, replacementLength);
        if (this._mostRecentCompletion?.kind === TerminalCompletionItemKind.Folder &&
            completions.every((c) => c.kind === TerminalCompletionItemKind.Folder)) {
            completions.push(this._mostRecentCompletion);
        }
        this._mostRecentCompletion = undefined;
        this._resolveCompletions(completions);
    }
    _resolveCompletions(result) {
        if (!this._completionsDeferred) {
            return;
        }
        this._completionsDeferred.complete(result);
        // Resolved, clear the deferred promise
        this._completionsDeferred = null;
    }
    _getCompletionsPromise() {
        this._completionsDeferred = new DeferredPromise();
        return this._completionsDeferred.p;
    }
    provideCompletions(value, cursorPosition, allowFallbackCompletions, token) {
        // Return immediately if completions are being requested for a command since this provider
        // only returns completions for arguments
        if (value.substring(0, cursorPosition).trim().indexOf(' ') === -1) {
            return Promise.resolve(undefined);
        }
        // Ensure that a key has been pressed since the last accepted completion in order to prevent
        // completions being requested again right after accepting a completion
        if (this._lastUserDataTimestamp > SuggestAddon.lastAcceptedCompletionTimestamp) {
            this._onDidRequestSendText.fire("\u001B[24~e" /* RequestCompletionsSequence.Contextual */);
        }
        if (token.isCancellationRequested) {
            return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
            const completionPromise = this._getCompletionsPromise();
            this._register(token.onCancellationRequested(() => {
                this._resolveCompletions(undefined);
            }));
            completionPromise.then((result) => {
                if (token.isCancellationRequested) {
                    resolve(undefined);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
};
PwshCompletionProviderAddon = PwshCompletionProviderAddon_1 = __decorate([
    __param(1, IConfigurationService)
], PwshCompletionProviderAddon);
export { PwshCompletionProviderAddon };
export function parseCompletionsFromShell(rawCompletions, replacementIndex, replacementLength) {
    if (!rawCompletions) {
        return [];
    }
    let typedRawCompletions;
    if (!Array.isArray(rawCompletions)) {
        typedRawCompletions = [rawCompletions];
    }
    else {
        if (rawCompletions.length === 0) {
            return [];
        }
        if (typeof rawCompletions[0] === 'string') {
            typedRawCompletions = [rawCompletions].map((e) => ({
                CompletionText: e[0],
                ResultType: e[1],
                ToolTip: e[2],
                CustomIcon: e[3],
            }));
        }
        else if (Array.isArray(rawCompletions[0])) {
            typedRawCompletions = rawCompletions.map((e) => ({
                CompletionText: e[0],
                ResultType: e[1],
                ToolTip: e[2],
                CustomIcon: e[3],
            }));
        }
        else {
            typedRawCompletions = rawCompletions;
        }
    }
    return typedRawCompletions.map((e) => rawCompletionToITerminalCompletion(e, replacementIndex, replacementLength));
}
function rawCompletionToITerminalCompletion(rawCompletion, replacementIndex, replacementLength) {
    // HACK: Somewhere along the way from the powershell script to here, the path separator at the
    // end of directories may go missing, likely because `\"` -> `"`. As a result, make sure there
    // is a trailing separator at the end of all directory completions. This should not be done for
    // `.` and `..` entries because they are optimized not for navigating to different directories
    // but for passing as args.
    let label = rawCompletion.CompletionText;
    if (rawCompletion.ResultType === 4 &&
        !label.match(/^[\-+]$/) && // Don't add a `/` to `-` or `+` (navigate location history)
        !label.match(/^\.\.?$/) &&
        !label.match(/[\\\/]$/)) {
        const separator = label.match(/(?<sep>[\\\/])/)?.groups?.sep ?? sep;
        label = label + separator;
    }
    // If tooltip is not present it means it's the same as label
    const detail = rawCompletion.ToolTip ?? label;
    // Pwsh gives executables a result type of 2, but we want to treat them as files wrt the sorting
    // and file extension score boost. An example of where this improves the experience is typing
    // `git`, `git.exe` should appear at the top and beat `git-lfs.exe`. Keep the same icon though.
    const icon = getIcon(rawCompletion.ResultType, rawCompletion.CustomIcon);
    const isExecutable = rawCompletion.ResultType === 2 && rawCompletion.CompletionText.match(/\.[a-z0-9]{2,4}$/i);
    if (isExecutable) {
        rawCompletion.ResultType = 3;
    }
    return {
        label,
        provider: PwshCompletionProviderAddon.ID,
        icon,
        detail,
        kind: pwshTypeToKindMap[rawCompletion.ResultType],
        isKeyword: rawCompletion.ResultType === 12,
        replacementIndex,
        replacementLength,
    };
}
function getIcon(resultType, customIconId) {
    if (customIconId) {
        const icon = customIconId in Codicon
            ? Codicon[customIconId]
            : Codicon.symbolText;
        if (icon) {
            return icon;
        }
    }
    return pwshTypeToIconMap[resultType] ?? Codicon.symbolText;
}
/**
 * A map of the pwsh result type enum's value to the corresponding icon to use in completions.
 *
 * | Value | Name              | Description
 * |-------|-------------------|------------
 * | 0     | Text              | An unknown result type, kept as text only
 * | 1     | History           | A history result type like the items out of get-history
 * | 2     | Command           | A command result type like the items out of get-command
 * | 3     | ProviderItem      | A provider item
 * | 4     | ProviderContainer | A provider container
 * | 5     | Property          | A property result type like the property items out of get-member
 * | 6     | Method            | A method result type like the method items out of get-member
 * | 7     | ParameterName     | A parameter name result type like the Parameters property out of get-command items
 * | 8     | ParameterValue    | A parameter value result type
 * | 9     | Variable          | A variable result type like the items out of get-childitem variable:
 * | 10    | Namespace         | A namespace
 * | 11    | Type              | A type name
 * | 12    | Keyword           | A keyword
 * | 13    | DynamicKeyword    | A dynamic keyword
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.completionresulttype?view=powershellsdk-7.0.0
 */
const pwshTypeToIconMap = {
    0: Codicon.symbolText,
    1: Codicon.history,
    2: Codicon.symbolMethod,
    3: Codicon.symbolFile,
    4: Codicon.folder,
    5: Codicon.symbolProperty,
    6: Codicon.symbolMethod,
    7: Codicon.symbolVariable,
    8: Codicon.symbolValue,
    9: Codicon.symbolVariable,
    10: Codicon.symbolNamespace,
    11: Codicon.symbolInterface,
    12: Codicon.symbolKeyword,
    13: Codicon.symbolKeyword,
};
const pwshTypeToKindMap = {
    0: undefined,
    1: undefined,
    2: TerminalCompletionItemKind.Method,
    3: TerminalCompletionItemKind.File,
    4: TerminalCompletionItemKind.Folder,
    5: TerminalCompletionItemKind.Argument,
    6: TerminalCompletionItemKind.Method,
    7: TerminalCompletionItemKind.Argument,
    8: undefined,
    9: undefined,
    10: undefined,
    11: undefined,
    12: undefined,
    13: undefined,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHdzaENvbXBsZXRpb25Qcm92aWRlckFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3B3c2hDb21wbGV0aW9uUHJvdmlkZXJBZGRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBRU4sNEJBQTRCLEdBQzVCLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFNckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXJFLE9BQU8sRUFBdUIsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUU3RixNQUFNLENBQU4sSUFBa0Isa0JBRWpCO0FBRkQsV0FBa0Isa0JBQWtCO0lBQ25DLGlEQUEyQixDQUFBO0FBQzVCLENBQUMsRUFGaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUVuQztBQWdCRCxJQUFXLDBCQUVWO0FBRkQsV0FBVywwQkFBMEI7SUFDcEMsd0RBQXdCLENBQUE7QUFDekIsQ0FBQyxFQUZVLDBCQUEwQixLQUExQiwwQkFB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