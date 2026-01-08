/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
export const errorDetails = (fullError) => {
    if (fullError === null) {
        return null;
    }
    else if (typeof fullError === 'object') {
        if (Object.keys(fullError).length === 0)
            return null;
        return JSON.stringify(fullError, null, 2);
    }
    else if (typeof fullError === 'string') {
        return null;
    }
    return null;
};
export const getErrorMessage = (error) => {
    if (error instanceof Error)
        return `${error.name}: ${error.message}`;
    return error + '';
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vc2VuZExMTU1lc3NhZ2VUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQWMxRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxTQUF1QixFQUFpQixFQUFFO0lBQ3RFLElBQUksU0FBUyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztTQUFNLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDMUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUE7UUFDcEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQztTQUFNLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDMUMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQStCLENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDcEUsSUFBSSxLQUFLLFlBQVksS0FBSztRQUFFLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNwRSxPQUFPLEtBQUssR0FBRyxFQUFFLENBQUE7QUFDbEIsQ0FBQyxDQUFBIn0=