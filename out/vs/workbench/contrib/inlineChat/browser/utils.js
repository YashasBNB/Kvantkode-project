/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { AsyncIterableSource } from '../../../../base/common/async.js';
import { getNWords } from '../../chat/common/chatWordCounter.js';
export async function performAsyncTextEdit(model, edit, progress, obs) {
    const [id] = model.deltaDecorations([], [
        {
            range: edit.range,
            options: {
                description: 'asyncTextEdit',
                stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
            },
        },
    ]);
    let first = true;
    for await (const part of edit.newText) {
        if (model.isDisposed()) {
            break;
        }
        const range = model.getDecorationRange(id);
        if (!range) {
            throw new Error('FAILED to perform async replace edit because the anchor decoration was removed');
        }
        const edit = first
            ? EditOperation.replace(range, part) // first edit needs to override the "anchor"
            : EditOperation.insert(range.getEndPosition(), part);
        obs?.start();
        model.pushEditOperations(null, [edit], (undoEdits) => {
            progress?.report(undoEdits);
            return null;
        });
        obs?.stop();
        first = false;
    }
}
export function asProgressiveEdit(interval, edit, wordsPerSec, token) {
    wordsPerSec = Math.max(30, wordsPerSec);
    const stream = new AsyncIterableSource();
    let newText = edit.text ?? '';
    interval.cancelAndSet(() => {
        if (token.isCancellationRequested) {
            return;
        }
        const r = getNWords(newText, 1);
        stream.emitOne(r.value);
        newText = newText.substring(r.value.length);
        if (r.isFullString) {
            interval.cancel();
            stream.resolve();
            d.dispose();
        }
    }, 1000 / wordsPerSec);
    // cancel ASAP
    const d = token.onCancellationRequested(() => {
        interval.cancel();
        stream.resolve();
        d.dispose();
    });
    return {
        range: edit.range,
        newText: stream.asyncIterable,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBVS9FLE9BQU8sRUFBaUIsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTaEUsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FDekMsS0FBaUIsRUFDakIsSUFBbUIsRUFDbkIsUUFBMkMsRUFDM0MsR0FBbUI7SUFFbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDbEMsRUFBRSxFQUNGO1FBQ0M7WUFDQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsT0FBTyxFQUFFO2dCQUNSLFdBQVcsRUFBRSxlQUFlO2dCQUM1QixVQUFVLDZEQUFxRDthQUMvRDtTQUNEO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFBO0lBQ2hCLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQUs7UUFDTixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQ2QsZ0ZBQWdGLENBQ2hGLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsS0FBSztZQUNqQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsNENBQTRDO1lBQ2pGLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDWixLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNwRCxRQUFRLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUE7UUFDRixHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDWCxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLFFBQXVCLEVBQ3ZCLElBQW9DLEVBQ3BDLFdBQW1CLEVBQ25CLEtBQXdCO0lBRXhCLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUV2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixFQUFVLENBQUE7SUFDaEQsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUE7SUFFN0IsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDMUIsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwQixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDakIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2hCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFBO0lBRXRCLGNBQWM7SUFDZCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1FBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNqQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPO1FBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLE9BQU8sRUFBRSxNQUFNLENBQUMsYUFBYTtLQUM3QixDQUFBO0FBQ0YsQ0FBQyJ9