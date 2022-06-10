import { statSync } from "fs";

export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
