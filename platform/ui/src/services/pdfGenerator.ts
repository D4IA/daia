import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import i18n from "../i18n";

interface Requirement {
	type?: string;
	pubKey?: string;
	offererNonce?: string;
}

interface Proof {
	type?: string;
	signeeNonce?: string;
	signature?: string;
}

interface PDFData {
	txId: string;
	description: string;
	publishedDate: string;
	requirements: Requirement | Requirement[];
	proofs: Proof | Proof[] | null;
}

export const generateAgreementPDF = (data: PDFData) => {
	const doc = new jsPDF();

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	let yPosition = 20;

	const t = (key: string) => i18n.t(key);

	const requirementsArray = Array.isArray(data.requirements)
		? data.requirements
		: [data.requirements];

	const proofsArray = data.proofs ? (Array.isArray(data.proofs) ? data.proofs : [data.proofs]) : [];

	// === HEADER ===
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

	// === TRANSACTION ID ===
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

	// === DESCRIPTION ===
	doc.setFontSize(12);
	doc.setTextColor(0, 0, 0);
	doc.text(t("pdf.description"), 20, yPosition);

	yPosition += 6;
	doc.setFontSize(10);
	doc.setTextColor(60, 60, 60);
	const descLines = doc.splitTextToSize(data.description, pageWidth - 40);
	doc.text(descLines, 20, yPosition);

	yPosition += descLines.length * 5 + 15;

	// === REQUIREMENTS ===
	if (yPosition > pageHeight - 60) {
		doc.addPage();
		yPosition = 20;
	}

	doc.setFontSize(14);
	doc.setTextColor(0, 0, 0);

	const reqTitle =
		requirementsArray.length > 1
			? `${t("pdf.requirements")} (${requirementsArray.length})`
			: t("pdf.requirements");
	doc.text(reqTitle, 20, yPosition);
	yPosition += 8;

	requirementsArray.forEach((req, index) => {
		if (yPosition > pageHeight - 80) {
			doc.addPage();
			yPosition = 20;
		}

		if (requirementsArray.length > 1) {
			doc.setFontSize(12);
			doc.setTextColor(147, 51, 234);
			doc.text(`${t("pdf.requirement_label")} ${index + 1}`, 20, yPosition);
			yPosition += 6;
		}

		autoTable(doc, {
			startY: yPosition,
			head: [[t("pdf.field"), t("pdf.value")]],
			body: [
				[t("pdf.req_type"), req.type || "N/A"],
				[t("pdf.pub_key"), req.pubKey || "N/A"],
				[t("pdf.offerer_nonce"), req.offererNonce || "N/A"],
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

		yPosition = (doc as any).lastAutoTable.finalY + 10;
	});

	yPosition += 5;

	// === PROOFS ===
	if (yPosition > pageHeight - 60) {
		doc.addPage();
		yPosition = 20;
	}

	doc.setFontSize(14);
	doc.setTextColor(0, 0, 0);

	const proofsTitle =
		proofsArray.length > 1 ? `${t("pdf.proofs")} (${proofsArray.length})` : t("pdf.proofs");
	doc.text(proofsTitle, 20, yPosition);
	yPosition += 8;

	if (proofsArray.length > 0) {
		proofsArray.forEach((proof, index) => {
			if (yPosition > pageHeight - 80) {
				doc.addPage();
				yPosition = 20;
			}

			if (proofsArray.length > 1) {
				doc.setFontSize(12);
				doc.setTextColor(147, 51, 234);
				doc.text(`${t("pdf.proof_label")} ${index + 1}`, 20, yPosition);
				yPosition += 6;
			}

			autoTable(doc, {
				startY: yPosition,
				head: [[t("pdf.field"), t("pdf.value")]],
				body: [
					[t("pdf.proof_type"), proof.type || "N/A"],
					[t("pdf.signee_nonce"), proof.signeeNonce || "N/A"],
					[t("pdf.signature"), proof.signature || "N/A"],
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

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		});
	} else {
		doc.setFontSize(10);
		doc.setTextColor(150, 150, 150);
		doc.setFont("helvetica", "italic");
		doc.text(t("pdf.no_proofs"), 20, yPosition);
		doc.setFont("helvetica", "normal");
	}

	// === FOOTER ===
	const footerY = pageHeight - 15;
	doc.setFontSize(8);
	doc.setTextColor(150, 150, 150);
	doc.text(t("pdf.footer"), pageWidth / 2, footerY, { align: "center" });

	// === SAVE ===
	const fileName = `DAIA_Agreement_${data.txId.substring(0, 8)}_${Date.now()}.pdf`;
	doc.save(fileName);
};
