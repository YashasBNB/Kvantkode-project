/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @internal
 */
export var RawContentChangedType;
(function (RawContentChangedType) {
    RawContentChangedType[RawContentChangedType["Flush"] = 1] = "Flush";
    RawContentChangedType[RawContentChangedType["LineChanged"] = 2] = "LineChanged";
    RawContentChangedType[RawContentChangedType["LinesDeleted"] = 3] = "LinesDeleted";
    RawContentChangedType[RawContentChangedType["LinesInserted"] = 4] = "LinesInserted";
    RawContentChangedType[RawContentChangedType["EOLChanged"] = 5] = "EOLChanged";
})(RawContentChangedType || (RawContentChangedType = {}));
/**
 * An event describing that a model has been reset to a new value.
 * @internal
 */
export class ModelRawFlush {
    constructor() {
        this.changeType = 1 /* RawContentChangedType.Flush */;
    }
}
/**
 * Represents text injected on a line
 * @internal
 */
export class LineInjectedText {
    static applyInjectedText(lineText, injectedTexts) {
        if (!injectedTexts || injectedTexts.length === 0) {
            return lineText;
        }
        let result = '';
        let lastOriginalOffset = 0;
        for (const injectedText of injectedTexts) {
            result += lineText.substring(lastOriginalOffset, injectedText.column - 1);
            lastOriginalOffset = injectedText.column - 1;
            result += injectedText.options.content;
        }
        result += lineText.substring(lastOriginalOffset);
        return result;
    }
    static fromDecorations(decorations) {
        const result = [];
        for (const decoration of decorations) {
            if (decoration.options.before && decoration.options.before.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.startLineNumber, decoration.range.startColumn, decoration.options.before, 0));
            }
            if (decoration.options.after && decoration.options.after.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.endLineNumber, decoration.range.endColumn, decoration.options.after, 1));
            }
        }
        result.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.column === b.column) {
                    return a.order - b.order;
                }
                return a.column - b.column;
            }
            return a.lineNumber - b.lineNumber;
        });
        return result;
    }
    constructor(ownerId, lineNumber, column, options, order) {
        this.ownerId = ownerId;
        this.lineNumber = lineNumber;
        this.column = column;
        this.options = options;
        this.order = order;
    }
    withText(text) {
        return new LineInjectedText(this.ownerId, this.lineNumber, this.column, { ...this.options, content: text }, this.order);
    }
}
/**
 * An event describing that a line has changed in a model.
 * @internal
 */
export class ModelRawLineChanged {
    constructor(lineNumber, detail, injectedText) {
        this.changeType = 2 /* RawContentChangedType.LineChanged */;
        this.lineNumber = lineNumber;
        this.detail = detail;
        this.injectedText = injectedText;
    }
}
/**
 * An event describing that line(s) have been deleted in a model.
 * @internal
 */
export class ModelRawLinesDeleted {
    constructor(fromLineNumber, toLineNumber) {
        this.changeType = 3 /* RawContentChangedType.LinesDeleted */;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
    }
}
/**
 * An event describing that line(s) have been inserted in a model.
 * @internal
 */
export class ModelRawLinesInserted {
    constructor(fromLineNumber, toLineNumber, detail, injectedTexts) {
        this.changeType = 4 /* RawContentChangedType.LinesInserted */;
        this.injectedTexts = injectedTexts;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
        this.detail = detail;
    }
}
/**
 * An event describing that a model has had its EOL changed.
 * @internal
 */
export class ModelRawEOLChanged {
    constructor() {
        this.changeType = 5 /* RawContentChangedType.EOLChanged */;
    }
}
/**
 * An event describing a change in the text of a model.
 * @internal
 */
export class ModelRawContentChangedEvent {
    constructor(changes, versionId, isUndoing, isRedoing) {
        this.changes = changes;
        this.versionId = versionId;
        this.isUndoing = isUndoing;
        this.isRedoing = isRedoing;
        this.resultingSelection = null;
    }
    containsEvent(type) {
        for (let i = 0, len = this.changes.length; i < len; i++) {
            const change = this.changes[i];
            if (change.changeType === type) {
                return true;
            }
        }
        return false;
    }
    static merge(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const versionId = b.versionId;
        const isUndoing = a.isUndoing || b.isUndoing;
        const isRedoing = a.isRedoing || b.isRedoing;
        return new ModelRawContentChangedEvent(changes, versionId, isUndoing, isRedoing);
    }
}
/**
 * An event describing a change in injected text.
 * @internal
 */
export class ModelInjectedTextChangedEvent {
    constructor(changes) {
        this.changes = changes;
    }
}
/**
 * @internal
 */
export class InternalModelContentChangeEvent {
    constructor(rawContentChangedEvent, contentChangedEvent) {
        this.rawContentChangedEvent = rawContentChangedEvent;
        this.contentChangedEvent = contentChangedEvent;
    }
    merge(other) {
        const rawContentChangedEvent = ModelRawContentChangedEvent.merge(this.rawContentChangedEvent, other.rawContentChangedEvent);
        const contentChangedEvent = InternalModelContentChangeEvent._mergeChangeEvents(this.contentChangedEvent, other.contentChangedEvent);
        return new InternalModelContentChangeEvent(rawContentChangedEvent, contentChangedEvent);
    }
    static _mergeChangeEvents(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const eol = b.eol;
        const versionId = b.versionId;
        const isUndoing = a.isUndoing || b.isUndoing;
        const isRedoing = a.isRedoing || b.isRedoing;
        const isFlush = a.isFlush || b.isFlush;
        const isEolChange = a.isEolChange && b.isEolChange; // both must be true to not confuse listeners who skip such edits
        return {
            changes: changes,
            eol: eol,
            isEolChange: isEolChange,
            versionId: versionId,
            isUndoing: isUndoing,
            isRedoing: isRedoing,
            isFlush: isFlush,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90ZXh0TW9kZWxFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF3SGhHOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHFCQU1qQjtBQU5ELFdBQWtCLHFCQUFxQjtJQUN0QyxtRUFBUyxDQUFBO0lBQ1QsK0VBQWUsQ0FBQTtJQUNmLGlGQUFnQixDQUFBO0lBQ2hCLG1GQUFpQixDQUFBO0lBQ2pCLDZFQUFjLENBQUE7QUFDZixDQUFDLEVBTmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFNdEM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQUNpQixlQUFVLHVDQUE4QjtJQUN6RCxDQUFDO0NBQUE7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDOUIsUUFBZ0IsRUFDaEIsYUFBd0M7UUFFeEMsSUFBSSxDQUFDLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFDRCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDZixJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtRQUMxQixLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekUsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDNUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFB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