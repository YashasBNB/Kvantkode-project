/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { badgeBackground, buttonForeground, chartsBlue, chartsPurple, foreground, } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, registerColor, } from '../../../../platform/theme/common/colorUtils.js';
import { rot } from '../../../../base/common/numbers.js';
import { svgElem } from '../../../../base/browser/dom.js';
import { compareHistoryItemRefs } from './util.js';
export const SWIMLANE_HEIGHT = 22;
export const SWIMLANE_WIDTH = 11;
const SWIMLANE_CURVE_RADIUS = 5;
const CIRCLE_RADIUS = 4;
const CIRCLE_STROKE_WIDTH = 2;
/**
 * History item reference colors (local, remote, base)
 */
export const historyItemRefColor = registerColor('scmGraph.historyItemRefColor', chartsBlue, localize('scmGraphHistoryItemRefColor', 'History item reference color.'));
export const historyItemRemoteRefColor = registerColor('scmGraph.historyItemRemoteRefColor', chartsPurple, localize('scmGraphHistoryItemRemoteRefColor', 'History item remote reference color.'));
export const historyItemBaseRefColor = registerColor('scmGraph.historyItemBaseRefColor', '#EA5C00', localize('scmGraphHistoryItemBaseRefColor', 'History item base reference color.'));
/**
 * History item hover color
 */
export const historyItemHoverDefaultLabelForeground = registerColor('scmGraph.historyItemHoverDefaultLabelForeground', foreground, localize('scmGraphHistoryItemHoverDefaultLabelForeground', 'History item hover default label foreground color.'));
export const historyItemHoverDefaultLabelBackground = registerColor('scmGraph.historyItemHoverDefaultLabelBackground', badgeBackground, localize('scmGraphHistoryItemHoverDefaultLabelBackground', 'History item hover default label background color.'));
export const historyItemHoverLabelForeground = registerColor('scmGraph.historyItemHoverLabelForeground', buttonForeground, localize('scmGraphHistoryItemHoverLabelForeground', 'History item hover label foreground color.'));
export const historyItemHoverAdditionsForeground = registerColor('scmGraph.historyItemHoverAdditionsForeground', { light: '#587C0C', dark: '#81B88B', hcDark: '#A1E3AD', hcLight: '#374E06' }, localize('scmGraph.HistoryItemHoverAdditionsForeground', 'History item hover additions foreground color.'));
export const historyItemHoverDeletionsForeground = registerColor('scmGraph.historyItemHoverDeletionsForeground', { light: '#AD0707', dark: '#C74E39', hcDark: '#C74E39', hcLight: '#AD0707' }, localize('scmGraph.HistoryItemHoverDeletionsForeground', 'History item hover deletions foreground color.'));
/**
 * History graph color registry
 */
export const colorRegistry = [
    registerColor('scmGraph.foreground1', '#FFB000', localize('scmGraphForeground1', 'Source control graph foreground color (1).')),
    registerColor('scmGraph.foreground2', '#DC267F', localize('scmGraphForeground2', 'Source control graph foreground color (2).')),
    registerColor('scmGraph.foreground3', '#994F00', localize('scmGraphForeground3', 'Source control graph foreground color (3).')),
    registerColor('scmGraph.foreground4', '#40B0A6', localize('scmGraphForeground4', 'Source control graph foreground color (4).')),
    registerColor('scmGraph.foreground5', '#B66DFF', localize('scmGraphForeground5', 'Source control graph foreground color (5).')),
];
function getLabelColorIdentifier(historyItem, colorMap) {
    for (const ref of historyItem.references ?? []) {
        const colorIdentifier = colorMap.get(ref.id);
        if (colorIdentifier !== undefined) {
            return colorIdentifier;
        }
    }
    return undefined;
}
function createPath(colorIdentifier) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '1px');
    path.setAttribute('stroke-linecap', 'round');
    path.style.stroke = asCssVariable(colorIdentifier);
    return path;
}
function drawCircle(index, radius, strokeWidth, colorIdentifier) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${SWIMLANE_WIDTH * (index + 1)}`);
    circle.setAttribute('cy', `${SWIMLANE_WIDTH}`);
    circle.setAttribute('r', `${radius}`);
    circle.style.strokeWidth = `${strokeWidth}px`;
    if (colorIdentifier) {
        circle.style.fill = asCssVariable(colorIdentifier);
    }
    return circle;
}
function drawVerticalLine(x1, y1, y2, color) {
    const path = createPath(color);
    path.setAttribute('d', `M ${x1} ${y1} V ${y2}`);
    return path;
}
function findLastIndex(nodes, id) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].id === id) {
            return i;
        }
    }
    return -1;
}
export function renderSCMHistoryItemGraph(historyItemViewModel) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph');
    const historyItem = historyItemViewModel.historyItem;
    const inputSwimlanes = historyItemViewModel.inputSwimlanes;
    const outputSwimlanes = historyItemViewModel.outputSwimlanes;
    // Find the history item in the input swimlanes
    const inputIndex = inputSwimlanes.findIndex((node) => node.id === historyItem.id);
    // Circle index - use the input swimlane index if present, otherwise add it to the end
    const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
    // Circle color - use the output swimlane color if present, otherwise the input swimlane color
    const circleColor = circleIndex < outputSwimlanes.length
        ? outputSwimlanes[circleIndex].color
        : circleIndex < inputSwimlanes.length
            ? inputSwimlanes[circleIndex].color
            : historyItemRefColor;
    let outputSwimlaneIndex = 0;
    for (let index = 0; index < inputSwimlanes.length; index++) {
        const color = inputSwimlanes[index].color;
        // Current commit
        if (inputSwimlanes[index].id === historyItem.id) {
            // Base commit
            if (index !== circleIndex) {
                const d = [];
                const path = createPath(color);
                // Draw /
                d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * index} ${SWIMLANE_WIDTH}`);
                // Draw -
                d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)}`);
                path.setAttribute('d', d.join(' '));
                svg.append(path);
            }
            else {
                outputSwimlaneIndex++;
            }
        }
        else {
            // Not the current commit
            if (outputSwimlaneIndex < outputSwimlanes.length &&
                inputSwimlanes[index].id === outputSwimlanes[outputSwimlaneIndex].id) {
                if (index === outputSwimlaneIndex) {
                    // Draw |
                    const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, color);
                    svg.append(path);
                }
                else {
                    const d = [];
                    const path = createPath(color);
                    // Draw |
                    d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                    d.push(`V 6`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 1 ${SWIMLANE_WIDTH * (index + 1) - SWIMLANE_CURVE_RADIUS} ${SWIMLANE_HEIGHT / 2}`);
                    // Draw -
                    d.push(`H ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 0 ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)} ${SWIMLANE_HEIGHT / 2 + SWIMLANE_CURVE_RADIUS}`);
                    // Draw |
                    d.push(`V ${SWIMLANE_HEIGHT}`);
                    path.setAttribute('d', d.join(' '));
                    svg.append(path);
                }
                outputSwimlaneIndex++;
            }
        }
    }
    // Add remaining parent(s)
    for (let i = 1; i < historyItem.parentIds.length; i++) {
        const parentOutputIndex = findLastIndex(outputSwimlanes, historyItem.parentIds[i]);
        if (parentOutputIndex === -1) {
            continue;
        }
        // Draw -\
        const d = [];
        const path = createPath(outputSwimlanes[parentOutputIndex].color);
        // Draw \
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (parentOutputIndex + 1)} ${SWIMLANE_HEIGHT}`);
        // Draw -
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)} `);
        path.setAttribute('d', d.join(' '));
        svg.append(path);
    }
    // Draw | to *
    if (inputIndex !== -1) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), 0, SWIMLANE_HEIGHT / 2, inputSwimlanes[inputIndex].color);
        svg.append(path);
    }
    // Draw | from *
    if (historyItem.parentIds.length > 0) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), SWIMLANE_HEIGHT / 2, SWIMLANE_HEIGHT, circleColor);
        svg.append(path);
    }
    // Draw *
    if (historyItemViewModel.isCurrent) {
        // HEAD
        const outerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 3, CIRCLE_STROKE_WIDTH, circleColor);
        svg.append(outerCircle);
        const innerCircle = drawCircle(circleIndex, CIRCLE_STROKE_WIDTH, CIRCLE_RADIUS);
        svg.append(innerCircle);
    }
    else {
        if (historyItem.parentIds.length > 1) {
            // Multi-parent node
            const circleOuter = drawCircle(circleIndex, CIRCLE_RADIUS + 2, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleOuter);
            const circleInner = drawCircle(circleIndex, CIRCLE_RADIUS - 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleInner);
        }
        else {
            // Node
            const circle = drawCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circle);
        }
    }
    // Set dimensions
    svg.style.height = `${SWIMLANE_HEIGHT}px`;
    svg.style.width = `${SWIMLANE_WIDTH * (Math.max(inputSwimlanes.length, outputSwimlanes.length, 1) + 1)}px`;
    return svg;
}
export function renderSCMHistoryGraphPlaceholder(columns) {
    const elements = svgElem('svg', {
        style: { height: `${SWIMLANE_HEIGHT}px`, width: `${SWIMLANE_WIDTH * (columns.length + 1)}px` },
    });
    // Draw |
    for (let index = 0; index < columns.length; index++) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, columns[index].color);
        elements.root.append(path);
    }
    return elements.root;
}
export function toISCMHistoryItemViewModelArray(historyItems, colorMap = new Map(), currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    let colorIndex = -1;
    const viewModels = [];
    for (let index = 0; index < historyItems.length; index++) {
        const historyItem = historyItems[index];
        const isCurrent = historyItem.id === currentHistoryItemRef?.revision;
        const outputSwimlanesFromPreviousItem = viewModels.at(-1)?.outputSwimlanes ?? [];
        const inputSwimlanes = outputSwimlanesFromPreviousItem.map((i) => deepClone(i));
        const outputSwimlanes = [];
        let firstParentAdded = false;
        // Add first parent to the output
        if (historyItem.parentIds.length > 0) {
            for (const node of inputSwimlanes) {
                if (node.id === historyItem.id) {
                    if (!firstParentAdded) {
                        outputSwimlanes.push({
                            id: historyItem.parentIds[0],
                            color: getLabelColorIdentifier(historyItem, colorMap) ?? node.color,
                        });
                        firstParentAdded = true;
                    }
                    continue;
                }
                outputSwimlanes.push(deepClone(node));
            }
        }
        // Add unprocessed parent(s) to the output
        for (let i = firstParentAdded ? 1 : 0; i < historyItem.parentIds.length; i++) {
            // Color index (label -> next color)
            let colorIdentifier;
            if (i === 0) {
                colorIdentifier = getLabelColorIdentifier(historyItem, colorMap);
            }
            else {
                const historyItemParent = historyItems.find((h) => h.id === historyItem.parentIds[i]);
                colorIdentifier = historyItemParent
                    ? getLabelColorIdentifier(historyItemParent, colorMap)
                    : undefined;
            }
            if (!colorIdentifier) {
                colorIndex = rot(colorIndex + 1, colorRegistry.length);
                colorIdentifier = colorRegistry[colorIndex];
            }
            outputSwimlanes.push({
                id: historyItem.parentIds[i],
                color: colorIdentifier,
            });
        }
        // Add colors to references
        const references = (historyItem.references ?? []).map((ref) => {
            let color = colorMap.get(ref.id);
            if (colorMap.has(ref.id) && color === undefined) {
                // Find the history item in the input swimlanes
                const inputIndex = inputSwimlanes.findIndex((node) => node.id === historyItem.id);
                // Circle index - use the input swimlane index if present, otherwise add it to the end
                const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
                // Circle color - use the output swimlane color if present, otherwise the input swimlane color
                color =
                    circleIndex < outputSwimlanes.length
                        ? outputSwimlanes[circleIndex].color
                        : circleIndex < inputSwimlanes.length
                            ? inputSwimlanes[circleIndex].color
                            : historyItemRefColor;
            }
            return { ...ref, color };
        });
        // Sort references
        references.sort((ref1, ref2) => compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef));
        viewModels.push({
            historyItem: {
                ...historyItem,
                references,
            },
            isCurrent,
            inputSwimlanes,
            outputSwimlanes,
        });
    }
    return viewModels;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtSGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFDTixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLFVBQVUsRUFDVixZQUFZLEVBQ1osVUFBVSxHQUNWLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLGFBQWEsRUFFYixhQUFhLEdBQ2IsTUFBTSxpREFBaUQsQ0FBQTtBQU94RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUVsRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFBO0FBQ2pDLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUE7QUFDaEMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUE7QUFDL0IsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO0FBRTdCOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsYUFBYSxDQUMvQyw4QkFBOEIsRUFDOUIsVUFBVSxFQUNWLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwrQkFBK0IsQ0FBQyxDQUN4RSxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsYUFBYSxDQUNyRCxv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