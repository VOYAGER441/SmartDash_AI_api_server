import { v4 as uuidv4 } from "uuid";

export const toString = (str: any) => {
    const result = str + "";
    return result;
};


const generatedIds = new Set<string>();

export const generateUUID = () => {
    let id;
    do {
        id = uuidv4();
    } while (generatedIds.has(id));
    generatedIds.add(id);
    return id;
};
