import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import animationStyles from "../styles/_animations.module.scss";
import Button from "../components/Button/Button";
import styles from "./SupportView.module.scss";
import { useLocation } from "react-router-dom";

const GITHUB_REPO_URL = "https://github.com/D4IA/daia/issues/new";
const UTTERANCES_REPO = "D4IA/daia";

interface IssueType {
  value: string;
  label: string;
}

const UtterancesComments: React.FC = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const location = useLocation();

  React.useEffect(() => {
    if (!ref.current) return;

    if (ref.current) {
      ref.current.innerHTML = "";
    }

    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;

    script.setAttribute("repo", UTTERANCES_REPO);
    script.setAttribute("issue-term", "pathname");
    script.setAttribute("label", "feedback");
    script.setAttribute("theme", "github-light");
    script.setAttribute("crossorigin", "anonymous");

    ref.current.appendChild(script);

    return () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    };
  }, [location.pathname]);

  return <div ref={ref} />;
};

const SupportView: React.FC = () => {
  const { t } = useTranslation();

  const viewOptions = {
    triggerOnce: true,
    threshold: 0.1,
  };
  const [headerRef, headerInView] = useInView(viewOptions);

  const issueTypes: IssueType[] = [
    { value: "Bug Report", label: t("support_view.type_bug") },
    { value: "Feature Request", label: t("support_view.type_feature") },
    { value: "Question", label: t("support_view.type_question") },
  ];

  const [issueType, setIssueType] = useState(issueTypes[0].value);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueContent, setIssueContent] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!issueTitle.trim() || !issueContent.trim()) {
        alert(
          t(
            "support_view.alert_fill_all",
            "Please fill in the title and details."
          )
        );
        return;
      }

      const bodyContent = `
**[Type: ${issueType}]**
    
**Details:**
${issueContent.trim()}

---
    
*This issue was submitted via the DAIA website support form.*
`;

      const params = new URLSearchParams();
      params.set("title", `[${issueType}] ${issueTitle.trim()}`);
      params.set("body", bodyContent);

      const githubUrl = `${GITHUB_REPO_URL}?${params.toString()}`;

      window.open(githubUrl, "_blank");
    },
    [issueType, issueTitle, issueContent, t]
  );

  return (
    <>
      <section className={styles.section}>
        <div className={styles.contentWrapper}>
          <div
            ref={headerRef}
            className={`${animationStyles.reveal} ${animationStyles.fadeUp} ${headerInView ? animationStyles.isVisible : ""}`}
          >
            <h1 className="title">{t("support_view.title")}</h1>
            <p className="subtitle">{t("support_view.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div>
              <label className={styles.label} htmlFor="issueType">
                {t("support_view.form_type_label")}
              </label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className={styles.selectField}
              >
                {issueTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label} htmlFor="issueTitle">
                {t("support_view.form_title_label")}
              </label>
              <input
                id="issueTitle"
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder={t("support_view.placeholder_title")}
                className={styles.inputField}
                required
              />
            </div>

            <div>
              <label className={styles.label} htmlFor="issueContent">
                {t("support_view.form_content_label")}
              </label>
              <textarea
                id="issueContent"
                value={issueContent}
                onChange={(e) => setIssueContent(e.target.value)}
                placeholder={t("support_view.placeholder_content")}
                className={styles.textareaField}
                required
              />
            </div>

            <Button
              type="submit"
              className={`actionButton ${styles.submitButton}`}
            >
              {t("support_view.button")}
            </Button>
          </form>
        </div>
      </section>

      <div className={styles.utterancesContainer}>
        <UtterancesComments />
      </div>
    </>
  );
};

export default SupportView;
