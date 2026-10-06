import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CompanyInfo } from "./company-info";
import type { ExpenseRow } from "../supabase";

function formatAmount(value: number, currency: string): string {
  return `${value.toFixed(3)} ${currency}`;
}

function paymentStatusLabel(status: ExpenseRow["payment_status"]): string {
  return status === "paid" ? "Payée" : "En attente";
}

async function fetchLogoBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function buildExpensePdf(expense: ExpenseRow, company: CompanyInfo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = 780;

  if (company.logoUrl) {
    const logoBytes = await fetchLogoBytes(company.logoUrl);
    if (logoBytes) {
      try {
        const image =
          company.logoUrl.toLowerCase().includes(".png") || logoBytes[0] === 0x89
            ? await doc.embedPng(logoBytes)
            : await doc.embedJpg(logoBytes);
        const dims = image.scale(0.35);
        page.drawImage(image, { x: margin, y: y - dims.height, width: dims.width, height: dims.height });
        y -= dims.height + 16;
      } catch {
        // skip logo if unsupported format
      }
    }
  }

  page.drawText(company.name, { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 22;
  const contactLines = [company.address, company.email, company.phone].filter(Boolean) as string[];
  for (const line of contactLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
  }

  y -= 10;
  page.drawText("PIÈCE DE DÉPENSE / FACTURE FOURNISSEUR", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 28;

  const rows: [string, string][] = [
    ["Référence", expense.invoice_number?.trim() || "—"],
    ["Fournisseur", expense.supplier_name?.trim() || "—"],
    ["Date de paiement", expense.payment_date],
    ["Titre", expense.title],
    ["Catégorie", expense.category],
    ["Statut paiement", paymentStatusLabel(expense.payment_status)],
  ];
  if (expense.description?.trim()) {
    rows.push(["Description", expense.description.trim()]);
  }

  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: margin, y, size: 10, font: fontBold });
    page.drawText(value.length > 70 ? `${value.slice(0, 67)}…` : value, {
      x: margin + 130,
      y,
      size: 10,
      font,
      maxWidth: 380,
    });
    y -= 18;
  }

  y -= 12;
  page.drawLine({ start: { x: margin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;

  const amounts: [string, string][] = [
    ["Montant HT", formatAmount(Number(expense.amount_ht), expense.currency)],
    [
      "TVA",
      expense.vat_rate != null && Number(expense.vat_rate) > 0
        ? `${formatAmount(Number(expense.vat_amount), expense.currency)} (${expense.vat_rate} %)`
        : formatAmount(0, expense.currency),
    ],
    ["Montant TTC", formatAmount(Number(expense.amount_ttc), expense.currency)],
  ];

  for (const [label, value] of amounts) {
    page.drawText(label, { x: margin, y, size: 11, font: fontBold });
    page.drawText(value, { x: 400, y, size: 11, font });
    y -= 20;
  }

  if (expense.notes?.trim()) {
    y -= 10;
    page.drawText("Notes", { x: margin, y, size: 10, font: fontBold });
    y -= 16;
    page.drawText(expense.notes.trim(), { x: margin, y, size: 10, font, maxWidth: 495, lineHeight: 14 });
  }

  if (expense.status === "voided") {
    page.drawText("ANNULÉE / VOIDED", {
      x: margin,
      y: 60,
      size: 14,
      font: fontBold,
      color: rgb(0.75, 0.1, 0.1),
    });
  }

  page.drawText(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, {
    x: margin,
    y: 40,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return doc.save();
}
