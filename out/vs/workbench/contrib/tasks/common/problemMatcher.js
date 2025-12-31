/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import * as Strings from '../../../../base/common/strings.js';
import * as Assert from '../../../../base/common/assert.js';
import { join, normalize } from '../../../../base/common/path.js';
import * as Types from '../../../../base/common/types.js';
import * as UUID from '../../../../base/common/uuid.js';
import * as Platform from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { ValidationStatus, Parser, } from '../../../../base/common/parsers.js';
import { asArray } from '../../../../base/common/arrays.js';
import { Schemas as NetworkSchemas } from '../../../../base/common/network.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ExtensionsRegistry, } from '../../../services/extensions/common/extensionsRegistry.js';
import { Emitter } from '../../../../base/common/event.js';
import { FileType, } from '../../../../platform/files/common/files.js';
export var FileLocationKind;
(function (FileLocationKind) {
    FileLocationKind[FileLocationKind["Default"] = 0] = "Default";
    FileLocationKind[FileLocationKind["Relative"] = 1] = "Relative";
    FileLocationKind[FileLocationKind["Absolute"] = 2] = "Absolute";
    FileLocationKind[FileLocationKind["AutoDetect"] = 3] = "AutoDetect";
    FileLocationKind[FileLocationKind["Search"] = 4] = "Search";
})(FileLocationKind || (FileLocationKind = {}));
(function (FileLocationKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'absolute') {
            return FileLocationKind.Absolute;
        }
        else if (value === 'relative') {
            return FileLocationKind.Relative;
        }
        else if (value === 'autodetect') {
            return FileLocationKind.AutoDetect;
        }
        else if (value === 'search') {
            return FileLocationKind.Search;
        }
        else {
            return undefined;
        }
    }
    FileLocationKind.fromString = fromString;
})(FileLocationKind || (FileLocationKind = {}));
export var ProblemLocationKind;
(function (ProblemLocationKind) {
    ProblemLocationKind[ProblemLocationKind["File"] = 0] = "File";
    ProblemLocationKind[ProblemLocationKind["Location"] = 1] = "Location";
})(ProblemLocationKind || (ProblemLocationKind = {}));
(function (ProblemLocationKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'file') {
            return ProblemLocationKind.File;
        }
        else if (value === 'location') {
            return ProblemLocationKind.Location;
        }
        else {
            return undefined;
        }
    }
    ProblemLocationKind.fromString = fromString;
})(ProblemLocationKind || (ProblemLocationKind = {}));
export var ApplyToKind;
(function (ApplyToKind) {
    ApplyToKind[ApplyToKind["allDocuments"] = 0] = "allDocuments";
    ApplyToKind[ApplyToKind["openDocuments"] = 1] = "openDocuments";
    ApplyToKind[ApplyToKind["closedDocuments"] = 2] = "closedDocuments";
})(ApplyToKind || (ApplyToKind = {}));
(function (ApplyToKind) {
    function fromString(value) {
        value = value.toLowerCase();
        if (value === 'alldocuments') {
            return ApplyToKind.allDocuments;
        }
        else if (value === 'opendocuments') {
            return ApplyToKind.openDocuments;
        }
        else if (value === 'closeddocuments') {
            return ApplyToKind.closedDocuments;
        }
        else {
            return undefined;
        }
    }
    ApplyToKind.fromString = fromString;
})(ApplyToKind || (ApplyToKind = {}));
export function isNamedProblemMatcher(value) {
    return value && Types.isString(value.name) ? true : false;
}
export async function getResource(filename, matcher, fileService) {
    const kind = matcher.fileLocation;
    let fullPath;
    if (kind === FileLocationKind.Absolute) {
        fullPath = filename;
    }
    else if (kind === FileLocationKind.Relative &&
        matcher.filePrefix &&
        Types.isString(matcher.filePrefix)) {
        fullPath = join(matcher.filePrefix, filename);
    }
    else if (kind === FileLocationKind.AutoDetect) {
        const matcherClone = Objects.deepClone(matcher);
        matcherClone.fileLocation = FileLocationKind.Relative;
        if (fileService) {
            const relative = await getResource(filename, matcherClone);
            let stat = undefined;
            try {
                stat = await fileService.stat(relative);
            }
            catch (ex) {
                // Do nothing, we just need to catch file resolution errors.
            }
            if (stat) {
                return relative;
            }
        }
        matcherClone.fileLocation = FileLocationKind.Absolute;
        return getResource(filename, matcherClone);
    }
    else if (kind === FileLocationKind.Search && fileService) {
        const fsProvider = fileService.getProvider(NetworkSchemas.file);
        if (fsProvider) {
            const uri = await searchForFileLocation(filename, fsProvider, matcher.filePrefix);
            fullPath = uri?.path;
        }
        if (!fullPath) {
            const absoluteMatcher = Objects.deepClone(matcher);
            absoluteMatcher.fileLocation = FileLocationKind.Absolute;
            return getResource(filename, absoluteMatcher);
        }
    }
    if (fullPath === undefined) {
        throw new Error('FileLocationKind is not actionable. Does the matcher have a filePrefix? This should never happen.');
    }
    fullPath = normalize(fullPath);
    fullPath = fullPath.replace(/\\/g, '/');
    if (fullPath[0] !== '/') {
        fullPath = '/' + fullPath;
    }
    if (matcher.uriProvider !== undefined) {
        return matcher.uriProvider(fullPath);
    }
    else {
        return URI.file(fullPath);
    }
}
async function searchForFileLocation(filename, fsProvider, args) {
    const exclusions = new Set(asArray(args.exclude || []).map((x) => URI.file(x).path));
    async function search(dir) {
        if (exclusions.has(dir.path)) {
            return undefined;
        }
        const entries = await fsProvider.readdir(dir);
        const subdirs = [];
        for (const [name, fileType] of entries) {
            if (fileType === FileType.Directory) {
                subdirs.push(URI.joinPath(dir, name));
                continue;
            }
            if (fileType === FileType.File) {
                /**
                 * Note that sometimes the given `filename` could be a relative
                 * path (not just the "name.ext" part). For example, the
                 * `filename` can be "/subdir/name.ext". So, just comparing
                 * `name` as `filename` is not sufficient. The workaround here
                 * is to form the URI with `dir` and `name` and check if it ends
                 * with the given `filename`.
                 */
                const fullUri = URI.joinPath(dir, name);
                if (fullUri.path.endsWith(filename)) {
                    return fullUri;
                }
            }
        }
        for (const subdir of subdirs) {
            const result = await search(subdir);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    for (const dir of asArray(args.include || [])) {
        const hit = await search(URI.file(dir));
        if (hit) {
            return hit;
        }
    }
    return undefined;
}
export function createLineMatcher(matcher, fileService) {
    const pattern = matcher.pattern;
    if (Array.isArray(pattern)) {
        return new MultiLineMatcher(matcher, fileService);
    }
    else {
        return new SingleLineMatcher(matcher, fileService);
    }
}
const endOfLine = Platform.OS === 1 /* Platform.OperatingSystem.Windows */ ? '\r\n' : '\n';
class AbstractLineMatcher {
    constructor(matcher, fileService) {
        this.matcher = matcher;
        this.fileService = fileService;
    }
    handle(lines, start = 0) {
        return { match: null, continue: false };
    }
    next(line) {
        return null;
    }
    fillProblemData(data, pattern, matches) {
        if (data) {
            this.fillProperty(data, 'file', pattern, matches, true);
            this.appendProperty(data, 'message', pattern, matches, true);
            this.fillProperty(data, 'code', pattern, matches, true);
            this.fillProperty(data, 'severity', pattern, matches, true);
            this.fillProperty(data, 'location', pattern, matches, true);
            this.fillProperty(data, 'line', pattern, matches);
            this.fillProperty(data, 'character', pattern, matches);
            this.fillProperty(data, 'endLine', pattern, matches);
            this.fillProperty(data, 'endCharacter', pattern, matches);
            return true;
        }
        else {
            return false;
        }
    }
    appendProperty(data, property, pattern, matches, trim = false) {
        const patternProperty = pattern[property];
        if (Types.isUndefined(data[property])) {
            this.fillProperty(data, property, pattern, matches, trim);
        }
        else if (!Types.isUndefined(patternProperty) && patternProperty < matches.length) {
            let value = matches[patternProperty];
            if (trim) {
                value = Strings.trim(value);
            }
            ;
            data[property] += endOfLine + value;
        }
    }
    fillProperty(data, property, pattern, matches, trim = false) {
        const patternAtProperty = pattern[property];
        if (Types.isUndefined(data[property]) &&
            !Types.isUndefined(patternAtProperty) &&
            patternAtProperty < matches.length) {
            let value = matches[patternAtProperty];
            if (value !== undefined) {
                if (trim) {
                    value = Strings.trim(value);
                }
                ;
                data[property] = value;
            }
        }
    }
    getMarkerMatch(data) {
        try {
            const location = this.getLocation(data);
            if (data.file && location && data.message) {
                const marker = {
                    severity: this.getSeverity(data),
                    startLineNumber: location.startLineNumber,
                    startColumn: location.startCharacter,
                    endLineNumber: location.endLineNumber,
                    endColumn: location.endCharacter,
                    message: data.message,
                };
                if (data.code !== undefined) {
                    marker.code = data.code;
                }
                if (this.matcher.source !== undefined) {
                    marker.source = this.matcher.source;
                }
                return {
                    description: this.matcher,
                    resource: this.getResource(data.file),
                    marker: marker,
                };
            }
        }
        catch (err) {
            console.error(`Failed to convert problem data into match: ${JSON.stringify(data)}`);
        }
        return undefined;
    }
    getResource(filename) {
        return getResource(filename, this.matcher, this.fileService);
    }
    getLocation(data) {
        if (data.kind === ProblemLocationKind.File) {
            return this.createLocation(0, 0, 0, 0);
        }
        if (data.location) {
            return this.parseLocationInfo(data.location);
        }
        if (!data.line) {
            return null;
        }
        const startLine = parseInt(data.line);
        const startColumn = data.character ? parseInt(data.character) : undefined;
        const endLine = data.endLine ? parseInt(data.endLine) : undefined;
        const endColumn = data.endCharacter ? parseInt(data.endCharacter) : undefined;
        return this.createLocation(startLine, startColumn, endLine, endColumn);
    }
    parseLocationInfo(value) {
        if (!value || !value.match(/(\d+|\d+,\d+|\d+,\d+,\d+,\d+)/)) {
            return null;
        }
        const parts = value.split(',');
        const startLine = parseInt(parts[0]);
        const startColumn = parts.length > 1 ? parseInt(parts[1]) : undefined;
        if (parts.length > 3) {
            return this.createLocation(startLine, startColumn, parseInt(parts[2]), parseInt(parts[3]));
        }
        else {
            return this.createLocation(startLine, startColumn, undefined, undefined);
        }
    }
    createLocation(startLine, startColumn, endLine, endColumn) {
        if (startColumn !== undefined && endColumn !== undefined) {
            return {
                startLineNumber: startLine,
                startCharacter: startColumn,
                endLineNumber: endLine || startLine,
                endCharacter: endColumn,
            };
        }
        if (startColumn !== undefined) {
            return {
                startLineNumber: startLine,
                startCharacter: startColumn,
                endLineNumber: startLine,
                endCharacter: startColumn,
            };
        }
        return {
            startLineNumber: startLine,
            startCharacter: 1,
            endLineNumber: startLine,
            endCharacter: 2 ** 31 - 1,
        }; // See https://github.com/microsoft/vscode/issues/80288#issuecomment-650636442 for discussion
    }
    getSeverity(data) {
        let result = null;
        if (data.severity) {
            const value = data.severity;
            if (value) {
                result = Severity.fromValue(value);
                if (result === Severity.Ignore) {
                    if (value === 'E') {
                        result = Severity.Error;
                    }
                    else if (value === 'W') {
                        result = Severity.Warning;
                    }
                    else if (value === 'I') {
                        result = Severity.Info;
                    }
                    else if (Strings.equalsIgnoreCase(value, 'hint')) {
                        result = Severity.Info;
                    }
                    else if (Strings.equalsIgnoreCase(value, 'note')) {
                        result = Severity.Info;
                    }
                }
            }
        }
        if (result === null || result === Severity.Ignore) {
            result = this.matcher.severity || Severity.Error;
        }
        return MarkerSeverity.fromSeverity(result);
    }
}
class SingleLineMatcher extends AbstractLineMatcher {
    constructor(matcher, fileService) {
        super(matcher, fileService);
        this.pattern = matcher.pattern;
    }
    get matchLength() {
        return 1;
    }
    handle(lines, start = 0) {
        Assert.ok(lines.length - start === 1);
        const data = Object.create(null);
        if (this.pattern.kind !== undefined) {
            data.kind = this.pattern.kind;
        }
        const matches = this.pattern.regexp.exec(lines[start]);
        if (matches) {
            this.fillProblemData(data, this.pattern, matches);
            const match = this.getMarkerMatch(data);
            if (match) {
                return { match: match, continue: false };
            }
        }
        return { match: null, continue: false };
    }
    next(line) {
        return null;
    }
}
class MultiLineMatcher extends AbstractLineMatcher {
    constructor(matcher, fileService) {
        super(matcher, fileService);
        this.patterns = matcher.pattern;
    }
    get matchLength() {
        return this.patterns.length;
    }
    handle(lines, start = 0) {
        Assert.ok(lines.length - start === this.patterns.length);
        this.data = Object.create(null);
        let data = this.data;
        data.kind = this.patterns[0].kind;
        for (let i = 0; i < this.patterns.length; i++) {
            const pattern = this.patterns[i];
            const matches = pattern.regexp.exec(lines[i + start]);
            if (!matches) {
                return { match: null, continue: false };
            }
            else {
                // Only the last pattern can loop
                if (pattern.loop && i === this.patterns.length - 1) {
                    data = Objects.deepClone(data);
                }
                this.fillProblemData(data, pattern, matches);
            }
        }
        const loop = !!this.patterns[this.patterns.length - 1].loop;
        if (!loop) {
            this.data = undefined;
        }
        const markerMatch = data ? this.getMarkerMatch(data) : null;
        return { match: markerMatch ? markerMatch : null, continue: loop };
    }
    next(line) {
        const pattern = this.patterns[this.patterns.length - 1];
        Assert.ok(pattern.loop === true && this.data !== null);
        const matches = pattern.regexp.exec(line);
        if (!matches) {
            this.data = undefined;
            return null;
        }
        const data = Objects.deepClone(this.data);
        let problemMatch;
        if (this.fillProblemData(data, pattern, matches)) {
            problemMatch = this.getMarkerMatch(data);
        }
        return problemMatch ? problemMatch : null;
    }
}
export var Config;
(function (Config) {
    let CheckedProblemPattern;
    (function (CheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && Types.isString(candidate.regexp);
        }
        CheckedProblemPattern.is = is;
    })(CheckedProblemPattern = Config.CheckedProblemPattern || (Config.CheckedProblemPattern = {}));
    let NamedProblemPattern;
    (function (NamedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && Types.isString(candidate.name);
        }
        NamedProblemPattern.is = is;
    })(NamedProblemPattern = Config.NamedProblemPattern || (Config.NamedProblemPattern = {}));
    let NamedCheckedProblemPattern;
    (function (NamedCheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return candidate && NamedProblemPattern.is(candidate) && Types.isString(candidate.regexp);
        }
        NamedCheckedProblemPattern.is = is;
    })(NamedCheckedProblemPattern = Config.NamedCheckedProblemPattern || (Config.NamedCheckedProblemPattern = {}));
    let MultiLineProblemPattern;
    (function (MultiLineProblemPattern) {
        function is(value) {
            return value && Array.isArray(value);
        }
        MultiLineProblemPattern.is = is;
    })(MultiLineProblemPattern = Config.MultiLineProblemPattern || (Config.MultiLineProblemPattern = {}));
    let MultiLineCheckedProblemPattern;
    (function (MultiLineCheckedProblemPattern) {
        function is(value) {
            if (!MultiLineProblemPattern.is(value)) {
                return false;
            }
            for (const element of value) {
                if (!Config.CheckedProblemPattern.is(element)) {
                    return false;
                }
            }
            return true;
        }
        MultiLineCheckedProblemPattern.is = is;
    })(MultiLineCheckedProblemPattern = Config.MultiLineCheckedProblemPattern || (Config.MultiLineCheckedProblemPattern = {}));
    let NamedMultiLineCheckedProblemPattern;
    (function (NamedMultiLineCheckedProblemPattern) {
        function is(value) {
            const candidate = value;
            return (candidate &&
                Types.isString(candidate.name) &&
                Array.isArray(candidate.patterns) &&
                MultiLineCheckedProblemPattern.is(candidate.patterns));
        }
        NamedMultiLineCheckedProblemPattern.is = is;
    })(NamedMultiLineCheckedProblemPattern = Config.NamedMultiLineCheckedProblemPattern || (Config.NamedMultiLineCheckedProblemPattern = {}));
    function isNamedProblemMatcher(value) {
        return Types.isString(value.name);
    }
    Config.isNamedProblemMatcher = isNamedProblemMatcher;
})(Config || (Config = {}));
export class ProblemPatternParser extends Parser {
    constructor(logger) {
        super(logger);
    }
    parse(value) {
        if (Config.NamedMultiLineCheckedProblemPattern.is(value)) {
            return this.createNamedMultiLineProblemPattern(value);
        }
        else if (Config.MultiLineCheckedProblemPattern.is(value)) {
            return this.createMultiLineProblemPattern(value);
        }
        else if (Config.NamedCheckedProblemPattern.is(value)) {
            const result = this.createSingleProblemPattern(value);
            result.name = value.name;
            return result;
        }
        else if (Config.CheckedProblemPattern.is(value)) {
            return this.createSingleProblemPattern(value);
        }
        else {
            this.error(localize('ProblemPatternParser.problemPattern.missingRegExp', 'The problem pattern is missing a regular expression.'));
            return null;
        }
    }
    createSingleProblemPattern(value) {
        const result = this.doCreateSingleProblemPattern(value, true);
        if (result === undefined) {
            return null;
        }
        else if (result.kind === undefined) {
            result.kind = ProblemLocationKind.Location;
        }
        return this.validateProblemPattern([result]) ? result : null;
    }
    createNamedMultiLineProblemPattern(value) {
        const validPatterns = this.createMultiLineProblemPattern(value.patterns);
        if (!validPatterns) {
            return null;
        }
        const result = {
            name: value.name,
            label: value.label ? value.label : value.name,
            patterns: validPatterns,
        };
        return result;
    }
    createMultiLineProblemPattern(values) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const pattern = this.doCreateSingleProblemPattern(values[i], false);
            if (pattern === undefined) {
                return null;
            }
            if (i < values.length - 1) {
                if (!Types.isUndefined(pattern.loop) && pattern.loop) {
                    pattern.loop = false;
                    this.error(localize('ProblemPatternParser.loopProperty.notLast', 'The loop property is only supported on the last line matcher.'));
                }
            }
            result.push(pattern);
        }
        if (result[0].kind === undefined) {
            result[0].kind = ProblemLocationKind.Location;
        }
        return this.validateProblemPattern(result) ? result : null;
    }
    doCreateSingleProblemPattern(value, setDefaults) {
        const regexp = this.createRegularExpression(value.regexp);
        if (regexp === undefined) {
            return undefined;
        }
        let result = { regexp };
        if (value.kind) {
            result.kind = ProblemLocationKind.fromString(value.kind);
        }
        function copyProperty(result, source, resultKey, sourceKey) {
            const value = source[sourceKey];
            if (typeof value === 'number') {
                ;
                result[resultKey] = value;
            }
        }
        copyProperty(result, value, 'file', 'file');
        copyProperty(result, value, 'location', 'location');
        copyProperty(result, value, 'line', 'line');
        copyProperty(result, value, 'character', 'column');
        copyProperty(result, value, 'endLine', 'endLine');
        copyProperty(result, value, 'endCharacter', 'endColumn');
        copyProperty(result, value, 'severity', 'severity');
        copyProperty(result, value, 'code', 'code');
        copyProperty(result, value, 'message', 'message');
        if (value.loop === true || value.loop === false) {
            result.loop = value.loop;
        }
        if (setDefaults) {
            if (result.location || result.kind === ProblemLocationKind.File) {
                const defaultValue = {
                    file: 1,
                    message: 0,
                };
                result = Objects.mixin(result, defaultValue, false);
            }
            else {
                const defaultValue = {
                    file: 1,
                    line: 2,
                    character: 3,
                    message: 0,
                };
                result = Objects.mixin(result, defaultValue, false);
            }
        }
        return result;
    }
    validateProblemPattern(values) {
        let file = false, message = false, location = false, line = false;
        const locationKind = values[0].kind === undefined ? ProblemLocationKind.Location : values[0].kind;
        values.forEach((pattern, i) => {
            if (i !== 0 && pattern.kind) {
                this.error(localize('ProblemPatternParser.problemPattern.kindProperty.notFirst', 'The problem pattern is invalid. The kind property must be provided only in the first element'));
            }
            file = file || !Types.isUndefined(pattern.file);
            message = message || !Types.isUndefined(pattern.message);
            location = location || !Types.isUndefined(pattern.location);
            line = line || !Types.isUndefined(pattern.line);
        });
        if (!(file && message)) {
            this.error(localize('ProblemPatternParser.problemPattern.missingProperty', 'The problem pattern is invalid. It must have at least have a file and a message.'));
            return false;
        }
        if (locationKind === ProblemLocationKind.Location && !(location || line)) {
            this.error(localize('ProblemPatternParser.problemPattern.missingLocation', 'The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
            return false;
        }
        return true;
    }
    createRegularExpression(value) {
        let result;
        try {
            result = new RegExp(value);
        }
        catch (err) {
            this.error(localize('ProblemPatternParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
        }
        return result;
    }
}
export class ExtensionRegistryReporter {
    constructor(_collector, _validationStatus = new ValidationStatus()) {
        this._collector = _collector;
        this._validationStatus = _validationStatus;
    }
    info(message) {
        this._validationStatus.state = 1 /* ValidationState.Info */;
        this._collector.info(message);
    }
    warn(message) {
        this._validationStatus.state = 2 /* ValidationState.Warning */;
        this._collector.warn(message);
    }
    error(message) {
        this._validationStatus.state = 3 /* ValidationState.Error */;
        this._collector.error(message);
    }
    fatal(message) {
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
        this._collector.error(message);
    }
    get status() {
        return this._validationStatus;
    }
}
export var Schemas;
(function (Schemas) {
    Schemas.ProblemPattern = {
        default: {
            regexp: '^([^\\\\s].*)\\\\((\\\\d+,\\\\d+)\\\\):\\\\s*(.*)$',
            file: 1,
            location: 2,
            message: 3,
        },
        type: 'object',
        additionalProperties: false,
        properties: {
            regexp: {
                type: 'string',
                description: localize('ProblemPatternSchema.regexp', 'The regular expression to find an error, warning or info in the output.'),
            },
            kind: {
                type: 'string',
                description: localize('ProblemPatternSchema.kind', 'whether the pattern matches a location (file and line) or only a file.'),
            },
            file: {
                type: 'integer',
                description: localize('ProblemPatternSchema.file', 'The match group index of the filename. If omitted 1 is used.'),
            },
            location: {
                type: 'integer',
                description: localize('ProblemPatternSchema.location', "The match group index of the problem's location. Valid location patterns are: (line), (line,column) and (startLine,startColumn,endLine,endColumn). If omitted (line,column) is assumed."),
            },
            line: {
                type: 'integer',
                description: localize('ProblemPatternSchema.line', "The match group index of the problem's line. Defaults to 2"),
            },
            column: {
                type: 'integer',
                description: localize('ProblemPatternSchema.column', "The match group index of the problem's line character. Defaults to 3"),
            },
            endLine: {
                type: 'integer',
                description: localize('ProblemPatternSchema.endLine', "The match group index of the problem's end line. Defaults to undefined"),
            },
            endColumn: {
                type: 'integer',
                description: localize('ProblemPatternSchema.endColumn', "The match group index of the problem's end line character. Defaults to undefined"),
            },
            severity: {
                type: 'integer',
                description: localize('ProblemPatternSchema.severity', "The match group index of the problem's severity. Defaults to undefined"),
            },
            code: {
                type: 'integer',
                description: localize('ProblemPatternSchema.code', "The match group index of the problem's code. Defaults to undefined"),
            },
            message: {
                type: 'integer',
                description: localize('ProblemPatternSchema.message', 'The match group index of the message. If omitted it defaults to 4 if location is specified. Otherwise it defaults to 5.'),
            },
            loop: {
                type: 'boolean',
                description: localize('ProblemPatternSchema.loop', 'In a multi line matcher loop indicated whether this pattern is executed in a loop as long as it matches. Can only specified on a last pattern in a multi line pattern.'),
            },
        },
    };
    Schemas.NamedProblemPattern = Objects.deepClone(Schemas.ProblemPattern);
    Schemas.NamedProblemPattern.properties = Objects.deepClone(Schemas.NamedProblemPattern.properties) || {};
    Schemas.NamedProblemPattern.properties['name'] = {
        type: 'string',
        description: localize('NamedProblemPatternSchema.name', 'The name of the problem pattern.'),
    };
    Schemas.MultiLineProblemPattern = {
        type: 'array',
        items: Schemas.ProblemPattern,
    };
    Schemas.NamedMultiLineProblemPattern = {
        type: 'object',
        additionalProperties: false,
        properties: {
            name: {
                type: 'string',
                description: localize('NamedMultiLineProblemPatternSchema.name', 'The name of the problem multi line problem pattern.'),
            },
            patterns: {
                type: 'array',
                description: localize('NamedMultiLineProblemPatternSchema.patterns', 'The actual patterns.'),
                items: Schemas.ProblemPattern,
            },
        },
    };
    Schemas.WatchingPattern = {
        type: 'object',
        additionalProperties: false,
        properties: {
            regexp: {
                type: 'string',
                description: localize('WatchingPatternSchema.regexp', 'The regular expression to detect the begin or end of a background task.'),
            },
            file: {
                type: 'integer',
                description: localize('WatchingPatternSchema.file', 'The match group index of the filename. Can be omitted.'),
            },
        },
    };
    Schemas.PatternType = {
        anyOf: [
            {
                type: 'string',
                description: localize('PatternTypeSchema.name', 'The name of a contributed or predefined pattern'),
            },
            Schemas.ProblemPattern,
            Schemas.MultiLineProblemPattern,
        ],
        description: localize('PatternTypeSchema.description', 'A problem pattern or the name of a contributed or predefined problem pattern. Can be omitted if base is specified.'),
    };
    Schemas.ProblemMatcher = {
        type: 'object',
        additionalProperties: false,
        properties: {
            base: {
                type: 'string',
                description: localize('ProblemMatcherSchema.base', 'The name of a base problem matcher to use.'),
            },
            owner: {
                type: 'string',
                description: localize('ProblemMatcherSchema.owner', "The owner of the problem inside Code. Can be omitted if base is specified. Defaults to 'external' if omitted and base is not specified."),
            },
            source: {
                type: 'string',
                description: localize('ProblemMatcherSchema.source', "A human-readable string describing the source of this diagnostic, e.g. 'typescript' or 'super lint'."),
            },
            severity: {
                type: 'string',
                enum: ['error', 'warning', 'info'],
                description: localize('ProblemMatcherSchema.severity', "The default severity for captures problems. Is used if the pattern doesn't define a match group for severity."),
            },
            applyTo: {
                type: 'string',
                enum: ['allDocuments', 'openDocuments', 'closedDocuments'],
                description: localize('ProblemMatcherSchema.applyTo', 'Controls if a problem reported on a text document is applied only to open, closed or all documents.'),
            },
            pattern: Schemas.PatternType,
            fileLocation: {
                oneOf: [
                    {
                        type: 'string',
                        enum: ['absolute', 'relative', 'autoDetect', 'search'],
                    },
                    {
                        type: 'array',
                        prefixItems: [
                            {
                                type: 'string',
                                enum: ['absolute', 'relative', 'autoDetect', 'search'],
                            },
                        ],
                        minItems: 1,
                        maxItems: 1,
                        additionalItems: false,
                    },
                    {
                        type: 'array',
                        prefixItems: [{ type: 'string', enum: ['relative', 'autoDetect'] }, { type: 'string' }],
                        minItems: 2,
                        maxItems: 2,
                        additionalItems: false,
                        examples: [
                            ['relative', '${workspaceFolder}'],
                            ['autoDetect', '${workspaceFolder}'],
                        ],
                    },
                    {
                        type: 'array',
                        prefixItems: [
                            { type: 'string', enum: ['search'] },
                            {
                                type: 'object',
                                properties: {
                                    include: {
                                        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                                    },
                                    exclude: {
                                        oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                                    },
                                },
                                required: ['include'],
                            },
                        ],
                        minItems: 2,
                        maxItems: 2,
                        additionalItems: false,
                        examples: [
                            ['search', { include: ['${workspaceFolder}'] }],
                            ['search', { include: ['${workspaceFolder}'], exclude: [] }],
                        ],
                    },
                ],
                description: localize('ProblemMatcherSchema.fileLocation', 'Defines how file names reported in a problem pattern should be interpreted. A relative fileLocation may be an array, where the second element of the array is the path of the relative file location. The search fileLocation mode, performs a deep (and, possibly, heavy) file system search within the directories specified by the include/exclude properties of the second element (or the current workspace directory if not specified).'),
            },
            background: {
                type: 'object',
                additionalProperties: false,
                description: localize('ProblemMatcherSchema.background', 'Patterns to track the begin and end of a matcher active on a background task.'),
                properties: {
                    activeOnStart: {
                        type: 'boolean',
                        description: localize('ProblemMatcherSchema.background.activeOnStart', 'If set to true the background monitor starts in active mode. This is the same as outputting a line that matches beginsPattern when the task starts.'),
                    },
                    beginsPattern: {
                        oneOf: [
                            {
                                type: 'string',
                            },
                            Schemas.WatchingPattern,
                        ],
                        description: localize('ProblemMatcherSchema.background.beginsPattern', 'If matched in the output the start of a background task is signaled.'),
                    },
                    endsPattern: {
                        oneOf: [
                            {
                                type: 'string',
                            },
                            Schemas.WatchingPattern,
                        ],
                        description: localize('ProblemMatcherSchema.background.endsPattern', 'If matched in the output the end of a background task is signaled.'),
                    },
                },
            },
            watching: {
                type: 'object',
                additionalProperties: false,
                deprecationMessage: localize('ProblemMatcherSchema.watching.deprecated', 'The watching property is deprecated. Use background instead.'),
                description: localize('ProblemMatcherSchema.watching', 'Patterns to track the begin and end of a watching matcher.'),
                properties: {
                    activeOnStart: {
                        type: 'boolean',
                        description: localize('ProblemMatcherSchema.watching.activeOnStart', 'If set to true the watcher starts in active mode. This is the same as outputting a line that matches beginsPattern when the task starts.'),
                    },
                    beginsPattern: {
                        oneOf: [
                            {
                                type: 'string',
                            },
                            Schemas.WatchingPattern,
                        ],
                        description: localize('ProblemMatcherSchema.watching.beginsPattern', 'If matched in the output the start of a watching task is signaled.'),
                    },
                    endsPattern: {
                        oneOf: [
                            {
                                type: 'string',
                            },
                            Schemas.WatchingPattern,
                        ],
                        description: localize('ProblemMatcherSchema.watching.endsPattern', 'If matched in the output the end of a watching task is signaled.'),
                    },
                },
            },
        },
    };
    Schemas.LegacyProblemMatcher = Objects.deepClone(Schemas.ProblemMatcher);
    Schemas.LegacyProblemMatcher.properties = Objects.deepClone(Schemas.LegacyProblemMatcher.properties) || {};
    Schemas.LegacyProblemMatcher.properties['watchedTaskBeginsRegExp'] = {
        type: 'string',
        deprecationMessage: localize('LegacyProblemMatcherSchema.watchedBegin.deprecated', 'This property is deprecated. Use the watching property instead.'),
        description: localize('LegacyProblemMatcherSchema.watchedBegin', 'A regular expression signaling that a watched tasks begins executing triggered through file watching.'),
    };
    Schemas.LegacyProblemMatcher.properties['watchedTaskEndsRegExp'] = {
        type: 'string',
        deprecationMessage: localize('LegacyProblemMatcherSchema.watchedEnd.deprecated', 'This property is deprecated. Use the watching property instead.'),
        description: localize('LegacyProblemMatcherSchema.watchedEnd', 'A regular expression signaling that a watched tasks ends executing.'),
    };
    Schemas.NamedProblemMatcher = Objects.deepClone(Schemas.ProblemMatcher);
    Schemas.NamedProblemMatcher.properties = Objects.deepClone(Schemas.NamedProblemMatcher.properties) || {};
    Schemas.NamedProblemMatcher.properties.name = {
        type: 'string',
        description: localize('NamedProblemMatcherSchema.name', 'The name of the problem matcher used to refer to it.'),
    };
    Schemas.NamedProblemMatcher.properties.label = {
        type: 'string',
        description: localize('NamedProblemMatcherSchema.label', 'A human readable label of the problem matcher.'),
    };
})(Schemas || (Schemas = {}));
const problemPatternExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'problemPatterns',
    jsonSchema: {
        description: localize('ProblemPatternExtPoint', 'Contributes problem patterns'),
        type: 'array',
        items: {
            anyOf: [Schemas.NamedProblemPattern, Schemas.NamedMultiLineProblemPattern],
        },
    },
});
class ProblemPatternRegistryImpl {
    constructor() {
        this.patterns = Object.create(null);
        this.fillDefaults();
        this.readyPromise = new Promise((resolve, reject) => {
            problemPatternExtPoint.setHandler((extensions, delta) => {
                // We get all statically know extension during startup in one batch
                try {
                    delta.removed.forEach((extension) => {
                        const problemPatterns = extension.value;
                        for (const pattern of problemPatterns) {
                            if (this.patterns[pattern.name]) {
                                delete this.patterns[pattern.name];
                            }
                        }
                    });
                    delta.added.forEach((extension) => {
                        const problemPatterns = extension.value;
                        const parser = new ProblemPatternParser(new ExtensionRegistryReporter(extension.collector));
                        for (const pattern of problemPatterns) {
                            if (Config.NamedMultiLineCheckedProblemPattern.is(pattern)) {
                                const result = parser.parse(pattern);
                                if (parser.problemReporter.status.state < 3 /* ValidationState.Error */) {
                                    this.add(result.name, result.patterns);
                                }
                                else {
                                    extension.collector.error(localize('ProblemPatternRegistry.error', 'Invalid problem pattern. The pattern will be ignored.'));
                                    extension.collector.error(JSON.stringify(pattern, undefined, 4));
                                }
                            }
                            else if (Config.NamedProblemPattern.is(pattern)) {
                                const result = parser.parse(pattern);
                                if (parser.problemReporter.status.state < 3 /* ValidationState.Error */) {
                                    this.add(pattern.name, result);
                                }
                                else {
                                    extension.collector.error(localize('ProblemPatternRegistry.error', 'Invalid problem pattern. The pattern will be ignored.'));
                                    extension.collector.error(JSON.stringify(pattern, undefined, 4));
                                }
                            }
                            parser.reset();
                        }
                    });
                }
                catch (error) {
                    // Do nothing
                }
                resolve(undefined);
            });
        });
    }
    onReady() {
        return this.readyPromise;
    }
    add(key, value) {
        this.patterns[key] = value;
    }
    get(key) {
        return this.patterns[key];
    }
    fillDefaults() {
        this.add('msCompile', {
            regexp: /^(?:\s*\d+>)?(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\)\s*:\s+((?:fatal +)?error|warning|info)\s+(\w+\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5,
        });
        this.add('gulp-tsc', {
            regexp: /^([^\s].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(\d+)\s+(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            code: 3,
            message: 4,
        });
        this.add('cpp', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(C\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5,
        });
        this.add('csc', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(CS\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5,
        });
        this.add('vb', {
            regexp: /^(\S.*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+(error|warning|info)\s+(BC\d+)\s*:\s*(.*)$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            location: 2,
            severity: 3,
            code: 4,
            message: 5,
        });
        this.add('lessCompile', {
            regexp: /^\s*(.*) in file (.*) line no. (\d+)$/,
            kind: ProblemLocationKind.Location,
            message: 1,
            file: 2,
            line: 3,
        });
        this.add('jshint', {
            regexp: /^(.*):\s+line\s+(\d+),\s+col\s+(\d+),\s(.+?)(?:\s+\((\w)(\d+)\))?$/,
            kind: ProblemLocationKind.Location,
            file: 1,
            line: 2,
            character: 3,
            message: 4,
            severity: 5,
            code: 6,
        });
        this.add('jshint-stylish', [
            {
                regexp: /^(.+)$/,
                kind: ProblemLocationKind.Location,
                file: 1,
            },
            {
                regexp: /^\s+line\s+(\d+)\s+col\s+(\d+)\s+(.+?)(?:\s+\((\w)(\d+)\))?$/,
                line: 1,
                character: 2,
                message: 3,
                severity: 4,
                code: 5,
                loop: true,
            },
        ]);
        this.add('eslint-compact', {
            regexp: /^(.+):\sline\s(\d+),\scol\s(\d+),\s(Error|Warning|Info)\s-\s(.+)\s\((.+)\)$/,
            file: 1,
            kind: ProblemLocationKind.Location,
            line: 2,
            character: 3,
            severity: 4,
            message: 5,
            code: 6,
        });
        this.add('eslint-stylish', [
            {
                regexp: /^((?:[a-zA-Z]:)*[./\\]+.*?)$/,
                kind: ProblemLocationKind.Location,
                file: 1,
            },
            {
                regexp: /^\s+(\d+):(\d+)\s+(error|warning|info)\s+(.+?)(?:\s\s+(.*))?$/,
                line: 1,
                character: 2,
                severity: 3,
                message: 4,
                code: 5,
                loop: true,
            },
        ]);
        this.add('go', {
            regexp: /^([^:]*: )?((.:)?[^:]*):(\d+)(:(\d+))?: (.*)$/,
            kind: ProblemLocationKind.Location,
            file: 2,
            line: 4,
            character: 6,
            message: 7,
        });
    }
}
export const ProblemPatternRegistry = new ProblemPatternRegistryImpl();
export class ProblemMatcherParser extends Parser {
    constructor(logger) {
        super(logger);
    }
    parse(json) {
        const result = this.createProblemMatcher(json);
        if (!this.checkProblemMatcherValid(json, result)) {
            return undefined;
        }
        this.addWatchingMatcher(json, result);
        return result;
    }
    checkProblemMatcherValid(externalProblemMatcher, problemMatcher) {
        if (!problemMatcher) {
            this.error(localize('ProblemMatcherParser.noProblemMatcher', "Error: the description can't be converted into a problem matcher:\n{0}\n", JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (!problemMatcher.pattern) {
            this.error(localize('ProblemMatcherParser.noProblemPattern', "Error: the description doesn't define a valid problem pattern:\n{0}\n", JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (!problemMatcher.owner) {
            this.error(localize('ProblemMatcherParser.noOwner', "Error: the description doesn't define an owner:\n{0}\n", JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        if (Types.isUndefined(problemMatcher.fileLocation)) {
            this.error(localize('ProblemMatcherParser.noFileLocation', "Error: the description doesn't define a file location:\n{0}\n", JSON.stringify(externalProblemMatcher, null, 4)));
            return false;
        }
        return true;
    }
    createProblemMatcher(description) {
        let result = null;
        const owner = Types.isString(description.owner) ? description.owner : UUID.generateUuid();
        const source = Types.isString(description.source) ? description.source : undefined;
        let applyTo = Types.isString(description.applyTo)
            ? ApplyToKind.fromString(description.applyTo)
            : ApplyToKind.allDocuments;
        if (!applyTo) {
            applyTo = ApplyToKind.allDocuments;
        }
        let fileLocation = undefined;
        let filePrefix = undefined;
        let kind;
        if (Types.isUndefined(description.fileLocation)) {
            fileLocation = FileLocationKind.Relative;
            filePrefix = '${workspaceFolder}';
        }
        else if (Types.isString(description.fileLocation)) {
            kind = FileLocationKind.fromString(description.fileLocation);
            if (kind) {
                fileLocation = kind;
                if (kind === FileLocationKind.Relative || kind === FileLocationKind.AutoDetect) {
                    filePrefix = '${workspaceFolder}';
                }
                else if (kind === FileLocationKind.Search) {
                    filePrefix = { include: ['${workspaceFolder}'] };
                }
            }
        }
        else if (Types.isStringArray(description.fileLocation)) {
            const values = description.fileLocation;
            if (values.length > 0) {
                kind = FileLocationKind.fromString(values[0]);
                if (values.length === 1 && kind === FileLocationKind.Absolute) {
                    fileLocation = kind;
                }
                else if (values.length === 2 &&
                    (kind === FileLocationKind.Relative || kind === FileLocationKind.AutoDetect) &&
                    values[1]) {
                    fileLocation = kind;
                    filePrefix = values[1];
                }
            }
        }
        else if (Array.isArray(description.fileLocation)) {
            const kind = FileLocationKind.fromString(description.fileLocation[0]);
            if (kind === FileLocationKind.Search) {
                fileLocation = FileLocationKind.Search;
                filePrefix = description.fileLocation[1] ?? { include: ['${workspaceFolder}'] };
            }
        }
        const pattern = description.pattern ? this.createProblemPattern(description.pattern) : undefined;
        let severity = description.severity ? Severity.fromValue(description.severity) : undefined;
        if (severity === Severity.Ignore) {
            this.info(localize('ProblemMatcherParser.unknownSeverity', 'Info: unknown severity {0}. Valid values are error, warning and info.\n', description.severity));
            severity = Severity.Error;
        }
        if (Types.isString(description.base)) {
            const variableName = description.base;
            if (variableName.length > 1 && variableName[0] === '$') {
                const base = ProblemMatcherRegistry.get(variableName.substring(1));
                if (base) {
                    result = Objects.deepClone(base);
                    if (description.owner !== undefined && owner !== undefined) {
                        result.owner = owner;
                    }
                    if (description.source !== undefined && source !== undefined) {
                        result.source = source;
                    }
                    if (description.fileLocation !== undefined && fileLocation !== undefined) {
                        result.fileLocation = fileLocation;
                        result.filePrefix = filePrefix;
                    }
                    if (description.pattern !== undefined && pattern !== undefined && pattern !== null) {
                        result.pattern = pattern;
                    }
                    if (description.severity !== undefined && severity !== undefined) {
                        result.severity = severity;
                    }
                    if (description.applyTo !== undefined && applyTo !== undefined) {
                        result.applyTo = applyTo;
                    }
                }
            }
        }
        else if (fileLocation && pattern) {
            result = {
                owner: owner,
                applyTo: applyTo,
                fileLocation: fileLocation,
                pattern: pattern,
            };
            if (source) {
                result.source = source;
            }
            if (filePrefix) {
                result.filePrefix = filePrefix;
            }
            if (severity) {
                result.severity = severity;
            }
        }
        if (Config.isNamedProblemMatcher(description)) {
            ;
            result.name = description.name;
            result.label = Types.isString(description.label)
                ? description.label
                : description.name;
        }
        return result;
    }
    createProblemPattern(value) {
        if (Types.isString(value)) {
            const variableName = value;
            if (variableName.length > 1 && variableName[0] === '$') {
                const result = ProblemPatternRegistry.get(variableName.substring(1));
                if (!result) {
                    this.error(localize('ProblemMatcherParser.noDefinedPatter', "Error: the pattern with the identifier {0} doesn't exist.", variableName));
                }
                return result;
            }
            else {
                if (variableName.length === 0) {
                    this.error(localize('ProblemMatcherParser.noIdentifier', 'Error: the pattern property refers to an empty identifier.'));
                }
                else {
                    this.error(localize('ProblemMatcherParser.noValidIdentifier', 'Error: the pattern property {0} is not a valid pattern variable name.', variableName));
                }
            }
        }
        else if (value) {
            const problemPatternParser = new ProblemPatternParser(this.problemReporter);
            if (Array.isArray(value)) {
                return problemPatternParser.parse(value);
            }
            else {
                return problemPatternParser.parse(value);
            }
        }
        return null;
    }
    addWatchingMatcher(external, internal) {
        const oldBegins = this.createRegularExpression(external.watchedTaskBeginsRegExp);
        const oldEnds = this.createRegularExpression(external.watchedTaskEndsRegExp);
        if (oldBegins && oldEnds) {
            internal.watching = {
                activeOnStart: false,
                beginsPattern: { regexp: oldBegins },
                endsPattern: { regexp: oldEnds },
            };
            return;
        }
        const backgroundMonitor = external.background || external.watching;
        if (Types.isUndefinedOrNull(backgroundMonitor)) {
            return;
        }
        const begins = this.createWatchingPattern(backgroundMonitor.beginsPattern);
        const ends = this.createWatchingPattern(backgroundMonitor.endsPattern);
        if (begins && ends) {
            internal.watching = {
                activeOnStart: Types.isBoolean(backgroundMonitor.activeOnStart)
                    ? backgroundMonitor.activeOnStart
                    : false,
                beginsPattern: begins,
                endsPattern: ends,
            };
            return;
        }
        if (begins || ends) {
            this.error(localize('ProblemMatcherParser.problemPattern.watchingMatcher', 'A problem matcher must define both a begin pattern and an end pattern for watching.'));
        }
    }
    createWatchingPattern(external) {
        if (Types.isUndefinedOrNull(external)) {
            return null;
        }
        let regexp;
        let file;
        if (Types.isString(external)) {
            regexp = this.createRegularExpression(external);
        }
        else {
            regexp = this.createRegularExpression(external.regexp);
            if (Types.isNumber(external.file)) {
                file = external.file;
            }
        }
        if (!regexp) {
            return null;
        }
        return file ? { regexp, file } : { regexp, file: 1 };
    }
    createRegularExpression(value) {
        let result = null;
        if (!value) {
            return result;
        }
        try {
            result = new RegExp(value);
        }
        catch (err) {
            this.error(localize('ProblemMatcherParser.invalidRegexp', 'Error: The string {0} is not a valid regular expression.\n', value));
        }
        return result;
    }
}
const problemMatchersExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'problemMatchers',
    deps: [problemPatternExtPoint],
    jsonSchema: {
        description: localize('ProblemMatcherExtPoint', 'Contributes problem matchers'),
        type: 'array',
        items: Schemas.NamedProblemMatcher,
    },
});
class ProblemMatcherRegistryImpl {
    constructor() {
        this._onMatchersChanged = new Emitter();
        this.onMatcherChanged = this._onMatchersChanged.event;
        this.matchers = Object.create(null);
        this.fillDefaults();
        this.readyPromise = new Promise((resolve, reject) => {
            problemMatchersExtPoint.setHandler((extensions, delta) => {
                try {
                    delta.removed.forEach((extension) => {
                        const problemMatchers = extension.value;
                        for (const matcher of problemMatchers) {
                            if (this.matchers[matcher.name]) {
                                delete this.matchers[matcher.name];
                            }
                        }
                    });
                    delta.added.forEach((extension) => {
                        const problemMatchers = extension.value;
                        const parser = new ProblemMatcherParser(new ExtensionRegistryReporter(extension.collector));
                        for (const matcher of problemMatchers) {
                            const result = parser.parse(matcher);
                            if (result && isNamedProblemMatcher(result)) {
                                this.add(result);
                            }
                        }
                    });
                    if (delta.removed.length > 0 || delta.added.length > 0) {
                        this._onMatchersChanged.fire();
                    }
                }
                catch (error) { }
                const matcher = this.get('tsc-watch');
                if (matcher) {
                    ;
                    matcher.tscWatch = true;
                }
                resolve(undefined);
            });
        });
    }
    onReady() {
        ProblemPatternRegistry.onReady();
        return this.readyPromise;
    }
    add(matcher) {
        this.matchers[matcher.name] = matcher;
    }
    get(name) {
        return this.matchers[name];
    }
    keys() {
        return Object.keys(this.matchers);
    }
    fillDefaults() {
        this.add({
            name: 'msCompile',
            label: localize('msCompile', 'Microsoft compiler problems'),
            owner: 'msCompile',
            source: 'cpp',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('msCompile'),
        });
        this.add({
            name: 'lessCompile',
            label: localize('lessCompile', 'Less problems'),
            deprecated: true,
            owner: 'lessCompile',
            source: 'less',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('lessCompile'),
            severity: Severity.Error,
        });
        this.add({
            name: 'gulp-tsc',
            label: localize('gulp-tsc', 'Gulp TSC Problems'),
            owner: 'typescript',
            source: 'ts',
            applyTo: ApplyToKind.closedDocuments,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('gulp-tsc'),
        });
        this.add({
            name: 'jshint',
            label: localize('jshint', 'JSHint problems'),
            owner: 'jshint',
            source: 'jshint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('jshint'),
        });
        this.add({
            name: 'jshint-stylish',
            label: localize('jshint-stylish', 'JSHint stylish problems'),
            owner: 'jshint',
            source: 'jshint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('jshint-stylish'),
        });
        this.add({
            name: 'eslint-compact',
            label: localize('eslint-compact', 'ESLint compact problems'),
            owner: 'eslint',
            source: 'eslint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('eslint-compact'),
        });
        this.add({
            name: 'eslint-stylish',
            label: localize('eslint-stylish', 'ESLint stylish problems'),
            owner: 'eslint',
            source: 'eslint',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Absolute,
            pattern: ProblemPatternRegistry.get('eslint-stylish'),
        });
        this.add({
            name: 'go',
            label: localize('go', 'Go problems'),
            owner: 'go',
            source: 'go',
            applyTo: ApplyToKind.allDocuments,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: ProblemPatternRegistry.get('go'),
        });
    }
}
export const ProblemMatcherRegistry = new ProblemMatcherRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vcHJvYmxlbU1hdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFDTixnQkFBZ0IsRUFHaEIsTUFBTSxHQUNOLE1BQU0sb0NBQW9DLENBQUE7QUFFM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLElBQUksY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFOUUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzVGLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxF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