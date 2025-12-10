import React from "react";
import styles from "./CodeStep.module.scss";

interface CodeStepProps {
  stepNumber: number;
  title: string;
  codeSnippet: string;
}

const CodeStep: React.FC<CodeStepProps> = ({
  stepNumber,
  title,
  codeSnippet,
}) => {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.header}>
        <div className={styles.stepNumberCircle}>{stepNumber}</div>
        <h3 className={styles.title}>{title}</h3>
      </div>

      <div className={styles.codeBlock}>
        <code className={styles.codeSnippet}>{codeSnippet}</code>
      </div>
    </div>
  );
};

export default CodeStep;
