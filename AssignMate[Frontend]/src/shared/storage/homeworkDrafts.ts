import type { AssignmentType } from "@/features/assignments/types";

export type HomeworkDraftPayload = {
  selected_option?: number | null;
  selected_options?: number[];
  answers?: { position: number; answer_text: string }[];
  answer_text?: string;
  files?: File[];
};

type StoredFile = {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
};

type StoredDraft = {
  key: string;
  type: AssignmentType;
  payload: Omit<HomeworkDraftPayload, "files">;
  files?: StoredFile[];
  updatedAt: number;
};

const DB_NAME = "assignmate";
const STORE_NAME = "homeworkDrafts";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  try {
    const result = await callback(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
    return result;
  } finally {
    db.close();
  }
}

function serializeFiles(files: File[] | undefined): StoredFile[] | undefined {
  if (!files || files.length === 0) return undefined;
  return files.map((file) => ({
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
  }));
}

function restoreFiles(files: StoredFile[] | undefined): File[] {
  if (!files || files.length === 0) return [];
  return files.map((file) => new File([file.blob], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  }));
}

export async function loadHomeworkDraft(
  key: string,
): Promise<{ type: AssignmentType; payload: HomeworkDraftPayload } | null> {
  try {
    return await withStore("readonly", async (store) => {
      const stored = (await requestToPromise(store.get(key))) as StoredDraft | undefined;
      if (!stored) return null;
      return {
        type: stored.type,
        payload: {
          ...stored.payload,
          files: restoreFiles(stored.files),
        },
      };
    });
  } catch {
    return null;
  }
}

export async function saveHomeworkDraft(
  key: string,
  type: AssignmentType,
  payload: HomeworkDraftPayload,
): Promise<void> {
  try {
    const { files, ...rest } = payload;
    const record: StoredDraft = {
      key,
      type,
      payload: rest,
      files: serializeFiles(files),
      updatedAt: Date.now(),
    };
    await withStore("readwrite", async (store) => {
      await requestToPromise(store.put(record));
    });
  } catch {
    // noop: offline/blocked storage should not break UI
  }
}

export async function clearHomeworkDraft(key: string): Promise<void> {
  try {
    await withStore("readwrite", async (store) => {
      await requestToPromise(store.delete(key));
    });
  } catch {
    // ignore
  }
}
