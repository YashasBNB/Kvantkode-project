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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3NlbmRMTE1NZXNzYWdlVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFjMUYsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsU0FBdUIsRUFBaUIsRUFBRTtJQUN0RSxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUN4QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7U0FBTSxJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sSUFBSSxDQUFBO1FBQ3BELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7U0FBTSxJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzFDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUErQixDQUFDLEtBQUssRUFBRSxFQUFFO0lBQ3BFLElBQUksS0FBSyxZQUFZLEtBQUs7UUFBRSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDcEUsT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFBO0FBQ2xCLENBQUMsQ0FBQSJ9