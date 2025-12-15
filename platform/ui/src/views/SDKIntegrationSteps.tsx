import React from "react";
import { useTranslation } from "react-i18next";
import CodeStep from "../components/CodeStep/CodeStep";
import styles from "./SDKIntegrationSteps.module.scss";

interface Step {
  number: number;
  title: string;
  codeSnippet: string;
}

const SDKIntegrationSteps: React.FC = () => {
  const { t } = useTranslation();

  const steps: Step[] = [
    t("sdk_integration_steps.step1", { returnObjects: true }),
    t("sdk_integration_steps.step2", { returnObjects: true }),
    t("sdk_integration_steps.step3", { returnObjects: true }),
    t("sdk_integration_steps.step4", { returnObjects: true }),
  ] as Step[];

  return (
    <section className={styles.sectionContainer}>
      <div className={styles.contentWrapper}>
        <h2 className={`title ${styles.sectionTitle}`}>
          {t("sdk_integration_steps.title")}
        </h2>
        <p className="subtitle">{t("sdk_integration_steps.subtitle")}</p>

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
