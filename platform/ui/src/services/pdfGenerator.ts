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

interface SummaryData {
	type: "payment" | "signed" | "unknown";
	participants: string[];
	amount?: number;
	relatedTxId?: string;
	signersStatus: string;
}

interface PDFData {
	txId: string;
	description: string;
	publishedDate: string;
	requirements: Requirement | Requirement[];
	proofs: Proof | Proof[] | null;
	summaryData?: SummaryData;
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

	// === SUMMARY (Replaces simple Description) ===
	if (data.summaryData) {
		doc.setFontSize(12);
		doc.setTextColor(0, 0, 0);
		doc.text(t("payment_agreement_summary.title"), 20, yPosition);
		yPosition += 8;

		const { type, participants, amount, relatedTxId, signersStatus } = data.summaryData;
		const [participantX, participantY] = participants;

		let key = "";
		if (type === "payment") {
			key = "payment_agreement_summary.text_pdf";
		} else if (type === "signed") {
			key = "signed_agreement_summary.text_pdf";
		}

		if (key) {
			let rawText = t(key);
			// Replace hardcoded <br /> tags with double newline to create paragraph gap
			rawText = rawText.replace(/<br\s*\/?>/g, "\n\n");
			// Remove self-closing tags like <3/> or <3 /> that are not part of the <n>...</n> structure
			rawText = rawText.replace(/<\d+\s*\/>/g, "");

			// Split by tags: <n>content</n>
			// Regex captures: [pre-text, tag-number, content, post-text...]
			const parts = rawText.split(/<(\d+)>(.*?)<\/\1>/g);

			const lineHeight = 6; // Reduced slightly to make paragraph gaps more obvious relative to line height
			const maxWidth = pageWidth - 40;
			let currentLine: any[] = [];
			let currentLineWidth = 0;

			// Helper to process a text segment
			const processText = (text: string) => {
				const isStatus = text.includes("{{signersStatus}}");

				// Interpolate values
				text = text.replace("{{description}}", data.description);
				text = text.replace("{{relatedTxId}}", relatedTxId || "N/A");
				text = text.replace("{{participantX}}", participantX || "Unknown");
				text = text.replace("{{participantY}}", participantY || "Unknown");
				text = text.replace("{{signersStatus}}", signersStatus || "");
				text = text.replace("{{participant}}", participantY || "Unknown");
				text = text.replace("{{amount}}", amount?.toString() || "");

				// Split into words to handle wrapping
				const words = text.split(/(\s+)/); // keep whitespace

				words.forEach((word) => {
					// Handle manual line breaks
					if (word.includes("\n")) {
						const splitByNewLine = word.split("\n");
						splitByNewLine.forEach((segment, idx) => {
							if (idx > 0) {
								// Force new line
								printLine(currentLine);
								currentLine = [];
								currentLineWidth = 0;
							}
							if (segment) addWord(segment, isStatus);
						});
						return;
					}
					addWord(word, isStatus);
				});
			};

			const addWord = (word: string, isStatus: boolean = false) => {
				// We need to temporarily set font to check width accurately
				// Assuming standard font for width check (approximate if bold changes width significantly, usually does)
				// We will stick to one font family for simplicity, just change weight/color
				doc.setFont(undefined as any, isBoldPart ? "bold" : "normal");
				let wordWidth = doc.getTextWidth(word);

				// Robust fix for space width
				// Check if word is whitespace only
				if (/^\s+$/.test(word)) {
					// If getTextWidth gives 0 or very small, enforce a minimum
					if (wordWidth < 0.1) {
						wordWidth = doc.getTextWidth("i") * word.length;
					}
				}

				if (currentLineWidth + wordWidth > maxWidth) {
					printLine(currentLine);
					currentLine = [];
					currentLineWidth = 0;
					// Trim leading space if new line - only if it's a single space
					// If it's a bunch of spaces, we might want to keep some, but standard wrap behavior trims
					if (/^\s+$/.test(word)) return;
				}

				currentLine.push({ text: word, isBold: isBoldPart, isStatus: isStatus, width: wordWidth });
				currentLineWidth += wordWidth;
			};

			let isBoldPart = false;

			const printLine = (lineSegments: any[]) => {
				let x = 20;
				lineSegments.forEach((seg) => {
					doc.setFont(undefined as any, seg.isBold ? "bold" : "normal");
					if (seg.isStatus) {
						doc.setTextColor(0, 160, 0); // Green for status
					} else if (seg.isBold) {
						doc.setTextColor(147, 51, 234); // Purple for highlighted values
					} else {
						doc.setTextColor(60, 60, 60); // Dark grey for normal text
					}
					doc.text(seg.text, x, yPosition);
					x += seg.width;
				});
				yPosition += lineHeight;

				// Check page break
				if (yPosition > pageHeight - 40) {
					doc.addPage();
					yPosition = 20;
				}
			};

			doc.setFontSize(10);

			for (let i = 0; i < parts.length; i++) {
				// Even indices are normal text, Odd indices are tag numbers (ignored), Odd+1 are content inside tag
				// wait, split output:
				// "pre", "1", "content", "post", "2", "content" ...

				// if i % 3 === 0 -> Normal text
				// if i % 3 === 1 -> Tag Number (skip)
				// if i % 3 === 2 -> Bold Content

				if (i % 3 === 0) {
					isBoldPart = false;
					processText(parts[i]);
				} else if (i % 3 === 2) {
					isBoldPart = true;
					processText(parts[i]);
				}
			}
			// Flush last line
			if (currentLine.length > 0) {
				printLine(currentLine);
			}

			yPosition += 10;
		} else {
			// Fallback
			doc.setFontSize(10);
			doc.setTextColor(60, 60, 60);
			const descLines = doc.splitTextToSize(data.description, pageWidth - 40);
			doc.text(descLines, 20, yPosition);
			yPosition += descLines.length * 5 + 15;
		}
	} else {
		// Legacy behavior
		doc.setFontSize(12);
		doc.setTextColor(0, 0, 0);
		doc.text(t("pdf.description"), 20, yPosition);

		yPosition += 6;
		doc.setFontSize(10);
		doc.setTextColor(60, 60, 60);
		const descLines = doc.splitTextToSize(data.description, pageWidth - 40);
		doc.text(descLines, 20, yPosition);

		yPosition += descLines.length * 5 + 15;
	}

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
