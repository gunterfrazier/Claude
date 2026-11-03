import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export";

/** Writes `content` to a named cache file and opens the system share sheet. */
export async function shareTextFile(content: string, fileName: string, format: ExportFormat): Promise<void> {
  const meta = EXPORT_FORMATS[format];
  if (Platform.OS === "web") {
    downloadOnWeb(content, fileName, meta.mime);
    return;
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(content);
  await shareUri(file.uri, format);
}

/** Renders HTML to a PDF named `fileName` and opens the share sheet. */
export async function sharePdf(html: string, fileName: string): Promise<void> {
  if (Platform.OS === "web") {
    printHtmlOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const named = new File(Paths.cache, fileName);
  await new File(uri).copy(named, { overwrite: true });
  await shareUri(named.uri, "PDF");
}

export async function printHtml(html: string): Promise<void> {
  if (Platform.OS === "web") {
    printHtmlOnWeb(html);
    return;
  }
  await Print.printAsync({ html });
}

async function shareUri(uri: string, format: ExportFormat) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  const meta = EXPORT_FORMATS[format];
  await Sharing.shareAsync(uri, { mimeType: meta.mime, UTI: meta.uti, dialogTitle: `Share ${meta.label}` });
}

function downloadOnWeb(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 400);
}

function printHtmlOnWeb(html: string) {
  const w = window.open("", "_blank");
  if (!w) throw new Error("Allow pop-ups to print the dossier.");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
