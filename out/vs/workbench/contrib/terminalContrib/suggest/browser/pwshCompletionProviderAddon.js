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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHdzaENvbXBsZXRpb25Qcm92aWRlckFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci9wd3NoQ29tcGxldGlvblByb3ZpZGVyQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUVOLDRCQUE0QixHQUM1QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBTXJHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVyRSxPQUFPLEVBQXVCLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFN0YsTUFBTSxDQUFOLElBQWtCLGtCQUVqQjtBQUZELFdBQWtCLGtCQUFrQjtJQUNuQyxpREFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBRmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFFbkM7QUFnQkQsSUFBVywwQkFFVjtBQUZELFdBQVcsMEJBQTBCO0lBQ3BDLHdEQUF3QixDQUFBO0FBQ3pCLENBQUMsRUFGVSwwQkFBMEIsS0FBMUIsMEJBQTBCLFFB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