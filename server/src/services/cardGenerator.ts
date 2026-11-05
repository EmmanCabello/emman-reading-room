import PDFDocument from "pdfkit";
import type { PublicWork } from "./catalogService";

const INK = "#181D24";
const GREEN = "#1E5631";
const MUTED = "#5B6470";
const VELLUM = "#F7F4EB";

/** Clamp text so the card is always exactly one page. */
function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Render a single-page bibliographic card. The card carries catalogue metadata
 * and Project Gutenberg links only - never any text of the work itself.
 */
export function renderBibliographicCard(work: PublicWork, holder: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A5",
      margin: 0,
      info: {
        Title: `Bibliographic card - ${work.title}`,
        Author: "Emman Reading Room",
        Subject: `${work.title} by ${work.author}`
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width; // 419.53
    const H = doc.page.height; // 595.28
    const pad = 36;
    const inner = W - pad * 2;

    // Vellum ground and a double-rule frame.
    doc.rect(0, 0, W, H).fill(VELLUM);
    doc.lineWidth(1.5).strokeColor(GREEN).roundedRect(18, 18, W - 36, H - 36, 12).stroke();
    doc.lineWidth(0.5).strokeColor(GREEN).roundedRect(23, 23, W - 46, H - 46, 9).stroke();

    // Masthead.
    let y = 44;
    doc.font("Times-Bold").fontSize(11).fillColor(GREEN).text("EMMAN READING ROOM", pad, y, {
      width: inner,
      align: "center",
      characterSpacing: 2
    });
    y += 16;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("BIBLIOGRAPHIC CARD", pad, y, {
      width: inner,
      align: "center",
      characterSpacing: 1.5
    });
    y += 22;
    doc.moveTo(pad, y).lineTo(W - pad, y).lineWidth(0.5).strokeColor(MUTED).stroke();
    y += 16;

    // Title and author.
    const title = clamp(work.title, 120);
    doc.font("Times-Bold").fontSize(title.length > 60 ? 17 : 22).fillColor(INK);
    doc.text(title, pad, y, { width: inner });
    y = doc.y + 8;
    doc.font("Times-Italic").fontSize(13).fillColor(INK).text(work.author, pad, y, { width: inner });
    y = doc.y + 2;
    if (work.authorLife) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(work.authorLife, pad, y, { width: inner });
      y = doc.y;
    }
    y += 14;

    // Metadata grid.
    const rows: Array<[string, string]> = [
      ["Catalogue no.", `ERR-${String(work.id).padStart(4, "0")}`],
      ["Reading room", work.room.label],
      ["First published", work.yearLabel],
      ["Language", "English (or English translation)"],
      ["Rights", "Public domain in the United States"]
    ];
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(GREEN).text(label.toUpperCase(), pad, y, {
        width: 96,
        characterSpacing: 0.6
      });
      doc.font("Helvetica").fontSize(10).fillColor(INK).text(value, pad + 104, y - 1, { width: inner - 104 });
      y = Math.max(doc.y, y + 14) + 4;
    }
    y += 6;
    doc.moveTo(pad, y).lineTo(W - pad, y).lineWidth(0.5).strokeColor(MUTED).stroke();
    y += 12;

    // Summary.
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GREEN).text("ABOUT THIS WORK", pad, y, {
      characterSpacing: 0.6
    });
    y = doc.y + 4;
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(clamp(work.summary, 420), pad, y, {
      width: inner,
      lineGap: 2
    });
    y = doc.y + 16;

    // Gutenberg link.
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GREEN).text("PROJECT GUTENBERG", pad, y, {
      characterSpacing: 0.6
    });
    y = doc.y + 4;
    const linkLabel = work.gutenberg.available
      ? `Free e-book #${work.gutenberg.id}`
      : "Search the Project Gutenberg catalogue for this title";
    doc.font("Helvetica").fontSize(10).fillColor(GREEN).text(linkLabel, pad, y, {
      width: inner,
      link: work.gutenberg.url,
      underline: true
    });
    y = doc.y + 2;
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(clamp(work.gutenberg.url, 110), pad, y, {
      width: inner
    });

    // Footer, pinned to the bottom of the frame.
    const footerY = H - 78;
    doc.moveTo(pad, footerY).lineTo(W - pad, footerY).lineWidth(0.5).strokeColor(MUTED).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
      "This card lists catalogue information only. It does not reproduce the text of the work.",
      pad,
      footerY + 8,
      { width: inner, align: "center" }
    );
    doc.text(`Issued to ${clamp(holder, 60)} on ${new Date().toISOString().slice(0, 10)}`, pad, footerY + 30, {
      width: inner,
      align: "center"
    });

    doc.end();
  });
}
