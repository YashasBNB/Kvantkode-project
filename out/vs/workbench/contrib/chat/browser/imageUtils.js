/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Resizes an image provided as a UInt8Array string. Resizing is based on Open AI's algorithm for tokenzing images.
 * https://platform.openai.com/docs/guides/vision#calculating-costs
 * @param data - The UInt8Array string of the image to resize.
 * @returns A promise that resolves to the UInt8Array string of the resized image.
 */
export async function resizeImage(data) {
    if (typeof data === 'string') {
        data = convertStringToUInt8Array(data);
    }
    const blob = new Blob([data]);
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    return new Promise((resolve, reject) => {
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width <= 768 || height <= 768) {
                resolve(data);
                return;
            }
            // Calculate the new dimensions while maintaining the aspect ratio
            if (width > 2048 || height > 2048) {
                const scaleFactor = 2048 / Math.max(width, height);
                width = Math.round(width * scaleFactor);
                height = Math.round(height * scaleFactor);
            }
            const scaleFactor = 768 / Math.min(width, height);
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(new Uint8Array(reader.result));
                        };
                        reader.onerror = (error) => reject(error);
                        reader.readAsArrayBuffer(blob);
                    }
                    else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                }, 'image/png');
            }
            else {
                reject(new Error('Failed to get canvas context'));
            }
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
}
export function convertStringToUInt8Array(data) {
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    if (isValidBase64(base64Data)) {
        return Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
    }
    return new TextEncoder().encode(data);
}
// Only used for URLs
export function convertUint8ArrayToString(data) {
    try {
        const decoder = new TextDecoder();
        const decodedString = decoder.decode(data);
        return decodedString;
    }
    catch {
        return '';
    }
}
function isValidBase64(str) {
    // checks if the string is a valid base64 string that is NOT encoded
    return (/^[A-Za-z0-9+/]*={0,2}$/.test(str) &&
        (() => {
            try {
                atob(str);
                return true;
            }
            catch {
                return false;
            }
        })());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2VVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9pbWFnZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7OztHQUtHO0FBRUgsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsSUFBeUI7SUFDMUQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixJQUFJLEdBQUcseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUM3QixNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDckMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7SUFFYixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUE7WUFFM0IsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNiLE9BQU07WUFDUCxDQUFDO1lBRUQsa0VBQWtFO1lBQ2xFLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7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