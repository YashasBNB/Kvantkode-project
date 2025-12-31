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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
let TerminalSuggestTelemetry = class TerminalSuggestTelemetry extends Disposable {
    constructor(commandDetection, _promptInputModel, _telemetryService) {
        super();
        this._promptInputModel = _promptInputModel;
        this._telemetryService = _telemetryService;
        this._kindMap = new Map([
            [TerminalCompletionItemKind.File, 'File'],
            [TerminalCompletionItemKind.Folder, 'Folder'],
            [TerminalCompletionItemKind.Method, 'Method'],
            [TerminalCompletionItemKind.Alias, 'Alias'],
            [TerminalCompletionItemKind.Argument, 'Argument'],
            [TerminalCompletionItemKind.Option, 'Option'],
            [TerminalCompletionItemKind.OptionValue, 'Option Value'],
            [TerminalCompletionItemKind.Flag, 'Flag'],
            [TerminalCompletionItemKind.InlineSuggestion, 'Inline Suggestion'],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, 'Inline Suggestion'],
        ]);
        this._register(commandDetection.onCommandFinished((e) => {
            this._sendTelemetryInfo(false, e.exitCode);
            this._acceptedCompletions = undefined;
        }));
        this._register(this._promptInputModel.onDidInterrupt(() => {
            this._sendTelemetryInfo(true);
            this._acceptedCompletions = undefined;
        }));
    }
    acceptCompletion(completion, commandLine) {
        if (!completion || !commandLine) {
            this._acceptedCompletions = undefined;
            return;
        }
        this._acceptedCompletions = this._acceptedCompletions || [];
        this._acceptedCompletions.push({
            label: typeof completion.label === 'string' ? completion.label : completion.label.label,
            kind: this._kindMap.get(completion.kind),
        });
    }
    _sendTelemetryInfo(fromInterrupt, exitCode) {
        const commandLine = this._promptInputModel?.value;
        for (const completion of this._acceptedCompletions || []) {
            const label = completion?.label;
            const kind = completion?.kind;
            if (label === undefined || commandLine === undefined || kind === undefined) {
                return;
            }
            let outcome;
            if (fromInterrupt) {
                outcome = "Interrupted" /* CompletionOutcome.Interrupted */;
            }
            else if (commandLine.trim() && commandLine.includes(label)) {
                outcome = "Accepted" /* CompletionOutcome.Accepted */;
            }
            else if (inputContainsFirstHalfOfLabel(commandLine, label)) {
                outcome = "AcceptedWithEdit" /* CompletionOutcome.AcceptedWithEdit */;
            }
            else {
                outcome = "Deleted" /* CompletionOutcome.Deleted */;
            }
            this._telemetryService.publicLog2('terminal.suggest.acceptedCompletion', {
                kind,
                outcome,
                exitCode,
            });
        }
    }
};
TerminalSuggestTelemetry = __decorate([
    __param(2, ITelemetryService)
], TerminalSuggestTelemetry);
export { TerminalSuggestTelemetry };
var CompletionOutcome;
(function (CompletionOutcome) {
    CompletionOutcome["Accepted"] = "Accepted";
    CompletionOutcome["Deleted"] = "Deleted";
    CompletionOutcome["AcceptedWithEdit"] = "AcceptedWithEdit";
    CompletionOutcome["Interrupted"] = "Interrupted";
})(CompletionOutcome || (CompletionOutcome = {}));
function inputContainsFirstHalfOfLabel(commandLine, label) {
    return commandLine.includes(label.substring(0, Math.ceil(label.length / 2)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0VGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbFN1Z2dlc3RUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBR3pGLE9BQU8sRUFBdUIsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV0RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFnQnZELFlBQ0MsZ0JBQTZDLEVBQzVCLGlCQUFvQyxFQUNsQyxpQkFBcUQ7UUFFeEUsS0FBSyxFQUFFLENBQUE7UUFIVSxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFoQmpFLGFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBaUI7WUFDMUMsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1lBQ3pDLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztZQUM3QyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDN0MsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1lBQzNDLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztZQUNqRCxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDN0MsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDO1lBQ3hE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