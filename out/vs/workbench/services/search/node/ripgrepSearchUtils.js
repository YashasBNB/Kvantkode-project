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
import { ILogService } from '../../../../platform/log/common/log.js';
import { SearchRange } from '../common/search.js';
import * as searchExtTypes from '../common/searchExtTypes.js';
export function anchorGlob(glob) {
    return glob.startsWith('**') || glob.startsWith('/') ? glob : `/${glob}`;
}
export function rangeToSearchRange(range) {
    return new SearchRange(range.start.line, range.start.character, range.end.line, range.end.character);
}
export function searchRangeToRange(range) {
    return new searchExtTypes.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
}
let OutputChannel = class OutputChannel {
    constructor(prefix, logService) {
        this.prefix = prefix;
        this.logService = logService;
    }
    appendLine(msg) {
        this.logService.debug(`${this.prefix}#search`, msg);
    }
};
OutputChannel = __decorate([
    __param(1, ILogService)
], OutputChannel);
export { OutputChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFNlYXJjaFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3JpcGdyZXBTZWFyY2hVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2pELE9BQU8sS0FBSyxjQUFjLE1BQU0sNkJBQTZCLENBQUE7QUFJN0QsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFZO0lBQ3RDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUE7QUFDekUsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUEyQjtJQUM3RCxPQUFPLElBQUksV0FBVyxDQUNyQixLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFDaEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUNkLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUNuQixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFrQjtJQUNwRCxPQUFPLElBQUksY0FBYyxDQUFDLEtBQUssQ0FDOUIsS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLFdBQVcsRUFDakIsS0FBSyxDQUFDLGFBQWEsRUFDbkIsS0FBSyxDQUFDLFNBQVMsQ0FDZixDQUFBO0FBQ0YsQ0FBQztBQU1NLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWE7SUFDekIsWUFDUyxNQUFjLEVBQ1EsVUFBdUI7UUFEN0MsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNRLGVBQVUsR0FBVixVQUFVLENBQWE7SUFDbkQsQ0FBQztJQUVKLFVBQVUsQ0FBQyxHQUFXO1FBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3BELENBQUM7Q0FDRCxDQUFBO0FBVFksYUFBYTtJQUd2QixXQUFBLFdBQVcsQ0FBQTtHQUhELGFBQWEsQ0FTekIifQ==