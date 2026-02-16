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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9yU2VyaWFsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTywwQkFBMEIsQ0FBQTtBQUVqQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRzdDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBT2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUV2RSxrRUFBa0U7QUFDbEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFBO0FBRTFCLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBWSxFQUFFLEVBQUUsQ0FDM0QsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7QUFFbEcsTUFBTSx5QkFBeUIsR0FBRyxDQUNqQyxLQUF1QixFQUN2QixpQkFBeUIsRUFDaUMsRUFBRTtJQUM1RCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENB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