import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import i18n from "../i18n";

interface PDFData {
  txId: string;
  description: string;
  publishedDate: string;
  requirements: {
    type?: string;
    pubKey?: string;
    offererNonce?: string;
  };
  proofs: {
    type?: string;
    signeeNonce?: string;
    signature?: string;
  } | null;
}

export const generateAgreementPDF = (data: PDFData) => {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  const t = (key: string) => i18n.t(key);

  doc.setFontSize(24);
  doc.setTextColor(147, 51, 234);
  doc.text("DAIA", 20, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(t("pdf.subtitle"), 20, yPosition);

  yPosition += 15;

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(t("pdf.title"), 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const currentDate = new Date().toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`${t("pdf.generated_at")} ${currentDate}`, 20, yPosition);

  yPosition += 15;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(t("pdf.transaction_id"), 20, yPosition);

  yPosition += 6;
  doc.setFontSize(9);
  const txIdLines = doc.splitTextToSize(data.txId, pageWidth - 40);
  doc.text(txIdLines, 20, yPosition);

  yPosition += txIdLines.length * 5 + 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${t("pdf.published_at")} ${data.publishedDate}`, 20, yPosition);

  yPosition += 12;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(t("pdf.description"), 20, yPosition);

  yPosition += 6;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const descLines = doc.splitTextToSize(data.description, pageWidth - 40);
  doc.text(descLines, 20, yPosition);

  yPosition += descLines.length * 5 + 15;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(t("pdf.requirements"), 20, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [[t("pdf.field"), t("pdf.value")]],
    body: [
      [t("pdf.req_type"), data.requirements.type || "N/A"],
      [t("pdf.pub_key"), data.requirements.pubKey || "N/A"],
      [t("pdf.offerer_nonce"), data.requirements.offererNonce || "N/A"],
    ],
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(t("pdf.proofs"), 20, yPosition);
  yPosition += 8;

  if (data.proofs && Object.keys(data.proofs).length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [[t("pdf.field"), t("pdf.value")]],
      body: [
        [t("pdf.proof_type"), data.proofs.type || "N/A"],
        [t("pdf.signee_nonce"), data.proofs.signeeNonce || "N/A"],
        [t("pdf.signature"), data.proofs.signature || "N/A"],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [147, 51, 234],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: "bold" },
        1: { cellWidth: "auto" },
      },
      margin: { left: 20, right: 20 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.text(t("pdf.no_proofs"), 20, yPosition);
    doc.setFont("helvetica", "normal");
  }

  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(t("pdf.footer"), pageWidth / 2, footerY, { align: "center" });

  const fileName = `DAIA_Agreement_${data.txId.substring(0, 8)}_${Date.now()}.pdf`;
  doc.save(fileName);
};
