/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import './media/searchEditor.css';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { searchMatchComparer } from '../../search/browser/searchCompare.js';
import { isNotebookFileMatch, } from '../../search/browser/notebookSearch/notebookSearchModelBase.js';
// Using \r\n on Windows inserts an extra newline between results.
const lineDelimiter = '\n';
const translateRangeLines = (n) => (range) => new Range(range.startLineNumber + n, range.startColumn, range.endLineNumber + n, range.endColumn);
const matchToSearchResultFormat = (match, longestLineNumber) => {
    const getLinePrefix = (i) => `${match.range().startLineNumber + i}`;
    const fullMatchLines = match.fullPreviewLines();
    const results = [];
    fullMatchLines.forEach((sourceLine, i) => {
        const lineNumber = getLinePrefix(i);
        const paddingStr = ' '.repeat(longestLineNumber - lineNumber.length);
        const prefix = `  ${paddingStr}${lineNumber}: `;
        const prefixOffset = prefix.length;
        // split instead of replace to avoid creating a new string object
        const line = prefix + (sourceLine.split(/\r?\n?$/, 1)[0] || '');
        const rangeOnThisLine = ({ start, end }) => new Range(1, (start ?? 1) + prefixOffset, 1, (end ?? sourceLine.length + 1) + prefixOffset);
        const matchRange = match.rangeInPreview();
        const matchIsSingleLine = matchRange.startLineNumber === matchRange.endLineNumber;
        let lineRange;
        if (matchIsSingleLine) {
            lineRange = rangeOnThisLine({ start: matchRange.startColumn, end: matchRange.endColumn });
        }
        else if (i === 0) {
            lineRange = rangeOnThisLine({ start: matchRange.startColumn });
        }
        else if (i === fullMatchLines.length - 1) {
            lineRange = rangeOnThisLine({ end: matchRange.endColumn });
        }
        else {
            lineRange = rangeOnThisLine({});
        }
        results.push({ lineNumber: lineNumber, line, ranges: [lineRange] });
    });
    return results;
};
function fileMatchToSearchResultFormat(fileMatch, labelFormatter) {
    const textSerializations = fileMatch.textMatches().length > 0
        ? matchesToSearchResultFormat(fileMatch.resource, fileMatch.textMatches().sort(searchMatchComparer), fileMatch.context, labelFormatter)
        : undefined;
    const cellSerializations = isNotebookFileMatch(fileMatch)
        ? fileMatch
            .cellMatches()
            .sort((a, b) => a.cellIndex - b.cellIndex)
            .sort()
            .filter((cellMatch) => cellMatch.contentMatches.length > 0)
            .map((cellMatch, index) => cellMatchToSearchResultFormat(cellMatch, labelFormatter, index === 0))
        : [];
    return [textSerializations, ...cellSerializations].filter((x) => !!x);
}
function matchesToSearchResultFormat(resource, sortedMatches, matchContext, labelFormatter, shouldUseHeader = true) {
    const longestLineNumber = sortedMatches[sortedMatches.length - 1]
        .range()
        .endLineNumber.toString().length;
    const text = shouldUseHeader ? [`${labelFormatter(resource)}:`] : [];
    const matchRanges = [];
    const targetLineNumberToOffset = {};
    const context = [];
    matchContext.forEach((line, lineNumber) => context.push({ line, lineNumber }));
    context.sort((a, b) => a.lineNumber - b.lineNumber);
    let lastLine = undefined;
    const seenLines = new Set();
    sortedMatches.forEach((match) => {
        matchToSearchResultFormat(match, longestLineNumber).forEach((match) => {
            if (!seenLines.has(match.lineNumber)) {
                while (context.length && context[0].lineNumber < +match.lineNumber) {
                    const { line, lineNumber } = context.shift();
                    if (lastLine !== undefined && lineNumber !== lastLine + 1) {
                        text.push('');
                    }
                    text.push(`  ${' '.repeat(longestLineNumber - `${lineNumber}`.length)}${lineNumber}  ${line}`);
                    lastLine = lineNumber;
                }
                targetLineNumberToOffset[match.lineNumber] = text.length;
                seenLines.add(match.lineNumber);
                text.push(match.line);
                lastLine = +match.lineNumber;
            }
            matchRanges.push(...match.ranges.map(translateRangeLines(targetLineNumberToOffset[match.lineNumber])));
        });
    });
    while (context.length) {
        const { line, lineNumber } = context.shift();
        text.push(`  ${lineNumber}  ${line}`);
    }
    return { text, matchRanges };
}
function cellMatchToSearchResultFormat(cellMatch, labelFormatter, shouldUseHeader) {
    return matchesToSearchResultFormat(cellMatch.cell?.uri ?? cellMatch.parent.resource, cellMatch.contentMatches.sort(searchMatchComparer), cellMatch.context, labelFormatter, shouldUseHeader);
}
const contentPatternToSearchConfiguration = (pattern, includes, excludes, contextLines) => {
    return {
        query: pattern.contentPattern.pattern,
        isRegexp: !!pattern.contentPattern.isRegExp,
        isCaseSensitive: !!pattern.contentPattern.isCaseSensitive,
        matchWholeWord: !!pattern.contentPattern.isWordMatch,
        filesToExclude: excludes,
        filesToInclude: includes,
        showIncludesExcludes: !!(includes || excludes || pattern?.userDisabledExcludesAndIgnoreFiles),
        useExcludeSettingsAndIgnoreFiles: pattern?.userDisabledExcludesAndIgnoreFiles === undefined
            ? true
            : !pattern.userDisabledExcludesAndIgnoreFiles,
        contextLines,
        onlyOpenEditors: !!pattern.onlyOpenEditors,
        notebookSearchConfig: {
            includeMarkupInput: !!pattern.contentPattern.notebookInfo?.isInNotebookMarkdownInput,
            includeMarkupPreview: !!pattern.contentPattern.notebookInfo?.isInNotebookMarkdownPreview,
            includeCodeInput: !!pattern.contentPattern.notebookInfo?.isInNotebookCellInput,
            includeOutput: !!pattern.contentPattern.notebookInfo?.isInNotebookCellOutput,
        },
    };
};
export const serializeSearchConfiguration = (config) => {
    const removeNullFalseAndUndefined = (a) => a.filter((a) => a !== false && a !== null && a !== undefined);
    const escapeNewlines = (str) => str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    return removeNullFalseAndUndefined([
        `# Query: ${escapeNewlines(config.query ?? '')}`,
        (config.isCaseSensitive ||
            config.matchWholeWord ||
            config.isRegexp ||
            config.useExcludeSettingsAndIgnoreFiles === false) &&
            `# Flags: ${coalesce([
                config.isCaseSensitive && 'CaseSensitive',
                config.matchWholeWord && 'WordMatch',
                config.isRegexp && 'RegExp',
                config.onlyOpenEditors && 'OpenEditors',
                config.useExcludeSettingsAndIgnoreFiles === false && 'IgnoreExcludeSettings',
            ]).join(' ')}`,
        config.filesToInclude ? `# Including: ${config.filesToInclude}` : undefined,
        config.filesToExclude ? `# Excluding: ${config.filesToExclude}` : undefined,
        config.contextLines ? `# ContextLines: ${config.contextLines}` : undefined,
        '',
    ]).join(lineDelimiter);
};
export const extractSearchQueryFromModel = (model) => extractSearchQueryFromLines(model.getValueInRange(new Range(1, 1, 6, 1)).split(lineDelimiter));
export const defaultSearchConfig = () => ({
    query: '',
    filesToInclude: '',
    filesToExclude: '',
    isRegexp: false,
    isCaseSensitive: false,
    useExcludeSettingsAndIgnoreFiles: true,
    matchWholeWord: false,
    contextLines: 0,
    showIncludesExcludes: false,
    onlyOpenEditors: false,
    notebookSearchConfig: {
        includeMarkupInput: true,
        includeMarkupPreview: false,
        includeCodeInput: true,
        includeOutput: true,
    },
});
export const extractSearchQueryFromLines = (lines) => {
    const query = defaultSearchConfig();
    const unescapeNewlines = (str) => {
        let out = '';
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '\\') {
                i++;
                const escaped = str[i];
                if (escaped === 'n') {
                    out += '\n';
                }
                else if (escaped === '\\') {
                    out += '\\';
                }
                else {
                    throw Error(localize('invalidQueryStringError', 'All backslashes in Query string must be escaped (\\\\)'));
                }
            }
            else {
                out += str[i];
            }
        }
        return out;
    };
    const parseYML = /^# ([^:]*): (.*)$/;
    for (const line of lines) {
        const parsed = parseYML.exec(line);
        if (!parsed) {
            continue;
        }
        const [, key, value] = parsed;
        switch (key) {
            case 'Query':
                query.query = unescapeNewlines(value);
                break;
            case 'Including':
                query.filesToInclude = value;
                break;
            case 'Excluding':
                query.filesToExclude = value;
                break;
            case 'ContextLines':
                query.contextLines = +value;
                break;
            case 'Flags': {
                query.isRegexp = value.indexOf('RegExp') !== -1;
                query.isCaseSensitive = value.indexOf('CaseSensitive') !== -1;
                query.useExcludeSettingsAndIgnoreFiles = value.indexOf('IgnoreExcludeSettings') === -1;
                query.matchWholeWord = value.indexOf('WordMatch') !== -1;
                query.onlyOpenEditors = value.indexOf('OpenEditors') !== -1;
            }
        }
    }
    query.showIncludesExcludes = !!(query.filesToInclude ||
        query.filesToExclude ||
        !query.useExcludeSettingsAndIgnoreFiles);
    return query;
};
export const serializeSearchResultForEditor = (searchResult, rawIncludePattern, rawExcludePattern, contextLines, labelFormatter, sortOrder, limitHit) => {
    if (!searchResult.query) {
        throw Error('Internal Error: Expected query, got null');
    }
    const config = contentPatternToSearchConfiguration(searchResult.query, rawIncludePattern, rawExcludePattern, contextLines);
    const filecount = searchResult.fileCount() > 1
        ? localize('numFiles', '{0} files', searchResult.fileCount())
        : localize('oneFile', '1 file');
    const resultcount = searchResult.count() > 1
        ? localize('numResults', '{0} results', searchResult.count())
        : localize('oneResult', '1 result');
    const info = [
        searchResult.count() ? `${resultcount} - ${filecount}` : localize('noResults', 'No Results'),
    ];
    if (limitHit) {
        info.push(localize('searchMaxResultsWarning', 'The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.'));
    }
    info.push('');
    const matchComparer = (a, b) => searchMatchComparer(a, b, sortOrder);
    const allResults = flattenSearchResultSerializations(searchResult
        .folderMatches()
        .sort(matchComparer)
        .map((folderMatch) => folderMatch
        .allDownstreamFileMatches()
        .sort(matchComparer)
        .flatMap((fileMatch) => fileMatchToSearchResultFormat(fileMatch, labelFormatter)))
        .flat());
    return {
        matchRanges: allResults.matchRanges.map(translateRangeLines(info.length)),
        text: info.concat(allResults.text).join(lineDelimiter),
        config,
    };
};
const flattenSearchResultSerializations = (serializations) => {
    const text = [];
    const matchRanges = [];
    serializations.forEach((serialized) => {
        serialized.matchRanges
            .map(translateRangeLines(text.length))
            .forEach((range) => matchRanges.push(range));
        serialized.text.forEach((line) => text.push(line));
        text.push(''); // new line
    });
    return { text, matchRanges };
};
export const parseSavedSearchEditor = async (accessor, resource) => {
    const textFileService = accessor.get(ITextFileService);
    const text = (await textFileService.read(resource)).value;
    return parseSerializedSearchEditor(text);
};
export const parseSerializedSearchEditor = (text) => {
    const headerlines = [];
    const bodylines = [];
    let inHeader = true;
    for (const line of text.split(/\r?\n/g)) {
        if (inHeader) {
            headerlines.push(line);
            if (line === '') {
                inHeader = false;
            }
        }
        else {
            bodylines.push(line);
        }
    }
    return { config: extractSearchQueryFromLines(headerlines), text: bodylines.join('\n') };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvclNlcmlhbGl6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQU9qRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sZ0VBQWdFLENBQUE7QUFFdkUsa0VBQWtFO0FBQ2xFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQTtBQUUxQixNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQVksRUFBRSxFQUFFLENBQzNELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBRWxHLE1BQU0seUJBQXlCLEdBQUcsQ0FDakMsS0FBdUIsRUFDdkIsaUJBQXlCLEVBQ2lDLEVBQUU7SUFDNUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLGVBQWUs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