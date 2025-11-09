import { honestCase } from "./scenarios/honestCase";
import { cheatingCaseNoProof } from "./scenarios/cheatingCaseNoProof";
import { cheatingCaseWithProof } from "./scenarios/cheatingCaseWithProof";

async function run(): Promise<void> {
  const honest = await honestCase();
  const cheat1 = await cheatingCaseNoProof();
  const cheat2 = await cheatingCaseWithProof();

  // eslint-disable-next-line no-console
  console.log("Summary:", { honest: honest ?? true, cheat1, cheat2 });
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


