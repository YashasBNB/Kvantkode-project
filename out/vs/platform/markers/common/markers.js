/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import Severity from '../../../base/common/severity.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var MarkerTag;
(function (MarkerTag) {
    MarkerTag[MarkerTag["Unnecessary"] = 1] = "Unnecessary";
    MarkerTag[MarkerTag["Deprecated"] = 2] = "Deprecated";
})(MarkerTag || (MarkerTag = {}));
export var MarkerSeverity;
(function (MarkerSeverity) {
    MarkerSeverity[MarkerSeverity["Hint"] = 1] = "Hint";
    MarkerSeverity[MarkerSeverity["Info"] = 2] = "Info";
    MarkerSeverity[MarkerSeverity["Warning"] = 4] = "Warning";
    MarkerSeverity[MarkerSeverity["Error"] = 8] = "Error";
})(MarkerSeverity || (MarkerSeverity = {}));
(function (MarkerSeverity) {
    function compare(a, b) {
        return b - a;
    }
    MarkerSeverity.compare = compare;
    const _displayStrings = Object.create(null);
    _displayStrings[MarkerSeverity.Error] = localize('sev.error', 'Error');
    _displayStrings[MarkerSeverity.Warning] = localize('sev.warning', 'Warning');
    _displayStrings[MarkerSeverity.Info] = localize('sev.info', 'Info');
    function toString(a) {
        return _displayStrings[a] || '';
    }
    MarkerSeverity.toString = toString;
    const _displayStringsPlural = Object.create(null);
    _displayStringsPlural[MarkerSeverity.Error] = localize('sev.errors', 'Errors');
    _displayStringsPlural[MarkerSeverity.Warning] = localize('sev.warnings', 'Warnings');
    _displayStringsPlural[MarkerSeverity.Info] = localize('sev.infos', 'Infos');
    function toStringPlural(a) {
        return _displayStringsPlural[a] || '';
    }
    MarkerSeverity.toStringPlural = toStringPlural;
    function fromSeverity(severity) {
        switch (severity) {
            case Severity.Error:
                return MarkerSeverity.Error;
            case Severity.Warning:
                return MarkerSeverity.Warning;
            case Severity.Info:
                return MarkerSeverity.Info;
            case Severity.Ignore:
                return MarkerSeverity.Hint;
        }
    }
    MarkerSeverity.fromSeverity = fromSeverity;
    function toSeverity(severity) {
        switch (severity) {
            case MarkerSeverity.Error:
                return Severity.Error;
            case MarkerSeverity.Warning:
                return Severity.Warning;
            case MarkerSeverity.Info:
                return Severity.Info;
            case MarkerSeverity.Hint:
                return Severity.Ignore;
        }
    }
    MarkerSeverity.toSeverity = toSeverity;
})(MarkerSeverity || (MarkerSeverity = {}));
export var IMarkerData;
(function (IMarkerData) {
    const emptyString = '';
    function makeKey(markerData) {
        return makeKeyOptionalMessage(markerData, true);
    }
    IMarkerData.makeKey = makeKey;
    function makeKeyOptionalMessage(markerData, useMessage) {
        const result = [emptyString];
        if (markerData.source) {
            result.push(markerData.source.replace('¦', '\\¦'));
        }
        else {
            result.push(emptyString);
        }
        if (markerData.code) {
            if (typeof markerData.code === 'string') {
                result.push(markerData.code.replace('¦', '\\¦'));
            }
            else {
                result.push(markerData.code.value.replace('¦', '\\¦'));
            }
        }
        else {
            result.push(emptyString);
        }
        if (markerData.severity !== undefined && markerData.severity !== null) {
            result.push(MarkerSeverity.toString(markerData.severity));
        }
        else {
            result.push(emptyString);
        }
        // Modifed to not include the message as part of the marker key to work around
        // https://github.com/microsoft/vscode/issues/77475
        if (markerData.message && useMessage) {
            result.push(markerData.message.replace('¦', '\\¦'));
        }
        else {
            result.push(emptyString);
        }
        if (markerData.startLineNumber !== undefined && markerData.startLineNumber !== null) {
            result.push(markerData.startLineNumber.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.startColumn !== undefined && markerData.startColumn !== null) {
            result.push(markerData.startColumn.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.endLineNumber !== undefined && markerData.endLineNumber !== null) {
            result.push(markerData.endLineNumber.toString());
        }
        else {
            result.push(emptyString);
        }
        if (markerData.endColumn !== undefined && markerData.endColumn !== null) {
            result.push(markerData.endColumn.toString());
        }
        else {
            result.push(emptyString);
        }
        result.push(emptyString);
        return result.join('¦');
    }
    IMarkerData.makeKeyOptionalMessage = makeKeyOptionalMessage;
})(IMarkerData || (IMarkerData = {}));
export const IMarkerService = createDecorator('markerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWFya2Vycy9jb21tb24vbWFya2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBZ0M3RSxNQUFNLENBQU4sSUFBa0IsU0FHakI7QUFIRCxXQUFrQixTQUFTO0lBQzFCLHVEQUFlLENBQUE7SUFDZixxREFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUhpQixTQUFTLEtBQVQsU0FBUyxRQUcxQjtBQUVELE1BQU0sQ0FBTixJQUFZLGNBS1g7QUFMRCxXQUFZLGNBQWM7SUFDekIsbURBQVEsQ0FBQTtJQUNSLG1EQUFRLENBQUE7SUFDUix5REFBVyxDQUFBO0lBQ1gscURBQVMsQ0FBQTtBQUNWLENBQUMsRUFMVyxjQUFjLEtBQWQsY0FBYyxRQUt6QjtBQUVELFdBQWlCLGNBQWM7SUFDOUIsU0FBZ0IsT0FBTyxDQUFDLENBQWlCLEVBQUUsQ0FBaUI7UUFDM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2IsQ0FBQztJQUZlLHNCQUFPLFVBRXRCLENBQUE7SUFFRCxNQUFNLGVBQWUsR0FBZ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN4RSxlQUFlLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdEUsZUFBZSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxRQUFRLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FB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