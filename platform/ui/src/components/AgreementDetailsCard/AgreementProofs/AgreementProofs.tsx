import React from "react";
import CardContainer from "../AgreementDetailsCard";

interface AgreementProofsProps {
  proofs: any;
}

const ProofRow: React.FC<{
  label: string;
  value: string;
  tooltip: string;
  isHash?: boolean;
  fullValue?: string;
}> = ({ label, value, tooltip, isHash = false, fullValue }) => (
  <div style={{ marginBottom: "18px" }}>
    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
      <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "black" }}>
        {label}
      </h4>
      <span
        title={tooltip}
        style={{
          marginLeft: "5px",
          cursor: "help",
          color: "#666",
          fontWeight: 600,
        }}
      >
        ?
      </span>
    </div>
    <div
      style={{
        fontSize: "0.85rem",
        color: "black",
        fontFamily: isHash ? "monospace" : "inherit",
        overflowWrap: "break-word",
        textAlign: "left",
        paddingTop: "2px",
      }}
      title={fullValue || value}
    >
      {value}
    </div>
  </div>
);

const AgreementProofs: React.FC<AgreementProofsProps> = ({ proofs }) => {
  if (!proofs || Object.keys(proofs).length === 0) {
    return (
      <CardContainer icon="lock" title="Agreement Proofs">
        <div style={{ fontStyle: "italic", color: "#888", padding: "10px 0" }}>
          Proofs not yet available.
        </div>
      </CardContainer>
    );
  }

  const req = proofs.req_signature || {};
  const topLevelSig = proofs.signature;

  const type = req.type || "N/A";
  const signeeNonce = req.signeeNonce || "N/A";
  const signature = req.signature || topLevelSig || "N/A";

  const formatShortHash = (hash: string, length: number = 20) => {
    if (!hash || hash === "N/A" || hash.length <= length) return hash;
    return `${hash.substring(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <CardContainer icon="lock" title="Agreement Proofs">
      <ProofRow
        label="Proof Type"
        value={type}
        tooltip="The type of cryptographic proof included."
      />

      <ProofRow
        label="Signee Nonce"
        value={signeeNonce}
        isHash={true}
        tooltip="Random nonce used to prevent replay attacks."
      />

      <ProofRow
        label="Digital Signature"
        value={formatShortHash(signature, 60)}
        fullValue={signature}
        isHash={true}
        tooltip="Cryptographic signature proving agreement acceptance."
      />
    </CardContainer>
  );
};

export default AgreementProofs;
