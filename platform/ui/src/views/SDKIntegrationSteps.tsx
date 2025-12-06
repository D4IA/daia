import React from "react";
import CodeStep from "../components/CodeStep/CodeStep";
import translations from "../translations/en-us.json";
import styles from "./SDKIntegrationSteps.module.scss";

const T = translations.sdk_integration_steps;

const SDKIntegrationSteps: React.FC = () => {
  const steps = [T.step1, T.step2, T.step3, T.step4];

  return (
    <section className={styles.sectionContainer}>
      <div className={styles.contentWrapper}>
        <h2 className={`title ${styles.sectionTitle}`}>{T.title}</h2>
        <p className="subtitle">{T.subtitle}</p>
        {steps.map((step) => (
          <CodeStep
            key={step.number}
            stepNumber={step.number}
            title={step.title}
            codeSnippet={step.codeSnippet}
          />
        ))}
      </div>
    </section>
  );
};

export default SDKIntegrationSteps;
