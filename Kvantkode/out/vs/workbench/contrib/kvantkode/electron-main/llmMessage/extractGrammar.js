/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../../../base/common/uuid.js';
import { endsWithAnyPrefixOf, SurroundingsRemover, } from '../../common/helpers/extractCodeFromResult.js';
import { availableTools } from '../../common/prompt/prompts.js';
// =============== reasoning ===============
// could simplify this - this assumes we can never add a tag without committing it to the user's screen, but that's not true
export const extractReasoningWrapper = (onText, onFinalMessage, thinkTags) => {
    let latestAddIdx = 0; // exclusive index in fullText_
    let foundTag1 = false;
    let foundTag2 = false;
    let fullTextSoFar = '';
    let fullReasoningSoFar = '';
    if (!thinkTags[0] || !thinkTags[1])
        throw new Error(`thinkTags must not be empty if provided. Got ${JSON.stringify(thinkTags)}.`);
    let onText_ = onText;
    onText = (params) => {
        onText_(params);
    };
    const newOnText = ({ fullText: fullText_, ...p }) => {
        // until found the first think tag, keep adding to fullText
        if (!foundTag1) {
            const endsWithTag1 = endsWithAnyPrefixOf(fullText_, thinkTags[0]);
            if (endsWithTag1) {
                // console.log('endswith1', { fullTextSoFar, fullReasoningSoFar, fullText_ })
                // wait until we get the full tag or know more
                return;
            }
            // if found the first tag
            const tag1Index = fullText_.indexOf(thinkTags[0]);
            if (tag1Index !== -1) {
                // console.log('tag1Index !==1', { tag1Index, fullTextSoFar, fullReasoningSoFar, thinkTags, fullText_ })
                foundTag1 = true;
                // Add text before the tag to fullTextSoFar
                fullTextSoFar += fullText_.substring(0, tag1Index);
                // Update latestAddIdx to after the first tag
                latestAddIdx = tag1Index + thinkTags[0].length;
                onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
                return;
            }
            // console.log('adding to text A', { fullTextSoFar, fullReasoningSoFar })
            // add the text to fullText
            fullTextSoFar = fullText_;
            latestAddIdx = fullText_.length;
            onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
            return;
        }
        // at this point, we found <tag1>
        // until found the second think tag, keep adding to fullReasoning
        if (!foundTag2) {
            const endsWithTag2 = endsWithAnyPrefixOf(fullText_, thinkTags[1]);
            if (endsWithTag2 && endsWithTag2 !== thinkTags[1]) {
                // if ends with any partial part (full is fine)
                // console.log('endsWith2', { fullTextSoFar, fullReasoningSoFar })
                // wait until we get the full tag or know more
                return;
            }
            // if found the second tag
            const tag2Index = fullText_.indexOf(thinkTags[1], latestAddIdx);
            if (tag2Index !== -1) {
                // console.log('tag2Index !== -1', { fullTextSoFar, fullReasoningSoFar })
                foundTag2 = true;
                // Add everything between first and second tag to reasoning
                fullReasoningSoFar += fullText_.substring(latestAddIdx, tag2Index);
                // Update latestAddIdx to after the second tag
                latestAddIdx = tag2Index + thinkTags[1].length;
                onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
                return;
            }
            // add the text to fullReasoning (content after first tag but before second tag)
            // console.log('adding to text B', { fullTextSoFar, fullReasoningSoFar })
            // If we have more text than we've processed, add it to reasoning
            if (fullText_.length > latestAddIdx) {
                fullReasoningSoFar += fullText_.substring(latestAddIdx);
                latestAddIdx = fullText_.length;
            }
            onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
            return;
        }
        // at this point, we found <tag2> - content after the second tag is normal text
        // console.log('adding to text C', { fullTextSoFar, fullReasoningSoFar })
        // Add any new text after the closing tag to fullTextSoFar
        if (fullText_.length > latestAddIdx) {
            fullTextSoFar += fullText_.substring(latestAddIdx);
            latestAddIdx = fullText_.length;
        }
        onText({ ...p, fullText: fullTextSoFar, fullReasoning: fullReasoningSoFar });
    };
    const getOnFinalMessageParams = () => {
        const fullText_ = fullTextSoFar;
        const tag1Idx = fullText_.indexOf(thinkTags[0]);
        const tag2Idx = fullText_.indexOf(thinkTags[1]);
        if (tag1Idx === -1)
            return { fullText: fullText_, fullReasoning: '' }; // never started reasoning
        if (tag2Idx === -1)
            return { fullText: '', fullReasoning: fullText_ }; // never stopped reasoning
        const fullReasoning = fullText_.substring(tag1Idx + thinkTags[0].length, tag2Idx);
        const fullText = fullText_.substring(0, tag1Idx) + fullText_.substring(tag2Idx + thinkTags[1].length, Infinity);
        return { fullText, fullReasoning };
    };
    const newOnFinalMessage = (params) => {
        // treat like just got text before calling onFinalMessage (or else we sometimes miss the final chunk that's new to finalMessage)
        newOnText({ ...params });
        const { fullText, fullReasoning } = getOnFinalMessageParams();
        onFinalMessage({ ...params, fullText, fullReasoning });
    };
    return { newOnText, newOnFinalMessage };
};
// =============== tools (XML) ===============
const findPartiallyWrittenToolTagAtEnd = (fullText, toolTags) => {
    for (const toolTag of toolTags) {
        const foundPrefix = endsWithAnyPrefixOf(fullText, toolTag);
        if (foundPrefix) {
            return [foundPrefix, toolTag];
        }
    }
    return false;
};
const findIndexOfAny = (fullText, matches) => {
    for (const str of matches) {
        const idx = fullText.indexOf(str);
        if (idx !== -1) {
            return [idx, str];
        }
    }
    return null;
};
const parseXMLPrefixToToolCall = (toolName, toolId, str, toolOfToolName) => {
    const paramsObj = {};
    const doneParams = [];
    let isDone = false;
    const getAnswer = () => {
        // trim off all whitespace at and before first \n and after last \n for each param
        for (const p in paramsObj) {
            const paramName = p;
            const orig = paramsObj[paramName];
            if (orig === undefined)
                continue;
            paramsObj[paramName] = trimBeforeAndAfterNewLines(orig);
        }
        // return tool call
        const ans = {
            name: toolName,
            rawParams: paramsObj,
            doneParams: doneParams,
            isDone: isDone,
            id: toolId,
        };
        return ans;
    };
    // find first toolName tag
    const openToolTag = `<${toolName}>`;
    let i = str.indexOf(openToolTag);
    if (i === -1)
        return getAnswer();
    let j = str.lastIndexOf(`</${toolName}>`);
    if (j === -1)
        j = Infinity;
    else
        isDone = true;
    str = str.substring(i + openToolTag.length, j);
    const pm = new SurroundingsRemover(str);
    const allowedParams = Object.keys(toolOfToolName[toolName]?.params ?? {});
    if (allowedParams.length === 0)
        return getAnswer();
    let latestMatchedOpenParam = null;
    let n = 0;
    while (true) {
        n += 1;
        if (n > 10)
            return getAnswer(); // just for good measure as this code is early
        // find the param name opening tag
        let matchedOpenParam = null;
        for (const paramName of allowedParams) {
            const removed = pm.removeFromStartUntilFullMatch(`<${paramName}>`, true);
            if (removed) {
                matchedOpenParam = paramName;
                break;
            }
        }
        // if did not find a new param, stop
        if (matchedOpenParam === null) {
            if (latestMatchedOpenParam !== null) {
                paramsObj[latestMatchedOpenParam] += pm.value();
            }
            return getAnswer();
        }
        else {
            latestMatchedOpenParam = matchedOpenParam;
        }
        paramsObj[latestMatchedOpenParam] = '';
        // find the param name closing tag
        let matchedCloseParam = false;
        let paramContents = '';
        for (const paramName of allowedParams) {
            const i = pm.i;
            const closeTag = `</${paramName}>`;
            const removed = pm.removeFromStartUntilFullMatch(closeTag, true);
            if (removed) {
                const i2 = pm.i;
                paramContents = pm.originalS.substring(i, i2 - closeTag.length);
                matchedCloseParam = true;
                break;
            }
        }
        // if did not find a new close tag, stop
        if (!matchedCloseParam) {
            paramsObj[latestMatchedOpenParam] += pm.value();
            return getAnswer();
        }
        else {
            doneParams.push(latestMatchedOpenParam);
        }
        paramsObj[latestMatchedOpenParam] += paramContents;
    }
};
export const extractXMLToolsWrapper = (onText, onFinalMessage, chatMode, mcpTools) => {
    if (!chatMode)
        return { newOnText: onText, newOnFinalMessage: onFinalMessage };
    const tools = availableTools(chatMode, mcpTools);
    if (!tools)
        return { newOnText: onText, newOnFinalMessage: onFinalMessage };
    const toolOfToolName = {};
    const toolOpenTags = tools.map((t) => `<${t.name}>`);
    for (const t of tools) {
        toolOfToolName[t.name] = t;
    }
    const toolId = generateUuid();
    // detect <availableTools[0]></availableTools[0]>, etc
    let fullText = '';
    let trueFullText = '';
    let latestToolCall = undefined;
    let foundOpenTag = null;
    let openToolTagBuffer = ''; // the characters we've seen so far that come after a < with no space afterwards, not yet added to fullText
    let prevFullTextLen = 0;
    const newOnText = (params) => {
        const newText = params.fullText.substring(prevFullTextLen);
        prevFullTextLen = params.fullText.length;
        trueFullText = params.fullText;
        // console.log('NEWTEXT', JSON.stringify(newText))
        if (foundOpenTag === null) {
            const newFullText = openToolTagBuffer + newText;
            // ensure the code below doesn't run if only half a tag has been written
            const isPartial = findPartiallyWrittenToolTagAtEnd(newFullText, toolOpenTags);
            if (isPartial) {
                // console.log('--- partial!!!')
                openToolTagBuffer += newText;
            }
            // if no tooltag is partially written at the end, attempt to get the index
            else {
                // we will instantly retroactively remove this if it's a tag match
                fullText += openToolTagBuffer;
                openToolTagBuffer = '';
                fullText += newText;
                const i = findIndexOfAny(fullText, toolOpenTags);
                if (i !== null) {
                    const [idx, toolTag] = i;
                    const toolName = toolTag.substring(1, toolTag.length - 1);
                    // console.log('found ', toolName)
                    foundOpenTag = { idx, toolName };
                    // do not count anything at or after i in fullText
                    fullText = fullText.substring(0, idx);
                }
            }
        }
        // toolTagIdx is not null, so parse the XML
        if (foundOpenTag !== null) {
            latestToolCall = parseXMLPrefixToToolCall(foundOpenTag.toolName, toolId, trueFullText.substring(foundOpenTag.idx, Infinity), toolOfToolName);
        }
        onText({
            ...params,
            fullText,
            toolCall: latestToolCall,
        });
    };
    const newOnFinalMessage = (params) => {
        // treat like just got text before calling onFinalMessage (or else we sometimes miss the final chunk that's new to finalMessage)
        newOnText({ ...params });
        fullText = fullText.trimEnd();
        const toolCall = latestToolCall;
        // console.log('final message!!!', trueFullText)
        // console.log('----- returning ----\n', fullText)
        // console.log('----- tools ----\n', JSON.stringify(firstToolCallRef.current, null, 2))
        // console.log('----- toolCall ----\n', JSON.stringify(toolCall, null, 2))
        onFinalMessage({ ...params, fullText, toolCall: toolCall });
    };
    return { newOnText, newOnFinalMessage };
};
// trim all whitespace up until the first newline, and all whitespace up until the last newline
const trimBeforeAndAfterNewLines = (s) => {
    if (!s)
        return s;
    const firstNewLineIndex = s.indexOf('\n');
    if (firstNewLineIndex !== -1 && s.substring(0, firstNewLineIndex).trim() === '') {
        s = s.substring(firstNewLineIndex + 1, Infinity);
    }
    const lastNewLineIndex = s.lastIndexOf('\n');
    if (lastNewLineIndex !== -1 && s.substring(lastNewLineIndex + 1, Infinity).trim() === '') {
        s = s.substring(0, lastNewLineIndex);
    }
    return s;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdEdyYW1tYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2UvZXh0cmFjdEdyYW1tYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQVVqRiw0Q0FBNEM7QUFFNUMsNEhBQTRIO0FBQzVILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQ3RDLE1BQWMsRUFDZCxjQUE4QixFQUM5QixTQUEyQixFQUNnQyxFQUFFO0lBQzdELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQSxDQUFDLCtCQUErQjtJQUNwRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7SUFDckIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBRXJCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQTtJQUN0QixJQUFJLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtJQUUzQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUU5RixJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUE7SUFDcEIsTUFBTSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDbkIsT0FBTyxDQUFDLE1BQU0s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